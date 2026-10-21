import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session.service';
describe('Authenticated transport', () => {
  let http: HttpClient, requests: HttpTestingController;
  const session = {
    accessToken: vi.fn(),
    currentToken: vi.fn(),
    refreshAccess: vi.fn(),
    expire: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    session.accessToken.mockResolvedValue('old-memory-token');
    session.currentToken.mockReturnValue('old-memory-token');
    session.refreshAccess.mockResolvedValue('rotated-memory-token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: session },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify());
  it('never leaks credentials to another URL', async () => {
    const pending = firstValueFrom(
      http.get('https://outside.example.com/api/users/me'),
    );
    const req = requests.expectOne('https://outside.example.com/api/users/me');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
    await pending;
    expect(session.accessToken).not.toHaveBeenCalled();
  });
  it('retries a 401 once after cookie rotation', async () => {
    const pending = firstValueFrom(http.get('/api/users/me'));
    await Promise.resolve();
    const first = requests.expectOne('/api/users/me');
    expect(first.request.headers.get('Authorization')).toBe(
      'Bearer old-memory-token',
    );
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();
    await Promise.resolve();
    const retried = requests.expectOne('/api/users/me');
    expect(retried.request.headers.get('Authorization')).toBe(
      'Bearer rotated-memory-token',
    );
    expect(retried.request.withCredentials).toBe(true);
    retried.flush({ id: 'test-user' });
    await pending;
    expect(session.refreshAccess).toHaveBeenCalledTimes(1);
  });
  it('does not repeat a mutation on service failure or expose raw server messages', async () => {
    const pending = firstValueFrom(
      http.patch('/api/users/me', { name: 'Ana' }),
    );
    const rejected = expect(pending).rejects.toMatchObject({
      status: 503,
      message:
        'El servicio no está disponible temporalmente. Inténtalo más tarde.',
    });
    await Promise.resolve();
    requests
      .expectOne('/api/users/me')
      .flush(
        { message: 'private SQL connection details' },
        { status: 503, statusText: 'Unavailable' },
      );
    await rejected;
    expect(session.refreshAccess).not.toHaveBeenCalled();
    expect(session.expire).not.toHaveBeenCalled();
  });
});
