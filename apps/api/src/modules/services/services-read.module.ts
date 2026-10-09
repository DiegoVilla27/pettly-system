import { Module } from '@nestjs/common';
import { Database } from '../../shared/infrastructure/database';
import {
  SERVICE_RESOURCE_DIRECTORY,
  type ServiceResourceDirectory,
} from './application/ports/in/service-resource-directory';
@Module({
  providers: [
    {
      provide: SERVICE_RESOURCE_DIRECTORY,
      useFactory: (db: Database): ServiceResourceDirectory => ({
        find: (id) =>
          db.client.serviceResource.findUnique({
            where: { id },
            select: {
              id: true,
              organizationId: true,
              kind: true,
              capacity: true,
              status: true,
            },
          }),
      }),
      inject: [Database],
    },
  ],
  exports: [SERVICE_RESOURCE_DIRECTORY],
})
export class ServicesReadModule {}
