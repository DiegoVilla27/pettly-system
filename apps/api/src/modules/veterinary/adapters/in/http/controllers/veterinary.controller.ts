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
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import type { Response } from 'express';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import { RatePolicy } from '../../../../../../shared/infrastructure/http/security.guard';
import { ApplicationError } from '../../../../../../shared/domain/application-error';
import {
  VETERINARY_USE_CASES,
  type VeterinaryUseCases,
} from '../../../../application/ports/in/veterinary-use-cases';
import {
  ConfigureCredentialCommand,
  CredentialActionCommand,
  CredentialDocumentCommand,
} from '../../../../application/commands/credential.commands';
import {
  CredentialQuery,
  CredentialsQuery,
} from '../../../../application/queries/credential.queries';
import * as R from '../dtos/requests/veterinary.requests';
import * as S from '../dtos/responses/veterinary.responses';
import { VeterinaryHttpMapper as M } from '../mappers/veterinary-http.mapper';
@ApiTags('Veterinary accreditation')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('veterinary/credentials')
export class VeterinaryController {
  constructor(
    @Inject(VETERINARY_USE_CASES) private readonly use: VeterinaryUseCases,
  ) {}
  @Post()
  @ApiOperation({
    operationId: 'createVeterinaryCredential',
    summary: 'Create a private professional accreditation profile',
    description:
      'Professional or global superadmin. Active verified professional with current business membership in Colombia, a dedicated appointment resource with capacity one and explicit consent. UUID/versioned evidence; no automatic approval.',
  })
  @ApiCreatedResponse({ type: S.CredentialResponseDto })
  @ZodSerializerDto(S.CredentialResponseDto)
  async create(
    @Body() d: R.CreateCredentialDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.credential(
      await this.use.configure(
        new ConfigureCredentialCommand(
          r.principal.userId,
          d.organizationId,
          d.professionalId,
          d.resourceId,
          d.profile,
          d.reason,
          r.requestId,
        ),
      ),
    );
  }
  @Patch(':credentialId')
  @ApiOperation({
    operationId: 'configureVeterinaryCredential',
    summary: 'Correct qualification data and require fresh independent review',
    description:
      'Professional or superadmin; identity/schedule immutable, pending evidence frozen, stale version 409. Any change withdraws approval immediately.',
  })
  @ApiOkResponse({ type: S.CredentialResponseDto })
  @ZodSerializerDto(S.CredentialResponseDto)
  async configure(
    @Param() p: R.CredentialParamsDto,
    @Body() d: R.ConfigureCredentialDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.credential(
      await this.use.configure(
        new ConfigureCredentialCommand(
          r.principal.userId,
          d.organizationId,
          d.professionalId,
          d.resourceId,
          d.profile,
          d.reason,
          r.requestId,
          p.credentialId,
          d.expectedVersion,
        ),
      ),
    );
  }
  @Get()
  @ApiOperation({
    operationId: 'listVeterinaryCredentials',
    summary: 'Review the bounded accreditation queue as superadmin',
    description:
      'Global superadmin only. Private identity/evidence metadata, optional organization/status filters and bounded pagination; document bytes fetched separately.',
  })
  @ApiOkResponse({ type: S.CredentialsResponseDto })
  @ZodSerializerDto(S.CredentialsResponseDto)
  async list(
    @Query() d: R.CredentialsFilterDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const page = await this.use.list(
      new CredentialsQuery(
        r.principal.userId,
        d.page,
        d.limit,
        d.organizationId,
        d.status,
      ),
    );
    return {
      ...page,
      items: page.items.map(M.credential),
      page: d.page,
      limit: d.limit,
    };
  }
  @Get(':credentialId')
  @ApiOperation({
    operationId: 'getVeterinaryCredential',
    summary: 'Read authorized private accreditation metadata',
    description:
      'Professional owner or global superadmin only; company administrators and public customers cannot read another professional’s documents.',
  })
  @ApiOkResponse({ type: S.CredentialResponseDto })
  @ZodSerializerDto(S.CredentialResponseDto)
  async get(@Param() p: R.CredentialParamsDto, @Req() r: AuthenticatedRequest) {
    return M.credential(
      await this.use.get(
        new CredentialQuery(r.principal.userId, p.credentialId),
      ),
    );
  }
  @Post(':credentialId/documents')
  @RatePolicy(20, 60)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'kind', 'reason', 'expectedVersion'],
      properties: {
        file: { type: 'string', format: 'binary' },
        kind: {
          type: 'string',
          enum: ['professional_card', 'qualification', 'standing_certificate'],
        },
        reason: { type: 'string', minLength: 10, maxLength: 500 },
        expectedVersion: { type: 'integer', minimum: 1 },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 3 },
    }),
  )
  @ApiOperation({
    operationId: 'uploadVeterinaryEvidence',
    summary: 'Upload a sanitized private document image',
    description:
      'Authenticated professional/superadmin authorization rechecked before decoding. Single-frame JPEG/PNG/WebP only, 5 MiB input, 20 MP decode, sanitized JPEG output <=2 MiB. At most six pages; PDF/URLs unsupported. Any edit removes approval, pending review frozen. Media/audit update is atomic.',
  })
  @ApiCreatedResponse({ type: S.CredentialResponseDto })
  @ZodSerializerDto(S.CredentialResponseDto)
  async upload(
    @Param() p: R.CredentialParamsDto,
    @Body() d: R.UploadCredentialDto,
    @UploadedFile() f: { buffer: Buffer; mimetype: string } | undefined,
    @Req() r: AuthenticatedRequest,
  ) {
    if (!f)
      throw new ApplicationError(
        'INVALID_INPUT',
        'A document image is required.',
      );
    return M.credential(
      await this.use.upload(
        new CredentialDocumentCommand(
          r.principal.userId,
          p.credentialId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          d.kind,
          f.buffer,
          f.mimetype,
        ),
      ),
    );
  }
  @Get(':credentialId/documents/:mediaId')
  @ApiOperation({
    operationId: 'readVeterinaryEvidence',
    summary: 'Read an authorized sanitized accreditation image',
    description:
      'Professional or superadmin only; exact credential attachment, image/jpeg and no-store. Does not expose arbitrary storage paths.',
  })
  @ApiOkResponse({
    content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } },
  })
  async document(
    @Param() p: R.DocumentParamsDto,
    @Req() r: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(
      Buffer.from(
        await this.use.document(
          new CredentialQuery(r.principal.userId, p.credentialId),
          p.mediaId,
        ),
      ),
      { type: 'image/jpeg' },
    );
  }
  @Delete(':credentialId/documents/:mediaId')
  @ApiOperation({
    operationId: 'removeVeterinaryEvidence',
    summary: 'Detach private evidence and purge its bytes atomically',
    description:
      'Professional or superadmin; audited reason/current version. Pending evidence frozen; removal withdraws approval, retains immutable metadata audit and disables new clinical bookings.',
  })
  @ApiOkResponse({ type: S.CredentialResponseDto })
  @ZodSerializerDto(S.CredentialResponseDto)
  async remove(
    @Param() p: R.DocumentParamsDto,
    @Body() d: R.CredentialDecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.credential(
      await this.use.remove(
        new CredentialDocumentCommand(
          r.principal.userId,
          p.credentialId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          'professional_card',
          new Uint8Array(),
          'image/jpeg',
          p.mediaId,
        ),
      ),
    );
  }
  @Post(':credentialId/submit')
  @ApiOperation({
    operationId: 'submitVeterinaryCredential',
    summary: 'Submit complete private evidence for independent review',
    description:
      'Card, qualification and standing certificate images required; active professional/business membership rechecked. Upload is evidence, never automatic legal verification.',
  })
  @ApiCreatedResponse({ type: S.CredentialResponseDto })
  @ZodSerializerDto(S.CredentialResponseDto)
  async submit(
    @Param() p: R.CredentialParamsDto,
    @Body() d: R.CredentialDecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.credential(
      await this.use.action(
        new CredentialActionCommand(
          r.principal.userId,
          p.credentialId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          'submit',
        ),
      ),
    );
  }
  @Post(':credentialId/review')
  @ApiOperation({
    operationId: 'reviewVeterinaryCredential',
    summary: 'Approve or reject evidence after manual official verification',
    description:
      'Global superadmin only; no self/business-member review. Reviewer must attest current COMVEZCOL identity/qualification/registration/authorization check, record a verification reference and a recheck deadline within 90 days. This is Pettly review freshness, not a statutory license expiration. No external register is automatically fetched.',
  })
  @ApiCreatedResponse({ type: S.CredentialResponseDto })
  @ZodSerializerDto(S.CredentialResponseDto)
  async review(
    @Param() p: R.CredentialParamsDto,
    @Body() d: R.ReviewCredentialDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.credential(
      await this.use.action(
        new CredentialActionCommand(
          r.principal.userId,
          p.credentialId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          'review',
          d.approved,
          d.verifiedUntil ? new Date(d.verifiedUntil) : null,
          d.verificationReference,
        ),
      ),
    );
  }
  @Post(':credentialId/revoke')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'revokeVeterinaryCredential',
    summary: 'Withdraw clinical eligibility immediately as superadmin',
    description:
      'Audited current version; stops public eligibility, new bookings and clinical confirmation/start. Existing reservations remain historical and require explicit provider handling, not silent deletion.',
  })
  @ApiOkResponse({ type: S.CredentialResponseDto })
  @ZodSerializerDto(S.CredentialResponseDto)
  async revoke(
    @Param() p: R.CredentialParamsDto,
    @Body() d: R.CredentialDecisionDto,
    @Req() r: AuthenticatedRequest,
  ) {
    return M.credential(
      await this.use.action(
        new CredentialActionCommand(
          r.principal.userId,
          p.credentialId,
          d.expectedVersion,
          d.reason,
          r.requestId,
          'revoke',
        ),
      ),
    );
  }
  @Get(':credentialId/audit')
  @ApiOperation({
    operationId: 'listVeterinaryCredentialAudit',
    summary: 'Read authorized immutable accreditation revisions',
    description:
      'Professional owner or superadmin. Bounded revision metadata/snapshots and administrative reasons; no document bytes or public access.',
  })
  @ApiOkResponse({ type: S.CredentialAuditsDto })
  @ZodSerializerDto(S.CredentialAuditsDto)
  async audits(
    @Param() p: R.CredentialParamsDto,
    @Query() d: R.CredentialPageDto,
    @Req() r: AuthenticatedRequest,
  ) {
    const a = await this.use.audits(
      new CredentialQuery(r.principal.userId, p.credentialId),
      d.page,
      d.limit,
    );
    return {
      ...a,
      items: a.items.map((x) => ({
        ...x,
        snapshot: M.credential(x.snapshot),
        createdAt: x.createdAt.toISOString(),
      })),
    };
  }
}
