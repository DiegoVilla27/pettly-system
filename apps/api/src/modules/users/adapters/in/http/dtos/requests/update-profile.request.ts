import { createZodDto } from 'nestjs-zod';
import { updateProfileSchema } from '../profile.schemas';
export class UpdateProfileRequestDto extends createZodDto(
  updateProfileSchema,
) {}
