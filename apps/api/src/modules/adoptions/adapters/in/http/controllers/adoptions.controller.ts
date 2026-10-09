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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import type { Response } from 'express';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import {
  ADOPTIONS_USE_CASES,
  type AdoptionsUseCases,
} from '../../../../application/ports/in/adoptions-use-cases';
import {
  CreatePublicationCommand,
  PublicationDecisionCommand,
  UpdatePublicationCommand,
  ReviewPublicationCommand,
  SubmitAdoptionRequestCommand,
  AdoptionRequestDecisionCommand,
} from '../../../../application/commands/adoption.commands';
import {
  PublicPublicationsQuery,
  OrganizationPublicationsQuery,
  AdoptionRequestsQuery,
} from '../../../../application/queries/adoption.queries';
import {
  CreatePublicationDto,
  UpdatePublicationDto,
  PublicationDecisionDto,
  ReviewPublicationDto,
  SubmitAdoptionRequestDto,
  AdoptionRequestDecisionDto,
  ReviewAdoptionRequestDto,
  PublicationParamsDto,
  PublicPhotoParamsDto,
  OrganizationPublicationsParamsDto,
  AdoptionRequestParamsDto,
  AdoptionPaginationDto,
  PrivatePublicationsQueryDto,
  AdoptionRequestsQueryDto,
  PublicPublicationsQueryDto,
} from '../dtos/requests/adoption.requests';
import {
  PublicationResponseDto,
  PublicPublicationResponseDto,
  PublicPublicationsResponseDto,
  PrivatePublicationsResponseDto,
  AdoptionRequestResponseDto,
  AdoptionRequestsResponseDto,
  AdoptionRequestDetailDto,
  PublicationDeletedDto,
  AdoptionAuditResponseDto,
} from '../dtos/responses/adoption.responses';
import { AdoptionHttpMapper as Mapper } from '../mappers/adoption-http.mapper';
@ApiTags('Adoptions')
@DocumentErrors()
@Controller('adoptions/publications')
export class PublicAdoptionsController {
  constructor(
    @Inject(ADOPTIONS_USE_CASES) private readonly adoptions: AdoptionsUseCases,
  ) {}
  @Get()
  @ApiOperation({
    operationId: 'listPublicAdoptions',
    summary: 'Browse available reviewed adoption publications',
    description:
      'Public cursor pagination, limit 1–50. At most 200 candidates are scanned per request; continue with nextCursor until null. Current active adoption entity, active animal and at least one still-attached approved photo are checked through public ports. Private clinical notes, microchip, ownership/user contact, moderation reasons and applicant data are excluded. No payments or sales.',
  })
  @ApiOkResponse({ type: PublicPublicationsResponseDto })
  @ZodSerializerDto(PublicPublicationsResponseDto)
  async list(
    @Query() dto: PublicPublicationsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    const page = await this.adoptions.publicList(
      new PublicPublicationsQuery(
        dto.limit,
        dto.cursor,
        dto.search,
        dto.species,
        dto.countryCode,
        dto.city,
      ),
    );
    return { ...page, items: page.items.map(Mapper.public) };
  }
  @Get(':publicationId')
  @ApiOperation({
    operationId: 'getPublicAdoption',
    summary: 'Read an available reviewed adoption listing',
    description:
      'Public safe snapshot and adoption conditions. Suspended entity, unavailable animal, unpublished listing or detached last approved photo return 404. Eligibility is read from current PostgreSQL state; no-store prevents caching stale visibility.',
  })
  @ApiOkResponse({ type: PublicPublicationResponseDto })
  @ZodSerializerDto(PublicPublicationResponseDto)
  async get(
    @Param() params: PublicationParamsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return Mapper.public(await this.adoptions.publicGet(params.publicationId));
  }
  @Get(':publicationId/photos/:mediaId')
  @ApiOperation({
    operationId: 'getPublicAdoptionPhoto',
    summary: 'Read a sanitized photo attached to an available listing',
    description:
      'Public access only while the listing, animal and entity are currently eligible and this exact photo remains in the approved snapshot and current attachment list. Storage is private; no-store JPEG response.',
  })
  @ApiOkResponse({
    content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } },
  })
  async photo(
    @Param() params: PublicPhotoParamsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(
      Buffer.from(
        await this.adoptions.publicPhoto(params.publicationId, params.mediaId),
      ),
      { type: 'image/jpeg' },
    );
  }
}
@ApiTags('Adoptions')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('adoptions')
export class AdoptionsController {
  constructor(
    @Inject(ADOPTIONS_USE_CASES) private readonly adoptions: AdoptionsUseCases,
  ) {}
  @Post('publications')
  @ApiOperation({
    operationId: 'createAdoptionPublication',
    summary: 'Create a shelter animal adoption draft',
    description:
      'Requires adoptions.publications.manage in the active adoption entity owning the active animal. At most one open draft/listing per animal. No publication or role is granted automatically; submit and moderation are required.',
  })
  @ApiCreatedResponse({ type: PublicationResponseDto })
  @ZodSerializerDto(PublicationResponseDto)
  async create(
    @Body() dto: CreatePublicationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.publication(
      await this.adoptions.create(
        new CreatePublicationCommand(
          req.principal.userId,
          dto.animalId,
          dto.profile,
          dto.reason,
          req.requestId,
        ),
      ),
    );
  }
  @Get('moderation/publications')
  @ApiOperation({
    operationId: 'listAdoptionModerationQueue',
    summary: 'Read pending adoption publications for moderation',
    description:
      'Requires current active verified moderator or super_admin. Bounded pagination ordered oldest submission first. Includes pending snapshot and review metadata; organization/animal availability is rechecked on the decision. No applicant records or private animal clinical fields.',
  })
  @ApiOkResponse({ type: PrivatePublicationsResponseDto })
  @ZodSerializerDto(PrivatePublicationsResponseDto)
  async moderation(
    @Query() dto: AdoptionPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const page = await this.adoptions.moderation(
      req.principal.userId,
      dto.page,
      dto.limit,
    );
    return { ...page, items: page.items.map(Mapper.publication) };
  }
  @Get('organizations/:organizationId/publications')
  @ApiOperation({
    operationId: 'listManagedAdoptionPublications',
    summary: 'List authorized shelter publications',
    description:
      'Active shelter publication permission required. Bounded pagination and status filter. Includes draft/review metadata; this is a private administration endpoint.',
  })
  @ApiOkResponse({ type: PrivatePublicationsResponseDto })
  @ZodSerializerDto(PrivatePublicationsResponseDto)
  async managed(
    @Param() params: OrganizationPublicationsParamsDto,
    @Query() dto: PrivatePublicationsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const page = await this.adoptions.list(
      new OrganizationPublicationsQuery(
        req.principal.userId,
        params.organizationId,
        dto.page,
        dto.limit,
        dto.status,
      ),
    );
    return { ...page, items: page.items.map(Mapper.publication) };
  }
  @Get('publications/:publicationId/manage')
  @ApiOperation({
    operationId: 'getManagedAdoptionPublication',
    summary: 'Read an authorized private publication',
    description:
      'Requires publication management permission in the active owning adoption entity, or current global moderator/super_admin for administrative inspection. Public reads use the separate public detail endpoint.',
  })
  @ApiOkResponse({ type: PublicationResponseDto })
  @ZodSerializerDto(PublicationResponseDto)
  async detail(
    @Param() params: PublicationParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.publication(
      await this.adoptions.get(req.principal.userId, params.publicationId),
    );
  }
  @Patch('publications/:publicationId')
  @ApiOperation({
    operationId: 'updateAdoptionPublication',
    summary: 'Edit a publication and require renewed moderation',
    description:
      'Requires active shelter management, reason and expectedVersion. Pending/closed/deleted listings cannot be edited. Real edits return the listing to draft; its public visibility stops immediately. The approved animal snapshot is refreshed only on submission.',
  })
  @ApiOkResponse({ type: PublicationResponseDto })
  @ZodSerializerDto(PublicationResponseDto)
  async update(
    @Param() params: PublicationParamsDto,
    @Body() dto: UpdatePublicationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.publication(
      await this.adoptions.update(
        new UpdatePublicationCommand(
          req.principal.userId,
          params.publicationId,
          dto.expectedVersion,
          dto.reason,
          req.requestId,
          dto.profile,
        ),
      ),
    );
  }
  @Post('publications/:publicationId/submit')
  @ApiOperation({
    operationId: 'submitAdoptionPublication',
    summary: 'Submit a publication for moderation',
    description:
      'Requires active shelter management, active animal and at least one sanitized attached photo. Draft/rejected/paused only; captures a safe animal snapshot. Reason and expectedVersion required; stale writes return 409.',
  })
  @ApiCreatedResponse({ type: PublicationResponseDto })
  @ZodSerializerDto(PublicationResponseDto)
  async submit(
    @Param() params: PublicationParamsDto,
    @Body() dto: PublicationDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.publication(
      await this.adoptions.submit(
        new PublicationDecisionCommand(
          req.principal.userId,
          params.publicationId,
          dto.expectedVersion,
          dto.reason,
          req.requestId,
        ),
      ),
    );
  }
  @Post('publications/:publicationId/pause')
  @ApiOperation({
    operationId: 'pauseAdoptionPublication',
    summary: 'Pause an available adoption listing',
    description:
      'Requires active shelter management. Paused listings stop public reads and new requests immediately. Resume requires resubmission and explicit moderation. Reason and expectedVersion required; stale writes return 409.',
  })
  @ApiCreatedResponse({ type: PublicationResponseDto })
  @ZodSerializerDto(PublicationResponseDto)
  async pause(
    @Param() params: PublicationParamsDto,
    @Body() dto: PublicationDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.publication(
      await this.adoptions.pause(
        new PublicationDecisionCommand(
          req.principal.userId,
          params.publicationId,
          dto.expectedVersion,
          dto.reason,
          req.requestId,
        ),
      ),
    );
  }
  @Post('publications/:publicationId/review')
  @ApiOperation({
    operationId: 'reviewAdoptionPublication',
    summary: 'Moderate a pending adoption publication',
    description:
      'Requires current moderator or super_admin global moderation permission, active entity/animal and an attached approved photo. Publication creators and members of its entity cannot moderate their own listing. Explicit approved boolean, reason and expectedVersion required; review and audit are atomic.',
  })
  @ApiCreatedResponse({ type: PublicationResponseDto })
  @ZodSerializerDto(PublicationResponseDto)
  async review(
    @Param() params: PublicationParamsDto,
    @Body() dto: ReviewPublicationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.publication(
      await this.adoptions.review(
        new ReviewPublicationCommand(
          req.principal.userId,
          params.publicationId,
          dto.expectedVersion,
          dto.reason,
          req.requestId,
          dto.approved,
        ),
      ),
    );
  }
  @Delete('publications/:publicationId')
  @ApiOperation({
    operationId: 'archiveAdoptionPublication',
    summary: 'Archive a publication and close its open requests',
    description:
      'Requires active shelter management and JSON reason/expectedVersion. Logical terminal archive; history preserved, all open requests closed atomically, no adoption inferred. Repeated archive is a no-op.',
  })
  @ApiOkResponse({ type: PublicationDeletedDto })
  @ZodSerializerDto(PublicationDeletedDto)
  async archive(
    @Param() params: PublicationParamsDto,
    @Body() dto: PublicationDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.adoptions.archive(
      new PublicationDecisionCommand(
        req.principal.userId,
        params.publicationId,
        dto.expectedVersion,
        dto.reason,
        req.requestId,
      ),
    );
    return { message: 'Publication archived.' };
  }
  @Post('publications/:publicationId/requests')
  @ApiOperation({
    operationId: 'submitAdoptionRequest',
    summary: 'Apply for adoption with explicit contact consent',
    description:
      'Requires active verified customer and current phone/country/city profile. Published eligible listing only; organization members cannot apply to their own shelter. Consent=true accepts conditions and sharing current contact with that entity. One open request per applicant/listing; no checkout or automatic approval.',
  })
  @ApiCreatedResponse({ type: AdoptionRequestResponseDto })
  @ZodSerializerDto(AdoptionRequestResponseDto)
  async apply(
    @Param() params: PublicationParamsDto,
    @Body() dto: SubmitAdoptionRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.request(
      await this.adoptions.apply(
        new SubmitAdoptionRequestCommand(
          req.principal.userId,
          params.publicationId,
          dto.message,
          dto.consent,
          req.requestId,
          dto.expectedPublicationVersion,
        ),
      ),
    );
  }
  @Get('requests/me')
  @ApiOperation({
    operationId: 'listMyAdoptionRequests',
    summary: 'List your own adoption applications',
    description:
      'Active verified account, bounded page/limit and status filters. Only current applicant UUID; other applicants are not returned. Own application access remains available during entity suspension.',
  })
  @ApiOkResponse({ type: AdoptionRequestsResponseDto })
  @ZodSerializerDto(AdoptionRequestsResponseDto)
  async mine(
    @Query() dto: AdoptionRequestsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const page = await this.adoptions.requests(
      new AdoptionRequestsQuery(
        req.principal.userId,
        null,
        dto.page,
        dto.limit,
        dto.status,
      ),
    );
    return { ...page, items: page.items.map(Mapper.request) };
  }
  @Get('publications/:publicationId/requests')
  @ApiOperation({
    operationId: 'listShelterAdoptionRequests',
    summary: 'List applications for an authorized shelter publication',
    description:
      'Requires adoptions.requests.review in the active owning entity. Bounded pagination and status filters. Contact is read through the separately authorized individual request detail, not copied into list results.',
  })
  @ApiOkResponse({ type: AdoptionRequestsResponseDto })
  @ZodSerializerDto(AdoptionRequestsResponseDto)
  async requests(
    @Param() params: PublicationParamsDto,
    @Query() dto: AdoptionRequestsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const page = await this.adoptions.requests(
      new AdoptionRequestsQuery(
        req.principal.userId,
        params.publicationId,
        dto.page,
        dto.limit,
        dto.status,
      ),
    );
    return { ...page, items: page.items.map(Mapper.request) };
  }
  @Get('requests/:adoptionRequestId')
  @ApiOperation({
    operationId: 'getAdoptionRequest',
    summary: 'Read your application or an authorized shelter request',
    description:
      'Only applicant or current shelter reviewer. Contact is fetched from the public UsersDirectory port; account anonymization yields contact=null. No address, birth date, credentials or other requests are exposed.',
  })
  @ApiOkResponse({ type: AdoptionRequestDetailDto })
  @ZodSerializerDto(AdoptionRequestDetailDto)
  async request(
    @Param() params: AdoptionRequestParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.adoptions.request(
      req.principal.userId,
      params.adoptionRequestId,
    );
    return { ...Mapper.request(result), contact: result.contact };
  }
  @Patch('requests/:adoptionRequestId/review')
  @ApiOperation({
    operationId: 'reviewAdoptionRequest',
    summary: 'Move an application into review, approval or rejection',
    description:
      'Requires current active shelter review permission and available published listing. Applicants cannot review their own application. Only one approved applicant per listing. Approval requires an active verified applicant and does not mark the animal adopted. Reason and expectedVersion required.',
  })
  @ApiOkResponse({ type: AdoptionRequestResponseDto })
  @ZodSerializerDto(AdoptionRequestResponseDto)
  async reviewRequest(
    @Param() params: AdoptionRequestParamsDto,
    @Body() dto: ReviewAdoptionRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.request(
      await this.adoptions.reviewRequest(
        new AdoptionRequestDecisionCommand(
          req.principal.userId,
          params.adoptionRequestId,
          dto.expectedVersion,
          dto.reason,
          req.requestId,
          dto.status,
        ),
      ),
    );
  }
  @Post('requests/:adoptionRequestId/withdraw')
  @ApiOperation({
    operationId: 'withdrawAdoptionRequest',
    summary: 'Withdraw your own adoption application',
    description:
      'Only the active verified applicant. Submitted/in_review/approved applications may be withdrawn even during entity suspension; completed requests cannot. Repeated withdrawal is a no-op. Reason and expectedVersion are required; stale or conflicting decisions return 409.',
  })
  @ApiCreatedResponse({ type: AdoptionRequestResponseDto })
  @ZodSerializerDto(AdoptionRequestResponseDto)
  async withdraw(
    @Param() params: AdoptionRequestParamsDto,
    @Body() dto: AdoptionRequestDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.request(
      await this.adoptions.withdraw(
        new AdoptionRequestDecisionCommand(
          req.principal.userId,
          params.adoptionRequestId,
          dto.expectedVersion,
          dto.reason,
          req.requestId,
        ),
      ),
    );
  }
  @Post('requests/:adoptionRequestId/complete')
  @ApiOperation({
    operationId: 'completeAdoptionRequest',
    summary: 'Explicitly confirm a completed adoption',
    description:
      'Requires active shelter reviewer, approved active verified applicant and available published animal. Applicant self-confirmation is forbidden. Atomically sets request completed, listing closed and animal adopted, closes other open requests and records immutable audits. This records the shelter confirmation of handover; no sale or payment. Reason and expectedVersion are required; stale or conflicting decisions return 409.',
  })
  @ApiCreatedResponse({ type: AdoptionRequestResponseDto })
  @ZodSerializerDto(AdoptionRequestResponseDto)
  async complete(
    @Param() params: AdoptionRequestParamsDto,
    @Body() dto: AdoptionRequestDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.request(
      await this.adoptions.complete(
        new AdoptionRequestDecisionCommand(
          req.principal.userId,
          params.adoptionRequestId,
          dto.expectedVersion,
          dto.reason,
          req.requestId,
        ),
      ),
    );
  }
  @Get('publications/:publicationId/audit')
  @ApiOperation({
    operationId: 'listAdoptionAudit',
    summary: 'Read the authorized adoption decision history',
    description:
      'Active shelter publication management required. Bounded paginated immutable lifecycle/request events, UUIDs, reason and HTTP correlation; no applicant contact or photo bytes.',
  })
  @ApiOkResponse({ type: AdoptionAuditResponseDto })
  @ZodSerializerDto(AdoptionAuditResponseDto)
  async audit(
    @Param() params: PublicationParamsDto,
    @Query() dto: AdoptionPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const page = await this.adoptions.audits(
      req.principal.userId,
      params.publicationId,
      dto.page,
      dto.limit,
    );
    return {
      ...page,
      items: page.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}
