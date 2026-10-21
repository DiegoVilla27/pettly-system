import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ApiClient } from './api-client';
describe('Typed API path and query transport', () => {
  it('encodes path segments and sends independently encoded query parameters', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const client = TestBed.inject(ApiClient);
    const http = TestBed.inject(HttpTestingController);
    client
      .request('getUserAsAdministrator', {
        path: { userId: 'an/id?role=super_admin' },
      })
      .subscribe();
    const detail = http.expectOne('/api/users/an%2Fid%3Frole%3Dsuper_admin');
    expect(detail.request.withCredentials).toBe(true);
    detail.flush({});
    client
      .request('listUsers', {
        query: { page: 2, limit: 10, search: 'Ana & Carlos', role: undefined },
      })
      .subscribe();
    const list = http.expectOne((request) => request.url === '/api/users');
    expect(list.request.params.get('search')).toBe('Ana & Carlos');
    expect(list.request.params.get('page')).toBe('2');
    expect(list.request.params.has('role')).toBe(false);
    list.flush({});
    http.verify();
  });
  it('uses generated multipart paths, CSRF and credentials without forcing a JSON content type', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const client = TestBed.inject(ApiClient),
      http = TestBed.inject(HttpTestingController);
    const file = new File(['image'], 'source.png', { type: 'image/png' });
    client
      .upload(
        'uploadAnimalPhoto',
        { animalId: 'animal/id' },
        { file, reason: 'Shelter photograph verified', expectedVersion: 3 },
      )
      .subscribe();
    const r = http.expectOne('/api/animals/animal%2Fid/photos');
    expect(r.request.body).toBeInstanceOf(FormData);
    expect(r.request.body.get('file')).toBeInstanceOf(Blob);
    expect(r.request.body.get('expectedVersion')).toBe('3');
    expect(r.request.headers.has('Content-Type')).toBe(false);
    expect(r.request.headers.get('X-CSRF-Protection')).toBe('1');
    expect(r.request.withCredentials).toBe(true);
    r.flush({});
    http.verify();
  });
});
