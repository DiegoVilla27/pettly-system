import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GLOBAL_ROLES } from '../../../../../../../shared/domain/authorization';
import { changeUserStatusSchema } from './change-user-status.request';
export class ChangeUserRoleRequestDto extends createZodDto(
  z.strictObject({
    role: z.enum(GLOBAL_ROLES).meta({
      description:
        'Desired global role. Business and adoption roles require an organization membership.',
      example: 'moderator',
    }),
    reason: changeUserStatusSchema.shape.reason,
  }),
) {}
