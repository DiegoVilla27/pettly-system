import { ApplicationError } from '../../../../shared/domain/application-error';
export class Password {
  static validate(value: string): void {
    if (value.length < 12 || value.length > 128)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Password must contain 12 to 128 characters.',
      );
  }
}
