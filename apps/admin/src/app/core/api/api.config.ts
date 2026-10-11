import { InjectionToken } from '@angular/core';
/** Public URL only. Same-origin /api is proxied by development server/Nginx. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
