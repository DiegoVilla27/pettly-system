export interface VeterinaryEligibility {
  eligible(
    id: string,
    organizationId: string,
    resourceId: string,
    through: Date,
  ): Promise<Date>;
}
export const VETERINARY_ELIGIBILITY = Symbol('VETERINARY_ELIGIBILITY');
