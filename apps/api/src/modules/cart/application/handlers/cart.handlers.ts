import { ApplicationError } from '../../../../shared/domain/application-error';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { Authorization } from '../../../authorization/application/ports/in/authorization';
import type { CatalogAccess } from '../../../catalog/application/ports/in/catalog-access';
import { Cart } from '../../domain/aggregates/cart';
import type { CartRepository, CartWork } from '../ports/out/cart-repository';
import type { CartUseCases } from '../ports/in/cart-use-cases';
import type { CartCheckout } from '../ports/in/cart-checkout';
import type { CartQuery } from '../queries/cart.query';
import type {
  CartCommand,
  PutCartItemCommand,
  RemoveCartItemCommand,
} from '../commands/cart.commands';
export class CartHandlers implements CartUseCases, CartCheckout {
  constructor(
    private readonly repository: CartRepository,
    private readonly catalog: CatalogAccess,
    private readonly auth: Authorization,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
  ) {}
  private async load(tx: CartWork, userId: string) {
    await tx.lock(`user:${userId}`);
    await tx.lock(`cart:${userId}`);
    await this.auth.requirePermission(userId, 'cart.self.manage');
    const existing = await tx.find(userId);
    const cart = existing
      ? Cart.restore(existing)
      : Cart.empty(this.entropy.id(), userId, this.clock.now());
    if (!existing) await tx.save(cart.snapshot());
    return cart;
  }
  private async detail(cart: Cart) {
    return {
      ...cart.snapshot(),
      current: await this.catalog.saleVariants(
        cart.snapshot().items.map((l) => l.variantId),
      ),
    };
  }
  get(q: CartQuery) {
    return this.repository.run(async (tx) =>
      this.detail(await this.load(tx, q.actorId)),
    );
  }
  put(c: PutCartItemCommand) {
    return this.repository.run(async (tx) => {
      const cart = await this.load(tx, c.actorId);
      cart.expect(c.expectedVersion);
      const variant = (await this.catalog.saleVariants([c.variantId]))[0];
      if (!variant)
        throw new ApplicationError(
          'CONFLICT',
          'The variant is not currently available for purchase.',
        );
      if (
        cart.put(
          c.variantId,
          c.quantity,
          variant.organizationId,
          variant.currency,
          this.clock.now(),
        )
      )
        await tx.save(cart.snapshot());
      return this.detail(cart);
    });
  }
  remove(c: RemoveCartItemCommand) {
    return this.repository.run(async (tx) => {
      const cart = await this.load(tx, c.actorId);
      cart.expect(c.expectedVersion);
      if (cart.remove(c.variantId, this.clock.now()))
        await tx.save(cart.snapshot());
      return this.detail(cart);
    });
  }
  clear(c: CartCommand) {
    return this.repository.run(async (tx) => {
      const cart = await this.load(tx, c.actorId);
      cart.expect(c.expectedVersion);
      if (cart.clear(this.clock.now())) await tx.save(cart.snapshot());
      return this.detail(cart);
    });
  }
  read(userId: string) {
    return this.repository.run(async (tx) =>
      (await this.load(tx, userId)).snapshot(),
    );
  }
  consume(userId: string, version: number) {
    return this.repository.run(async (tx) => {
      const cart = await this.load(tx, userId);
      cart.expect(version);
      cart.clear(this.clock.now());
      await tx.save(cart.snapshot());
    });
  }
}
