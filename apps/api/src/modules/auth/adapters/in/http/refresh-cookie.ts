import type { RuntimeConfig } from '../../../../../shared/infrastructure/config';
export const REFRESH_COOKIE = 'pettly_refresh';
export function refreshCookieOptions(settings: RuntimeConfig) {
  return {
    httpOnly: true,
    secure: settings.secureCookies,
    sameSite: 'lax' as const,
    path: '/api/auth',
  };
}
