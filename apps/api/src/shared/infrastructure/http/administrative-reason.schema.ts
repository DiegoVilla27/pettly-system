import { z } from 'zod';
export const administrativeReasonSchema = z
  .string()
  .trim()
  .min(10)
  .max(500)
  .regex(/^[^\p{Cc}]+$/u)
  .meta({
    description:
      'Reason for this operation, 10–500 characters; recorded in the immutable audit trail.',
    example: 'Account removed following the owner request.',
  });
