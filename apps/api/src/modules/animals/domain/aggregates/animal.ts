import { ApplicationError } from '../../../../shared/domain/application-error';
export const SPECIES = [
  'dog',
  'cat',
  'bird',
  'rabbit',
  'reptile',
  'rodent',
  'equine',
  'other',
] as const;
export const SEXES = ['male', 'female', 'unknown'] as const;
export const SIZES = [
  'small',
  'medium',
  'large',
  'extra_large',
  'unknown',
] as const;
export const ANIMAL_STATUSES = [
  'active',
  'adopted',
  'deceased',
  'archived',
] as const;
export interface AnimalProfile {
  name: string;
  species: (typeof SPECIES)[number];
  breed: string | null;
  sex: (typeof SEXES)[number];
  size: (typeof SIZES)[number];
  dateOfBirth: string | null;
  birthDateEstimated: boolean;
  weightGrams: number | null;
  color: string | null;
  description: string | null;
  healthNotes: string | null;
  specialNeeds: string | null;
  vaccinated: boolean | null;
  neutered: boolean | null;
  microchip: string | null;
}
export interface AnimalState extends AnimalProfile {
  id: string;
  ownerUserId: string | null;
  organizationId: string | null;
  status: (typeof ANIMAL_STATUSES)[number];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}
export function validateAnimalProfile(
  input: Partial<AnimalProfile>,
  now: Date,
) {
  const result = { ...input };
  const limits = {
    name: 100,
    breed: 100,
    color: 100,
    description: 2000,
    healthNotes: 4000,
    specialNeeds: 2000,
    microchip: 30,
  };
  const keys = [
    ...Object.keys(limits),
    'species',
    'sex',
    'size',
    'dateOfBirth',
    'birthDateEstimated',
    'weightGrams',
    'vaccinated',
    'neutered',
  ];
  if (Object.keys(input).some((k) => !keys.includes(k)))
    throw new ApplicationError(
      'INVALID_INPUT',
      'Unsupported animal profile field.',
    );
  for (const [key, max] of Object.entries(limits)) {
    const field = key as keyof typeof limits,
      value = result[field];
    if (value === undefined) continue;
    if (value === null && field !== 'name') continue;
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > max ||
      /\p{Cc}/u.test(value)
    )
      throw new ApplicationError('INVALID_INPUT', `Invalid animal ${key}.`);
    result[field] = value.trim();
  }
  for (const [key, choices] of [
    ['species', SPECIES],
    ['sex', SEXES],
    ['size', SIZES],
  ] as const) {
    if (
      result[key] !== undefined &&
      !(choices as readonly string[]).includes(result[key]!)
    )
      throw new ApplicationError('INVALID_INPUT', `Invalid animal ${key}.`);
  }
  for (const key of ['birthDateEstimated', 'vaccinated', 'neutered'] as const) {
    if (
      result[key] !== undefined &&
      typeof result[key] !== 'boolean' &&
      !(result[key] === null && key !== 'birthDateEstimated')
    )
      throw new ApplicationError('INVALID_INPUT', `Invalid animal ${key}.`);
  }
  const birth = result.dateOfBirth;
  if (birth !== undefined && birth !== null) {
    const date = new Date(birth + 'T00:00:00Z');
    if (
      typeof birth !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== birth ||
      birth > now.toISOString().slice(0, 10)
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'Date of birth must be a real past or current date.',
      );
  }
  const weight = result.weightGrams;
  if (
    weight !== undefined &&
    weight !== null &&
    (!Number.isInteger(weight) || weight < 1 || weight > 2000000)
  )
    throw new ApplicationError(
      'INVALID_INPUT',
      'Weight must contain 1 to 2000000 grams.',
    );
  return result;
}
export class Animal {
  private constructor(private state: AnimalState) {}
  static create(
    id: string,
    profile: AnimalProfile,
    ownerUserId: string | null,
    organizationId: string | null,
    now: Date,
  ) {
    if (Boolean(ownerUserId) === Boolean(organizationId))
      throw new ApplicationError(
        'INVALID_INPUT',
        'Exactly one user or organization must own the animal.',
      );
    const fields = validateAnimalProfile(profile, now);
    if (
      !fields.name ||
      !fields.species ||
      !fields.sex ||
      !fields.size ||
      typeof fields.birthDateEstimated !== 'boolean'
    )
      throw new ApplicationError(
        'INVALID_INPUT',
        'A complete base animal profile is required.',
      );
    return new Animal({
      ...profile,
      ...fields,
      id,
      ownerUserId,
      organizationId,
      status: 'active',
      version: 1,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });
  }
  static restore(state: AnimalState) {
    return new Animal({ ...state });
  }
  expectVersion(version: number) {
    if (!Number.isInteger(version) || version < 1)
      throw new ApplicationError(
        'INVALID_INPUT',
        'A positive expectedVersion is required.',
      );
    if (version !== this.state.version)
      throw new ApplicationError(
        'CONFLICT',
        'The animal changed. Read its current version and retry.',
      );
  }
  private mutable() {
    if (this.state.status === 'archived')
      throw new ApplicationError(
        'CONFLICT',
        'Archived animals cannot be changed.',
      );
  }
  update(input: Partial<AnimalProfile>, now: Date) {
    this.mutable();
    const fields = validateAnimalProfile(input, now);
    if (!Object.keys(fields).length)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Provide at least one animal profile field.',
      );
    if (
      !Object.entries(fields).some(
        ([k, v]) => this.state[k as keyof AnimalState] !== v,
      )
    )
      return false;
    this.state = {
      ...this.state,
      ...fields,
      version: this.state.version + 1,
      updatedAt: now,
    };
    return true;
  }
  touch(now: Date) {
    this.mutable();
    this.state = {
      ...this.state,
      version: this.state.version + 1,
      updatedAt: now,
    };
  }
  status(status: 'active' | 'deceased' | 'archived', now: Date) {
    this.mutable();
    if (status === this.state.status) return false;
    if (status === 'active' && this.state.status !== 'active')
      throw new ApplicationError(
        'CONFLICT',
        'Deceased or adopted animals cannot be reactivated.',
      );
    if (this.state.status === 'adopted' && status === 'deceased')
      throw new ApplicationError(
        'CONFLICT',
        'An adopted animal can only be archived.',
      );
    if (!['active', 'deceased', 'archived'].includes(status))
      throw new ApplicationError('INVALID_INPUT', 'Unsupported animal state.');
    this.state = {
      ...this.state,
      status,
      version: this.state.version + 1,
      updatedAt: now,
      archivedAt: status === 'archived' ? now : null,
    };
    return true;
  }
  adopt(now: Date) {
    if (this.state.status !== 'active' || !this.state.organizationId)
      throw new ApplicationError(
        'CONFLICT',
        'Only an active shelter animal can complete adoption.',
      );
    this.state = {
      ...this.state,
      status: 'adopted',
      version: this.state.version + 1,
      updatedAt: now,
    };
  }
  snapshot() {
    return { ...this.state };
  }
}
