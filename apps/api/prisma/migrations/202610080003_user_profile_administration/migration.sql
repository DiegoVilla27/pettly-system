-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" VARCHAR(200),
ADD COLUMN     "addressLine2" VARCHAR(200),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "countryCode" CHAR(2),
ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "globalRole" VARCHAR(20) NOT NULL DEFAULT 'user',
ADD COLUMN     "lastName" VARCHAR(100),
ADD COLUMN     "phone" VARCHAR(16),
ADD COLUMN     "postalCode" VARCHAR(20),
ADD COLUMN     "region" VARCHAR(100);

-- CreateTable
CREATE TABLE "user_audit_entries" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "targetId" UUID NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "previousValue" VARCHAR(20) NOT NULL,
    "nextValue" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "requestId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_audit_entries_targetId_createdAt_idx" ON "user_audit_entries"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "user_audit_entries_actorId_createdAt_idx" ON "user_audit_entries"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_audit_entries" ADD CONSTRAINT "user_audit_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_audit_entries" ADD CONSTRAINT "user_audit_entries_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing accounts retain their previous name; no guessed surname or privileged role is assigned.
ALTER TABLE "users" ADD CONSTRAINT "users_global_role" CHECK ("globalRole" IN ('user', 'super_admin'));
ALTER TABLE "users" ADD CONSTRAINT "users_nonblank_last_name" CHECK ("lastName" IS NULL OR length(btrim("lastName")) > 0);
ALTER TABLE "users" ADD CONSTRAINT "users_phone_format" CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{6,14}$');
ALTER TABLE "users" ADD CONSTRAINT "users_country_code_format" CHECK ("countryCode" IS NULL OR "countryCode" ~ '^[A-Z]{2}$');
ALTER TABLE "users" ADD CONSTRAINT "users_birth_date_not_future" CHECK ("dateOfBirth" IS NULL OR "dateOfBirth" <= CURRENT_DATE);
ALTER TABLE "user_audit_entries" ADD CONSTRAINT "user_audit_reason" CHECK (length(btrim("reason")) BETWEEN 10 AND 500);
ALTER TABLE "user_audit_entries" ADD CONSTRAINT "user_audit_action" CHECK (
  ("action" = 'user.status_changed' AND "actorId" IS NOT NULL AND "requestId" IS NOT NULL AND "previousValue" IN ('active', 'disabled') AND "nextValue" IN ('active', 'disabled') AND "previousValue" <> "nextValue") OR
  ("action" = 'user.global_role_granted' AND "previousValue" = 'user' AND "nextValue" = 'super_admin')
);
CREATE FUNCTION pettly_reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'User audit entries are append-only';
END;
$$;
CREATE TRIGGER user_audit_entries_append_only BEFORE UPDATE OR DELETE ON "user_audit_entries" FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();

CREATE INDEX "users_globalRole_status_idx" ON "users"("globalRole", "status");
