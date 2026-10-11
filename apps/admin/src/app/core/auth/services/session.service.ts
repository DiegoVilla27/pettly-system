import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../api/api-client';
import { ApiProblem, toApiProblem } from '../../api/api-problem';
import { mapAuthResponse, mapSession } from '../mappers/session.mapper';
import type { AuthSession, Permission, SessionState } from '../models/session';
import { SessionCoordination } from './session-coordination';
@Injectable({ providedIn: 'root' })
export class SessionService implements AuthSession {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly coordination = inject(SessionCoordination);
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<SessionState>({ phase: 'loading' });
  readonly state = this.current.asReadonly();
  readonly identity = computed(() => {
    const s = this.current();
    return s.phase === 'authenticated' ? s.identity : null;
  });
  private readonly working = signal(false);
  readonly busy = this.working.asReadonly();
  private token: { accessToken: string; expiresAt: number } | null = null;
  private readyFlight?: Promise<void>;
  private refreshFlight?: Promise<string>;
  private epoch = 0;
  private closing = false;
  constructor() {
    afterNextRender(() => {
      this.coordination.listen((event) => {
        this.epoch++;
        this.token = null;
        if (event === 'signed-out') {
          this.clear();
          void this.router.navigateByUrl('/acceso');
        } else {
          this.current.set({ phase: 'loading' });
          this.readyFlight = undefined;
          const previous = this.refreshFlight;
          void (previous ?? Promise.resolve())
            .catch(() => undefined)
            .then(() => this.restore());
        }
      });
    });
    const destroy = inject(DestroyRef);
    const resume = () => {
      if (
        this.document.visibilityState === 'visible' &&
        this.identity() &&
        !this.busy()
      )
        void this.restore();
    };
    this.document.addEventListener('visibilitychange', resume);
    destroy.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', resume),
    );
  }
  ensureReady(): Promise<void> {
    return (this.readyFlight ??= this.coordination.hasHint()
      ? this.restore()
      : Promise.resolve(this.clear()));
  }
  async restore(): Promise<void> {
    if (this.closing) return;
    this.working.set(true);
    const epoch = this.epoch;
    try {
      await this.refreshAccess();
    } catch (error) {
      if (epoch !== this.epoch) return;
      const problem = toApiProblem(error);
      if ([400, 401, 403].includes(problem.status)) this.clear();
      else {
        this.token = null;
        this.current.set({ phase: 'unavailable', problem });
      }
    } finally {
      if (epoch === this.epoch) this.working.set(false);
    }
  }
  private async hydrate(bearer: string, epoch: number) {
    const [user, access] = await Promise.all([
      firstValueFrom(
        this.api.request('getCurrentUser', { bearer, sessionManaged: true }),
      ),
      firstValueFrom(
        this.api.request('getCurrentUserAccess', {
          bearer,
          sessionManaged: true,
        }),
      ),
    ]);
    const identity = mapSession(user, access);
    if (epoch !== this.epoch)
      throw new ApiProblem(
        401,
        'STALE_SESSION',
        'La sesión cambió. Vuelve a entrar.',
      );
    this.current.set({ phase: 'authenticated', identity });
    this.coordination.setHint(true);
  }
  async login(email: string, password: string): Promise<void> {
    if (this.busy()) return;
    this.working.set(true);
    const epoch = ++this.epoch;
    try {
      const response = await firstValueFrom(
        this.api.request('login', {
          body: { email: email.trim().toLowerCase(), password, client: 'web' },
          sessionManaged: true,
        }),
      );
      if (epoch !== this.epoch)
        throw new ApiProblem(401, 'STALE_SESSION', 'La sesión cambió.');
      this.token = mapAuthResponse(response);
      this.coordination.setHint(true);
      await this.hydrate(this.token.accessToken, epoch);
      this.coordination.announce('changed');
    } catch (error) {
      if (epoch !== this.epoch) throw toApiProblem(error);
      const problem = toApiProblem(error);
      if (this.token && ![400, 401, 403].includes(problem.status))
        this.current.set({ phase: 'unavailable', problem });
      else this.clear();
      this.token = null;
      throw problem;
    } finally {
      if (epoch === this.epoch) this.working.set(false);
    }
  }
  refreshAccess(): Promise<string> {
    if (this.refreshFlight) return this.refreshFlight;
    const epoch = this.epoch;
    const pending = this.coordination.serialize(async () => {
      if (this.closing || epoch !== this.epoch)
        throw new ApiProblem(401, 'STALE_SESSION', 'La sesión cambió.');
      const response = await firstValueFrom(
        this.api.request('refreshSession', { body: {}, sessionManaged: true }),
      );
      if (epoch !== this.epoch)
        throw new ApiProblem(401, 'STALE_SESSION', 'La sesión cambió.');
      this.token = mapAuthResponse(response);
      await this.hydrate(this.token.accessToken, epoch);
      return this.token.accessToken;
    });
    this.refreshFlight = pending;
    void pending
      .finally(() => {
        if (this.refreshFlight === pending) this.refreshFlight = undefined;
      })
      .catch(() => undefined);
    return pending;
  }
  async accessToken(): Promise<string> {
    if (this.closing)
      throw new ApiProblem(
        401,
        'SESSION_CLOSING',
        'Estamos cerrando tu sesión.',
      );
    if (this.token && this.token.expiresAt > Date.now() + 30000)
      return this.token.accessToken;
    return this.refreshAccess();
  }
  currentToken() {
    return this.token?.accessToken ?? null;
  }
  expire() {
    this.epoch++;
    this.clear();
    this.coordination.announce('signed-out');
    void this.router.navigateByUrl('/acceso', { replaceUrl: true });
  }
  private clear() {
    this.working.set(false);
    this.token = null;
    this.current.set({ phase: 'anonymous' });
    this.coordination.setHint(false);
  }
  async logout(): Promise<void> {
    if (this.busy()) return;
    this.working.set(true);
    try {
      const bearer = this.refreshFlight
        ? await this.refreshFlight
        : await this.accessToken();
      this.closing = true;
      await firstValueFrom(
        this.api.request('logout', { bearer, sessionManaged: true }),
      );
      this.expire();
    } catch (error) {
      const problem = toApiProblem(error);
      if ([400, 401, 403].includes(problem.status)) this.expire();
      else throw problem; // A failed server logout must not claim revocation succeeded.
    } finally {
      this.closing = false;
      this.working.set(false);
    }
  }
  hasPermission(permission: Permission, organizationId?: string): boolean {
    const identity = this.identity();
    if (!identity) return false;
    if (!organizationId) return identity.globalPermissions.includes(permission);
    return identity.organizations.some(
      (o) =>
        o.organizationId === organizationId &&
        o.status === 'active' &&
        o.permissions.includes(permission),
    );
  }
}
