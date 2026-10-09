import {
  Controller,
  Inject,
  UseGuards,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import type { Response } from 'express';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import * as R from '../dtos/requests/inventory.requests';
import * as S from '../dtos/responses/inventory.responses';
import { InventoryHttpMapper as Mapper } from '../mappers/inventory-http.mapper';
import {
  INVENTORY_USE_CASES,
  type InventoryUseCases,
} from '../../../../application/ports/in/inventory-use-cases';
import {
  StockCommand,
  HoldCommand,
  HoldDecisionCommand,
} from '../../../../application/commands/inventory.commands';
import { StockQuery } from '../../../../application/queries/inventory.queries';
@ApiTags('Inventory')
@DocumentErrors()
@Controller('inventory')
export class PublicInventoryController {
  constructor(
    @Inject(INVENTORY_USE_CASES) private readonly inventory: InventoryUseCases,
  ) {}
  @Get('availability')
  @ApiOperation({
    operationId: 'getPublicInventoryAvailability',
    summary: 'Read current available quantities',
    description:
      'At most fifty comma-separated variant UUIDs; only currently published active business/category/product variants are returned. Available = physical stock minus unexpired holds. This read is advisory; no-store, no reservation guarantee and no private stock ledger.',
  })
  @ApiOkResponse({ type: S.AvailabilityResponseDto })
  @ZodSerializerDto(S.AvailabilityResponseDto)
  async getPublicInventoryAvailability(
    @Query() dto: R.AvailabilityQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return { items: await this.inventory.availability(dto.variantIds) };
  }
}
@ApiTags('Inventory')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    @Inject(INVENTORY_USE_CASES) private readonly inventory: InventoryUseCases,
  ) {}
  @Get('variants/:variantId')
  @ApiOperation({
    operationId: 'getManagedStock',
    summary: 'Read a variant stock balance',
    description:
      'Requires inventory.manage in owning active business. Physical/reserved/available quantities and version; expired reservations are released transactionally before read. New variants have zero stock at version one.',
  })
  @ApiOkResponse({ type: S.StockResponseDto })
  @ZodSerializerDto(S.StockResponseDto)
  async getManagedStock(
    @Param() params: R.StockParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.stock(
      await this.inventory.get(
        new StockQuery(req.principal.userId, params.variantId),
      ),
    );
  }
  @Post('variants/:variantId/movements')
  @ApiOperation({
    operationId: 'recordInventoryMovement',
    summary: 'Receive, issue or adjust physical stock',
    description:
      'Requires owning inventory.manage, reason, expectedVersion and durable idempotency UUID. Receipt/issue positive quantity, adjustment signed delta. Reserved stock cannot be issued; balances remain nonnegative. Movement audit failure rolls back stock. Identical retry has no duplicate effects.',
  })
  @ApiCreatedResponse({ type: S.MovementChangeResponseDto })
  @ZodSerializerDto(S.MovementChangeResponseDto)
  async recordInventoryMovement(
    @Param() params: R.StockParamsDto,
    @Body() dto: R.StockMovementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.inventory.change(
      new StockCommand(
        req.principal.userId,
        params.variantId,
        dto.kind,
        dto.quantity,
        dto.expectedVersion,
        dto.idempotencyKey,
        dto.reason,
        req.requestId,
      ),
    );
    return {
      stock: Mapper.stock(result.stock),
      movement: Mapper.movement(result.movement),
    };
  }
  @Get('variants/:variantId/movements')
  @ApiOperation({
    operationId: 'listInventoryMovements',
    summary: 'Read the immutable stock ledger',
    description:
      'Requires owning inventory.manage; bounded page/limit. Includes receipts, issues, signed adjustments, reservations, release, consumption and system expiry with resulting balances and correlation.',
  })
  @ApiOkResponse({ type: S.MovementsResponseDto })
  @ZodSerializerDto(S.MovementsResponseDto)
  async listInventoryMovements(
    @Param() params: R.StockParamsDto,
    @Query() dto: R.InventoryPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.inventory.movements(
      new StockQuery(
        req.principal.userId,
        params.variantId,
        dto.page,
        dto.limit,
      ),
    );
    return { ...result, items: result.items.map(Mapper.movement) };
  }
  @Post('variants/:variantId/holds')
  @ApiOperation({
    operationId: 'createInventoryHold',
    summary: 'Reserve currently available variant units',
    description:
      'Business operation requires owning inventory.manage and currently published eligible variant. Persisted deadline within thirty minutes, reference UUID, reason, expectedVersion and idempotency UUID. Maximum 1000 active holds per variant. This is not a customer checkout or an implemented order/payment.',
  })
  @ApiCreatedResponse({ type: S.HoldChangeResponseDto })
  @ZodSerializerDto(S.HoldChangeResponseDto)
  async createInventoryHold(
    @Param() params: R.StockParamsDto,
    @Body() dto: R.CreateHoldDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.inventory.reserve(
      new HoldCommand(
        req.principal.userId,
        params.variantId,
        dto.quantity,
        new Date(dto.expiresAt),
        dto.referenceId,
        dto.expectedVersion,
        dto.idempotencyKey,
        dto.reason,
        req.requestId,
      ),
    );
    return {
      stock: Mapper.stock(result.stock),
      hold: Mapper.hold(result.hold),
    };
  }
  @Get('holds/:holdId')
  @ApiOperation({
    operationId: 'getManagedInventoryHold',
    summary: 'Read a business reservation',
    description:
      'Owning active-business inventory permission. Expired holds are released before reading; customers and other businesses cannot inspect internal references.',
  })
  @ApiOkResponse({ type: S.HoldResponseDto })
  @ZodSerializerDto(S.HoldResponseDto)
  async getManagedInventoryHold(
    @Param() params: R.HoldParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.hold(
      await this.inventory.hold(req.principal.userId, params.holdId),
    );
  }
  @Post('holds/:holdId/release')
  @ApiOperation({
    operationId: 'releaseInventoryHold',
    summary: 'Release a stock reservation',
    description:
      'Owning inventory.manage, expected stock version and idempotency UUID. Release frees reserved units even after product archival; consume requires an unexpired active hold and published eligible variant and reduces physical and reserved stock together. Terminal holds cannot be processed twice. This operation does not record payment or create an order.',
  })
  @ApiCreatedResponse({ type: S.HoldChangeResponseDto })
  @ZodSerializerDto(S.HoldChangeResponseDto)
  async releaseInventoryHold(
    @Param() params: R.HoldParamsDto,
    @Body() dto: R.HoldDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.inventory.decide(
      new HoldDecisionCommand(
        req.principal.userId,
        params.holdId,
        'release',
        dto.expectedVersion,
        dto.idempotencyKey,
        dto.reason,
        req.requestId,
      ),
    );
    return {
      stock: Mapper.stock(result.stock),
      hold: Mapper.hold(result.hold),
    };
  }
  @Post('holds/:holdId/consume')
  @ApiOperation({
    operationId: 'consumeInventoryHold',
    summary: 'Consume a stock reservation',
    description:
      'Owning inventory.manage, expected stock version and idempotency UUID. Release frees reserved units even after product archival; consume requires an unexpired active hold and published eligible variant and reduces physical and reserved stock together. Terminal holds cannot be processed twice. This operation does not record payment or create an order.',
  })
  @ApiCreatedResponse({ type: S.HoldChangeResponseDto })
  @ZodSerializerDto(S.HoldChangeResponseDto)
  async consumeInventoryHold(
    @Param() params: R.HoldParamsDto,
    @Body() dto: R.HoldDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.inventory.decide(
      new HoldDecisionCommand(
        req.principal.userId,
        params.holdId,
        'consume',
        dto.expectedVersion,
        dto.idempotencyKey,
        dto.reason,
        req.requestId,
      ),
    );
    return {
      stock: Mapper.stock(result.stock),
      hold: Mapper.hold(result.hold),
    };
  }
}
