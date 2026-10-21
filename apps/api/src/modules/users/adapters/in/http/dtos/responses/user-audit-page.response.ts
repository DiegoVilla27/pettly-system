import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
export class UserAuditPageResponseDto extends createZodDto(
  z.strictObject({
    items: z.array(
      z.strictObject({
        id: z.uuid(),
        actorId: z.uuid().nullable(),
        targetId: z.uuid(),
        action: z.enum([
          'user.status_changed',
          'user.global_role_granted',
          'user.global_role_changed',
          'user.created',
          'user.invitation_resent',
          'user.profile_updated',
          'user.email_changed',
          'user.deleted',
        ]),
        previousValue: z.string(),
        nextValue: z.string(),
        reason: z.string(),
        requestId: z.uuid().nullable(),
        createdAt: z.iso.datetime(),
      }),
    ),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
) {}
