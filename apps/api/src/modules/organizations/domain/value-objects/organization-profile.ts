import { ApplicationError } from '../../../../shared/domain/application-error';
import { Email } from '../../../../shared/domain/email';
import {
  COUNTRY_CODES,
  PHONE_PATTERN,
} from '../../../../shared/domain/profile-details';
export const PROFILE_FIELDS = [
  'name',
  'legalName',
  'registrationNumber',
  'description',
  'email',
  'phone',
  'website',
  'countryCode',
  'region',
  'city',
  'address',
  'addressLine2',
  'postalCode',
] as const;
export interface OrganizationProfile {
  name: string;
  legalName: string | null;
  registrationNumber: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  addressLine2: string | null;
  postalCode: string | null;
}
export type OrganizationProfileChanges = Partial<OrganizationProfile>;
export const EMPTY_PROFILE = {
  legalName: null,
  registrationNumber: null,
  description: null,
  email: null,
  phone: null,
  website: null,
  countryCode: null,
  region: null,
  city: null,
  address: null,
  addressLine2: null,
  postalCode: null,
};
export function normalizeRegistration(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s.\-/]/g, '');
}
export function validateOrganizationProfile(
  input: OrganizationProfileChanges,
): OrganizationProfileChanges {
  const result: OrganizationProfileChanges = {};
  const limits: Record<string, number> = {
    name: 150,
    legalName: 150,
    description: 2000,
    email: 254,
    phone: 16,
    website: 2048,
    countryCode: 2,
    region: 100,
    city: 100,
    address: 200,
    addressLine2: 200,
    postalCode: 20,
    registrationNumber: 40,
  };
  for (const [key, value] of Object.entries(input)) {
    if (!PROFILE_FIELDS.includes(key as (typeof PROFILE_FIELDS)[number]))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Unsupported organization profile field.',
      );
    if (value === undefined) continue;
    if (value === null) {
      if (key === 'name')
        throw new ApplicationError(
          'INVALID_INPUT',
          'Organization name cannot be cleared.',
        );
      Object.assign(result, { [key]: null });
      continue;
    }
    if (typeof value !== 'string')
      throw new ApplicationError(
        'INVALID_INPUT',
        'Organization profile values must be strings or null.',
      );
    let text = value.trim();
    if (key === 'registrationNumber') text = normalizeRegistration(value);
    if (key === 'email') text = Email.create(value).value;
    if (
      !text ||
      text.length > limits[key] ||
      /\p{Cc}/u.test(text) ||
      (key === 'name' && text.length < 2) ||
      (key === 'legalName' && text.length < 2)
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        `Invalid organization ${key}.`,
      );
    if (key === 'countryCode' && !COUNTRY_CODES.includes(text))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Unsupported ISO country code.',
      );
    if (key === 'phone' && !PHONE_PATTERN.test(text))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Phone must use E.164 format.',
      );
    if (key === 'registrationNumber' && !/^[A-Z0-9]{2,40}$/.test(text))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Registration number must contain 2–40 canonical alphanumeric characters.',
      );
    if (key === 'website') {
      try {
        const url = new URL(text);
        if (url.protocol !== 'https:' || url.username || url.password)
          throw Error();
        text = url.href;
        if (text.length > 2048) throw Error();
      } catch {
        throw new ApplicationError(
          'INVALID_INPUT',
          'Website must be an HTTPS URL without credentials.',
        );
      }
    }
    Object.assign(result, { [key]: text });
  }
  return result;
}
export function requireCompleteProfile(profile: OrganizationProfile) {
  const missing = [
    'legalName',
    'registrationNumber',
    'email',
    'phone',
    'countryCode',
    'city',
    'address',
  ].filter((key) => !profile[key as keyof OrganizationProfile]);
  if (missing.length)
    throw new ApplicationError(
      'CONFLICT',
      `Complete the organization profile before review: ${missing.join(', ')}.`,
    );
}
