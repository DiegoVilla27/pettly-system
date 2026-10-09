import {
  Controller,
  Inject,
  UseGuards,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import * as R from '../dtos/requests/orders.requests';
import * as S from '../dtos/responses/orders.responses';
import { OrdersHttpMapper as M } from '../mappers/orders-http.mapper';
import {
  ORDERS_USE_CASES,
  type OrdersUseCases,
} from '../../../../application/ports/in/orders-use-cases';
import {
  PolicyCommand,
  QuoteCommand,
  CreateOrderCommand,
  OrderDecisionCommand,
} from '../../../../application/commands/order.commands';
import { OrdersQuery } from '../../../../application/queries/order.queries';
@ApiTags('Orders')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller()
export class OrdersController {
  constructor(
    @Inject(ORDERS_USE_CASES) private readonly orders: OrdersUseCases,
  ) {}
  @Get('organizations/:organizationId/order-policy')
  @ApiOperation({
    operationId: 'getCommercialPolicy',
    summary: 'Read business checkout settings',
    description:
      'Owning active-business orders.settings.manage: business admin or superadmin. Null until explicitly configured; checkout remains unavailable.',
  })
  @ApiOkResponse({ type: S.PolicyResponseDto })
  @ZodSerializerDto(S.PolicyResponseDto)
  async getCommercialPolicy(
    @Param() p: R.PolicyParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return M.policy(
      await this.orders.policy(req.principal.userId, p.organizationId),
    );
  }
  @Put('organizations/:organizationId/order-policy')
  @ApiOperation({
    operationId: 'configureCommercialPolicy',
    summary: 'Configure delivery, taxes and commercial terms',
    description:
      'Owning active-business orders.settings.manage. Audited versioned configuration; first version uses expectedVersion zero. Pickup address and/or fixed city/country delivery fees. Explicit included or added tax policy; added rates use integer basis points (100 = 1 percent). Collector records an agreement and never activates real charges.',
  })
  @ApiOkResponse({ type: S.PolicyResponseDto })
  @ZodSerializerDto(S.PolicyResponseDto)
  async configureCommercialPolicy(
    @Param() p: R.PolicyParamsDto,
    @Body() d: R.ConfigurePolicyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { expectedVersion, reason, ...data } = d;
    return M.policy(
      await this.orders.configure(
        new PolicyCommand(
          req.principal.userId,
          p.organizationId,
          data,
          expectedVersion,
          reason,
          req.requestId,
        ),
      ),
    );
  }
  @Post('checkout/quotes')
  @ApiOperation({
    operationId: 'createCheckoutQuote',
    summary: 'Quote the current cart',
    description:
      'Own current nonempty cart; revalidates publication, business, category, price, delivery coverage, explicit taxes and available stock. Immutable quote expires in five minutes; creates no reservation. Colombia/COP only. Includes immutable commission allocation; changing commission requires a new quote. All amounts are safe integer minor units.',
  })
  @ApiCreatedResponse({ type: S.QuoteResponseDto })
  @ZodSerializerDto(S.QuoteResponseDto)
  async createCheckoutQuote(
    @Body() d: R.QuoteRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return M.quote(
      await this.orders.quote(
        new QuoteCommand(
          req.principal.userId,
          d.expectedCartVersion,
          d.fulfillment,
          d.contact,
        ),
      ),
    );
  }
  @Get('checkout/quotes/:quoteId')
  @ApiOperation({
    operationId: 'getOwnCheckoutQuote',
    summary: 'Read an own immutable quote',
    description:
      'Only the authenticated buyer. Contains the accepted products, contact, delivery/tax costs, terms and expiry. Reading does not extend validity.',
  })
  @ApiOkResponse({ type: S.QuoteResponseDto })
  @ZodSerializerDto(S.QuoteResponseDto)
  async getOwnCheckoutQuote(
    @Param() p: R.QuoteParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return M.quote(
      await this.orders.quoteDetail(req.principal.userId, p.quoteId),
    );
  }
  @Post('orders')
  @ApiOperation({
    operationId: 'createOwnOrder',
    summary: 'Confirm a quote and reserve every order line',
    description:
      'Explicit consent and exact total required. Quote, cart, products and terms must remain current; otherwise 409 requires a new quote. Durable buyer idempotency UUID. Creates an unpaid order, stock holds, cart clear and audit in one PostgreSQL transaction; unpaid orders expire in thirty minutes. No charge is made.',
  })
  @ApiCreatedResponse({ type: S.OrderResponseDto })
  @ZodSerializerDto(S.OrderResponseDto)
  async createOwnOrder(
    @Body() d: R.CreateOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return M.order(
      await this.orders.create(
        new CreateOrderCommand(
          req.principal.userId,
          d.quoteId,
          d.expectedTotalMinor,
          d.consent,
          d.idempotencyKey,
          req.requestId,
        ),
      ),
    );
  }
  @Get('orders')
  @ApiOperation({
    operationId: 'listVisibleOrders',
    summary: 'List own or managed business orders',
    description:
      'Default scope is authenticated buyer. Explicit organizationId requires current owning active-business orders.fulfillment.manage. Bounded pagination and status filter; contact details are never public. Deadline expiry is recovered by the scheduler and individual reads.',
  })
  @ApiOkResponse({ type: S.OrdersResponseDto })
  @ZodSerializerDto(S.OrdersResponseDto)
  async listVisibleOrders(
    @Query() d: R.ListOrdersDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.orders.list(
      new OrdersQuery(
        req.principal.userId,
        d.page,
        d.limit,
        d.organizationId,
        d.status,
      ),
    );
    return { ...result, items: result.items.map(M.order) };
  }
  @Get('orders/:orderId')
  @ApiOperation({
    operationId: 'getVisibleOrder',
    summary: 'Read an order and its immutable snapshot',
    description:
      'Only the buyer or owning active-business fulfillment staff/superadmin. Buyer retains own history when the seller is suspended. Expired unpaid orders release reservations transactionally.',
  })
  @ApiOkResponse({ type: S.OrderResponseDto })
  @ZodSerializerDto(S.OrderResponseDto)
  async getVisibleOrder(
    @Param() p: R.OrderParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return M.order(await this.orders.get(req.principal.userId, p.orderId));
  }
  @Post('orders/:orderId/cancel')
  @ApiOperation({
    operationId: 'cancelUnpaidOrder',
    summary: 'Cancel an unpaid pending order',
    description:
      'Buyer or owning active-business fulfillment staff. Current version and audited reason; releases every reservation atomically. Paid orders require a future refund workflow and return 409.',
  })
  @ApiCreatedResponse({ type: S.OrderResponseDto })
  @ZodSerializerDto(S.OrderResponseDto)
  async cancelUnpaidOrder(
    @Param() p: R.OrderParamsDto,
    @Body() d: R.CancelOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return M.order(
      await this.orders.cancel(
        new OrderDecisionCommand(
          req.principal.userId,
          p.orderId,
          d.expectedVersion,
          d.reason,
          req.requestId,
        ),
      ),
    );
  }
  @Patch('orders/:orderId/fulfillment')
  @ApiOperation({
    operationId: 'advanceOrderFulfillment',
    summary: 'Advance paid order fulfillment',
    description:
      'Owning active-business orders.fulfillment.manage. Version and audited reason. Only paid → preparing → dispatched (delivery) or ready_for_pickup (pickup) → delivered. Payment can only be recorded through the internal verified Payments port; no HTTP mark-paid endpoint exists.',
  })
  @ApiOkResponse({ type: S.OrderResponseDto })
  @ZodSerializerDto(S.OrderResponseDto)
  async advanceOrderFulfillment(
    @Param() p: R.OrderParamsDto,
    @Body() d: R.FulfillOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return M.order(
      await this.orders.fulfill(
        new OrderDecisionCommand(
          req.principal.userId,
          p.orderId,
          d.expectedVersion,
          d.reason,
          req.requestId,
          d.status,
        ),
      ),
    );
  }
  @Get('orders/:orderId/audits')
  @ApiOperation({
    operationId: 'listVisibleOrderAudits',
    summary: 'Read immutable order history',
    description:
      'Buyer or owning active-business fulfillment staff; bounded pagination. Automatic expiry and trusted payment confirmation use null system actors.',
  })
  @ApiOkResponse({ type: S.OrderAuditsResponseDto })
  @ZodSerializerDto(S.OrderAuditsResponseDto)
  async listVisibleOrderAudits(
    @Param() p: R.OrderParamsDto,
    @Query() d: R.OrdersPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.orders.audits(
      req.principal.userId,
      p.orderId,
      d.page,
      d.limit,
    );
    return { ...result, items: result.items.map(M.audit) };
  }

  @Get('organizations/:organizationId/order-policy/audits')
  @ApiOperation({
    operationId: 'listCommercialPolicyAudits',
    summary: 'Read commercial policy revision history',
    description:
      'Owning active-business orders.settings.manage; paginated immutable terms, delivery and tax snapshots with actor, reason and request correlation. Contains private pickup contact details.',
  })
  @ApiOkResponse({ type: S.PolicyAuditsResponseDto })
  @ZodSerializerDto(S.PolicyAuditsResponseDto)
  async listCommercialPolicyAudits(
    @Param() p: R.PolicyParamsDto,
    @Query() d: R.OrdersPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.orders.policyAudits(
      req.principal.userId,
      p.organizationId,
      d.page,
      d.limit,
    );
    return {
      ...result,
      items: result.items.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
}
