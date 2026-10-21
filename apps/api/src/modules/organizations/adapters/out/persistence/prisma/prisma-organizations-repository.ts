import { Prisma } from '@prisma/client';
import { ApplicationError } from '../../../../../../shared/domain/application-error';
import { Injectable } from '@nestjs/common';
import { Database } from '../../../../../../shared/infrastructure/database';
import type {
  OrganizationsRepository,
  OrganizationsWork,
} from '../../../../application/ports/out/organizations-repository';
import { OrganizationPersistenceMapper as Mapper } from './organization.mapper';
@Injectable()
export class PrismaOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly db: Database) {}
  run<T>(work: (context: OrganizationsWork) => Promise<T>) {
    return this.db
      .transaction(() =>
        work({
          lock: (key) => this.db.lock(key),
          find: async (id) => {
            const row = await this.db.client.organization.findUnique({
              where: { id },
            });
            return row ? Mapper.organization(row) : null;
          },
          save: async (organization) =>
            Mapper.organization(
              await this.db.client.organization.update({
                where: { id: organization.id },
                data: organization,
              }),
            ),
          list: async (query) => {
            const clauses: Prisma.OrganizationWhereInput[] = [];
            if (query.mine)
              clauses.push({
                status: { not: 'deleted' },
                OR: [
                  { applicantId: query.actorId },
                  { memberships: { some: { userId: query.actorId } } },
                ],
              });
            if (query.status) clauses.push({ status: query.status });
            if (query.type) clauses.push({ type: query.type });
            if (query.countryCode)
              clauses.push({ countryCode: query.countryCode });
            if (query.search)
              clauses.push({
                OR: ['name', 'legalName', 'registrationNumber'].map(
                  (field) => ({
                    [field]: { contains: query.search, mode: 'insensitive' },
                  }),
                ),
              });
            const where: Prisma.OrganizationWhereInput = { AND: clauses };
            const [items, total] = await Promise.all([
              this.db.client.organization.findMany({
                where,
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              }),
              this.db.client.organization.count({ where }),
            ]);
            return {
              items: items.map(Mapper.organization),
              total,
              page: query.page,
              limit: query.limit,
            };
          },
          members: async (organizationId, page, limit) => {
            const where = { organizationId };
            const [items, total] = await Promise.all([
              this.db.client.organizationMembership.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
              }),
              this.db.client.organizationMembership.count({ where }),
            ]);
            return { items: items.map(Mapper.membership), total, page, limit };
          },
          audits: async (organizationId, page, limit) => {
            const where = { organizationId };
            const [items, total] = await Promise.all([
              this.db.client.organizationAuditEntry.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              }),
              this.db.client.organizationAuditEntry.count({ where }),
            ]);
            return {
              items: items.map((row) => ({
                ...row,
                action:
                  row.action as import('../../../../application/ports/out/organizations-repository').OrganizationAudit['action'],
              })),
              total,
              page,
              limit,
            };
          },
          create: async (organization) =>
            Mapper.organization(
              await this.db.client.organization.create({ data: organization }),
            ),
          membership: async (organizationId, userId) => {
            const row = await this.db.client.organizationMembership.findUnique({
              where: { organizationId_userId: { organizationId, userId } },
            });
            return row ? Mapper.membership(row) : null;
          },
          assign: async (id, organizationId, userId, role, now) =>
            Mapper.membership(
              await this.db.client.organizationMembership.upsert({
                where: { organizationId_userId: { organizationId, userId } },
                create: {
                  id,
                  organizationId,
                  organizationType: role.startsWith('business_')
                    ? 'business'
                    : 'adoption_entity',
                  userId,
                  role,
                  createdAt: now,
                  updatedAt: now,
                },
                update: { role, updatedAt: now },
              }),
            ),
          remove: async (id) => {
            await this.db.client.organizationMembership.delete({
              where: { id },
            });
          },
          audit: async (entry) => {
            await this.db.client.organizationAuditEntry.create({ data: entry });
          },
        }),
      )
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        )
          throw new ApplicationError(
            'CONFLICT',
            'Registration number already belongs to an organization in this country.',
          );
        throw error;
      });
  }
  async states(ids: string[]) {
    if (ids.length > 200)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Too many organization identities.',
      );
    return (
      await this.db.client.organization.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, type: true },
      })
    ).map((row) => row) as Awaited<
      ReturnType<
        import('../../../../application/ports/in/organization-access').OrganizationAccess['states']
      >
    >;
  }
  async findOrganization(id: string) {
    const row = await this.db.client.organization.findUnique({ where: { id } });
    return row ? Mapper.organization(row) : null;
  }
  async membershipsForUser(userId: string) {
    const rows = await this.db.client.organizationMembership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { organizationId: 'asc' },
    });
    return rows.map(({ organization, ...row }) => ({
      ...Mapper.membership(row),
      organization: Mapper.organization(organization),
    }));
  }
}
