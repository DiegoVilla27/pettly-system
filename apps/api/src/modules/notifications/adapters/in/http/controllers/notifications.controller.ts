import {
  Controller,
  Inject,
  UseGuards,
  Get,
  Post,
  Put,
  HttpCode,
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
  NOTIFICATIONS_USE_CASES,
  type NotificationsUseCases,
} from '../../../../application/ports/in/notifications-use-cases';
import {
  NotificationsQuery,
  FailedDeliveriesQuery,
} from '../../../../application/queries/notification.queries';
import {
  ReadNotificationCommand,
  ReadAllNotificationsCommand,
  ChangeNotificationPreferencesCommand,
  RetryNotificationCommand,
} from '../../../../application/commands/notification.commands';
import * as R from '../dtos/requests/notifications.requests';
import * as S from '../dtos/responses/notifications.responses';
import { NotificationsHttpMapper as M } from '../mappers/notifications-http.mapper';
@ApiTags('Notifications')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NOTIFICATIONS_USE_CASES)
    private readonly use: NotificationsUseCases,
  ) {}
  @Get()
  @ApiOperation({
    operationId: 'listOwnNotifications',
    summary: 'Read your persistent notification inbox',
    description:
      'Active verified account; strictly current recipient, including superadmin. Bounded pagination/category/unread filters. Historical informational event, not an authorization grant or current subject state; original module permissions still apply.',
  })
  @ApiOkResponse({ type: S.InboxNotificationsDto })
  @ZodSerializerDto(S.InboxNotificationsDto)
  async list(
    @Query() q: R.NotificationsQueryDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const result = await this.use.list(
      new NotificationsQuery(
        r.principal.userId,
        q.page,
        q.limit,
        q.unreadOnly === 'true',
        q.category,
      ),
    );
    return {
      ...result,
      items: result.items.map(M.notification),
      page: q.page,
      limit: q.limit,
    };
  }
  @Get('unread-count')
  @ApiOperation({
    operationId: 'countOwnUnreadNotifications',
    summary: 'Count your unread inbox events',
    description:
      'Recipient-only current database count. No Redis cache or foreign-user query parameter.',
  })
  @ApiOkResponse({ type: S.UnreadNotificationsDto })
  @ZodSerializerDto(S.UnreadNotificationsDto)
  async count(@Req() r: AuthenticatedRequest) {
    return { count: await this.use.unread(r.principal.userId) };
  }
  @Get('preferences')
  @ApiOperation({
    operationId: 'getOwnNotificationPreferences',
    summary: 'Read your optional email preferences',
    description:
      'Orders/adoptions/bookings email defaults enabled. Virtual version zero until first save; organization access/security mail and in-app records remain mandatory. Auth token/security mail is independent.',
  })
  @ApiOkResponse({ type: S.NotificationPreferencesDto })
  @ZodSerializerDto(S.NotificationPreferencesDto)
  async preferences(@Req() r: AuthenticatedRequest) {
    return M.preferences(await this.use.preferences(r.principal.userId));
  }
  @Put('preferences')
  @ApiOperation({
    operationId: 'changeOwnNotificationPreferences',
    summary: 'Update optional email categories optimistically',
    description:
      'All three optional booleans and expectedVersion required. Stale version returns 409. Disabling cancels unsent matching notification emails/reminders; records remain in-app. Re-enabling affects future events, without replaying canceled historical mail. An SMTP send already in progress may arrive.',
  })
  @ApiOkResponse({ type: S.NotificationPreferencesDto })
  @ZodSerializerDto(S.NotificationPreferencesDto)
  async change(@Body() d: R.PreferencesDto, @Req() r: AuthenticatedRequest) {
    const { expectedVersion, ...preferences } = d;
    return M.preferences(
      await this.use.changePreferences(
        new ChangeNotificationPreferencesCommand(
          r.principal.userId,
          expectedVersion,
          preferences,
        ),
      ),
    );
  }
  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'readAllOwnNotifications',
    summary: 'Mark your existing inbox events as read up to a cutoff',
    description:
      'UTC through timestamp at or before now. Newer arrivals remain unread. Single database update, recipient scoped and idempotent; no email delivery effect.',
  })
  @ApiOkResponse({ type: S.ReadAllNotificationsResponseDto })
  @ZodSerializerDto(S.ReadAllNotificationsResponseDto)
  async readAll(
    @Body() d: R.ReadAllNotificationsDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return {
      updated: await this.use.readAll(
        new ReadAllNotificationsCommand(
          r.principal.userId,
          new Date(d.through),
        ),
      ),
    };
  }
  @Post(':notificationId/read')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'readOwnNotification',
    summary: 'Mark one of your notifications as read',
    description:
      'Strict empty body. Unknown/foreign recipient UUID returns 404. Replays preserve the original readAt; no read-to-unread mutation or physical deletion.',
  })
  @ApiOkResponse({ type: S.InboxNotificationDto })
  @ZodSerializerDto(S.InboxNotificationDto)
  async read(
    @Param() p: R.NotificationParamsDto,
    @Body() _d: R.EmptyNotificationDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.notification(
      await this.use.read(
        new ReadNotificationCommand(r.principal.userId, p.notificationId),
      ),
    );
  }
  @Get('admin/failed-deliveries')
  @ApiOperation({
    operationId: 'listFailedNotificationDeliveries',
    summary: 'Inspect safe failed-delivery metadata as superadmin',
    description:
      'Global superadmin only. Bounded metadata including failure category, deadline and retry parent. Excludes recipient addresses, encrypted payloads, tokens and provider exception bodies. Auth/legacy/canceled/expired messages may be listed but are not retryable.',
  })
  @ApiOkResponse({ type: S.FailedNotificationDeliveriesDto })
  @ZodSerializerDto(S.FailedNotificationDeliveriesDto)
  async failed(
    @Query() q: R.FailedDeliveriesQueryDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const result = await this.use.failed(
      new FailedDeliveriesQuery(r.principal.userId, q.page, q.limit),
    );
    return {
      ...result,
      items: result.items.map(M.delivery),
      page: q.page,
      limit: q.limit,
    };
  }
  @Post('admin/deliveries/:deliveryId/retry')
  @ApiOperation({
    operationId: 'retryFailedNotificationDelivery',
    summary: 'Create an audited fresh attempt for a failed business email',
    description:
      'Superadmin and 10–500 character reason. Only delivery_failed, unexpired inbox-backed mail, current active verified recipient and enabled category. New outbox/job UUID, stable parent uniqueness, original deadline and informational content; repeated requests return the same child. Tokens, expired, superseded and preference-canceled mail must not be replayed. No provider send inside HTTP transaction.',
  })
  @ApiCreatedResponse({ type: S.NotificationDeliveryDto })
  @ZodSerializerDto(S.NotificationDeliveryDto)
  async retry(
    @Param() p: R.DeliveryParamsDto,
    @Body() d: R.RetryDeliveryDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.delivery(
      await this.use.retry(
        new RetryNotificationCommand(
          r.principal.userId,
          p.deliveryId,
          d.reason,
        ),
      ),
    );
  }
}
