import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SessionService } from './session.service';
import { SessionCoordination } from './session-coordination';
const id = '9d9dc708-d471-44d8-ab8a-463c04721baf';
const response = {
  accessToken: 'test-memory-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  sessionId: id,
};
const user = {
  id,
  name: 'Ana',
  lastName: 'Villa',
  email: 'ana@example.com',
  globalRole: 'super_admin',
  status: 'active',
  emailVerifiedAt: '2026-10-09T10:00:00.000Z',
};
const access = {
  userId: id,
  globalRole: 'super_admin',
  globalPermissions: ['users.status.update'],
  organizations: [],
};
describe('Session lifecycle', () => {
  let service: SessionService, http: HttpTestingController;
  const coordination = {
    hasHint: () => true,
    setHint: vi.fn(),
    serialize: <T>(task: () => Promise<T>) => task(),
    listen: vi.fn(),
    announce: vi.fn(),
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: { navigateByUrl: vi.fn().mockResolvedValue(true) },
        },
        { provide: SessionCoordination, useValue: coordination },
      ],
    });
    service = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function hydrate() {
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne('/api/users/me').flush(user);
    http.expectOne('/api/authorization/me').flush(access);
  }
  it('serializes concurrent refreshes and uses browser cookies without exposing a refresh token', async () => {
    const first = service.refreshAccess(),
      second = service.refreshAccess();
    expect(first).toBe(second);
    const req = http.expectOne('/api/auth/refresh');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-CSRF-Protection')).toBe('1');
    expect(req.request.body).toEqual({});
    req.flush(response);
    await hydrate();
    await Promise.all([first, second]);
    expect(service.identity()?.fullName).toBe('Ana Villa');
    expect(service.hasPermission('users.status.update')).toBe(true);
    expect(service.hasPermission('users.status.update', id)).toBe(false);
  });
  it('keeps a valid session when server logout fails', async () => {
    const login = service.login('ANA@example.com', ' password ');
    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({
      email: 'ana@example.com',
      password: ' password ',
      client: 'web',
    });
    req.flush(response);
    await hydrate();
    await login;
    const logout = service.logout();
    await Promise.resolve();
    await Promise.resolve();
    http
      .expectOne('/api/auth/logout')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await expect(logout).rejects.toMatchObject({ status: 503 });
    expect(service.state().phase).toBe('authenticated');
  });
  it('rejects a mismatched authorization identity', async () => {
    const login = service.login('ana@example.com', 'password');
    const result = expect(login).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    http.expectOne('/api/auth/login').flush(response);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne('/api/users/me').flush(user);
    http
      .expectOne('/api/authorization/me')
      .flush({ ...access, userId: '6ee2a5af-85e0-4109-b778-1d2eb73aad1c' });
    await result;
    expect(service.identity()).toBeNull();
  });
  it('does not restore invalidated in-flight credentials', async () => {
    const restore = service.restore();
    service.expire();
    http.expectOne('/api/auth/refresh').flush(response);
    await restore;
    expect(service.state().phase).toBe('anonymous');
    expect(service.currentToken()).toBeNull();
  });
  it('does not clear a newer login when an old refresh finishes with an error', async () => {
    const oldRestore = service.restore();
    const oldRefresh = http.expectOne('/api/auth/refresh');
    service.expire();
    const login = service.login('ana@example.com', 'password');
    http.expectOne('/api/auth/login').flush(response);
    await hydrate();
    await login;
    oldRefresh.flush(
      { code: 'INVALID_TOKEN' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await oldRestore;
    expect(service.state().phase).toBe('authenticated');
    expect(service.identity()?.fullName).toBe('Ana Villa');
  });
  it('never replaces a newer token with a late login response', async () => {
    const oldLogin = service.login('ana@example.com', 'password');
    const rejected = expect(oldLogin).rejects.toMatchObject({
      code: 'STALE_SESSION',
    });
    const oldRequest = http.expectOne('/api/auth/login');
    service.expire();
    const login = service.login('ana@example.com', 'password');
    http.expectOne('/api/auth/login').flush(response);
    await hydrate();
    await login;
    oldRequest.flush({ ...response, accessToken: 'older-token' });
    await rejected;
    expect(service.currentToken()).toBe(response.accessToken);
    expect(service.state().phase).toBe('authenticated');
  });
});
