import type { UserProfile } from '../../../../application/results/user-profile';
import { ageOn } from '../../../../domain/value-objects/profile-details';
import type { UserResponseDto } from '../dtos/responses/user.response';
export class UserHttpMapper {
  static response(profile: UserProfile, now: Date): UserResponseDto {
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      lastName: profile.lastName,
      dateOfBirth: profile.dateOfBirth,
      age: profile.dateOfBirth ? ageOn(profile.dateOfBirth, now) : null,
      phone: profile.phone,
      address: profile.address,
      addressLine2: profile.addressLine2,
      countryCode: profile.countryCode,
      region: profile.region,
      city: profile.city,
      postalCode: profile.postalCode,
      status: profile.status,
      globalRole: profile.globalRole,
      deletedAt: profile.deletedAt?.toISOString() ?? null,
      emailVerifiedAt: profile.emailVerifiedAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
