import { string, refine } from 'zod/mini';
import type { ValidatorFn } from '@angular/forms';
export const reasonSchema = string().check(
  refine(
    (value) =>
      value.trim().length >= 10 &&
      value.trim().length <= 500 &&
      !/\p{Cc}/u.test(value),
  ),
);
export const auditReasonValidator: ValidatorFn = (control) =>
  reasonSchema.safeParse(String(control.value).trim()).success
    ? null
    : { reason: true };
