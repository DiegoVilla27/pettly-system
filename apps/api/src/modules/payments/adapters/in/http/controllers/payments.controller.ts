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
import {
  PAYMENTS_USE_CASES,
  type PaymentsUseCases,
} from '../../../../application/ports/in/payments-use-cases';
import {
  CreatePaymentCommand,
  ReconcilePaymentCommand,
} from '../../../../application/commands/payment.commands';
import {
  PaymentQuery,
  PaymentsQuery,
} from '../../../../application/queries/payment.queries';
import { PaymentsHttpMapper as M } from '../mappers/payments-http.mapper';
import * as R from '../dtos/requests/payments.requests';
import * as S from '../dtos/responses/payments.responses';
@ApiTags('Payments')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller()
export class PaymentsController {
  constructor(
    @Inject(PAYMENTS_USE_CASES) private readonly payments: PaymentsUseCases,
  ) {}
  @Get('payments/policy')
  @ApiOperation({
    operationId: 'getPaymentPolicy',
    summary: 'Read the current commission and provider availability',
    description:
      'Active verified account. PETTLY_COMMISSION_PERCENT defaults to 10; rates are copied into each accepted quote/order. Product subtotal excludes shipping and added taxes; embedded price taxes remain included. Provider disabled means no checkout or money transfer is available.',
  })
  @ApiOkResponse({ type: S.PaymentPolicyResponseDto })
  @ZodSerializerDto(S.PaymentPolicyResponseDto)
  policy(@Req() r: AuthenticatedRequest) {
    return this.payments.policy(r.principal.userId);
  }
  @Post('orders/:orderId/payment-attempts')
  @ApiOperation({
    operationId: 'createOwnPaymentAttempt',
    summary: 'Prepare an idempotent payment attempt for an own order',
    description:
      'Active verified buyer of a live Colombian COP order with accepted commission. One unresolved attempt per order. Body accepts only a buyer-scoped idempotency UUID; identical retry returns the original attempt. Persists allocation, audit and transactional outbox; does not synchronously charge. Unconfigured provider leaves checkoutUrl null until local deadline expiry. Never authorizes a browser to mark paid.',
  })
  @ApiCreatedResponse({ type: S.PaymentResponseDto })
  @ZodSerializerDto(S.PaymentResponseDto)
  async create(
    @Param() p: R.PaymentOrderParamsDto,
    @Body() d: R.CreatePaymentDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.payment(
      await this.payments.create(
        new CreatePaymentCommand(
          r.principal.userId,
          p.orderId,
          d.idempotencyKey,
          r.requestId,
        ),
      ),
    );
  }
  @Get('payments')
  @ApiOperation({
    operationId: 'listVisiblePayments',
    summary: 'Search own, business or platform payment attempts',
    description:
      'Own scope by default. organizationId requires payments.business.read in the active owning business (business admin/superadmin). scope=platform requires superadmin payments.platform.manage. Optional status and bounded page/limit. No-store; excludes idempotency internals.',
  })
  @ApiOkResponse({ type: S.PaymentsResponseDto })
  @ZodSerializerDto(S.PaymentsResponseDto)
  async list(@Query() d: R.ListPaymentsDto, @Req() r: AuthenticatedRequest) {
    const v = await this.payments.list(
      new PaymentsQuery(
        r.principal.userId,
        d.page,
        d.limit,
        d.organizationId,
        d.scope === 'platform',
        d.status,
      ),
    );
    return { ...v, items: v.items.map(M.payment) };
  }
  @Get('payments/:paymentId')
  @ApiOperation({
    operationId: 'getVisiblePayment',
    summary: 'Read a visible payment and its immutable allocation',
    description:
      'Active verified buyer or owning active-business financial administrator. Approval and distribution are separate states; processing charges remain null until authoritatively reported. Reconciliation-required payments block replacement attempts.',
  })
  @ApiOkResponse({ type: S.PaymentResponseDto })
  @ZodSerializerDto(S.PaymentResponseDto)
  async get(@Param() p: R.PaymentParamsDto, @Req() r: AuthenticatedRequest) {
    return M.payment(
      await this.payments.get(
        new PaymentQuery(r.principal.userId, p.paymentId),
      ),
    );
  }
  @Get('payments/:paymentId/history')
  @ApiOperation({
    operationId: 'listVisiblePaymentHistory',
    summary: 'Read immutable payment audit history',
    description:
      'Same buyer/business financial scope as payment detail; bounded pagination. Provider/scheduler changes have null system actor; requestId supports tracing.',
  })
  @ApiOkResponse({ type: S.PaymentHistoryResponseDto })
  @ZodSerializerDto(S.PaymentHistoryResponseDto)
  async history(
    @Param() p: R.PaymentParamsDto,
    @Query() d: R.PaymentsPaginationDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const v = await this.payments.history(
      new PaymentQuery(r.principal.userId, p.paymentId),
      d.page,
      d.limit,
    );
    return { ...v, items: v.items.map(M.audit) };
  }
  @Get('payments/:paymentId/financials')
  @ApiOperation({
    operationId: 'getPaymentFinancialEvidence',
    summary: 'Read authoritative payment events and capture ledger',
    description:
      'Superadmin payments.platform.manage only. Returns the latest 100 normalized provider observations and bounded capture ledger; no raw secrets, card data or private provider payload. Capture records do not prove seller distribution or order delivery.',
  })
  @ApiOkResponse({ type: S.PaymentFinancialsResponseDto })
  @ZodSerializerDto(S.PaymentFinancialsResponseDto)
  async financials(
    @Param() p: R.PaymentParamsDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const v = await this.payments.financials(
      new PaymentQuery(r.principal.userId, p.paymentId),
    );
    return { events: v.events.map(M.event), ledger: v.ledger.map(M.ledger) };
  }
  @Post('payments/:paymentId/reconcile')
  @ApiOperation({
    operationId: 'requestPaymentReconciliation',
    summary: 'Schedule an authoritative provider status lookup',
    description:
      'Superadmin payments.platform.manage. Empty strict body. Does not accept status, money or recipient fields. Durable outbox with leases and backoff; disabled or incompatible provider returns 503. No public verified-event or mark-paid endpoint exists.',
  })
  @ApiCreatedResponse({ type: S.PaymentResponseDto })
  @ZodSerializerDto(S.PaymentResponseDto)
  async reconcile(
    @Param() p: R.PaymentParamsDto,
    @Body() _d: R.ReconcilePaymentDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.payment(
      await this.payments.reconcile(
        new ReconcilePaymentCommand(
          r.principal.userId,
          p.paymentId,
          r.requestId,
        ),
      ),
    );
  }
}
