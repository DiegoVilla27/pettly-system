import {
  Controller,
  HttpCode,
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
  SERVICES_USE_CASES,
  type ServicesUseCases,
} from '../../../../application/ports/in/services-use-cases';
import {
  ConfigureServiceCommand,
  ConfigureResourceCommand,
  ServiceDecisionCommand,
  BlockCommand,
} from '../../../../application/commands/service.commands';
import {
  ServicesQuery,
  AvailabilityQuery,
} from '../../../../application/queries/service.queries';
import * as R from '../dtos/requests/services.requests';
import * as S from '../dtos/responses/services.responses';
import { ServicesHttpMapper as M } from '../mappers/services-http.mapper';
@ApiTags('Services')
@DocumentErrors()
@Controller('services')
export class PublicServicesController {
  constructor(
    @Inject(SERVICES_USE_CASES) private readonly use: ServicesUseCases,
  ) {}
  @Get()
  @ApiOperation({
    operationId: 'listPublicServices',
    summary: 'Search reviewed services from active Colombian businesses',
    description:
      'Bounded search by organization, category or kind. Short filtered pages are possible; follow nextPage. Prices are tax-inclusive COP minor units, collected at the business. Veterinary services require a future credential workflow.',
  })
  @ApiOkResponse({ type: S.PublicServicesDto })
  @ZodSerializerDto(S.PublicServicesDto)
  async list(@Query() q: R.PublicServicesQueryDto) {
    const r = await this.use.list(
      new ServicesQuery(
        q.page,
        q.limit,
        q.organizationId,
        q.search,
        q.category,
        q.kind,
      ),
    );
    return {
      items: r.items.map((s) => M.service(s, false)),
      page: q.page,
      limit: q.limit,
      nextPage:
        q.page < 10000 && q.page * q.limit < r.total ? q.page + 1 : null,
    };
  }
  @Get(':serviceId/resources')
  @ApiOperation({
    operationId: 'listPublicServiceResources',
    summary: 'Read selectable active resources for a reviewed service',
    description:
      'Current published service and active Colombian business required. Resource names, kind, capacity, weekly business hours and version allow clients to choose an availability calendar. No staff account identities, private contact or reservations are exposed.',
  })
  @ApiOkResponse({ type: S.ResourcesDto })
  @ZodSerializerDto(S.ResourcesDto)
  async selectable(@Param() p: R.ServiceParamsDto) {
    return {
      items: (await this.use.publicResources(p.serviceId)).map(M.resource),
    };
  }
  @Get(':serviceId/availability')
  @ApiOperation({
    operationId: 'getServiceAvailability',
    summary: 'Read current appointment or lodging availability',
    description:
      'Inclusive local dates in America/Bogota, at most 31 dates within 180 days; lodging specifies nights. Up to 1000 slots with remaining capacity and total COP minor units. Advisory only: booking repeats checks under database locks. Buffers, blocks and pending requests occupy capacity.',
  })
  @ApiOkResponse({ type: S.ServiceAvailabilityResponseDto })
  @ZodSerializerDto(S.ServiceAvailabilityResponseDto)
  async availability(
    @Param() p: R.ServiceParamsDto,
    @Query() q: R.AvailabilityDto,
  ) {
    const r = await this.use.availability(
      new AvailabilityQuery(p.serviceId, q.resourceId, q.from, q.to, q.nights),
    );
    return {
      ...r,
      slots: r.slots.map((s) => ({
        ...s,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
      })),
    };
  }
  @Get(':serviceId')
  @ApiOperation({
    operationId: 'getPublicService',
    summary: 'Read a reviewed service and its accepted booking policy',
    description:
      'Current published state and active Colombian business required; otherwise 404. Resources are referenced by UUID; UTC slots are available through the availability endpoint. No provider private contact or reviewer identity is exposed.',
  })
  @ApiOkResponse({ type: S.PublicServiceDto })
  @ZodSerializerDto(S.PublicServiceDto)
  async get(@Param() p: R.ServiceParamsDto) {
    return M.service(await this.use.get(p.serviceId), false);
  }
}
@ApiTags('Services')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('services/admin')
export class ManagedServicesController {
  constructor(
    @Inject(SERVICES_USE_CASES) private readonly use: ServicesUseCases,
  ) {}
  @Post()
  @ApiOperation({
    operationId: 'createService',
    summary: 'Create a Colombian business service draft',
    description:
      'Requires services.manage in an active business. Full validated profile, assigned compatible resources, tax-inclusive COP price and explicit pay_at_business. Creation does not publish.',
  })
  @ApiCreatedResponse({ type: S.ServiceResponseDto })
  @ZodSerializerDto(S.ServiceResponseDto)
  async create(@Body() d: R.CreateServiceDto, @Req() r: AuthenticatedRequest) {
    return M.service(
      await this.use.configure(
        new ConfigureServiceCommand(
          r.principal.userId,
          d.organizationId,
          null,
          0,
          d.reason,
          r.requestId,
          d.profile,
        ),
      ),
    );
  }
  @Get()
  @ApiOperation({
    operationId: 'listManagedServices',
    summary: 'Search all service states in your active business',
    description:
      'Requires scoped services.manage; explicit organizationId, bounded pagination. No cross-company private reads.',
  })
  @ApiOkResponse({ type: S.ManagedServicesDto })
  @ZodSerializerDto(S.ManagedServicesDto)
  async list(
    @Query() q: R.ManagedServicesQueryDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const result = await this.use.list(
      new ServicesQuery(
        q.page,
        q.limit,
        q.organizationId,
        q.search,
        q.category,
        q.kind,
        q.status,
        r.principal.userId,
      ),
    );
    return {
      ...result,
      items: result.items.map((s) => M.service(s)),
      page: q.page,
      limit: q.limit,
    };
  }
  @Get('moderation')
  @ApiOperation({
    operationId: 'listServiceModerationQueue',
    summary: 'Read pending service submissions for independent review',
    description:
      'Requires global moderation.publications.review. Bounded pending policy snapshots without reservation/contact data. Current business/resource eligibility and self-review restrictions are rechecked when deciding.',
  })
  @ApiOkResponse({ type: S.ManagedServicesDto })
  @ZodSerializerDto(S.ManagedServicesDto)
  async moderation(@Query() q: R.PageDto, @Req() r: AuthenticatedRequest) {
    const result = await this.use.list(
      new ServicesQuery(
        q.page,
        q.limit,
        undefined,
        undefined,
        undefined,
        undefined,
        'pending',
        r.principal.userId,
        true,
      ),
    );
    return {
      ...result,
      items: result.items.map((s) => M.service(s)),
      page: q.page,
      limit: q.limit,
    };
  }
  @Get('moderation/:serviceId')
  @ApiOperation({
    operationId: 'getServiceReviewPreview',
    summary: 'Read a pending service policy before moderation',
    description:
      'Global moderation.publications.review required. Pending state only; does not grant operational company access or booking details.',
  })
  @ApiOkResponse({ type: S.ServiceResponseDto })
  @ZodSerializerDto(S.ServiceResponseDto)
  async preview(
    @Param() p: R.ServiceParamsDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.service(await this.use.preview(p.serviceId, r.principal.userId));
  }
  @Get('resources/:resourceId/blocks')
  @ApiOperation({
    operationId: 'listActiveServiceBlocks',
    summary: 'Read active future calendar blocks',
    description:
      'Requires scoped services.manage. UTC from/to interval within 210 days, at most 100 active future blocks per resource. Release preserves historical rows; this operational read excludes released blocks.',
  })
  @ApiOkResponse({ type: S.ActiveServiceBlocksDto })
  @ZodSerializerDto(S.ActiveServiceBlocksDto)
  async activeBlocks(
    @Param() p: R.ResourceParamsDto,
    @Query() q: R.ActiveBlocksQueryDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return {
      items: (
        await this.use.activeBlocks(
          p.resourceId,
          r.principal.userId,
          new Date(q.from),
          new Date(q.to),
        )
      ).map(M.block),
    };
  }
  @Post('resources')
  @ApiOperation({
    operationId: 'createServiceResource',
    summary: 'Create a shared service resource and weekly calendar',
    description:
      'Requires services.manage. Capacity 1–100, maximum 100 resources per business. ISO weekday and local quarter-hour minutes; lodging uses full-day windows. Resource kind is immutable.',
  })
  @ApiCreatedResponse({ type: S.ResourceResponseDto })
  @ZodSerializerDto(S.ResourceResponseDto)
  async resource(
    @Body() d: R.CreateResourceDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.resource(
      await this.use.resource(
        new ConfigureResourceCommand(
          r.principal.userId,
          d.organizationId,
          null,
          0,
          d.reason,
          r.requestId,
          d.profile,
        ),
      ),
    );
  }
  @Get('resources')
  @ApiOperation({
    operationId: 'listManagedServiceResources',
    summary: 'Read your business resources and calendars',
    description:
      'Scoped services.manage. Includes active and inactive resources, bounded to 100; no buyer or booking data.',
  })
  @ApiOkResponse({ type: S.ResourcesDto })
  @ZodSerializerDto(S.ResourcesDto)
  async resources(
    @Query() q: R.ResourceQueryDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return {
      items: (
        await this.use.resources(q.organizationId, r.principal.userId)
      ).map(M.resource),
    };
  }
  @Patch('resources/:resourceId')
  @ApiOperation({
    operationId: 'updateServiceResource',
    summary: 'Change capacity, calendar or resource status safely',
    description:
      'Scoped services.manage and expectedVersion. Changes cannot invalidate occupied future bookings; inactivation prevents new reservations while accepted bookings remain. Shared resource changes affect every assigned service.',
  })
  @ApiOkResponse({ type: S.ResourceResponseDto })
  @ZodSerializerDto(S.ResourceResponseDto)
  async updateResource(
    @Param() p: R.ResourceParamsDto,
    @Body() d: R.UpdateResourceDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.resource(
      await this.use.resource(
        new ConfigureResourceCommand(
          r.principal.userId,
          d.organizationId,
          p.resourceId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          d.profile,
        ),
      ),
    );
  }
  @Post('resources/:resourceId/blocks')
  @ApiOperation({
    operationId: 'blockServiceResource',
    summary: 'Block a resource for a future interval',
    description:
      'Scoped services.manage, expected resource version, UTC interval and audited reason. Up to 210 days horizon; overlapping bookings or blocks return 409. Blocks consume all capacity.',
  })
  @ApiCreatedResponse({ type: S.BlockResponseDto })
  @ZodSerializerDto(S.BlockResponseDto)
  async block(
    @Param() p: R.ResourceParamsDto,
    @Body() d: R.BlockDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.block(
      await this.use.block(
        new BlockCommand(
          r.principal.userId,
          p.resourceId,
          null,
          d.expectedVersion,
          new Date(d.startsAt),
          new Date(d.endsAt),
          d.reason,
          r.requestId,
        ),
      ),
    );
  }
  @Delete('resources/:resourceId/blocks/:blockId')
  @ApiOperation({
    operationId: 'releaseServiceBlock',
    summary: 'Release a block without deleting its history',
    description:
      'Scoped services.manage, expected resource version and audited reason. The block remains recorded and resource version increases; already released blocks return 409.',
  })
  @ApiOkResponse({ type: S.BlockResponseDto })
  @ZodSerializerDto(S.BlockResponseDto)
  async release(
    @Param() p: R.BlockParamsDto,
    @Body() d: R.DecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.block(
      await this.use.release(
        new BlockCommand(
          r.principal.userId,
          p.resourceId,
          p.blockId,
          d.expectedVersion,
          new Date(),
          new Date(),
          d.reason,
          r.requestId,
        ),
      ),
    );
  }
  @Get(':serviceId/audit')
  @ApiOperation({
    operationId: 'listServiceAudit',
    summary: 'Read immutable service revisions',
    description:
      'Scoped services.manage; bounded history of actor, reason, correlation and full service snapshot.',
  })
  @ApiOkResponse({ type: S.ServiceAuditsDto })
  @ZodSerializerDto(S.ServiceAuditsDto)
  async audit(
    @Param() p: R.ServiceParamsDto,
    @Query() q: R.PageDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const result = await this.use.audits(
      p.serviceId,
      r.principal.userId,
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
  @Get(':serviceId')
  @ApiOperation({
    operationId: 'getManagedService',
    summary: 'Read a managed service including review history',
    description:
      'Scoped services.manage in owning active business, including archived records. Reviewer identity and reason are private.',
  })
  @ApiOkResponse({ type: S.ServiceResponseDto })
  @ZodSerializerDto(S.ServiceResponseDto)
  async get(@Param() p: R.ServiceParamsDto, @Req() r: AuthenticatedRequest) {
    return M.service(await this.use.get(p.serviceId, r.principal.userId));
  }
  @Patch(':serviceId')
  @ApiOperation({
    operationId: 'updateService',
    summary: 'Replace service details and withdraw publication',
    description:
      'Scoped services.manage, expectedVersion and full validated profile. Pending and archived services cannot be edited; accepted booking snapshots are preserved.',
  })
  @ApiOkResponse({ type: S.ServiceResponseDto })
  @ZodSerializerDto(S.ServiceResponseDto)
  async update(
    @Param() p: R.ServiceParamsDto,
    @Body() d: R.UpdateServiceDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.service(
      await this.use.configure(
        new ConfigureServiceCommand(
          r.principal.userId,
          d.organizationId,
          p.serviceId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          d.profile,
        ),
      ),
    );
  }
  @HttpCode(200)
  @Post(':serviceId/submit')
  @ApiOperation({
    operationId: 'submitService',
    summary: 'Submit a service for review',
    description:
      'Requires owning services.manage, compatible active resources and expectedVersion. Draft, rejected or paused becomes pending.',
  })
  @ApiOkResponse({ type: S.ServiceResponseDto })
  @ZodSerializerDto(S.ServiceResponseDto)
  async submit(
    @Param() p: R.ServiceParamsDto,
    @Body() d: R.DecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.service(
      await this.use.decision(
        new ServiceDecisionCommand(
          r.principal.userId,
          '',
          p.serviceId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          'submit',
        ),
      ),
    );
  }
  @HttpCode(200)
  @Post(':serviceId/pause')
  @ApiOperation({
    operationId: 'pauseService',
    summary: 'Pause a published service',
    description:
      'Requires owning services.manage and expectedVersion. Existing accepted bookings remain; reopening requires review.',
  })
  @ApiOkResponse({ type: S.ServiceResponseDto })
  @ZodSerializerDto(S.ServiceResponseDto)
  async pause(
    @Param() p: R.ServiceParamsDto,
    @Body() d: R.DecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.service(
      await this.use.decision(
        new ServiceDecisionCommand(
          r.principal.userId,
          '',
          p.serviceId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          'pause',
        ),
      ),
    );
  }
  @Delete(':serviceId')
  @ApiOperation({
    operationId: 'archiveService',
    summary: 'Archive a service permanently',
    description:
      'Requires owning services.manage and expectedVersion. History and accepted bookings remain; archive is terminal.',
  })
  @ApiOkResponse({ type: S.ServiceResponseDto })
  @ZodSerializerDto(S.ServiceResponseDto)
  async archive(
    @Param() p: R.ServiceParamsDto,
    @Body() d: R.DecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.service(
      await this.use.decision(
        new ServiceDecisionCommand(
          r.principal.userId,
          '',
          p.serviceId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          'archive',
        ),
      ),
    );
  }
  @HttpCode(200)
  @Post(':serviceId/review')
  @ApiOperation({
    operationId: 'reviewService',
    summary: 'Review a pending service',
    description:
      'Requires global moderation.publications.review outside owning organization. Creator and organization members cannot self-review; current eligibility and resources are checked.',
  })
  @ApiOkResponse({ type: S.ServiceResponseDto })
  @ZodSerializerDto(S.ServiceResponseDto)
  async review(
    @Param() p: R.ServiceParamsDto,
    @Body() d: R.ReviewDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.service(
      await this.use.decision(
        new ServiceDecisionCommand(
          r.principal.userId,
          '',
          p.serviceId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          'review',
          d.approved,
        ),
      ),
    );
  }
}
