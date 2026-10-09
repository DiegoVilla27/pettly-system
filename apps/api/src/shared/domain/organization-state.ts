export const ORGANIZATION_STATUSES = [
  'draft',
  'pending',
  'active',
  'rejected',
  'suspended',
  'deleted',
] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];
