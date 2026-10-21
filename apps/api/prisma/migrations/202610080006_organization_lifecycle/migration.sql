-- Existing identities are drafts. Approval is never inferred from an old identity or membership.
ALTER TABLE organizations ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft', ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "legalName" VARCHAR(150), ADD COLUMN "registrationNumber" VARCHAR(40), ADD COLUMN description VARCHAR(2000), ADD COLUMN email VARCHAR(254), ADD COLUMN phone VARCHAR(16), ADD COLUMN website VARCHAR(2048),
ADD COLUMN "countryCode" CHAR(2), ADD COLUMN region VARCHAR(100), ADD COLUMN city VARCHAR(100), ADD COLUMN address VARCHAR(200), ADD COLUMN "addressLine2" VARCHAR(200), ADD COLUMN "postalCode" VARCHAR(20),
ADD COLUMN "applicantId" UUID, ADD COLUMN "responsibleUserId" UUID, ADD COLUMN "reviewedBy" UUID,
ADD COLUMN "submittedAt" TIMESTAMP(3), ADD COLUMN "reviewedAt" TIMESTAMP(3), ADD COLUMN "reviewReason" VARCHAR(500), ADD COLUMN "approvedAt" TIMESTAMP(3), ADD COLUMN "suspendedAt" TIMESTAMP(3), ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE organizations ADD CONSTRAINT "organizations_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE organizations ADD CONSTRAINT "organizations_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE organizations ADD CONSTRAINT "organizations_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE organizations ADD CONSTRAINT organizations_status CHECK (status IN ('draft','pending','active','rejected','suspended','deleted'));
ALTER TABLE organizations ADD CONSTRAINT organizations_version CHECK (version>0);
ALTER TABLE organizations ADD CONSTRAINT organizations_profile CHECK (
 ("legalName" IS NULL OR length(btrim("legalName"))>=2) AND ("registrationNumber" IS NULL OR "registrationNumber" ~ '^[A-Z0-9]{2,40}$') AND
 (email IS NULL OR (email=lower(btrim(email)) AND length(email)>0)) AND (phone IS NULL OR phone ~ '^\+[1-9][0-9]{6,14}$') AND
 ("countryCode" IS NULL OR "countryCode" ~ '^[A-Z]{2}$') AND (website IS NULL OR website ~ '^https://') AND
 (city IS NULL OR length(btrim(city))>0) AND (address IS NULL OR length(btrim(address))>0)
);
ALTER TABLE organizations ADD CONSTRAINT organizations_workflow CHECK (
 (status<>'pending' OR ("submittedAt" IS NOT NULL AND "legalName" IS NOT NULL AND "registrationNumber" IS NOT NULL AND email IS NOT NULL AND phone IS NOT NULL AND "countryCode" IS NOT NULL AND city IS NOT NULL AND address IS NOT NULL)) AND
 (status NOT IN ('active','suspended') OR ("approvedAt" IS NOT NULL AND "responsibleUserId" IS NOT NULL AND "legalName" IS NOT NULL AND "registrationNumber" IS NOT NULL AND email IS NOT NULL AND phone IS NOT NULL AND "countryCode" IS NOT NULL AND city IS NOT NULL AND address IS NOT NULL)) AND
 (status<>'rejected' OR ("reviewedAt" IS NOT NULL AND "reviewedBy" IS NOT NULL AND "reviewReason" IS NOT NULL)) AND
 ((status='suspended' AND "suspendedAt" IS NOT NULL) OR (status<>'suspended' AND "suspendedAt" IS NULL)) AND
 ((status='deleted' AND "deletedAt" IS NOT NULL AND name='Archived organization' AND "legalName" IS NULL AND "registrationNumber" IS NULL AND email IS NULL AND phone IS NULL AND address IS NULL AND "countryCode" IS NULL AND description IS NULL AND website IS NULL AND city IS NULL AND region IS NULL AND "addressLine2" IS NULL AND "postalCode" IS NULL) OR (status<>'deleted' AND "deletedAt" IS NULL))
);
CREATE UNIQUE INDEX "organizations_countryCode_registrationNumber_key" ON organizations("countryCode","registrationNumber");
CREATE INDEX "organizations_status_createdAt_id_idx" ON organizations(status,"createdAt",id);
CREATE INDEX "organizations_applicantId_createdAt_id_idx" ON organizations("applicantId","createdAt",id);
CREATE INDEX "organizations_responsibleUserId_idx" ON organizations("responsibleUserId");
CREATE INDEX "organizations_reviewedBy_idx" ON organizations("reviewedBy");
CREATE INDEX "organizations_name_search_idx" ON organizations USING GIN(name gin_trgm_ops);
CREATE INDEX "organizations_legalName_search_idx" ON organizations USING GIN("legalName" gin_trgm_ops);
ALTER TABLE organization_audit_entries ALTER COLUMN "previousValue" TYPE VARCHAR(64), ALTER COLUMN "nextValue" TYPE VARCHAR(64);
ALTER TABLE organization_audit_entries DROP CONSTRAINT organization_audit_action;
ALTER TABLE organization_audit_entries ADD CONSTRAINT organization_audit_action CHECK (COALESCE((
 (action IN ('organization.created','organization.requested') AND "targetUserId" IS NULL AND "previousValue" IS NULL AND "nextValue" IS NOT NULL AND "nextValue" IN ('business','adoption_entity')) OR
 (action='organization.profile_updated' AND "targetUserId" IS NULL AND "previousValue"='profile' AND "nextValue"='profile') OR
 (action='organization.submitted' AND "previousValue" IN ('draft','rejected','active','suspended') AND "nextValue"='pending') OR
 (action='organization.approved' AND "targetUserId" IS NOT NULL AND "previousValue"='pending' AND "nextValue"='active') OR
 (action='organization.rejected' AND "previousValue"='pending' AND "nextValue"='rejected') OR
 (action='organization.status_changed' AND "previousValue" IN ('active','suspended') AND "nextValue" IN ('active','suspended') AND "previousValue"<>"nextValue") OR
 (action='organization.deleted' AND "previousValue" IN ('draft','pending','active','rejected','suspended') AND "nextValue"='deleted') OR
 (action='organization.responsible_changed' AND "targetUserId" IS NOT NULL AND "nextValue"="targetUserId"::text AND ("previousValue" IS NULL OR "previousValue"<>"nextValue")) OR
 (action='membership.role_assigned' AND "targetUserId" IS NOT NULL AND "nextValue" IS NOT NULL AND "nextValue" IN ('business_admin','business_operator','adoption_admin','adoption_operator') AND ("previousValue" IS NULL OR ("previousValue" IN ('business_admin','business_operator','adoption_admin','adoption_operator') AND "previousValue"<>"nextValue"))) OR
 (action='membership.role_removed' AND "targetUserId" IS NOT NULL AND "previousValue" IS NOT NULL AND "previousValue" IN ('business_admin','business_operator','adoption_admin','adoption_operator') AND "nextValue" IS NULL)
),false));
-- Deferred constraint checks the final transaction state, allowing atomic approval + membership assignment.
CREATE FUNCTION pettly_organization_responsible() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE organization_id UUID; organization_type VARCHAR(20); organization_status VARCHAR(20); responsible_id UUID;
BEGIN
 IF TG_TABLE_NAME='organizations' THEN organization_id:=NEW.id; ELSE organization_id:=COALESCE(NEW."organizationId",OLD."organizationId"); END IF;
 SELECT type,status,"responsibleUserId" INTO organization_type,organization_status,responsible_id FROM organizations WHERE id=organization_id;
 IF organization_status IN ('active','suspended') AND NOT EXISTS (SELECT 1 FROM organization_memberships WHERE "organizationId"=organization_id AND "userId"=responsible_id AND role=CASE WHEN organization_type='business' THEN 'business_admin' ELSE 'adoption_admin' END) THEN
  RAISE EXCEPTION 'An approved organization requires its responsible administrator membership';
 END IF;
 RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER organization_responsible_membership AFTER INSERT OR UPDATE ON organizations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_organization_responsible();
CREATE CONSTRAINT TRIGGER membership_responsible_preserved AFTER DELETE OR UPDATE ON organization_memberships DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_organization_responsible();
