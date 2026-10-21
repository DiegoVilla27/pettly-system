-- Additive Animals, private Media and moderated Adoptions. Existing identities are preserved.
CREATE TABLE "animals" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID,
    "organizationId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "species" VARCHAR(20) NOT NULL,
    "breed" VARCHAR(100),
    "sex" VARCHAR(10) NOT NULL,
    "size" VARCHAR(20) NOT NULL,
    "dateOfBirth" DATE,
    "birthDateEstimated" BOOLEAN NOT NULL DEFAULT false,
    "weightGrams" INTEGER,
    "color" VARCHAR(100),
    "description" VARCHAR(2000),
    "healthNotes" VARCHAR(4000),
    "specialNeeds" VARCHAR(2000),
    "vaccinated" BOOLEAN,
    "neutered" BOOLEAN,
    "microchip" VARCHAR(30),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "uploadedBy" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "contentType" VARCHAR(30) NOT NULL,
    "byteLength" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "animal_photos" (
    "id" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "animal_audit_entries" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "requestId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "adoption_publications" (
    "id" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "conditions" VARCHAR(2000) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB,
    "createdBy" UUID NOT NULL,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" VARCHAR(500),
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adoption_publications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "adoption_requests" (
    "id" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "applicantId" UUID NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "publicationVersion" INTEGER NOT NULL,
    "conditionsAccepted" VARCHAR(2000) NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'submitted',
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" VARCHAR(500),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adoption_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "adoption_audit_entries" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "requestId" UUID,
    "action" VARCHAR(40) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "correlationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoption_audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "animals_ownerUserId_status_createdAt_id_idx" ON "animals"("ownerUserId", "status", "createdAt", "id");

CREATE INDEX "animals_organizationId_status_createdAt_id_idx" ON "animals"("organizationId", "status", "createdAt", "id");

CREATE INDEX "animals_name_search_idx" ON "animals" USING GIN ("name" gin_trgm_ops);

CREATE UNIQUE INDEX "animals_id_organizationId_key" ON "animals"("id", "organizationId");

CREATE INDEX "media_assets_resourceId_createdAt_idx" ON "media_assets"("resourceId", "createdAt");

CREATE UNIQUE INDEX "animal_photos_mediaId_key" ON "animal_photos"("mediaId");

CREATE INDEX "animal_photos_animalId_position_idx" ON "animal_photos"("animalId", "position");

CREATE INDEX "animal_audit_entries_animalId_createdAt_id_idx" ON "animal_audit_entries"("animalId", "createdAt", "id");

CREATE INDEX "adoption_publications_status_createdAt_id_idx" ON "adoption_publications"("status", "createdAt", "id");

CREATE INDEX "adoption_publications_organizationId_status_createdAt_id_idx" ON "adoption_publications"("organizationId", "status", "createdAt", "id");

CREATE INDEX "adoption_publications_title_search_idx" ON "adoption_publications" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "adoption_requests_publicationId_status_createdAt_id_idx" ON "adoption_requests"("publicationId", "status", "createdAt", "id");

CREATE INDEX "adoption_requests_applicantId_createdAt_id_idx" ON "adoption_requests"("applicantId", "createdAt", "id");

CREATE INDEX "adoption_audit_entries_publicationId_createdAt_id_idx" ON "adoption_audit_entries"("publicationId", "createdAt", "id");

ALTER TABLE "animals" ADD CONSTRAINT "animals_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "animals" ADD CONSTRAINT "animals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "animal_photos" ADD CONSTRAINT "animal_photos_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "animal_photos" ADD CONSTRAINT "animal_photos_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "animal_audit_entries" ADD CONSTRAINT "animal_audit_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "animal_audit_entries" ADD CONSTRAINT "animal_audit_entries_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adoption_publications" ADD CONSTRAINT "adoption_publications_animalId_organizationId_fkey" FOREIGN KEY ("animalId", "organizationId") REFERENCES "animals"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adoption_publications" ADD CONSTRAINT "adoption_publications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adoption_publications" ADD CONSTRAINT "adoption_publications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adoption_publications" ADD CONSTRAINT "adoption_publications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adoption_requests" ADD CONSTRAINT "adoption_requests_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "adoption_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adoption_requests" ADD CONSTRAINT "adoption_requests_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adoption_requests" ADD CONSTRAINT "adoption_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adoption_audit_entries" ADD CONSTRAINT "adoption_audit_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adoption_audit_entries" ADD CONSTRAINT "adoption_audit_entries_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "adoption_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adoption_audit_entries" ADD CONSTRAINT "adoption_audit_entries_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "adoption_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE animals ADD CONSTRAINT animal_owner CHECK (("ownerUserId" IS NULL)<>("organizationId" IS NULL));
ALTER TABLE animals ADD CONSTRAINT animal_profile CHECK (length(btrim(name))>0 AND species IN ('dog','cat','bird','rabbit','reptile','rodent','equine','other') AND sex IN ('male','female','unknown') AND size IN ('small','medium','large','extra_large','unknown') AND ("weightGrams" IS NULL OR "weightGrams" BETWEEN 1 AND 2000000) AND ("dateOfBirth" IS NULL OR "dateOfBirth"<=CURRENT_DATE));
ALTER TABLE animals ADD CONSTRAINT animal_state CHECK (version>0 AND status IN ('active','adopted','deceased','archived') AND ((status='archived')=("archivedAt" IS NOT NULL)) AND (status<>'adopted' OR "organizationId" IS NOT NULL));
ALTER TABLE media_assets ADD CONSTRAINT media_image CHECK ("contentType"='image/jpeg' AND "byteLength" BETWEEN 1 AND 2097152 AND width BETWEEN 1 AND 1600 AND height BETWEEN 1 AND 1600 AND (("deletedAt" IS NULL AND bytes IS NOT NULL AND octet_length(bytes)="byteLength") OR ("deletedAt" IS NOT NULL AND bytes IS NULL)));
ALTER TABLE animal_photos ADD CONSTRAINT photo_position CHECK (position>=0);
CREATE FUNCTION pettly_animal_photo_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM 1 FROM animals WHERE id=NEW."animalId" FOR UPDATE;
 IF (SELECT count(*) FROM animal_photos WHERE "animalId"=NEW."animalId" AND id<>NEW.id)>=10 THEN RAISE EXCEPTION 'At most ten photos per animal'; END IF;
 IF NOT EXISTS (SELECT 1 FROM media_assets WHERE id=NEW."mediaId" AND "resourceId"=NEW."animalId" AND "deletedAt" IS NULL) THEN RAISE EXCEPTION 'Media must be active and bound to this animal'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER animal_photo_guard BEFORE INSERT OR UPDATE ON animal_photos FOR EACH ROW EXECUTE FUNCTION pettly_animal_photo_guard();
CREATE FUNCTION pettly_animal_entity_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW."organizationId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM organizations WHERE id=NEW."organizationId" AND type='adoption_entity') THEN RAISE EXCEPTION 'Only an adoption entity may own an organization animal'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER animal_entity_guard BEFORE INSERT OR UPDATE ON animals FOR EACH ROW EXECUTE FUNCTION pettly_animal_entity_guard();
ALTER TABLE adoption_publications ADD CONSTRAINT publication_state CHECK (version>0 AND status IN ('draft','pending','published','rejected','paused','closed','deleted') AND ((status='deleted')=("deletedAt" IS NOT NULL)) AND (status<>'closed' OR "closedAt" IS NOT NULL) AND (status<>'pending' OR ("submittedAt" IS NOT NULL AND snapshot IS NOT NULL)) AND (status NOT IN ('published','rejected') OR ("reviewedAt" IS NOT NULL AND "reviewedBy" IS NOT NULL AND "reviewReason" IS NOT NULL)) AND (status<>'published' OR ("publishedAt" IS NOT NULL AND snapshot IS NOT NULL)));
ALTER TABLE adoption_publications ADD CONSTRAINT publication_profile CHECK (length(btrim(title))>=2 AND length(btrim(description))>=2 AND length(btrim(conditions))>=2 AND length(btrim(city))>=2 AND "countryCode" ~ '^[A-Z]{2}$');
CREATE UNIQUE INDEX publication_one_open_animal ON adoption_publications("animalId") WHERE status NOT IN ('closed','deleted');
ALTER TABLE adoption_requests ADD CONSTRAINT adoption_request_state CHECK (version>0 AND "publicationVersion">0 AND length(btrim("conditionsAccepted"))>=2 AND status IN ('submitted','in_review','approved','rejected','withdrawn','completed','closed') AND length(btrim(message))>=10 AND (status NOT IN ('in_review','approved','rejected','completed') OR ("reviewedAt" IS NOT NULL AND "reviewedBy" IS NOT NULL AND "reviewReason" IS NOT NULL AND "reviewedBy"<>"applicantId")) AND ((status='completed')=("completedAt" IS NOT NULL)));
CREATE UNIQUE INDEX request_one_open_applicant ON adoption_requests("publicationId","applicantId") WHERE status IN ('submitted','in_review','approved');
CREATE UNIQUE INDEX request_one_selected_applicant ON adoption_requests("publicationId") WHERE status IN ('approved','completed');
ALTER TABLE animal_audit_entries ADD CONSTRAINT animal_audit_action CHECK (action IN ('animal.created','animal.updated','animal.status_changed','animal.photo_added','animal.photo_removed','animal.adopted') AND length(btrim(reason))>=10);
ALTER TABLE adoption_audit_entries ADD CONSTRAINT adoption_audit_action CHECK (action IN ('publication.created','publication.updated','publication.submitted','publication.approved','publication.rejected','publication.paused','publication.deleted','publication.closed','request.submitted','request.reviewed','request.withdrawn','request.completed','request.closed') AND length(btrim(reason))>=10 AND ((action LIKE 'request.%')=("requestId" IS NOT NULL)));
CREATE TRIGGER animal_audit_append_only BEFORE UPDATE OR DELETE ON animal_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER adoption_audit_append_only BEFORE UPDATE OR DELETE ON adoption_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
