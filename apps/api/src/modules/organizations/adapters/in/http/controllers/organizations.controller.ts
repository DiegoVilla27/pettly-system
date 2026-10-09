import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Patch,
  Query,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import {
  ORGANIZATIONS_USE_CASES,
  type OrganizationsUseCases,
} from '../../../../application/ports/in/organizations-use-cases';
import {
  CreateOrganizationCommand,
  AssignMembershipRoleCommand,
  RemoveMembershipRoleCommand,
} from '../../../../application/commands/organization.commands';
import { GetOrganizationQuery } from '../../../../application/queries/get-organization.query';
import {
  CreateOrganizationRequestDto,
  OrganizationParamsDto,
  MembershipParamsDto,
  AssignMembershipRequestDto,
  RemoveMembershipRequestDto,
} from '../dtos/requests/organization.requests';
import {
  OrganizationResponseDto,
  MembershipResponseDto,
  MembershipRemovedResponseDto,
} from '../dtos/responses/organization.responses';
import { OrganizationHttpMapper as Mapper } from '../mappers/organization-http.mapper';
import {
  RequestOrganizationCommand,
  UpdateOrganizationProfileCommand,
  OrganizationDecisionCommand,
  OrganizationStatusCommand,
} from '../../../../application/commands/organization-lifecycle.commands';
import {
  ListOrganizationsQuery,
  OrganizationPageQuery,
} from '../../../../application/queries/organization-management.queries';
import {
  RequestOrganizationDto,
  UpdateOrganizationProfileDto,
  OrganizationDecisionDto,
  OrganizationResponsibleDto,
  OrganizationStatusDto,
  ListOrganizationsDto,
  OrganizationPaginationDto,
} from '../dtos/requests/organization.requests';
import {
  OrganizationProfileResponseDto,
  OrganizationPageResponseDto,
  OrganizationMembersResponseDto,
  OrganizationAuditResponseDto,
  OrganizationDeletedDto,
} from '../dtos/responses/organization.responses';
@ApiTags('Organizations')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    @Inject(ORGANIZATIONS_USE_CASES)
    private readonly organizations: OrganizationsUseCases,
  ) {}
  @Post()
  @ApiOperation({
    operationId: 'createOrganization',
    summary: 'Create an organization as a super administrator',
    description:
      'Creates the organization identity and immutable audit event atomically. Requires current active verified super_admin. No membership is granted automatically; assign one using the membership role endpoint. Creates a draft. Submission and explicit approval are required before operational permissions become available.',
  })
  @ApiCreatedResponse({ type: OrganizationResponseDto })
  @ZodSerializerDto(OrganizationResponseDto)
  async create(
    @Body() dto: CreateOrganizationRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.organization(
      await this.organizations.create(
        new CreateOrganizationCommand(
          req.principal.userId,
          dto.name,
          dto.type,
          dto.reason,
          req.requestId,
          dto.profile,
        ),
      ),
    );
  }
  @Post('requests')
  @ApiOperation({
    operationId: 'requestOrganization',
    summary: 'Start organization onboarding',
    description:
      'Requires an active verified account. Creates a draft owned by the applicant and grants no organization roles. Unknown fields, including roles and status, are rejected.',
  })
  @ApiCreatedResponse({ type: OrganizationProfileResponseDto })
  @ZodSerializerDto(OrganizationProfileResponseDto)
  async request(
    @Body() dto: RequestOrganizationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.profile(
      await this.organizations.request(
        new RequestOrganizationCommand(
          req.principal.userId,
          dto.name,
          dto.type,
          dto.profile ?? {},
          req.requestId,
        ),
      ),
    );
  }
  @Get()
  @ApiOperation({
    operationId: 'listOrganizations',
    summary: 'Search organizations as a super administrator',
    description:
      'Bounded pagination and name, legal name or registration search; filters by status, type and country. Returns basic identity without private contact or legal data.',
  })
  @ApiOkResponse({ type: OrganizationPageResponseDto })
  @ZodSerializerDto(OrganizationPageResponseDto)
  async list(
    @Query() dto: ListOrganizationsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationList(dto, req, false);
  }
  @Get('me')
  @ApiOperation({
    operationId: 'listMyOrganizations',
    summary: 'List own applications and memberships',
    description:
      'Requires an active verified account. Archived organizations are always excluded, even when status=deleted is requested. Returns basic identity only.',
  })
  @ApiOkResponse({ type: OrganizationPageResponseDto })
  @ZodSerializerDto(OrganizationPageResponseDto)
  async mine(
    @Query() dto: ListOrganizationsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationList(dto, req, true);
  }
  private async organizationList(
    dto: ListOrganizationsDto,
    req: AuthenticatedRequest,
    mine: boolean,
  ) {
    const page = await this.organizations.list(
      new ListOrganizationsQuery(
        req.principal.userId,
        dto.page,
        dto.limit,
        dto.search,
        dto.status,
        dto.type,
        dto.countryCode,
        mine,
      ),
    );
    return { ...page, items: page.items.map(Mapper.organization) };
  }
  @Get(':organizationId/profile')
  @ApiOperation({
    operationId: 'getOrganizationProfile',
    summary: 'Read private organization profile',
    description:
      'Restricted to super_admin, organization administrators, or the applicant while draft, pending or rejected. Operators and moderators cannot read private profiles.',
  })
  @ApiOkResponse({ type: OrganizationProfileResponseDto })
  @ZodSerializerDto(OrganizationProfileResponseDto)
  async profile(
    @Param() params: OrganizationParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.profile(
      await this.organizations.profile(
        new GetOrganizationQuery(req.principal.userId, params.organizationId),
      ),
    );
  }
  @Patch(':organizationId/profile')
  @ApiOperation({
    operationId: 'updateOrganizationProfile',
    summary: 'Update validated organization profile',
    description:
      'Requires private profile access, reason and current expectedVersion. Non-superadmins cannot edit pending or suspended profiles. Changes to an active legal identity require renewed approval and immediately stop operational permissions. Repeating unchanged fields is a no-op.',
  })
  @ApiOkResponse({ type: OrganizationProfileResponseDto })
  @ZodSerializerDto(OrganizationProfileResponseDto)
  async updateProfile(
    @Param() params: OrganizationParamsDto,
    @Body() dto: UpdateOrganizationProfileDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.profile(
      await this.organizations.updateProfile(
        new UpdateOrganizationProfileCommand(
          req.principal.userId,
          params.organizationId,
          dto.profile,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
        ),
      ),
    );
  }
  @Post(':organizationId/submit')
  @ApiOperation({
    operationId: 'submitOrganization',
    summary: 'Submit a complete organization for review',
    description:
      'Draft or rejected applications only. Requires applicant or administrator access and a complete legal/contact profile. Submission grants no roles. Requires reason and current expectedVersion; stale writes return HTTP 409.',
  })
  @ApiCreatedResponse({ type: OrganizationProfileResponseDto })
  @ZodSerializerDto(OrganizationProfileResponseDto)
  async submit(
    @Param() params: OrganizationParamsDto,
    @Body() dto: OrganizationDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.profile(
      await this.organizations.submit(
        new OrganizationDecisionCommand(
          req.principal.userId,
          params.organizationId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
        ),
      ),
    );
  }
  @Post(':organizationId/approve')
  @ApiOperation({
    operationId: 'approveOrganization',
    summary:
      'Approve an organization and appoint its responsible administrator',
    description:
      'Exclusive to super_admin. Pending applications only. Responsible account must be active and verified. Approval and the explicit type-compatible administrator assignment are atomic. Requires reason and current expectedVersion; stale writes return HTTP 409.',
  })
  @ApiCreatedResponse({ type: OrganizationProfileResponseDto })
  @ZodSerializerDto(OrganizationProfileResponseDto)
  async approve(
    @Param() params: OrganizationParamsDto,
    @Body() dto: OrganizationResponsibleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.profile(
      await this.organizations.approve(
        new OrganizationDecisionCommand(
          req.principal.userId,
          params.organizationId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
          dto.responsibleUserId,
        ),
      ),
    );
  }
  @Post(':organizationId/reject')
  @ApiOperation({
    operationId: 'rejectOrganization',
    summary: 'Reject an organization application',
    description:
      'Exclusive to super_admin. Pending applications only. Reason is preserved for correction and later resubmission. Requires reason and current expectedVersion; stale writes return HTTP 409.',
  })
  @ApiCreatedResponse({ type: OrganizationProfileResponseDto })
  @ZodSerializerDto(OrganizationProfileResponseDto)
  async reject(
    @Param() params: OrganizationParamsDto,
    @Body() dto: OrganizationDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.profile(
      await this.organizations.reject(
        new OrganizationDecisionCommand(
          req.principal.userId,
          params.organizationId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
        ),
      ),
    );
  }
  @Patch(':organizationId/status')
  @ApiOperation({
    operationId: 'updateOrganizationStatus',
    summary: 'Suspend or reactivate an approved organization',
    description:
      'Exclusive to super_admin. Only active/suspended transitions are supported. Reactivation requires a complete profile and an active verified responsible administrator. Operational permissions change immediately; memberships and audit remain. Requires reason and expectedVersion.',
  })
  @ApiOkResponse({ type: OrganizationProfileResponseDto })
  @ZodSerializerDto(OrganizationProfileResponseDto)
  async status(
    @Param() params: OrganizationParamsDto,
    @Body() dto: OrganizationStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.profile(
      await this.organizations.status(
        new OrganizationStatusCommand(
          req.principal.userId,
          params.organizationId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
          dto.status,
        ),
      ),
    );
  }
  @Patch(':organizationId/responsible')
  @ApiOperation({
    operationId: 'transferOrganizationResponsibility',
    summary: 'Transfer responsibility to an active verified administrator',
    description:
      'Exclusive to super_admin. Active or suspended organizations only. Assigns the appropriate administrator membership atomically; previous administrator membership remains. Transfer first before removing or demoting the responsible administrator. Requires reason and expectedVersion.',
  })
  @ApiOkResponse({ type: OrganizationProfileResponseDto })
  @ZodSerializerDto(OrganizationProfileResponseDto)
  async responsible(
    @Param() params: OrganizationParamsDto,
    @Body() dto: OrganizationResponsibleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.profile(
      await this.organizations.responsible(
        new OrganizationDecisionCommand(
          req.principal.userId,
          params.organizationId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
          dto.responsibleUserId,
        ),
      ),
    );
  }
  @Delete(':organizationId')
  @ApiOperation({
    operationId: 'archiveOrganization',
    summary: 'Archive an organization permanently',
    description:
      'Exclusive to super_admin. Requires JSON reason and expectedVersion. Clears contact/legal profile and blocks all organization access except superadmin historical inspection. UUIDs, memberships and audit are retained. No restoration; repeating archive is a no-op.',
  })
  @ApiOkResponse({ type: OrganizationDeletedDto })
  @ZodSerializerDto(OrganizationDeletedDto)
  async archive(
    @Param() params: OrganizationParamsDto,
    @Body() dto: OrganizationDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.organizations.archive(
      new OrganizationDecisionCommand(
        req.principal.userId,
        params.organizationId,
        dto.reason,
        req.requestId,
        dto.expectedVersion,
      ),
    );
    return { message: 'Organization archived.' };
  }
  @Get(':organizationId/members')
  @ApiOperation({
    operationId: 'listOrganizationMembers',
    summary: 'List organization memberships',
    description:
      'Restricted to super_admin and administrators of this organization. Bounded pagination; exposes membership UUID, user UUID, role and timestamps without user contact information. Only super_admin may change roles.',
  })
  @ApiOkResponse({ type: OrganizationMembersResponseDto })
  @ZodSerializerDto(OrganizationMembersResponseDto)
  async members(
    @Param() params: OrganizationParamsDto,
    @Query() dto: OrganizationPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const page = await this.organizations.members(
      new OrganizationPageQuery(
        req.principal.userId,
        params.organizationId,
        dto.page,
        dto.limit,
      ),
    );
    return { ...page, items: page.items.map(Mapper.membership) };
  }
  @Get(':organizationId/audit')
  @ApiOperation({
    operationId: 'listOrganizationAudit',
    summary: 'Read immutable organization audit as a super administrator',
    description:
      'Bounded pagination of lifecycle and membership decisions, actor/target UUIDs, justification, request correlation and timestamp. Profile values and credentials are never copied into audit events.',
  })
  @ApiOkResponse({ type: OrganizationAuditResponseDto })
  @ZodSerializerDto(OrganizationAuditResponseDto)
  async audits(
    @Param() params: OrganizationParamsDto,
    @Query() dto: OrganizationPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const page = await this.organizations.audits(
      new OrganizationPageQuery(
        req.principal.userId,
        params.organizationId,
        dto.page,
        dto.limit,
      ),
    );
    return {
      ...page,
      items: page.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
  @Get(':organizationId')
  @ApiOperation({
    operationId: 'getOrganization',
    summary: 'Read permitted organization identity',
    description:
      'Requires an active verified account with membership in this organization, moderator or super_admin. Membership in a different organization grants no access. Returns basic identity only; members and customer records are not exposed.',
  })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ZodSerializerDto(OrganizationResponseDto)
  async get(
    @Param() params: OrganizationParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.organization(
      await this.organizations.get(
        new GetOrganizationQuery(req.principal.userId, params.organizationId),
      ),
    );
  }
  @Put(':organizationId/members/:userId/role')
  @ApiOperation({
    operationId: 'assignOrganizationRole',
    summary: 'Assign or replace an organization role as a super administrator',
    description:
      'Exclusive to current active verified super_admin, including administrator membership assignments. Target must be active and verified. Business roles require a business; adoption roles require an adoption_entity. Unique membership per user/organization; users may belong to multiple organizations. Role changes and audit are atomic. Repeating the role is a no-op. Existing sessions remain usable and permissions are read from PostgreSQL on each authorized operation; global user role is preserved.',
  })
  @ApiOkResponse({ type: MembershipResponseDto })
  @ZodSerializerDto(MembershipResponseDto)
  async assign(
    @Param() params: MembershipParamsDto,
    @Body() dto: AssignMembershipRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.membership(
      await this.organizations.assign(
        new AssignMembershipRoleCommand(
          req.principal.userId,
          params.organizationId,
          params.userId,
          dto.role,
          dto.reason,
          req.requestId,
        ),
      ),
    );
  }
  @Delete(':organizationId/members/:userId/role')
  @ApiOperation({
    operationId: 'removeOrganizationRole',
    summary: 'Remove an organization role as a super administrator',
    description:
      'Requires super_admin and a JSON body with reason. Removes only this membership and appends an immutable audit event atomically. Permissions disappear on subsequent operations; other memberships and customer access remain. Already absent membership is a no-op.',
  })
  @ApiOkResponse({ type: MembershipRemovedResponseDto })
  @ZodSerializerDto(MembershipRemovedResponseDto)
  async remove(
    @Param() params: MembershipParamsDto,
    @Body() dto: RemoveMembershipRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.organizations.remove(
      new RemoveMembershipRoleCommand(
        req.principal.userId,
        params.organizationId,
        params.userId,
        dto.reason,
        req.requestId,
      ),
    );
    return { message: 'Organization role removed.' };
  }
}
