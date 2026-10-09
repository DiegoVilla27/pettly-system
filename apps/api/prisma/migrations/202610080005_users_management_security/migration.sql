-- Account management preserves UUIDs and immutable historical references.
ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "auth_credentials" ADD COLUMN "pendingEmail" VARCHAR(254);
ALTER TABLE "users" DROP CONSTRAINT "users_status";
ALTER TABLE "users" ADD CONSTRAINT "users_status" CHECK ("status" IN ('active', 'disabled', 'deleted'));
ALTER TABLE "users" ADD CONSTRAINT "users_deletion_state" CHECK (
  ("status" <> 'deleted' AND "deletedAt" IS NULL) OR
  ("status" = 'deleted' AND "deletedAt" IS NOT NULL AND "globalRole"='user' AND "emailVerifiedAt" IS NULL
    AND "email" = 'deleted.' || "id"::text || '@anonymized.invalid' AND "name"='Deleted' AND "lastName" IS NOT NULL AND "lastName"='Account'
    AND "dateOfBirth" IS NULL AND "phone" IS NULL AND "address" IS NULL AND "addressLine2" IS NULL
    AND "countryCode" IS NULL AND "region" IS NULL AND "city" IS NULL AND "postalCode" IS NULL)
);
ALTER TABLE "auth_action_tokens" DROP CONSTRAINT "auth_action_token_purpose";
ALTER TABLE "auth_action_tokens" ADD CONSTRAINT "auth_action_token_purpose" CHECK ("purpose" IN ('verification','reset','invitation','email_change'));
ALTER TABLE "user_audit_entries" DROP CONSTRAINT "user_audit_action";
ALTER TABLE "user_audit_entries" ADD CONSTRAINT "user_audit_action" CHECK (
  ("action" = 'user.status_changed' AND "actorId" IS NOT NULL AND "requestId" IS NOT NULL AND "previousValue" IN ('active','disabled') AND "nextValue" IN ('active','disabled') AND "previousValue" <> "nextValue") OR
  ("action" = 'user.global_role_granted' AND "actorId" IS NULL AND "requestId" IS NULL AND "previousValue" IN ('user','moderator') AND "nextValue"='super_admin') OR
  ("action" = 'user.global_role_changed' AND "actorId" IS NOT NULL AND "requestId" IS NOT NULL AND "previousValue" IN ('user','moderator','super_admin') AND "nextValue" IN ('user','moderator','super_admin') AND "previousValue" <> "nextValue") OR
  ("action" = 'user.created' AND "actorId" IS NOT NULL AND "requestId" IS NOT NULL AND "previousValue"='none' AND "nextValue"='user') OR
  ("action" = 'user.profile_updated' AND "actorId" IS NOT NULL AND "requestId" IS NOT NULL AND "previousValue"='profile' AND "nextValue"='profile') OR
  ("action" = 'user.invitation_resent' AND "actorId" IS NOT NULL AND "requestId" IS NOT NULL AND "previousValue"='pending' AND "nextValue"='pending') OR
  ("action" = 'user.email_changed' AND "actorId" IS NOT NULL AND "actorId"="targetId" AND "previousValue"='email' AND "nextValue"='email') OR
  ("action" = 'user.deleted' AND "actorId" IS NOT NULL AND "requestId" IS NOT NULL AND "previousValue" IN ('active','disabled') AND "nextValue"='deleted')
);
CREATE INDEX "users_createdAt_id_idx" ON "users"("createdAt","id");
CREATE INDEX "auth_sessions_userId_revokedAt_createdAt_id_idx" ON "auth_sessions"("userId","revokedAt","createdAt","id");
CREATE INDEX "organization_memberships_role_userId_idx" ON "organization_memberships"("role","userId");
-- Trigram indexes support case-insensitive substring searches without changing search semantics.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "users_email_search_idx" ON "users" USING GIN ("email" gin_trgm_ops);
CREATE INDEX "users_name_search_idx" ON "users" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "users_lastName_search_idx" ON "users" USING GIN ("lastName" gin_trgm_ops);
