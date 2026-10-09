-- Additive authorization foundation. Existing users and their roles are preserved.
ALTER TABLE "users" DROP CONSTRAINT "users_global_role";
ALTER TABLE "users" ADD CONSTRAINT "users_global_role" CHECK ("globalRole" IN ('user', 'moderator', 'super_admin'));
ALTER TABLE "user_audit_entries" DROP CONSTRAINT "user_audit_action";
ALTER TABLE "user_audit_entries" ADD CONSTRAINT "user_audit_action" CHECK (
  ("action" = 'user.status_changed' AND "actorId" IS NOT NULL AND "requestId" IS NOT NULL AND "previousValue" IN ('active', 'disabled') AND "nextValue" IN ('active', 'disabled') AND "previousValue" <> "nextValue") OR
  ("action" = 'user.global_role_granted' AND "actorId" IS NULL AND "requestId" IS NULL AND "previousValue" IN ('user', 'moderator') AND "nextValue" = 'super_admin') OR
  ("action" = 'user.global_role_changed' AND "actorId" IS NOT NULL AND "requestId" IS NOT NULL AND "previousValue" IN ('user', 'moderator', 'super_admin') AND "nextValue" IN ('user', 'moderator', 'super_admin') AND "previousValue" <> "nextValue")
);
CREATE TABLE "organizations" (
  "id" UUID PRIMARY KEY, "name" VARCHAR(150) NOT NULL, "type" VARCHAR(20) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizations_type" CHECK ("type" IN ('business', 'adoption_entity')),
  CONSTRAINT "organizations_name" CHECK (length(btrim("name")) BETWEEN 2 AND 150)
);
CREATE UNIQUE INDEX "organizations_id_type_key" ON "organizations"("id", "type");
CREATE TABLE "organization_memberships" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "organizationType" VARCHAR(20) NOT NULL,
  "userId" UUID NOT NULL, "role" VARCHAR(20) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_memberships_organizationId_organizationType_fkey" FOREIGN KEY ("organizationId", "organizationType") REFERENCES "organizations"("id", "type") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "membership_role_type" CHECK (("organizationType" = 'business' AND "role" IN ('business_admin', 'business_operator')) OR ("organizationType" = 'adoption_entity' AND "role" IN ('adoption_admin', 'adoption_operator')))
);
CREATE UNIQUE INDEX "organization_memberships_organizationId_userId_key" ON "organization_memberships"("organizationId", "userId");
CREATE INDEX "organization_memberships_userId_organizationId_idx" ON "organization_memberships"("userId", "organizationId");
CREATE TABLE "organization_audit_entries" (
  "id" UUID PRIMARY KEY, "actorId" UUID NOT NULL, "organizationId" UUID NOT NULL, "targetUserId" UUID,
  "action" VARCHAR(40) NOT NULL, "previousValue" VARCHAR(20), "nextValue" VARCHAR(20), "reason" VARCHAR(500) NOT NULL,
  "requestId" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_audit_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organization_audit_entries_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organization_audit_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organization_audit_reason" CHECK (length(btrim("reason")) BETWEEN 10 AND 500),
  CONSTRAINT "organization_audit_action" CHECK (
    ("action" = 'organization.created' AND "targetUserId" IS NULL AND "previousValue" IS NULL AND "nextValue" IS NOT NULL AND "nextValue" IN ('business', 'adoption_entity')) OR
    ("action" = 'membership.role_assigned' AND "targetUserId" IS NOT NULL AND "nextValue" IS NOT NULL AND "nextValue" IN ('business_admin', 'business_operator', 'adoption_admin', 'adoption_operator') AND ("previousValue" IS NULL OR ("previousValue" IN ('business_admin', 'business_operator', 'adoption_admin', 'adoption_operator') AND "previousValue" <> "nextValue"))) OR
    ("action" = 'membership.role_removed' AND "targetUserId" IS NOT NULL AND "previousValue" IS NOT NULL AND "previousValue" IN ('business_admin', 'business_operator', 'adoption_admin', 'adoption_operator') AND "nextValue" IS NULL)
  )
);
CREATE INDEX "organization_audit_entries_organizationId_createdAt_idx" ON "organization_audit_entries"("organizationId", "createdAt");
CREATE INDEX "organization_audit_entries_targetUserId_createdAt_idx" ON "organization_audit_entries"("targetUserId", "createdAt");
CREATE INDEX "organization_audit_entries_actorId_createdAt_idx" ON "organization_audit_entries"("actorId", "createdAt");
CREATE TRIGGER organization_audit_entries_append_only BEFORE UPDATE OR DELETE ON "organization_audit_entries" FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
