import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GLOBAL_ROLES } from '../../../../../../../shared/domain/authorization';
export class UserRoleResponseDto extends createZodDto(
  z.strictObject({
    id: z.uuid(),
    globalRole: z.enum(GLOBAL_ROLES),
    updatedAt: z.iso.datetime(),
  }),
) {}
