-- CreateTable
CREATE TABLE "veterinary_credentials" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "profession" VARCHAR(40) NOT NULL,
    "registrationNumber" VARCHAR(15) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "version" INTEGER NOT NULL,
    "verifiedUntil" TIMESTAMP(3),
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veterinary_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veterinary_credential_audit" (
    "id" UUID NOT NULL,
    "credentialId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "requestId" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veterinary_credential_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "veterinary_credentials_resourceId_key" ON "veterinary_credentials"("resourceId");

-- CreateIndex
CREATE INDEX "veterinary_credentials_organizationId_status_createdAt_id_idx" ON "veterinary_credentials"("organizationId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "veterinary_credentials_status_verifiedUntil_id_idx" ON "veterinary_credentials"("status", "verifiedUntil", "id");

-- CreateIndex
CREATE UNIQUE INDEX "veterinary_credentials_profession_registrationNumber_key" ON "veterinary_credentials"("profession", "registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "veterinary_credential_audit_credentialId_version_key" ON "veterinary_credential_audit"("credentialId", "version");

ALTER TABLE veterinary_credentials ADD CONSTRAINT credential_owner_fk FOREIGN KEY("organizationId") REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE veterinary_credentials ADD CONSTRAINT credential_professional_fk FOREIGN KEY("professionalId") REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE veterinary_credentials ADD CONSTRAINT credential_resource_fk FOREIGN KEY("resourceId","organizationId") REFERENCES service_resources(id,"organizationId") ON DELETE RESTRICT;
ALTER TABLE veterinary_credential_audit ADD CONSTRAINT credential_audit_owner_fk FOREIGN KEY("credentialId") REFERENCES veterinary_credentials(id) ON DELETE RESTRICT;
ALTER TABLE veterinary_credential_audit ADD CONSTRAINT credential_audit_actor_fk FOREIGN KEY("actorId") REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE veterinary_credentials ADD CONSTRAINT credential_shape CHECK(version>0 AND status IN('draft','pending','approved','rejected','revoked') AND profession IN('veterinarian','veterinarian_zootechnician') AND "registrationNumber" ~ '^[0-9]{1,15}$' AND (status='approved')=("verifiedUntil" IS NOT NULL));
ALTER TABLE veterinary_credential_audit ADD CONSTRAINT credential_reason CHECK(length(reason) BETWEEN 10 AND 500);
CREATE FUNCTION pettly_credential_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE r service_resources%ROWTYPE; d jsonb; BEGIN
 SELECT * INTO r FROM service_resources WHERE id=NEW."resourceId" FOR UPDATE;
 IF r.kind IS DISTINCT FROM 'appointment' OR r.capacity IS DISTINCT FROM 1 OR r."organizationId" IS DISTINCT FROM NEW."organizationId" THEN RAISE EXCEPTION 'Credential requires dedicated capacity-one appointment resource'; END IF;
 IF (NEW.snapshot->>'id',NEW.snapshot->>'organizationId',NEW.snapshot->>'professionalId',NEW.snapshot->>'resourceId',NEW.snapshot->>'profession',NEW.snapshot->>'registrationNumber',NEW.snapshot->>'status',(NEW.snapshot->>'version')::int,(NEW.snapshot->>'verifiedUntil')::timestamp,(NEW.snapshot->>'createdAt')::timestamp,(NEW.snapshot->>'updatedAt')::timestamp) IS DISTINCT FROM (NEW.id::text,NEW."organizationId"::text,NEW."professionalId"::text,NEW."resourceId"::text,NEW.profession,NEW."registrationNumber",NEW.status,NEW.version,NEW."verifiedUntil",NEW."createdAt",NEW."updatedAt") THEN RAISE EXCEPTION 'Credential snapshot projection mismatch'; END IF;
 IF TG_OP='INSERT' THEN IF NEW.version<>1 OR NEW.status<>'draft' THEN RAISE EXCEPTION 'Credentials start as draft version one'; END IF;
 ELSE
 IF (NEW.id,NEW."organizationId",NEW."professionalId",NEW."resourceId",NEW."createdAt") IS DISTINCT FROM (OLD.id,OLD."organizationId",OLD."professionalId",OLD."resourceId",OLD."createdAt") OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Immutable credential identity or stale version'; END IF;
 IF NEW.status='approved' AND OLD.status<>'pending' THEN RAISE EXCEPTION 'Approval requires pending evidence'; END IF;
 END IF;
 IF NEW.status IN('pending','approved') AND NOT ((NEW.snapshot->'documents') @> '[{"kind":"professional_card"}]'::jsonb AND (NEW.snapshot->'documents') @> '[{"kind":"qualification"}]'::jsonb AND (NEW.snapshot->'documents') @> '[{"kind":"standing_certificate"}]'::jsonb) THEN RAISE EXCEPTION 'Complete accreditation evidence required'; END IF;
 IF jsonb_array_length(NEW.snapshot->'documents')>6 THEN RAISE EXCEPTION 'At most six evidence images'; END IF;
 FOR d IN SELECT value FROM jsonb_array_elements(NEW.snapshot->'documents') LOOP
 IF NOT EXISTS(SELECT 1 FROM media_assets WHERE id=(d->>'mediaId')::uuid AND "resourceId"=NEW.id AND "deletedAt" IS NULL) THEN RAISE EXCEPTION 'Evidence must bind live sanitized media to exact credential'; END IF;
 END LOOP;
 IF NEW.status='approved' AND (NEW."verifiedUntil"<=NOW() OR NEW."verifiedUntil">NOW()+INTERVAL '90 days' OR (NEW.snapshot->>'reviewedBy')::uuid=NEW."professionalId" OR length(NEW.snapshot->>'verificationReference')<10 OR NOT EXISTS(SELECT 1 FROM users WHERE id=(NEW.snapshot->>'reviewedBy')::uuid AND "globalRole"='super_admin' AND status='active') OR EXISTS(SELECT 1 FROM organization_memberships WHERE "userId"=(NEW.snapshot->>'reviewedBy')::uuid AND "organizationId"=NEW."organizationId")) THEN RAISE EXCEPTION 'Independent current superadmin verification and bounded deadline required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER credential_guard BEFORE INSERT OR UPDATE ON veterinary_credentials FOR EACH ROW EXECUTE FUNCTION pettly_credential_guard();
CREATE TRIGGER credential_no_delete BEFORE DELETE ON veterinary_credentials FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER credential_audit_immutable BEFORE UPDATE OR DELETE ON veterinary_credential_audit FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE FUNCTION pettly_credential_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM veterinary_credential_audit WHERE "credentialId"=NEW.id AND version=NEW.version AND snapshot=NEW.snapshot) THEN RAISE EXCEPTION 'Credential revision requires immutable matching audit'; END IF; RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER credential_evidence AFTER INSERT OR UPDATE ON veterinary_credentials DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_credential_evidence();
ALTER TABLE services DROP CONSTRAINT service_shape;
ALTER TABLE services ADD CONSTRAINT service_shape CHECK(version>0 AND kind IN('appointment','lodging') AND status IN('draft','pending','published','rejected','paused','archived') AND category IN('grooming','daycare','training','lodging','veterinary') AND snapshot->>'currency'='COP' AND snapshot->>'collectionMode'='pay_at_business');
CREATE FUNCTION pettly_clinical_service_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.category='veterinary' AND NEW.status NOT IN('paused','archived') AND NOT EXISTS(SELECT 1 FROM veterinary_credentials c JOIN service_resources r ON r.id=c."resourceId" WHERE c.id=(NEW.snapshot->>'veterinaryCredentialId')::uuid AND c."organizationId"=NEW."organizationId" AND c.status='approved' AND c."verifiedUntil">NOW() AND r.capacity=1 AND r.status='active' AND jsonb_array_length(NEW.snapshot->'resourceIds')=1 AND NEW.snapshot->'resourceIds' ? r.id::text AND NEW.kind='appointment') THEN RAISE EXCEPTION 'Clinical services require verified professional and dedicated schedule'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER clinical_service_guard BEFORE INSERT OR UPDATE ON services FOR EACH ROW EXECUTE FUNCTION pettly_clinical_service_guard();
CREATE FUNCTION pettly_clinical_resource_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.capacity<>1 OR NEW.kind<>'appointment') AND EXISTS(SELECT 1 FROM veterinary_credentials WHERE "resourceId"=NEW.id) THEN RAISE EXCEPTION 'Clinical resource must remain capacity one'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER clinical_resource_guard BEFORE UPDATE ON service_resources FOR EACH ROW EXECUTE FUNCTION pettly_clinical_resource_guard();
CREATE FUNCTION pettly_clinical_booking_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE c veterinary_credentials%ROWTYPE; BEGIN
 IF NEW.snapshot#>>'{acceptance,service,category}'='veterinary' AND (TG_OP='INSERT' OR NEW.status IN('requested','confirmed','in_progress') AND (OLD.snapshot->'acceptance' IS DISTINCT FROM NEW.snapshot->'acceptance' OR OLD.status IS DISTINCT FROM NEW.status)) THEN
 SELECT * INTO c FROM veterinary_credentials WHERE id=(NEW.snapshot#>>'{acceptance,service,veterinaryCredentialId}')::uuid FOR UPDATE;
 IF c.status IS DISTINCT FROM 'approved' OR c."organizationId" IS DISTINCT FROM NEW."organizationId" OR c."resourceId" IS DISTINCT FROM NEW."resourceId" OR c."verifiedUntil"<=GREATEST(NOW(),NEW."endsAt") OR NOT EXISTS(SELECT 1 FROM users WHERE id=c."professionalId" AND status='active' AND "emailVerifiedAt" IS NOT NULL) OR NOT EXISTS(SELECT 1 FROM organization_memberships WHERE "userId"=c."professionalId" AND "organizationId"=c."organizationId" AND role IN('business_admin','business_operator')) THEN RAISE EXCEPTION 'Current professional authorization must cover clinical appointment'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER clinical_booking_guard BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION pettly_clinical_booking_guard();
-- Bounded maintenance/operational queries; no cleanup of immutable business history.
CREATE INDEX auth_sessions_expiry_ops_idx ON auth_sessions("expiresAt",id);
CREATE INDEX auth_actions_expiry_ops_idx ON auth_action_tokens("expiresAt",hash);
CREATE INDEX notification_due_ops_idx ON notification_outbox("notBefore","expiresAt") WHERE "deliveredAt" IS NULL AND "failedAt" IS NULL;
CREATE INDEX notification_failed_ops_idx ON notification_outbox("failedAt",id) WHERE "failureKind"='delivery_failed' AND "deliveredAt" IS NULL;
