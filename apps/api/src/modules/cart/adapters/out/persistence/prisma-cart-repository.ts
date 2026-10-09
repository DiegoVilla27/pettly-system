import { Injectable } from '@nestjs/common';
import { Database } from '../../../../../shared/infrastructure/database';
import type {
  CartRepository,
  CartWork,
} from '../../../application/ports/out/cart-repository';
import { CartPersistenceMapper as Mapper } from './cart.mapper';
@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly db: Database) {}
  run<T>(work: (tx: CartWork) => Promise<T>) {
    return this.db.transaction(() =>
      work({
        lock: (key) => this.db.lock(key),
        find: async (userId) => {
          const r = await this.db.client.cart.findUnique({ where: { userId } });
          return r ? Mapper.from(r) : null;
        },
        save: async (s) => {
          const data = Mapper.to(s);
          await this.db.client.cart.upsert({
            where: { userId: s.userId },
            create: data,
            update: data,
          });
        },
      }),
    );
  }
}
