import type { APIResponse, Page, Request, Response } from '@playwright/test';

const pages = new WeakSet<Page>();
const bodies = new WeakMap<Request, APIResponse>();

/** Keep real server responses available after Chromium refreshes a page. */
export async function preserveApiResponses(page: Page): Promise<void> {
  if (pages.has(page)) return;
  await page.route(
    (url) =>
      url.pathname === '/api/auth/login' ||
      /^\/api\/(catalog\/admin|inventory|services|bookings\/admin|orders|notifications)(?:\/|$)/.test(
        url.pathname,
      ),
    async (route) => {
      const method = route.request().method();
      const availability = new URL(route.request().url()).pathname.endsWith(
        '/availability',
      );
      if (
        !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
        !availability
      ) {
        await route.continue();
        return;
      }
      const response = await route.fetch({ maxRetries: 0, maxRedirects: 0 });
      await response.body();
      bodies.set(route.request(), response);
      await route.fulfill({ response });
    },
  );
  pages.add(page);
}

/** APIRequestContext responses already retain their body independently of navigation. */
export function retainedResponse(
  response: APIResponse | Response,
): APIResponse {
  if (!('request' in response)) return response;
  const captured = bodies.get(response.request());
  if (!captured)
    throw Error(
      'Enable preserveApiResponses before reading a browser API body.',
    );
  return captured;
}
