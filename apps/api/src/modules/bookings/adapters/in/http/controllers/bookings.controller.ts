import {
  Controller,
  HttpCode,
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
  BOOKINGS_USE_CASES,
  type BookingsUseCases,
} from '../../../../application/ports/in/bookings-use-cases';
import {
  CreateBookingCommand,
  RescheduleBookingCommand,
  BookingActionCommand,
} from '../../../../application/commands/booking.commands';
import { BookingsQuery } from '../../../../application/queries/booking.queries';
import * as R from '../dtos/requests/bookings.requests';
import * as S from '../dtos/responses/bookings.responses';
import { BookingsHttpMapper as M } from '../mappers/bookings-http.mapper';
@ApiTags('Bookings')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('bookings')
export class OwnBookingsController {
  constructor(
    @Inject(BOOKINGS_USE_CASES) private readonly use: BookingsUseCases,
  ) {}
  @Post()
  @ApiOperation({
    operationId: 'createBooking',
    summary: 'Reserve a reviewed service for your own pet',
    description:
      'Active verified account, personal active pet, accepted species and current service/resource versions required. Idempotent UUID scoped to buyer; altered replay returns 409. Availability, resource capacity, blocks and pet conflicts are checked transactionally. Automatic confirmation or expiring manual request. Explicit terms/contact-sharing consent; tax-inclusive COP collected at business, no online charge.',
  })
  @ApiCreatedResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async create(@Body() d: R.CreateBookingDto, @Req() r: AuthenticatedRequest) {
    const { serviceId, animalId, idempotencyKey, ...selection } = d;
    return M.booking(
      await this.use.create(
        new CreateBookingCommand(
          r.principal.userId,
          serviceId,
          animalId,
          idempotencyKey,
          selection,
          r.requestId,
        ),
      ),
    );
  }
  @Get()
  @ApiOperation({
    operationId: 'listOwnBookings',
    summary: 'Search your booking history',
    description:
      'Buyer-only bounded pagination, status and service filters. Requested deadlines are recovered by the durable expiry scheduler within fifteen seconds; capacity checks exclude already expired requests immediately.',
  })
  @ApiOkResponse({ type: S.BookingsResponseDto })
  @ZodSerializerDto(S.BookingsResponseDto)
  async list(
    @Query() q: R.OwnBookingsQueryDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const result = await this.use.list(
      new BookingsQuery(
        r.principal.userId,
        q.page,
        q.limit,
        undefined,
        q.status,
        q.serviceId,
      ),
    );
    return {
      ...result,
      items: result.items.map(M.booking),
      page: q.page,
      limit: q.limit,
    };
  }
  @Get(':bookingId/audit')
  @ApiOperation({
    operationId: 'listOwnBookingAudit',
    summary: 'Read your accepted booking revisions',
    description:
      'Own booking only. Immutable reasons, actions and accepted snapshots, including prior terms after rescheduling. Private contact information never appears in public catalog responses.',
  })
  @ApiOkResponse({ type: S.BookingAuditResponseDto })
  @ZodSerializerDto(S.BookingAuditResponseDto)
  async audit(
    @Param() p: R.BookingParamsDto,
    @Query() q: R.BookingsPageDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const result = await this.use.history(
      r.principal.userId,
      p.bookingId,
      q.page,
      q.limit,
    );
    return {
      ...result,
      items: result.items.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
  @Get(':bookingId')
  @ApiOperation({
    operationId: 'getOwnBooking',
    summary: 'Read your reservation and accepted policy',
    description:
      'Own booking only, including inactive-provider history. Expired pending requests are recovered on read; accepted policies and total are immutable unless you explicitly reschedule.',
  })
  @ApiOkResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async get(@Param() p: R.BookingParamsDto, @Req() r: AuthenticatedRequest) {
    return M.booking(await this.use.get(r.principal.userId, p.bookingId));
  }
  @HttpCode(200)
  @Post(':bookingId/cancel')
  @ApiOperation({
    operationId: 'cancelOwnBooking',
    summary: 'Cancel within your accepted cancellation window',
    description:
      'Own requested/confirmed future booking, expectedVersion and reason. Uses the policy accepted at booking time, including changes to the source service. Releases capacity and cancels queued reminders transactionally.',
  })
  @ApiOkResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async cancel(
    @Param() p: R.BookingParamsDto,
    @Body() d: R.BookingDecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.booking(
      await this.use.action(
        new BookingActionCommand(
          r.principal.userId,
          p.bookingId,
          d.expectedVersion,
          'cancel',
          d.reason,
          r.requestId,
        ),
      ),
    );
  }
  @HttpCode(200)
  @Post(':bookingId/reschedule')
  @ApiOperation({
    operationId: 'rescheduleOwnBooking',
    summary: 'Accept a new schedule, price and policy atomically',
    description:
      'Own requested/confirmed booking inside its existing cutoff; expected booking/service/resource versions, total, renewed consent and contact. Same service/pet, compatible resource may change. Original slot is released only when new allocation succeeds; manual services require renewed confirmation. Stable booking UUID and immutable revision history.',
  })
  @ApiOkResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async reschedule(
    @Param() p: R.BookingParamsDto,
    @Body() d: R.RescheduleBookingDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const { expectedVersion, reason, ...selection } = d;
    return M.booking(
      await this.use.reschedule(
        new RescheduleBookingCommand(
          r.principal.userId,
          p.bookingId,
          expectedVersion,
          selection,
          reason,
          r.requestId,
        ),
      ),
    );
  }
}
@ApiTags('Bookings')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('bookings/admin')
export class ManagedBookingsController {
  constructor(
    @Inject(BOOKINGS_USE_CASES) private readonly use: BookingsUseCases,
  ) {}
  @Get()
  @ApiOperation({
    operationId: 'listManagedBookings',
    summary: 'Search bookings in your active business',
    description:
      'Requires scoped bookings.manage, explicit organizationId and bounded pagination. Includes necessary accepted contact/pet identity for service delivery; no cross-company private reads.',
  })
  @ApiOkResponse({ type: S.BookingsResponseDto })
  @ZodSerializerDto(S.BookingsResponseDto)
  async list(
    @Query() q: R.ManagedBookingsQueryDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const result = await this.use.list(
      new BookingsQuery(
        r.principal.userId,
        q.page,
        q.limit,
        q.organizationId,
        q.status,
        q.serviceId,
      ),
    );
    return {
      ...result,
      items: result.items.map(M.booking),
      page: q.page,
      limit: q.limit,
    };
  }
  @Get(':bookingId/audit')
  @ApiOperation({
    operationId: 'listManagedBookingAudit',
    summary: 'Read the booking audit in your active business',
    description:
      'Requires current scoped bookings.manage. Bounded immutable revisions of accepted policies, actor actions and reasons.',
  })
  @ApiOkResponse({ type: S.BookingAuditResponseDto })
  @ZodSerializerDto(S.BookingAuditResponseDto)
  async audit(
    @Param() p: R.BookingParamsDto,
    @Query() q: R.BookingsPageDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const result = await this.use.history(
      r.principal.userId,
      p.bookingId,
      q.page,
      q.limit,
      true,
    );
    return {
      ...result,
      items: result.items.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
  @Get(':bookingId')
  @ApiOperation({
    operationId: 'getManagedBooking',
    summary: 'Read a booking for service delivery',
    description:
      'Requires scoped bookings.manage in owning active business. Accepted policy survives service edits; pending deadlines are recovered on read.',
  })
  @ApiOkResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async get(@Param() p: R.BookingParamsDto, @Req() r: AuthenticatedRequest) {
    return M.booking(await this.use.get(r.principal.userId, p.bookingId, true));
  }
  @HttpCode(200)
  @Post(':bookingId/confirm')
  @ApiOperation({
    operationId: 'confirmManagedBooking',
    summary: 'Confirm a pending request',
    description:
      'Requires scoped bookings.manage, expectedVersion and reason. Only pending unexpired requests can be confirmed; capacity was held during the request.',
  })
  @ApiOkResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async confirm(
    @Param() p: R.BookingParamsDto,
    @Body() d: R.BookingDecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.booking(
      await this.use.action(
        new BookingActionCommand(
          r.principal.userId,
          p.bookingId,
          d.expectedVersion,
          'confirm',
          d.reason,
          r.requestId,
          true,
        ),
      ),
    );
  }
  @HttpCode(200)
  @Post(':bookingId/reject')
  @ApiOperation({
    operationId: 'rejectManagedBooking',
    summary: 'Reject a pending request',
    description:
      'Requires scoped bookings.manage, expectedVersion and reason. Releases occupied capacity and records the provider decision.',
  })
  @ApiOkResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async reject(
    @Param() p: R.BookingParamsDto,
    @Body() d: R.BookingDecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.booking(
      await this.use.action(
        new BookingActionCommand(
          r.principal.userId,
          p.bookingId,
          d.expectedVersion,
          'reject',
          d.reason,
          r.requestId,
          true,
        ),
      ),
    );
  }
  @HttpCode(200)
  @Post(':bookingId/cancel')
  @ApiOperation({
    operationId: 'cancelManagedBooking',
    summary: 'Cancel a future booking as provider',
    description:
      'Requires scoped bookings.manage, expectedVersion and reason. Requested/confirmed future bookings can be cancelled even after customer cutoff; no refund or payment is implied.',
  })
  @ApiOkResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async cancel(
    @Param() p: R.BookingParamsDto,
    @Body() d: R.BookingDecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.booking(
      await this.use.action(
        new BookingActionCommand(
          r.principal.userId,
          p.bookingId,
          d.expectedVersion,
          'cancel',
          d.reason,
          r.requestId,
          true,
        ),
      ),
    );
  }
  @HttpCode(200)
  @Post(':bookingId/start')
  @ApiOperation({
    operationId: 'startManagedBooking',
    summary: 'Record attendance during the service window',
    description:
      'Requires scoped bookings.manage and confirmed state. Current time must be within accepted start/end; marks in_progress.',
  })
  @ApiOkResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async start(
    @Param() p: R.BookingParamsDto,
    @Body() d: R.BookingDecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.booking(
      await this.use.action(
        new BookingActionCommand(
          r.principal.userId,
          p.bookingId,
          d.expectedVersion,
          'start',
          d.reason,
          r.requestId,
          true,
        ),
      ),
    );
  }
  @HttpCode(200)
  @Post(':bookingId/complete')
  @ApiOperation({
    operationId: 'completeManagedBooking',
    summary: 'Complete an attended booking',
    description:
      'Requires scoped bookings.manage and in_progress state. Occupied interval including cleanup buffer remains reserved until its accepted end.',
  })
  @ApiOkResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async complete(
    @Param() p: R.BookingParamsDto,
    @Body() d: R.BookingDecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.booking(
      await this.use.action(
        new BookingActionCommand(
          r.principal.userId,
          p.bookingId,
          d.expectedVersion,
          'complete',
          d.reason,
          r.requestId,
          true,
        ),
      ),
    );
  }
  @HttpCode(200)
  @Post(':bookingId/no_show')
  @ApiOperation({
    operationId: 'no_showManagedBooking',
    summary: 'Record a missed appointment after grace',
    description:
      'Requires scoped bookings.manage and confirmed state. At least fifteen minutes after accepted start; releases capacity without claiming payment collection.',
  })
  @ApiOkResponse({ type: S.BookingResponseDto })
  @ZodSerializerDto(S.BookingResponseDto)
  async no_show(
    @Param() p: R.BookingParamsDto,
    @Body() d: R.BookingDecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.booking(
      await this.use.action(
        new BookingActionCommand(
          r.principal.userId,
          p.bookingId,
          d.expectedVersion,
          'no_show',
          d.reason,
          r.requestId,
          true,
        ),
      ),
    );
  }
}
