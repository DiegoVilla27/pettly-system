import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  private readonly context = new AsyncLocalStorage<Prisma.TransactionClient>();
  readonly prisma = new PrismaClient();
  get client(): Prisma.TransactionClient {
    return this.context.getStore() || this.prisma;
  }
  async onModuleInit() {
    await this.prisma.$connect();
  }
  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.context.getStore()) return work();
    return this.prisma.$transaction((tx) => this.context.run(tx, work), {
      timeout: 10000,
    });
  }
  async lock(key: string) {
    await this.client
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
  }
}
