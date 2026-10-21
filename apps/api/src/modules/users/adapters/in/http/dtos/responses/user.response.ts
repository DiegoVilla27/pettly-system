import { createZodDto } from 'nestjs-zod';
import { userResponseSchema } from '../profile.schemas';
export class UserResponseDto extends createZodDto(userResponseSchema) {}
