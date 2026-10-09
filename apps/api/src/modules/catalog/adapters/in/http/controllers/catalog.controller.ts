import {
  Controller,
  Inject,
  UseGuards,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  StreamableFile,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import { RatePolicy } from '../../../../../../shared/infrastructure/http/security.guard';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import * as R from '../dtos/requests/catalog.requests';
import * as S from '../dtos/responses/catalog.responses';
import { CatalogHttpMapper as Mapper } from '../mappers/catalog-http.mapper';
import {
  CATALOG_USE_CASES,
  type CatalogUseCases,
} from '../../../../application/ports/in/catalog-use-cases';
import {
  CategoryCommand,
  CreateProductCommand,
  ProductCommand,
  UpdateProductCommand,
  VariantCommand,
  PhotoCommand,
} from '../../../../application/commands/catalog.commands';
import {
  CatalogQuery,
  ProductQuery,
} from '../../../../application/queries/catalog.queries';
function query(d: R.PublicCatalogQueryDto | R.PrivateCatalogQueryDto) {
  return new CatalogQuery(
    d.page,
    d.limit,
    d.search,
    d.categoryId,
    d.organizationId,
    'status' in d ? d.status : undefined,
    d.brand,
    d.minPriceMinor,
    d.maxPriceMinor,
    d.currency,
  );
}
@ApiTags('Catalog')
@DocumentErrors()
@Controller('catalog')
export class PublicCatalogController {
  constructor(
    @Inject(CATALOG_USE_CASES) private readonly catalog: CatalogUseCases,
  ) {}
  @Get('categories')
  @ApiOperation({
    operationId: 'listPublicCategories',
    summary: 'List active product categories',
    description:
      'Public flat taxonomy; inactive/archived categories are excluded. No-store responses reflect current state.',
  })
  @ApiOkResponse({ type: S.CategoriesResponseDto })
  @ZodSerializerDto(S.CategoriesResponseDto)
  async listPublicCategories(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return { items: (await this.catalog.categories()).map(Mapper.category) };
  }
  @Get('products')
  @ApiOperation({
    operationId: 'listPublicProducts',
    summary: 'Search reviewed products from active businesses',
    description:
      'Bounded page/limit, name, category, business, brand and minor-unit price/currency filters. Current organization/category state is checked through public ports. Filtered pages may be short; continue nextPage until null. No eligible total is claimed; stock availability uses Inventory.',
  })
  @ApiOkResponse({ type: S.PublicProductsResponseDto })
  @ZodSerializerDto(S.PublicProductsResponseDto)
  async listPublicProducts(
    @Query() dto: R.PublicCatalogQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    const result = await this.catalog.list(query(dto));
    return {
      items: result.items.map((d) => Mapper.detail(d)),
      page: result.page,
      limit: result.limit,
      nextPage:
        result.page < 10000 && result.page * result.limit < result.total
          ? result.page + 1
          : null,
    };
  }
  @Get('products/:productId')
  @ApiOperation({
    operationId: 'getPublicProduct',
    summary: 'Read a currently available reviewed product',
    description:
      'Inactive business/category or unpublished product returns 404. Prices are minor units, not final checkout totals; shipping/taxes/orders are not implemented. Review identities/reasons are excluded.',
  })
  @ApiOkResponse({ type: S.PublicProductDetailDto })
  @ZodSerializerDto(S.PublicProductDetailDto)
  async getPublicProduct(
    @Param() params: R.ProductParamsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return Mapper.detail(
      await this.catalog.get(new ProductQuery(params.productId)),
    );
  }
  @Get('products/:productId/photos/:mediaId')
  @ApiOperation({
    operationId: 'getPublicProductPhoto',
    summary: 'Read a sanitized public product photo',
    description:
      'Checks current published product, active business/category and exact attachment. Private storage; JPEG without EXIF and no-store.',
  })
  @ApiOkResponse({
    content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } },
  })
  async photo(
    @Param() params: R.ProductPhotoParamsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(
      Buffer.from(
        await this.catalog.photo(
          new ProductQuery(params.productId),
          params.mediaId,
        ),
      ),
      { type: 'image/jpeg' },
    );
  }
}
@ApiTags('Catalog')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('catalog/admin')
export class CatalogController {
  constructor(
    @Inject(CATALOG_USE_CASES) private readonly catalog: CatalogUseCases,
  ) {}
  @Get('categories')
  @ApiOperation({
    operationId: 'listManagedCategories',
    summary: 'List the complete product taxonomy',
    description:
      'Requires super_admin platform.settings.manage. Flat taxonomy bounded to 1000 categories; inactive and archived entries remain for history.',
  })
  @ApiOkResponse({ type: S.CategoriesResponseDto })
  @ZodSerializerDto(S.CategoriesResponseDto)
  async listManagedCategories(@Req() req: AuthenticatedRequest) {
    return {
      items: (await this.catalog.categories(req.principal.userId)).map(
        Mapper.category,
      ),
    };
  }
  @Get('categories/:categoryId/audit')
  @ApiOperation({
    operationId: 'listCategoryAudit',
    summary: 'Read an immutable category administration audit',
    description:
      'Requires global platform.settings.manage (superadmin). Bounded pagination of actor/action/reason/correlation, including archived taxonomy history; business memberships cannot access platform audit.',
  })
  @ApiOkResponse({ type: S.CatalogAuditResponseDto })
  @ZodSerializerDto(S.CatalogAuditResponseDto)
  async categoryAudit(
    @Param() params: R.CategoryParamsDto,
    @Query() dto: R.CatalogPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.catalog.categoryAudit(
      req.principal.userId,
      params.categoryId,
      dto.page,
      dto.limit,
    );
    return {
      ...result,
      items: result.items.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
      })),
    };
  }
  @Post('categories')
  @ApiOperation({
    operationId: 'createProductCategory',
    summary: 'Create a product category',
    description:
      'Superadmin only; globally unique lowercase slug and audited reason. No organization role grants taxonomy administration.',
  })
  @ApiCreatedResponse({ type: S.CategoryResponseDto })
  @ZodSerializerDto(S.CategoryResponseDto)
  async createProductCategory(
    @Body() dto: R.CreateCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.category(
      await this.catalog.category(
        new CategoryCommand(
          req.principal.userId,
          { name: dto.name, slug: dto.slug, description: dto.description },
          dto.reason,
          req.requestId,
        ),
      ),
    );
  }
  @Patch('categories/:categoryId')
  @ApiOperation({
    operationId: 'updateProductCategory',
    summary: 'Update or disable a product category',
    description:
      'Superadmin only, optimistic version and audit. Inactive categories immediately hide associated products; archived state is terminal and references/history remain.',
  })
  @ApiOkResponse({ type: S.CategoryResponseDto })
  @ZodSerializerDto(S.CategoryResponseDto)
  async updateProductCategory(
    @Param() params: R.CategoryParamsDto,
    @Body() dto: R.UpdateCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.category(
      await this.catalog.category(
        new CategoryCommand(
          req.principal.userId,
          dto.profile,
          dto.reason,
          req.requestId,
          params.categoryId,
          dto.expectedVersion,
        ),
      ),
    );
  }
  @Post('products')
  @ApiOperation({
    operationId: 'createCatalogProduct',
    summary: 'Create a business product draft',
    description:
      'Requires catalog.manage in the explicit active business. Currency is immutable COP/USD/EUR; category must be active. No automatic publication or initial stock.',
  })
  @ApiCreatedResponse({ type: S.ProductResponseDto })
  @ZodSerializerDto(S.ProductResponseDto)
  async createCatalogProduct(
    @Body() dto: R.CreateProductDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.product(
      await this.catalog.create(
        new CreateProductCommand(
          req.principal.userId,
          dto.organizationId,
          dto.profile,
          dto.currency,
          dto.reason,
          req.requestId,
        ),
      ),
    );
  }
  @Get('products')
  @ApiOperation({
    operationId: 'listManagedProducts',
    summary: 'Search products in your business',
    description:
      'Requires catalog.manage in an active business including superadmin. Explicit organization UUID, bounded pagination and status/search filters. No cross-company reads.',
  })
  @ApiOkResponse({ type: S.PrivateProductsResponseDto })
  @ZodSerializerDto(S.PrivateProductsResponseDto)
  async listManagedProducts(
    @Query() dto: R.PrivateCatalogQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.catalog.list(query(dto), req.principal.userId);
    return {
      ...result,
      items: result.items.map((d) => Mapper.detail(d, true)),
    };
  }
  @Get('products/:productId')
  @ApiOperation({
    operationId: 'getManagedProduct',
    summary: 'Read a managed product with variants and photos',
    description:
      'Requires current catalog.manage in the owning active business. Includes private lifecycle/reviewer metadata and archived variants.',
  })
  @ApiOkResponse({ type: S.PrivateProductDetailDto })
  @ZodSerializerDto(S.PrivateProductDetailDto)
  async getManagedProduct(
    @Param() params: R.ProductParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.detail(
      await this.catalog.get(
        new ProductQuery(params.productId, req.principal.userId),
      ),
      true,
    );
  }
  @Patch('products/:productId')
  @ApiOperation({
    operationId: 'updateCatalogProduct',
    summary: 'Update a product and request renewed review',
    description:
      'Requires owning business permission and expectedVersion. Real changes remove public visibility; pending/archived products cannot be edited. UUID ownership/currency/status cannot be injected.',
  })
  @ApiOkResponse({ type: S.ProductResponseDto })
  @ZodSerializerDto(S.ProductResponseDto)
  async updateCatalogProduct(
    @Param() params: R.ProductParamsDto,
    @Body() dto: R.UpdateProductDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.product(
      await this.catalog.update(
        new UpdateProductCommand(
          req.principal.userId,
          params.productId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
          dto.profile,
        ),
      ),
    );
  }
  @Post('products/:productId/submit')
  @ApiOperation({
    operationId: 'submitCatalogProduct',
    summary: 'Submit a product for moderation',
    description:
      'Requires owning business permission, active category, at least one active variant and one sanitized photo. Draft/rejected/paused to pending. Optimistic version and audit.',
  })
  @ApiCreatedResponse({ type: S.ProductResponseDto })
  @ZodSerializerDto(S.ProductResponseDto)
  async submitCatalogProduct(
    @Param() params: R.ProductParamsDto,
    @Body() dto: R.ProductDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.product(
      await this.catalog.decision(
        new ProductCommand(
          req.principal.userId,
          params.productId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
        ),
        'submit',
      ),
    );
  }
  @Post('products/:productId/pause')
  @ApiOperation({
    operationId: 'pauseCatalogProduct',
    summary: 'Pause a published product',
    description:
      'Requires owning business permission and current published state. Immediately removes public visibility; resume requires submission and moderation.',
  })
  @ApiCreatedResponse({ type: S.ProductResponseDto })
  @ZodSerializerDto(S.ProductResponseDto)
  async pauseCatalogProduct(
    @Param() params: R.ProductParamsDto,
    @Body() dto: R.ProductDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.product(
      await this.catalog.decision(
        new ProductCommand(
          req.principal.userId,
          params.productId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
        ),
        'pause',
      ),
    );
  }
  @Delete('products/:productId')
  @ApiOperation({
    operationId: 'archiveCatalogProduct',
    summary: 'Archive a product permanently',
    description:
      'Requires owning active business permission, expectedVersion and reason. Terminal archive preserves variants, inventory, holds and audit history; active holds can be released or expire.',
  })
  @ApiOkResponse({ type: S.ProductResponseDto })
  @ZodSerializerDto(S.ProductResponseDto)
  async archiveCatalogProduct(
    @Param() params: R.ProductParamsDto,
    @Body() dto: R.ProductDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.product(
      await this.catalog.decision(
        new ProductCommand(
          req.principal.userId,
          params.productId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
        ),
        'archive',
      ),
    );
  }
  @Post('products/:productId/review')
  @ApiOperation({
    operationId: 'reviewCatalogProduct',
    summary: 'Review a submitted product',
    description:
      'Requires global moderator or super_admin outside the owning organization, active business, pending status and expectedVersion. Creator/members cannot self-review. Approved products become public only while eligibility remains current.',
  })
  @ApiCreatedResponse({ type: S.ProductResponseDto })
  @ZodSerializerDto(S.ProductResponseDto)
  async reviewCatalogProduct(
    @Param() params: R.ProductParamsDto,
    @Body() dto: R.ProductReviewDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.product(
      await this.catalog.decision(
        new ProductCommand(
          req.principal.userId,
          params.productId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
        ),
        'review',
        dto.approved,
      ),
    );
  }
  @Get('moderation/products')
  @ApiOperation({
    operationId: 'listProductModerationQueue',
    summary: 'List products awaiting moderation',
    description:
      'Requires global moderator/super_admin. Bounded pagination; pending product metadata only, without private organization profile or stock balances. Current eligibility is rechecked at review.',
  })
  @ApiOkResponse({ type: S.ModerationProductsResponseDto })
  @ZodSerializerDto(S.ModerationProductsResponseDto)
  async listProductModerationQueue(
    @Query() dto: R.CatalogPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.catalog.moderation(
      req.principal.userId,
      new CatalogQuery(dto.page, dto.limit),
    );
    return { ...result, items: result.items.map(Mapper.product) };
  }
  @Post('products/:productId/variants')
  @ApiOperation({
    operationId: 'createProductVariant',
    summary: 'Create a product variant',
    description:
      'Requires owning catalog.manage; SKU normalized uppercase and unique within company including archived entries. Maximum fifty variants per product, ten bounded attributes and integer minor-unit prices. Variant changes withdraw publication and require renewed review; stock remains owned by Inventory.',
  })
  @ApiCreatedResponse({ type: S.VariantChangeResponseDto })
  @ZodSerializerDto(S.VariantChangeResponseDto)
  async createProductVariant(
    @Param() params: R.ProductParamsDto,
    @Body() dto: R.CreateVariantDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.catalog.variant(
      new VariantCommand(
        req.principal.userId,
        params.productId,
        dto.reason,
        req.requestId,
        dto.expectedVersion,
        dto.profile,
        undefined,
      ),
      false,
    );
    return {
      product: Mapper.product(result.product),
      variant: Mapper.variant(result.variant),
    };
  }
  @Patch('products/:productId/variants/:variantId')
  @ApiOperation({
    operationId: 'updateProductVariant',
    summary: 'Update an existing product variant',
    description:
      'Requires owning catalog.manage; SKU normalized uppercase and unique within company including archived entries. Maximum fifty variants per product, ten bounded attributes and integer minor-unit prices. Variant changes withdraw publication and require renewed review; stock remains owned by Inventory.',
  })
  @ApiOkResponse({ type: S.VariantChangeResponseDto })
  @ZodSerializerDto(S.VariantChangeResponseDto)
  async updateProductVariant(
    @Param() params: R.VariantParamsDto,
    @Body() dto: R.UpdateVariantDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.catalog.variant(
      new VariantCommand(
        req.principal.userId,
        params.productId,
        dto.reason,
        req.requestId,
        dto.expectedVersion,
        dto.profile,
        params.variantId,
      ),
      false,
    );
    return {
      product: Mapper.product(result.product),
      variant: Mapper.variant(result.variant),
    };
  }
  @Delete('products/:productId/variants/:variantId')
  @ApiOperation({
    operationId: 'archiveProductVariant',
    summary: 'Archive a product variant permanently',
    description:
      'Requires owning catalog.manage; SKU normalized uppercase and unique within company including archived entries. Maximum fifty variants per product, ten bounded attributes and integer minor-unit prices. Variant changes withdraw publication and require renewed review; stock remains owned by Inventory.',
  })
  @ApiOkResponse({ type: S.VariantChangeResponseDto })
  @ZodSerializerDto(S.VariantChangeResponseDto)
  async archiveProductVariant(
    @Param() params: R.VariantParamsDto,
    @Body() dto: R.ProductDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.catalog.variant(
      new VariantCommand(
        req.principal.userId,
        params.productId,
        dto.reason,
        req.requestId,
        dto.expectedVersion,
        {},
        params.variantId,
      ),
      true,
    );
    return {
      product: Mapper.product(result.product),
      variant: Mapper.variant(result.variant),
    };
  }
  @Post('products/:productId/photos')
  @RatePolicy(20, 60)
  @ApiOperation({
    operationId: 'uploadProductPhoto',
    summary: 'Upload a sanitized product photo',
    description:
      'Owning catalog.manage, expected product version and reason. One JPEG/PNG/WebP up to 5 MiB, at most ten photos. Metadata stripped; output bounded JPEG. Bytes, attachment, product version and audit commit atomically; product returns to draft.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'reason', 'expectedVersion'],
      additionalProperties: false,
      properties: {
        file: { type: 'string', format: 'binary' },
        reason: { type: 'string', minLength: 10, maxLength: 500 },
        expectedVersion: { type: 'integer', minimum: 1 },
      },
    },
  })
  @ApiResponse({ status: 413, description: 'Uploaded file exceeds five MiB.' })
  @ApiCreatedResponse({ type: S.PhotoChangeResponseDto })
  @ZodSerializerDto(S.PhotoChangeResponseDto)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2 },
    }),
  )
  async upload(
    @Param() params: R.ProductParamsDto,
    @Body() dto: R.ProductPhotoUploadDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException('One photo file is required.');
    const result = await this.catalog.upload(
      new PhotoCommand(
        req.principal.userId,
        params.productId,
        dto.reason,
        req.requestId,
        dto.expectedVersion,
        file.buffer,
        file.mimetype,
      ),
    );
    return {
      product: Mapper.product(result.product),
      photo: Mapper.photo(result.photo),
    };
  }
  @Get('products/:productId/photos/:mediaId')
  @ApiOperation({
    operationId: 'getManagedProductPhoto',
    summary: 'Read an authorized private product photo',
    description:
      'Owning catalog.manage and exact product attachment required. Sanitized JPEG with no-store; original filenames/storage paths are never exposed.',
  })
  @ApiOkResponse({
    content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } },
  })
  async photo(
    @Param() params: R.ProductPhotoParamsDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(
      Buffer.from(
        await this.catalog.photo(
          new ProductQuery(params.productId, req.principal.userId),
          params.mediaId,
        ),
      ),
      { type: 'image/jpeg' },
    );
  }
  @Delete('products/:productId/photos/:mediaId')
  @ApiOperation({
    operationId: 'removeProductPhoto',
    summary: 'Detach and purge a product photo',
    description:
      'Owning catalog.manage, reason and expectedVersion. Attachment/bytes/version/audit are transactional; real changes withdraw publication. Pending/archived products cannot be edited.',
  })
  @ApiOkResponse({ type: S.ProductResponseDto })
  @ZodSerializerDto(S.ProductResponseDto)
  async removeProductPhoto(
    @Param() params: R.ProductPhotoParamsDto,
    @Body() dto: R.ProductDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.product(
      await this.catalog.removePhoto(
        new PhotoCommand(
          req.principal.userId,
          params.productId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
          undefined,
          undefined,
          params.mediaId,
        ),
      ),
    );
  }
  @Get('products/:productId/audit')
  @ApiOperation({
    operationId: 'listProductAudit',
    summary: 'Read the immutable product audit trail',
    description:
      'Owning catalog.manage and bounded pagination. Audit events contain actor UUID, action, reason and correlation; stock movements have their own Inventory endpoint.',
  })
  @ApiOkResponse({ type: S.CatalogAuditResponseDto })
  @ZodSerializerDto(S.CatalogAuditResponseDto)
  async listProductAudit(
    @Param() params: R.ProductParamsDto,
    @Query() dto: R.CatalogPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.catalog.auditList(
      new ProductQuery(params.productId, req.principal.userId),
      dto.page,
      dto.limit,
    );
    return {
      ...result,
      items: result.items.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
      })),
    };
  }
}
