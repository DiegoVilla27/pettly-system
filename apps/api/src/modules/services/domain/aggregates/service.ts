import { ApplicationError } from '../../../../shared/domain/application-error';
import {
  invalid,
  validateWindows,
  type WeeklyWindow,
  type ServiceKind,
} from '../../../../shared/domain/scheduling';
export const SERVICE_STATUSES = [
  'draft',
  'pending',
  'published',
  'rejected',
  'paused',
  'archived',
] as const;
export const SERVICE_CATEGORIES = [
  'grooming',
  'daycare',
  'training',
  'lodging',
  'veterinary',
] as const;
export const SERVICE_SPECIES = [
  'dog',
  'cat',
  'bird',
  'rabbit',
  'reptile',
  'rodent',
  'equine',
  'other',
] as const;
export interface ServiceDetails {
  veterinaryCredentialId?: string | null;
  name: string;
  description: string;
  category: (typeof SERVICE_CATEGORIES)[number];
  kind: ServiceKind;
  priceMinor: number;
  currency: 'COP';
  acceptedSpecies: string[];
  requirements: string;
  terms: string;
  collectionMode: 'pay_at_business';
  confirmationMode: 'automatic' | 'manual';
  durationMinutes: number | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  checkInMinute: number | null;
  checkOutMinute: number | null;
  minNights: number;
  maxNights: number;
  minimumNoticeMinutes: number;
  cancellationCutoffMinutes: number;
  requestTtlMinutes: number;
  resourceIds: string[];
}
export interface ServiceState extends ServiceDetails {
  id: string;
  organizationId: string;
  status: (typeof SERVICE_STATUSES)[number];
  version: number;
  createdBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface ResourceDetails {
  name: string;
  kind: ServiceKind;
  capacity: number;
  windows: WeeklyWindow[];
  status: 'active' | 'inactive';
}
export interface ResourceState extends ResourceDetails {
  id: string;
  organizationId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface BlockState {
  id: string;
  resourceId: string;
  organizationId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdBy: string;
  createdAt: Date;
  releasedAt: Date | null;
}
function text(value: string, min: number, max: number) {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max ||
    /\p{Cc}/u.test(value)
  )
    invalid('Service text is invalid.');
  return value.trim();
}
export function validateDetails(d: ServiceDetails): ServiceDetails {
  if (
    !SERVICE_CATEGORIES.includes(d.category) ||
    !['appointment', 'lodging'].includes(d.kind) ||
    d.currency !== 'COP' ||
    d.collectionMode !== 'pay_at_business' ||
    !['automatic', 'manual'].includes(d.confirmationMode)
  )
    invalid('Unsupported service category, mode or currency.');
  if (
    !Number.isSafeInteger(d.priceMinor) ||
    d.priceMinor < 1 ||
    d.priceMinor > 2147483647
  )
    invalid('Service price must be positive integer COP minor units.');
  if (
    !d.acceptedSpecies.length ||
    d.acceptedSpecies.length > 8 ||
    new Set(d.acceptedSpecies).size !== d.acceptedSpecies.length ||
    d.acceptedSpecies.some(
      (s) => !SERVICE_SPECIES.includes(s as (typeof SERVICE_SPECIES)[number]),
    )
  )
    invalid('Choose distinct supported pet species.');
  if (
    d.resourceIds.length > 20 ||
    new Set(d.resourceIds).size !== d.resourceIds.length ||
    d.resourceIds.some(
      (id) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
    )
  )
    invalid('Assign at most twenty distinct resource UUIDs.');
  if (
    ![
      d.minimumNoticeMinutes,
      d.cancellationCutoffMinutes,
      d.requestTtlMinutes,
      d.minNights,
      d.maxNights,
      d.bufferBeforeMinutes,
      d.bufferAfterMinutes,
    ].every(Number.isInteger) ||
    d.minimumNoticeMinutes < 15 ||
    d.minimumNoticeMinutes > 43200 ||
    d.cancellationCutoffMinutes < 0 ||
    d.cancellationCutoffMinutes > 43200 ||
    d.requestTtlMinutes < 15 ||
    d.requestTtlMinutes > 1440 ||
    d.minNights < 1 ||
    d.maxNights < d.minNights ||
    d.maxNights > 30
  )
    invalid(
      'Invalid booking notice, cancellation, request lifetime or stay bounds.',
    );
  if (
    d.category === 'veterinary' &&
    (!d.veterinaryCredentialId ||
      d.resourceIds.length !== 1 ||
      d.kind !== 'appointment')
  )
    invalid(
      'Veterinary services require one professional credential and one appointment resource.',
    );
  if (d.category !== 'veterinary' && d.veterinaryCredentialId)
    invalid(
      'Only clinical veterinary services can bind professional credentials.',
    );
  if (d.kind === 'appointment') {
    if (
      d.category === 'lodging' ||
      !Number.isInteger(d.durationMinutes) ||
      d.durationMinutes === null ||
      d.durationMinutes < 15 ||
      d.durationMinutes > 480 ||
      d.durationMinutes % 15 ||
      [d.bufferBeforeMinutes, d.bufferAfterMinutes].some(
        (n) => n < 0 || n > 120 || n % 15,
      ) ||
      d.checkInMinute !== null ||
      d.checkOutMinute !== null ||
      d.minNights !== 1 ||
      d.maxNights !== 1
    )
      invalid(
        'Appointments require 15–480 quarter-hour minutes, optional bounded buffers and no lodging clock.',
      );
  } else if (
    d.category !== 'lodging' ||
    d.durationMinutes !== null ||
    d.bufferBeforeMinutes !== 0 ||
    d.bufferAfterMinutes !== 0 ||
    !Number.isInteger(d.checkInMinute) ||
    !Number.isInteger(d.checkOutMinute) ||
    d.checkInMinute === null ||
    d.checkOutMinute === null ||
    d.checkOutMinute < 0 ||
    d.checkInMinute >= 1440 ||
    d.checkOutMinute >= d.checkInMinute ||
    d.checkInMinute % 15 ||
    d.checkOutMinute % 15
  )
    invalid(
      'Lodging requires check-out before check-in, a nightly price and no appointment buffers.',
    );
  return {
    ...d,
    name: text(d.name, 2, 150),
    description: text(d.description, 10, 2000),
    requirements: text(d.requirements, 2, 2000),
    terms: text(d.terms, 10, 2000),
    acceptedSpecies: [...d.acceptedSpecies],
    resourceIds: [...d.resourceIds],
  };
}
export function validateResource(d: ResourceDetails) {
  if (
    !['appointment', 'lodging'].includes(d.kind) ||
    !['active', 'inactive'].includes(d.status) ||
    !Number.isInteger(d.capacity) ||
    d.capacity < 1 ||
    d.capacity > 100
  )
    invalid('Resource kind, capacity or status is invalid.');
  validateWindows(d.kind, d.windows);
  return {
    ...d,
    name: text(d.name, 2, 100),
    windows: structuredClone(d.windows),
  };
}
export class Service {
  private constructor(private state: ServiceState) {}
  static create(
    id: string,
    org: string,
    actor: string,
    d: ServiceDetails,
    now: Date,
  ) {
    return new Service({
      ...validateDetails(d),
      id,
      organizationId: org,
      createdBy: actor,
      status: 'draft',
      version: 1,
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  static restore(s: ServiceState) {
    return new Service(structuredClone(s));
  }
  snapshot() {
    return structuredClone(this.state);
  }
  expect(version: number) {
    if (this.state.version !== version)
      throw new ApplicationError(
        'CONFLICT',
        'Service changed. Read its current version.',
      );
  }
  configure(d: ServiceDetails, now: Date) {
    if (['archived', 'pending'].includes(this.state.status))
      throw new ApplicationError(
        'CONFLICT',
        'Pending or archived services cannot be edited.',
      );
    Object.assign(this.state, validateDetails(d), {
      status: 'draft',
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
    });
    this.touch(now);
  }
  submit(now: Date) {
    if (
      !['draft', 'rejected', 'paused'].includes(this.state.status) ||
      !this.state.resourceIds.length
    )
      throw new ApplicationError(
        'CONFLICT',
        'A mutable service with assigned active resources is required.',
      );
    this.state.status = 'pending';
    this.touch(now);
  }
  review(actor: string, approved: boolean, reason: string, now: Date) {
    if (this.state.status !== 'pending')
      throw new ApplicationError(
        'CONFLICT',
        'Only pending services can be reviewed.',
      );
    if (actor === this.state.createdBy)
      throw new ApplicationError('FORBIDDEN', 'Self-review is forbidden.');
    Object.assign(this.state, {
      status: approved ? 'published' : 'rejected',
      reviewedBy: actor,
      reviewedAt: now,
      reviewReason: reason,
    });
    this.touch(now);
  }
  close(status: 'paused' | 'archived', now: Date) {
    if (
      this.state.status === 'archived' ||
      (status === 'paused' && this.state.status !== 'published')
    )
      throw new ApplicationError(
        'CONFLICT',
        'Invalid service visibility transition.',
      );
    this.state.status = status;
    this.touch(now);
  }
  private touch(now: Date) {
    this.state.version++;
    this.state.updatedAt = now;
  }
}
