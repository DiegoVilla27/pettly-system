import { VeterinaryModule } from '../veterinary/veterinary.module';
import {
  VETERINARY_ELIGIBILITY,
  type VeterinaryEligibility,
} from '../veterinary/application/ports/in/veterinary-eligibility';
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BookingsReadModule } from '../bookings/bookings-read.module';
import {
  AUTHORIZATION,
  type Authorization,
} from '../authorization/application/ports/in/authorization';
import {
  ORGANIZATION_ACCESS,
  type OrganizationAccess,
} from '../organizations/application/ports/in/organization-access';
import {
  BOOKING_OCCUPANCY,
  type BookingOccupancy,
} from '../bookings/application/ports/in/booking-occupancy';
import {
  CLOCK,
  ENTROPY,
  type Clock,
  type Entropy,
} from '../../shared/application/runtime-ports';
import {
  SERVICES_REPOSITORY,
  type ServicesRepository,
} from './application/ports/out/services-repository';
import { SERVICES_USE_CASES } from './application/ports/in/services-use-cases';
import {
  SERVICES_BOOKING,
  type ServicesBooking,
} from './application/ports/in/services-booking';
import { ServicesHandlers } from './application/handlers/services.handlers';
import { PrismaServicesRepository } from './adapters/out/persistence/prisma-services-repository';
import {
  PublicServicesController,
  ManagedServicesController,
} from './adapters/in/http/controllers/services.controller';
@Module({
  imports: [
    AuthorizationModule,
    OrganizationsModule,
    BookingsReadModule,
    VeterinaryModule,
  ],
  controllers: [ManagedServicesController, PublicServicesController],
  providers: [
    { provide: SERVICES_REPOSITORY, useClass: PrismaServicesRepository },
    {
      provide: SERVICES_USE_CASES,
      useFactory: (
        repo: ServicesRepository,
        auth: Authorization,
        orgs: OrganizationAccess,
        busy: BookingOccupancy,
        clock: Clock,
        entropy: Entropy,
        veterinary: VeterinaryEligibility,
      ) =>
        new ServicesHandlers(
          repo,
          auth,
          orgs,
          busy,
          clock,
          entropy,
          veterinary,
        ),
      inject: [
        SERVICES_REPOSITORY,
        AUTHORIZATION,
        ORGANIZATION_ACCESS,
        BOOKING_OCCUPANCY,
        CLOCK,
        ENTROPY,
        VETERINARY_ELIGIBILITY,
      ],
    },
    {
      provide: SERVICES_BOOKING,
      useFactory: (h: ServicesHandlers): ServicesBooking => ({
        inspect: (id) => h.inspect(id),
        resource: (id) => h.resourceById(id),
        offer: (...args) => h.offer(...args),
        blocks: (...args) => h.blocks(...args),
      }),
      inject: [SERVICES_USE_CASES],
    },
  ],
  exports: [SERVICES_BOOKING],
})
export class ServicesModule {}
