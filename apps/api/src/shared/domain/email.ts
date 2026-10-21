import { ApplicationError } from './application-error';
export class Email {
  private constructor(readonly value: string) {}
  static create(value: string): Email {
    const normalized = value.trim().toLowerCase();
    if (
      normalized.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'A valid email address is required.',
      );
    return new Email(normalized);
  }
}
