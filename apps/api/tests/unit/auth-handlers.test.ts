import test from 'node:test';
import assert from 'node:assert/strict';
import { RefreshHandler } from '../../src/modules/auth/application/handlers/refresh.handler';
import { RegisterHandler } from '../../src/modules/auth/application/handlers/register.handler';
import {
  RefreshCommand,
  RegisterCommand,
} from '../../src/modules/auth/application/commands/auth.commands';
import type { HandlerDependencies } from '../../src/modules/auth/application/handlers/handler-dependencies';
import type { AuthWork } from '../../src/modules/auth/application/ports/out/auth-persistence';
const now = new Date();
function dependencies(work: Partial<AuthWork>): HandlerDependencies {
  return {
    uow: { run: (fn) => fn(work as AuthWork) },
    clock: { now: () => now },
    entropy: {
      id: () => 'uuid',
      token: () => 'opaque',
      digest: (s) => `hash:${s}`,
    },
    passwords: { hash: async () => 'hash', verify: async () => true },
    access: {
      issue: () => 'jwt',
      verify: () => ({ userId: 'uid', sessionId: 'sid' }),
    },
    policy: {
      accessSeconds: 900,
      refreshSeconds: 2592000,
      verificationSeconds: 86400,
      resetSeconds: 1800,
    },
    dummyPasswordHash: 'dummy',
  };
}
test('refresh reuse commits revocation before returning an error', async () => {
  let committed = false,
    revoked = false;
  const deps = dependencies({
    lock: async () => undefined,
    auth: {
      refreshToken: async () => ({
        session: {
          id: 'sid',
          userId: 'uid',
          createdAt: now,
          expiresAt: new Date(now.getTime() + 60000),
          revokedAt: null,
        },
        consumedAt: now,
      }),
      revokeSession: async () => {
        revoked = true;
      },
    } as AuthWork['auth'],
  });
  deps.uow = {
    run: async (fn) => {
      const result = await fn({
        lock: async () => undefined,
        auth: {
          refreshToken: async () => ({
            session: {
              id: 'sid',
              userId: 'uid',
              createdAt: now,
              expiresAt: new Date(now.getTime() + 60000),
              revokedAt: null,
            },
            consumedAt: now,
          }),
          revokeSession: async () => {
            revoked = true;
          },
        },
      } as AuthWork);
      committed = true;
      return result;
    },
  };
  await assert.rejects(
    new RefreshHandler(deps).execute(new RefreshCommand('old-token')),
  );
  assert.ok(revoked && committed);
});
test('registration writes identity, credential and outbox in the same work unit', async () => {
  const events: string[] = [];
  const deps = dependencies({
    lock: async () => undefined,
    users: {
      findByEmail: async () => null,
      create: async () => {
        events.push('user');
        return { id: 'uid', email: 'alex@example.com' };
      },
    } as AuthWork['users'],
    auth: {
      savePassword: async () => {
        events.push('credential');
      },
      replaceActionToken: async () => {
        events.push('token');
      },
    } as AuthWork['auth'],
    enqueueEmail: async () => {
      events.push('outbox');
    },
  });
  await new RegisterHandler(deps).execute(
    new RegisterCommand(
      'alex@example.com',
      { name: 'Alex', lastName: 'Rivera' },
      'A sufficiently long passphrase',
    ),
  );
  assert.deepEqual(events, ['user', 'credential', 'token', 'outbox']);
});
