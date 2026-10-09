import { ApplicationError } from '../../../../shared/domain/application-error';
import { administrativeReason } from '../../../../shared/domain/authorization';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { Authorization } from '../../../authorization/application/ports/in/authorization';
import type { OrganizationAccess } from '../../../organizations/application/ports/in/organization-access';
import type { Media } from '../../../media/application/ports/in/media';
import { Category } from '../../domain/aggregates/category';
import {
  Product,
  ProductVariant,
  type ProductState,
  type VariantState,
} from '../../domain/aggregates/product';
import type { ProductPhoto } from '../results/catalog';
import type {
  CatalogRepository,
  CatalogWork,
} from '../ports/out/catalog-repository';
import type { CatalogAccess } from '../ports/in/catalog-access';
import type {
  CategoryCommand,
  CreateProductCommand,
  ProductCommand,
  UpdateProductCommand,
  VariantCommand,
  PhotoCommand,
} from '../commands/catalog.commands';
import type { CatalogQuery, ProductQuery } from '../queries/catalog.queries';
import type { CatalogUseCases } from '../ports/in/catalog-use-cases';
export class CatalogHandlers implements CatalogAccess, CatalogUseCases {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly auth: Authorization,
    private readonly organizations: OrganizationAccess,
    private readonly media: Media,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
  ) {}
  private async load(tx: CatalogWork, id: string) {
    const state = await tx.product(id);
    if (!state)
      throw new ApplicationError(
        'RESOURCE_NOT_FOUND',
        'Product was not found.',
      );
    return Product.restore(state);
  }
  private async locked(tx: CatalogWork, c: ProductCommand, moderation = false) {
    await tx.lock(`user:${c.actorId}`);
    const first = (await this.load(tx, c.productId)).snapshot();
    await tx.lock(`organization:${first.organizationId}`);
    await tx.lock(`product:${c.productId}`);
    const p = await this.load(tx, c.productId);
    if (moderation) {
      await this.auth.requirePermission(
        c.actorId,
        'moderation.publications.review',
      );
      const states = await this.organizations.states([first.organizationId]);
      if (states[0]?.status !== 'active' || states[0].type !== 'business')
        throw new ApplicationError(
          'CONFLICT',
          'An active business is required.',
        );
      if (
        (await this.organizations.membershipsForUser(c.actorId)).some(
          (m) => m.organizationId === first.organizationId,
        )
      )
        throw new ApplicationError(
          'FORBIDDEN',
          'Organization members cannot moderate their products.',
        );
    } else
      await this.auth.requirePermission(
        c.actorId,
        'catalog.manage',
        first.organizationId,
      );
    p.expect(c.expectedVersion);
    return p;
  }
  private audit(
    tx: CatalogWork,
    actorId: string,
    productId: string | null,
    categoryId: string | null,
    action: string,
    reason: string,
    requestId: string,
  ) {
    return tx.audit({
      id: this.entropy.id(),
      actorId,
      productId,
      categoryId,
      action,
      reason: administrativeReason(reason),
      requestId,
      createdAt: this.clock.now(),
    });
  }
  categories(actorId?: string) {
    return this.repository.run(async (tx) => {
      if (actorId)
        await this.auth.requirePermission(actorId, 'platform.settings.manage');
      return tx.categories(!!actorId);
    });
  }
  category(command: CategoryCommand) {
    return this.repository.run(async (tx) => {
      await tx.lock(`user:${command.actorId}`);
      await tx.lock('catalog:categories');
      await this.auth.requirePermission(
        command.actorId,
        'platform.settings.manage',
      );
      let state;
      if (command.id) {
        const old = await tx.category(command.id);
        if (!old)
          throw new ApplicationError(
            'RESOURCE_NOT_FOUND',
            'Category was not found.',
          );
        state = Category.update(
          old,
          command.data,
          command.expectedVersion!,
          this.clock.now(),
        );
      } else {
        if ((await tx.categories(true)).length >= 1000)
          throw new ApplicationError(
            'CONFLICT',
            'The category limit has been reached.',
          );
        state = Category.create(
          this.entropy.id(),
          command.data.name!,
          command.data.slug!,
          command.data.description ?? null,
          this.clock.now(),
        );
      }
      await tx.saveCategory(state);
      await this.audit(
        tx,
        command.actorId,
        null,
        state.id,
        command.id ? 'category.updated' : 'category.created',
        command.reason,
        command.requestId,
      );
      return state;
    });
  }
  create(c: CreateProductCommand) {
    return this.repository.run(async (tx) => {
      await tx.lock(`user:${c.actorId}`);
      await tx.lock(`organization:${c.organizationId}`);
      await this.auth.requirePermission(
        c.actorId,
        'catalog.manage',
        c.organizationId,
      );
      if ((await tx.category(c.profile.categoryId))?.status !== 'active')
        throw new ApplicationError(
          'CONFLICT',
          'An active category is required.',
        );
      const state = Product.create(
        this.entropy.id(),
        c.organizationId,
        c.actorId,
        c.profile,
        c.currency,
        this.clock.now(),
      ).snapshot();
      await tx.saveProduct(state);
      await this.audit(
        tx,
        c.actorId,
        state.id,
        null,
        'product.created',
        c.reason,
        c.requestId,
      );
      return state;
    });
  }
  update(c: UpdateProductCommand) {
    return this.repository.run(async (tx) => {
      const p = await this.locked(tx, c);
      await tx.lock('catalog:categories');
      if (
        (await tx.category(c.profile.categoryId ?? p.snapshot().categoryId))
          ?.status !== 'active'
      )
        throw new ApplicationError(
          'CONFLICT',
          'An active category is required.',
        );
      if (p.update(c.profile, this.clock.now())) {
        await tx.saveProduct(p.snapshot());
        await this.audit(
          tx,
          c.actorId,
          c.productId,
          null,
          'product.updated',
          c.reason,
          c.requestId,
        );
      }
      return p.snapshot();
    });
  }
  private async ready(tx: CatalogWork, p: ProductState) {
    return (
      (await tx.category(p.categoryId))?.status === 'active' &&
      (await tx.variants([p.id])).some((v) => v.status === 'active') &&
      (await tx.photos([p.id])).length > 0
    );
  }
  decision(
    c: ProductCommand,
    kind: 'submit' | 'pause' | 'archive' | 'review',
    approved?: boolean,
  ) {
    return this.repository.run(async (tx) => {
      const p = await this.locked(tx, c, kind === 'review');
      await tx.lock('catalog:categories');
      if (kind === 'submit')
        p.submit(await this.ready(tx, p.snapshot()), this.clock.now());
      else if (kind === 'review') {
        if (approved && !(await this.ready(tx, p.snapshot())))
          throw new ApplicationError(
            'CONFLICT',
            'The product is no longer publishable.',
          );
        p.review(
          c.actorId,
          approved!,
          administrativeReason(c.reason),
          this.clock.now(),
        );
      } else
        p.status(kind === 'pause' ? 'paused' : 'archived', this.clock.now());
      await tx.saveProduct(p.snapshot());
      await this.audit(
        tx,
        c.actorId,
        c.productId,
        null,
        `product.${kind}`,
        c.reason,
        c.requestId,
      );
      return p.snapshot();
    });
  }
  variant(c: VariantCommand, archive = false) {
    return this.repository.run(async (tx) => {
      const p = await this.locked(tx, c);
      p.mutable();
      const variants = await tx.variants([c.productId]);
      let state: VariantState;
      if (c.variantId) {
        const old = variants.find((v) => v.id === c.variantId);
        if (!old)
          throw new ApplicationError(
            'RESOURCE_NOT_FOUND',
            'Variant was not found in this product.',
          );
        if (old.status === 'archived')
          throw new ApplicationError(
            'CONFLICT',
            'Archived variants are terminal.',
          );
        state = archive
          ? { ...old, status: 'archived', updatedAt: this.clock.now() }
          : ProductVariant.update(old, c.profile, this.clock.now());
      } else {
        if (variants.length >= 50)
          throw new ApplicationError(
            'CONFLICT',
            'At most fifty variants per product are allowed.',
          );
        state = ProductVariant.create(
          this.entropy.id(),
          p.snapshot(),
          c.profile as VariantState,
          this.clock.now(),
        );
      }
      p.changed(this.clock.now());
      await tx.saveVariant(state);
      await tx.saveProduct(p.snapshot());
      await this.audit(
        tx,
        c.actorId,
        c.productId,
        null,
        archive
          ? 'variant.archived'
          : c.variantId
            ? 'variant.updated'
            : 'variant.created',
        c.reason,
        c.requestId,
      );
      return { product: p.snapshot(), variant: state };
    });
  }
  upload(c: PhotoCommand) {
    return this.repository.run(async (tx) => {
      const p = await this.locked(tx, c);
      p.mutable();
      const photos = await tx.photos([c.productId]);
      if (photos.length >= 10)
        throw new ApplicationError(
          'CONFLICT',
          'At most ten photos are allowed.',
        );
      const image = await this.media.prepare(c.bytes!, c.mime!);
      const asset = await this.media.store(c.actorId, c.productId, image);
      const photo: ProductPhoto = {
        id: this.entropy.id(),
        productId: c.productId,
        mediaId: asset.id,
        position: Math.max(-1, ...photos.map((x) => x.position)) + 1,
        createdAt: this.clock.now(),
      };
      await tx.attach(photo);
      p.changed(this.clock.now());
      await tx.saveProduct(p.snapshot());
      await this.audit(
        tx,
        c.actorId,
        c.productId,
        null,
        'photo.created',
        c.reason,
        c.requestId,
      );
      return { product: p.snapshot(), photo };
    });
  }
  removePhoto(c: PhotoCommand) {
    return this.repository.run(async (tx) => {
      const p = await this.locked(tx, c);
      p.mutable();
      const photo = (await tx.photos([c.productId])).find(
        (x) => x.mediaId === c.mediaId,
      );
      if (!photo)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Photo was not found.',
        );
      await tx.detach(photo.id);
      await this.media.remove(c.mediaId!, c.productId, this.clock.now());
      p.changed(this.clock.now());
      await tx.saveProduct(p.snapshot());
      await this.audit(
        tx,
        c.actorId,
        c.productId,
        null,
        'photo.removed',
        c.reason,
        c.requestId,
      );
      return p.snapshot();
    });
  }
  private async eligible(tx: CatalogWork, states: ProductState[]) {
    const organizations = await this.organizations.states([
      ...new Set(states.map((p) => p.organizationId)),
    ]);
    const active = new Set(
      organizations
        .filter((o) => o.status === 'active' && o.type === 'business')
        .map((o) => o.id),
    );
    const categories = new Set(
      (
        await tx.categoriesByIds([...new Set(states.map((p) => p.categoryId))])
      ).map((c) => c.id),
    );
    return states.filter(
      (p) =>
        p.status === 'published' &&
        active.has(p.organizationId) &&
        categories.has(p.categoryId),
    );
  }
  private async detail(tx: CatalogWork, p: ProductState, privateRead: boolean) {
    const [variants, photos] = await Promise.all([
      tx.variants([p.id]),
      tx.photos([p.id]),
    ]);
    return {
      product: p,
      variants: variants.filter((v) => privateRead || v.status === 'active'),
      photos,
    };
  }
  get(query: ProductQuery) {
    return this.repository.run(async (tx) => {
      const state = (await this.load(tx, query.id)).snapshot();
      if (query.actorId)
        await this.auth.requirePermission(
          query.actorId,
          'catalog.manage',
          state.organizationId,
        );
      else if (!(await this.eligible(tx, [state])).length)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Public product was not found.',
        );
      return this.detail(tx, state, !!query.actorId);
    });
  }
  list(query: CatalogQuery, actorId?: string) {
    return this.repository.run(async (tx) => {
      if (actorId) {
        if (!query.organizationId)
          throw new ApplicationError(
            'INVALID_INPUT',
            'An organization context is required.',
          );
        await this.auth.requirePermission(
          actorId,
          'catalog.manage',
          query.organizationId,
        );
      }
      const page = await tx.products(query, !actorId);
      const states = actorId ? page.items : await this.eligible(tx, page.items);
      const [variants, photos] = await Promise.all([
        tx.variants(states.map((p) => p.id)),
        tx.photos(states.map((p) => p.id)),
      ]);
      return {
        ...page,
        items: states.map((product) => ({
          product,
          variants: variants.filter(
            (v) =>
              v.productId === product.id && (actorId || v.status === 'active'),
          ),
          photos: photos.filter((p) => p.productId === product.id),
        })),
      };
    });
  }
  moderation(actorId: string, query: CatalogQuery) {
    return this.repository.run(async (tx) => {
      await this.auth.requirePermission(
        actorId,
        'moderation.publications.review',
      );
      return tx.products({ ...query, status: 'pending' }, false);
    });
  }
  photo(query: ProductQuery, mediaId: string) {
    return this.repository.run(async (tx) => {
      const p = (await this.load(tx, query.id)).snapshot();
      await tx.lock(`organization:${p.organizationId}`);
      await tx.lock(`product:${p.id}`);
      const detail = await this.get(query);
      if (!detail.photos.some((x) => x.mediaId === mediaId))
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Photo was not found.',
        );
      return (await this.media.read(mediaId, query.id)).bytes;
    });
  }
  auditList(query: ProductQuery, page: number, limit: number) {
    return this.repository.run(async (tx) => {
      const p = (await this.load(tx, query.id)).snapshot();
      await this.auth.requirePermission(
        query.actorId!,
        'catalog.manage',
        p.organizationId,
      );
      return tx.audits(p.id, page, limit);
    });
  }
  categoryAudit(actorId: string, id: string, page: number, limit: number) {
    return this.repository.run(async (tx) => {
      await this.auth.requirePermission(actorId, 'platform.settings.manage');
      if (!(await tx.category(id)))
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Category was not found.',
        );
      return tx.audits(null, page, limit, id);
    });
  }
  saleVariants(ids: string[]) {
    if (ids.length > 50)
      throw new ApplicationError(
        'INVALID_INPUT',
        'At most fifty sale variants per lookup.',
      );
    return this.repository.run(async (tx) => {
      const variants = await tx.variantIds(ids);
      const products = await tx.productsByIds([
        ...new Set(variants.map((v) => v.productId)),
      ]);
      const eligible = new Map(
        (await this.eligible(tx, products)).map((p) => [p.id, p]),
      );
      return variants
        .filter((v) => v.status === 'active' && eligible.has(v.productId))
        .map((v) => {
          const p = eligible.get(v.productId)!;
          return {
            id: v.id,
            productId: v.productId,
            organizationId: v.organizationId,
            currency: p.currency,
            name: p.name,
            sku: v.sku,
            priceMinor: v.priceMinor,
            attributes: v.attributes,
            productVersion: p.version,
          };
        });
    });
  }
  variants(ids: string[]) {
    if (ids.length > 100)
      throw new ApplicationError(
        'INVALID_INPUT',
        'At most one hundred variants per lookup.',
      );
    return this.repository.run(async (tx) => {
      const variants = await tx.variantIds(ids);
      const products = await tx.productsByIds([
        ...new Set(variants.map((v) => v.productId)),
      ]);
      const eligible = new Set(
        (await this.eligible(tx, products)).map((p) => p.id),
      );
      return variants.map((v) => ({
        id: v.id,
        productId: v.productId,
        organizationId: v.organizationId,
        active:
          v.status === 'active' &&
          products.find((p) => p.id === v.productId)?.status !== 'archived',
        published: v.status === 'active' && eligible.has(v.productId),
      }));
    });
  }
}
