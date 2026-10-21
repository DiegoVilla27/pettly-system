import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import {
  USERS_DIRECTORY,
  type UsersDirectory,
} from '../users/application/ports/out/users-directory';
import { Database } from '../../shared/infrastructure/database';
import { CONFIG, type RuntimeConfig } from '../../shared/infrastructure/config';
import {
  CLOCK,
  ENTROPY,
  type Clock,
  type Entropy,
} from '../../shared/application/runtime-ports';
import { BOOKING_NOTIFICATIONS } from './application/ports/in/booking-notifications';
import {
  BUSINESS_NOTIFICATIONS,
  type BusinessNotifications,
} from './application/ports/in/business-notifications';
import { NOTIFICATIONS_USE_CASES } from './application/ports/in/notifications-use-cases';
import {
  NOTIFICATIONS_REPOSITORY,
  type NotificationsRepository,
} from './application/ports/out/notifications-repository';
import { NotificationsHandlers } from './application/handlers/notifications.handlers';
import { PrismaNotificationsRepository } from './adapters/out/persistence/prisma-notifications-repository';
import { BookingMailOutbox } from './adapters/out/booking-mail-outbox';
import { NotificationsController } from './adapters/in/http/controllers/notifications.controller';
@Module({
  imports: [UsersModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: NOTIFICATIONS_REPOSITORY,
      useFactory: (db: Database, settings: RuntimeConfig) =>
        new PrismaNotificationsRepository(db, settings.mailKey),
      inject: [Database, CONFIG],
    },
    {
      provide: NOTIFICATIONS_USE_CASES,
      useFactory: (
        repo: NotificationsRepository,
        users: UsersDirectory,
        clock: Clock,
        entropy: Entropy,
      ) => new NotificationsHandlers(repo, users, clock, entropy),
      inject: [NOTIFICATIONS_REPOSITORY, USERS_DIRECTORY, CLOCK, ENTROPY],
    },
    { provide: BUSINESS_NOTIFICATIONS, useExisting: NOTIFICATIONS_USE_CASES },
    {
      provide: BOOKING_NOTIFICATIONS,
      useFactory: (
        db: Database,
        settings: RuntimeConfig,
        entropy: Entropy,
        publisher: BusinessNotifications,
      ) => new BookingMailOutbox(db, settings, entropy, publisher),
      inject: [Database, CONFIG, ENTROPY, BUSINESS_NOTIFICATIONS],
    },
  ],
  exports: [BOOKING_NOTIFICATIONS, BUSINESS_NOTIFICATIONS],
})
export class NotificationsModule {}
