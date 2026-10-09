import { VeterinaryModule } from '../veterinary/veterinary.module';
import {
  VETERINARY_ELIGIBILITY,
  type VeterinaryEligibility,
} from '../veterinary/application/ports/in/veterinary-eligibility';
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ServicesModule } from '../services/services.module';
import { AnimalsModule } from '../animals/animals.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsReadModule } from './bookings-read.module';
import {
  AUTHORIZATION,
  type Authorization,
} from '../authorization/application/ports/in/authorization';
import {
  SERVICES_BOOKING,
  type ServicesBooking,
} from '../services/application/ports/in/services-booking';
import {
  ANIMALS_BOOKING,
  type AnimalsBooking,
} from '../animals/application/ports/in/animals-booking';
import {
  USERS_DIRECTORY,
  type UsersDirectory,
} from '../users/application/ports/out/users-directory';
import {
  BOOKING_NOTIFICATIONS,
  type BookingNotifications,
} from '../notifications/application/ports/in/booking-notifications';
import {
  BOOKING_OCCUPANCY,
  type BookingOccupancy,
} from './application/ports/in/booking-occupancy';
import {
  CLOCK,
  ENTROPY,
  type Clock,
  type Entropy,
} from '../../shared/application/runtime-ports';
import {
  BOOKINGS_REPOSITORY,
  type BookingsRepository,
} from './application/ports/out/bookings-repository';
import { BOOKINGS_USE_CASES } from './application/ports/in/bookings-use-cases';
import { BookingsHandlers } from './application/handlers/bookings.handlers';
import { PrismaBookingsRepository } from './adapters/out/persistence/prisma-bookings-repository';
import { BookingExpiry } from './adapters/in/scheduling/booking-expiry';
import {
  OwnBookingsController,
  ManagedBookingsController,
} from './adapters/in/http/controllers/bookings.controller';
@Module({
  imports: [
    AuthorizationModule,
    ServicesModule,
    AnimalsModule,
    UsersModule,
    NotificationsModule,
    BookingsReadModule,
    VeterinaryModule,
  ],
  controllers: [ManagedBookingsController, OwnBookingsController],
  providers: [
    BookingExpiry,
    { provide: BOOKINGS_REPOSITORY, useClass: PrismaBookingsRepository },
    {
      provide: BOOKINGS_USE_CASES,
      useFactory: (
        repo: BookingsRepository,
        auth: Authorization,
        services: ServicesBooking,
        animals: AnimalsBooking,
        users: UsersDirectory,
        busy: BookingOccupancy,
        mail: BookingNotifications,
        clock: Clock,
        entropy: Entropy,
        veterinary: VeterinaryEligibility,
      ) =>
        new BookingsHandlers(
          repo,
          auth,
          services,
          animals,
          users,
          busy,
          mail,
          clock,
          entropy,
          veterinary,
        ),
      inject: [
        BOOKINGS_REPOSITORY,
        AUTHORIZATION,
        SERVICES_BOOKING,
        ANIMALS_BOOKING,
        USERS_DIRECTORY,
        BOOKING_OCCUPANCY,
        BOOKING_NOTIFICATIONS,
        CLOCK,
        ENTROPY,
        VETERINARY_ELIGIBILITY,
      ],
    },
  ],
})
export class BookingsModule {}
