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
  UploadedFile,
  UseInterceptors,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiConsumes,
  ApiBody,
  ApiResponse,
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
  ANIMALS_USE_CASES,
  type AnimalsUseCases,
} from '../../../../application/ports/in/animals-use-cases';
import {
  CreateAnimalCommand,
  UpdateAnimalCommand,
  AnimalDecisionCommand,
  UploadAnimalPhotoCommand,
  RemoveAnimalPhotoCommand,
} from '../../../../application/commands/animal.commands';
import {
  GetAnimalQuery,
  ListAnimalsQuery,
} from '../../../../application/queries/animal.queries';
import {
  CreateAnimalDto,
  UpdateAnimalDto,
  AnimalDecisionDto,
  AnimalStatusDto,
  AnimalParamsDto,
  AnimalPhotoParamsDto,
  UploadAnimalPhotoDto,
  ListAnimalsDto,
  AnimalPaginationDto,
} from '../dtos/requests/animal.requests';
import {
  AnimalResponseDto,
  AnimalDetailDto,
  AnimalsPageDto,
  AnimalAuditDto,
} from '../dtos/responses/animal.responses';
import { AnimalHttpMapper as Mapper } from '../mappers/animal-http.mapper';
@ApiTags('Animals')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('animals')
export class AnimalsController {
  constructor(
    @Inject(ANIMALS_USE_CASES) private readonly animals: AnimalsUseCases,
  ) {}
  @Post()
  @ApiOperation({
    operationId: 'createAnimal',
    summary: 'Register a personal or shelter animal',
    description:
      'Requires an active verified account. Personal records belong to the current user. Shelter records require animals.manage in an active adoption entity. Unknown ownership/status/role fields are rejected. Creation and audit are atomic.',
  })
  @ApiCreatedResponse({ type: AnimalResponseDto })
  @ZodSerializerDto(AnimalResponseDto)
  async create(@Body() dto: CreateAnimalDto, @Req() req: AuthenticatedRequest) {
    return Mapper.animal(
      await this.animals.create(
        new CreateAnimalCommand(
          req.principal.userId,
          dto.profile,
          dto.organizationId ?? null,
          dto.reason,
          req.requestId,
        ),
      ),
    );
  }
  @Get()
  @ApiOperation({
    operationId: 'listAnimals',
    summary: 'Search your animals or a permitted shelter',
    description:
      'Defaults to current personal ownership; organizationId selects an active adoption entity with animals.manage. Bounded page/limit, name/species/status filters. Private fields require resource authorization.',
  })
  @ApiOkResponse({ type: AnimalsPageDto })
  @ZodSerializerDto(AnimalsPageDto)
  async list(@Query() dto: ListAnimalsDto, @Req() req: AuthenticatedRequest) {
    const page = await this.animals.list(
      new ListAnimalsQuery(
        req.principal.userId,
        dto.organizationId ?? null,
        dto.page,
        dto.limit,
        dto.search,
        dto.species,
        dto.status,
      ),
    );
    return { ...page, items: page.items.map(Mapper.animal) };
  }
  @Get(':animalId')
  @ApiOperation({
    operationId: 'getAnimal',
    summary: 'Read an authorized private animal record',
    description:
      'Requires personal ownership, superadmin personal-record access, or animals.manage in the active shelter. Includes clinical notes, identification and photo references; never use this endpoint as a public listing.',
  })
  @ApiOkResponse({ type: AnimalDetailDto })
  @ZodSerializerDto(AnimalDetailDto)
  async get(
    @Param() params: AnimalParamsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.detail(
      await this.animals.get(
        new GetAnimalQuery(req.principal.userId, params.animalId),
      ),
    );
  }
  @Patch(':animalId')
  @ApiOperation({
    operationId: 'updateAnimal',
    summary: 'Update a validated animal profile',
    description:
      'Requires current resource ownership or shelter permission, reason and expectedVersion. Stale writes return 409. Owner and organization cannot be changed. Public listings retain their approved snapshot until resubmitted.',
  })
  @ApiOkResponse({ type: AnimalResponseDto })
  @ZodSerializerDto(AnimalResponseDto)
  async update(
    @Param() params: AnimalParamsDto,
    @Body() dto: UpdateAnimalDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.animal(
      await this.animals.update(
        new UpdateAnimalCommand(
          req.principal.userId,
          params.animalId,
          dto.profile,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
        ),
      ),
    );
  }
  @Patch(':animalId/status')
  @ApiOperation({
    operationId: 'updateAnimalStatus',
    summary: 'Record an animal as deceased',
    description:
      'Authorized owner or shelter staff only. Deceased/adopted animals cannot be reactivated; archived records are terminal. Adoption state is set only by the explicit adoption completion workflow. Public availability checks current animal state immediately. Reason and expectedVersion required.',
  })
  @ApiOkResponse({ type: AnimalResponseDto })
  @ZodSerializerDto(AnimalResponseDto)
  async status(
    @Param() params: AnimalParamsDto,
    @Body() dto: AnimalStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.animal(
      await this.animals.status(
        new AnimalDecisionCommand(
          req.principal.userId,
          params.animalId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
          dto.status,
        ),
      ),
    );
  }
  @Delete(':animalId')
  @ApiOperation({
    operationId: 'archiveAnimal',
    summary: 'Archive an animal without erasing historical references',
    description:
      'Requires resource authorization and JSON reason/expectedVersion. Terminal logical archive; history and photos remain private. Repeated archive is a no-op. Listings stop being publicly available.',
  })
  @ApiOkResponse({ type: AnimalResponseDto })
  @ZodSerializerDto(AnimalResponseDto)
  async archive(
    @Param() params: AnimalParamsDto,
    @Body() dto: AnimalDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.animal(
      await this.animals.status(
        new AnimalDecisionCommand(
          req.principal.userId,
          params.animalId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
          'archived',
        ),
      ),
    );
  }
  @Post(':animalId/photos')
  @RatePolicy(20, 60)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 2,
        fieldSize: 1024,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['file', 'reason', 'expectedVersion'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Single-frame JPEG/PNG/WebP, at most 5 MiB and 20 megapixels.',
        },
        reason: { type: 'string', minLength: 10, maxLength: 500 },
        expectedVersion: { type: 'integer', minimum: 1 },
      },
    },
  })
  @ApiResponse({
    status: 413,
    description: 'Upload exceeds the multipart size limit.',
  })
  @ApiOperation({
    operationId: 'uploadAnimalPhoto',
    summary: 'Validate and attach a sanitized animal photo',
    description:
      'Requires resource authorization and current version. At most ten photos; file content must match the declared image type. Reencoded JPEG at most 1600px and 2 MiB, orientation normalized and metadata stripped. Photo bytes, attachment, version and audit commit atomically. 20 uploads/minute per IP.',
  })
  @ApiCreatedResponse({ type: AnimalDetailDto })
  @ZodSerializerDto(AnimalDetailDto)
  async upload(
    @Param() params: AnimalParamsDto,
    @Body() dto: UploadAnimalPhotoDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file)
      throw new ApplicationError('INVALID_INPUT', 'A file is required.');
    return Mapper.detail(
      await this.animals.upload(
        new UploadAnimalPhotoCommand(
          req.principal.userId,
          params.animalId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
          file.buffer,
          file.mimetype,
        ),
      ),
    );
  }
  @Get(':animalId/photos/:mediaId')
  @ApiOperation({
    operationId: 'getPrivateAnimalPhoto',
    summary: 'Read an authorized private photo',
    description:
      'Rechecks personal ownership or current active shelter permission and attachment. No public storage keys or original files are exposed; response is sanitized JPEG with no-store.',
  })
  @ApiOkResponse({
    content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } },
  })
  async photo(
    @Param() params: AnimalPhotoParamsDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const bytes = await this.animals.photo(
      new GetAnimalQuery(req.principal.userId, params.animalId),
      params.mediaId,
    );
    res.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(Buffer.from(bytes), { type: 'image/jpeg' });
  }
  @Delete(':animalId/photos/:mediaId')
  @ApiOperation({
    operationId: 'removeAnimalPhoto',
    summary: 'Detach a photo and purge its stored bytes',
    description:
      'Requires resource authorization, JSON reason and expectedVersion. Removes the attachment and photo bytes atomically. Previously approved snapshots cannot expose detached photos; a listing without any remaining approved photos becomes unavailable.',
  })
  @ApiOkResponse({ type: AnimalResponseDto })
  @ZodSerializerDto(AnimalResponseDto)
  async removePhoto(
    @Param() params: AnimalPhotoParamsDto,
    @Body() dto: AnimalDecisionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return Mapper.animal(
      await this.animals.removePhoto(
        new RemoveAnimalPhotoCommand(
          req.principal.userId,
          params.animalId,
          dto.reason,
          req.requestId,
          dto.expectedVersion,
          params.mediaId,
        ),
      ),
    );
  }
  @Get(':animalId/audit')
  @ApiOperation({
    operationId: 'listAnimalAudit',
    summary: 'Read the authorized animal audit trail',
    description:
      'Same private resource authorization; paginated append-only events, actor UUID, reason and request correlation. Profile values and photo bytes are not copied into audit.',
  })
  @ApiOkResponse({ type: AnimalAuditDto })
  @ZodSerializerDto(AnimalAuditDto)
  async audit(
    @Param() params: AnimalParamsDto,
    @Query() dto: AnimalPaginationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const page = await this.animals.audits(
      new GetAnimalQuery(req.principal.userId, params.animalId),
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
