import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  GLOBAL_ROLES,
  MEMBERSHIP_ROLES,
  ORGANIZATION_TYPES,
  PERMISSIONS,
} from '../../../../../../../shared/domain/authorization';
import { ORGANIZATION_STATUSES } from '../../../../../../../shared/domain/organization-state';
const permissions = z.array(z.enum(PERMISSIONS)).meta({
  description:
    'Action/resource permissions. A permission does not bypass ownership, organization scope or domain state rules. Future-module permissions describe approved capabilities; their endpoints are not implemented yet.',
});
export class RolesResponseDto extends createZodDto(
  z.strictObject({
    roles: z.array(
      z.strictObject({
        role: z.enum([...GLOBAL_ROLES, ...MEMBERSHIP_ROLES]),
        scope: z.enum(['platform', 'organization']),
        organizationType: z.enum(ORGANIZATION_TYPES).nullable(),
        permissions,
      }),
    ),
  }),
) {}
export class AccessResponseDto extends createZodDto(
  z.strictObject({
    userId: z.uuid(),
    globalRole: z.enum(GLOBAL_ROLES),
    globalPermissions: permissions,
    organizations: z.array(
      z.strictObject({
        organizationId: z.uuid(),
        name: z.string().min(2).max(150),
        type: z.enum(ORGANIZATION_TYPES),
        role: z.enum(MEMBERSHIP_ROLES),
        status: z.enum(ORGANIZATION_STATUSES),
        permissions,
      }),
    ),
  }),
) {}
