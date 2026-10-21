import { ApplicationError } from './application-error';
export const COUNTRY_CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  );
export const NAME_PATTERN = /^[\p{L}\p{M} .’'-]+$/u;
export const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;
export interface ProfileDetails {
  name: string;
  lastName: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  address: string | null;
  addressLine2: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  postalCode: string | null;
}
export type ProfileChanges = Partial<ProfileDetails>;
export type NewProfile = Pick<ProfileDetails, 'name'> & {
  lastName: string;
} & Partial<Omit<ProfileDetails, 'name' | 'lastName'>>;
export function ageOn(dateOfBirth: string, now: Date): number {
  const birth = new Date(dateOfBirth + 'T00:00:00.000Z');
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() &&
      now.getUTCDate() < birth.getUTCDate())
  )
    age--;
  return age;
}
function invalid(message: string): never {
  throw new ApplicationError('INVALID_INPUT', message);
}
export function validateProfile(
  changes: ProfileChanges,
  now: Date,
): ProfileChanges {
  const allowed = new Set([
    'name',
    'lastName',
    'dateOfBirth',
    'phone',
    'address',
    'addressLine2',
    'countryCode',
    'region',
    'city',
    'postalCode',
  ]);
  if (Object.keys(changes).some((field) => !allowed.has(field)))
    invalid('Only editable profile fields can be changed.');
  const result: ProfileChanges = { ...changes };
  for (const [key, limit] of Object.entries({
    name: 100,
    lastName: 100,
    phone: 16,
    address: 200,
    addressLine2: 200,
    countryCode: 2,
    region: 100,
    city: 100,
    postalCode: 20,
  })) {
    const field = key as keyof ProfileDetails;
    const value = result[field];
    if (value === undefined) continue;
    if (value === null) {
      if (field === 'name' || field === 'lastName')
        invalid('Given name and family name cannot be cleared.');
      continue;
    }
    if (typeof value !== 'string') invalid(`${field} must be a string.`);
    const normalized = value.trim();
    if (!normalized || normalized.length > limit || /\p{Cc}/u.test(normalized))
      invalid(
        `${field} must contain 1 to ${limit} characters without control characters.`,
      );
    if (
      (field === 'name' || field === 'lastName') &&
      (!NAME_PATTERN.test(normalized) || !/\p{L}/u.test(normalized))
    )
      invalid('Names must contain letters and supported name punctuation.');
    if (field === 'phone' && !PHONE_PATTERN.test(normalized))
      invalid('Phone must use E.164 format, for example +34612345678.');
    if (field === 'countryCode' && !COUNTRY_CODES.includes(normalized))
      invalid('Country must be an uppercase ISO 3166-1 alpha-2 code.');
    result[field] = normalized;
  }
  if (result.dateOfBirth !== undefined && result.dateOfBirth !== null) {
    const value = result.dateOfBirth;
    const date = new Date(value + 'T00:00:00.000Z');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value ||
      value > now.toISOString().slice(0, 10) ||
      ageOn(value, now) > 120
    )
      invalid(
        'Date of birth must be a real past or current date within 120 years.',
      );
  }
  return result;
}
