import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import type {
  AccessTokens,
  Entropy,
  PasswordHasher,
} from '../application/runtime-ports';
import { ApplicationError } from '../domain/application-error';
import type { RuntimeConfig } from './config';
export class CryptoEntropy implements Entropy {
  id() {
    return randomUUID();
  }
  token() {
    return randomBytes(32).toString('base64url');
  }
  digest(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
export class ArgonPasswordHasher implements PasswordHasher {
  hash(password: string) {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }
  verify(hash: string, password: string) {
    return argon2.verify(hash, password);
  }
}
export class JwtAccessTokens implements AccessTokens {
  constructor(private readonly settings: RuntimeConfig) {}
  issue(userId: string, sessionId: string) {
    return jwt.sign({ sid: sessionId }, this.settings.jwtSecret, {
      algorithm: 'HS256',
      subject: userId,
      issuer: 'pettly-api',
      audience: 'pettly-clients',
      expiresIn: this.settings.accessSeconds,
    });
  }
  verify(token: string) {
    try {
      const claims = jwt.verify(token, this.settings.jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'pettly-api',
        audience: 'pettly-clients',
      });
      if (
        typeof claims === 'string' ||
        typeof claims.sub !== 'string' ||
        typeof claims.sid !== 'string' ||
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(claims.sub) ||
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(claims.sid)
      )
        throw new Error('Invalid claims');
      return { userId: claims.sub, sessionId: claims.sid };
    } catch {
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'Authentication is required.',
      );
    }
  }
}
