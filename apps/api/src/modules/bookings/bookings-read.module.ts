import { Module } from '@nestjs/common';
import { BOOKING_OCCUPANCY } from './application/ports/in/booking-occupancy';
import { PrismaBookingOccupancy } from './adapters/out/persistence/prisma-booking-occupancy';
@Module({
  providers: [{ provide: BOOKING_OCCUPANCY, useClass: PrismaBookingOccupancy }],
  exports: [BOOKING_OCCUPANCY],
})
export class BookingsReadModule {}
