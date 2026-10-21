-- AlterTable
ALTER TABLE "notification_outbox" ADD COLUMN     "deduplicationKey" VARCHAR(120),
ADD COLUMN     "notBefore" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "subjectId" UUID,
ADD COLUMN     "subjectType" VARCHAR(30),
ADD COLUMN     "subjectVersion" INTEGER;

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_resources" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_blocks" (
    "id" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "service_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_audit" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "serviceId" UUID,
    "resourceId" UUID,
    "actorId" UUID NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "requestId" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "version" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "occupiedStartsAt" TIMESTAMP(3) NOT NULL,
    "occupiedEndsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_audit" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(40) NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "requestId" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_status_category_kind_createdAt_id_idx" ON "services"("status", "category", "kind", "createdAt", "id");

-- CreateIndex
CREATE INDEX "services_organizationId_status_createdAt_id_idx" ON "services"("organizationId", "status", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "services_id_organizationId_key" ON "services"("id", "organizationId");

-- CreateIndex
CREATE INDEX "service_resources_organizationId_status_id_idx" ON "service_resources"("organizationId", "status", "id");

-- CreateIndex
CREATE UNIQUE INDEX "service_resources_id_organizationId_key" ON "service_resources"("id", "organizationId");

-- CreateIndex
CREATE INDEX "service_blocks_resourceId_releasedAt_startsAt_endsAt_idx" ON "service_blocks"("resourceId", "releasedAt", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "service_audit_serviceId_createdAt_id_idx" ON "service_audit"("serviceId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "service_audit_resourceId_createdAt_id_idx" ON "service_audit"("resourceId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "bookings_resourceId_status_occupiedStartsAt_occupiedEndsAt_idx" ON "bookings"("resourceId", "status", "occupiedStartsAt", "occupiedEndsAt");

-- CreateIndex
CREATE INDEX "bookings_animalId_status_occupiedStartsAt_occupiedEndsAt_idx" ON "bookings"("animalId", "status", "occupiedStartsAt", "occupiedEndsAt");

-- CreateIndex
CREATE INDEX "bookings_status_expiresAt_id_idx" ON "bookings"("status", "expiresAt", "id");

-- CreateIndex
CREATE INDEX "bookings_buyerId_createdAt_id_idx" ON "bookings"("buyerId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "bookings_organizationId_createdAt_id_idx" ON "bookings"("organizationId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_buyerId_idempotencyKey_key" ON "bookings"("buyerId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "booking_audit_bookingId_createdAt_id_idx" ON "booking_audit"("bookingId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_audit_bookingId_version_key" ON "booking_audit"("bookingId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "notification_outbox_deduplicationKey_key" ON "notification_outbox"("deduplicationKey");

-- CreateIndex
CREATE INDEX "notification_outbox_subjectType_subjectId_idx" ON "notification_outbox"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "notification_outbox_notBefore_deliveredAt_failedAt_idx" ON "notification_outbox"("notBefore", "deliveredAt", "failedAt");

-- AddForeignKey
ALTER TABLE "service_blocks" ADD CONSTRAINT "service_blocks_resourceId_organizationId_fkey" FOREIGN KEY ("resourceId", "organizationId") REFERENCES "service_resources"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceId_organizationId_fkey" FOREIGN KEY ("serviceId", "organizationId") REFERENCES "services"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resourceId_organizationId_fkey" FOREIGN KEY ("resourceId", "organizationId") REFERENCES "service_resources"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- UUID identities, referential retention, current projections and immutable revision evidence.
ALTER TABLE services ADD CONSTRAINT services_org FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE service_resources ADD CONSTRAINT resources_org FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE service_blocks ADD CONSTRAINT blocks_actor FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE service_audit ADD CONSTRAINT service_audit_actor FOREIGN KEY ("actorId") REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE service_audit ADD CONSTRAINT service_audit_service FOREIGN KEY ("serviceId") REFERENCES services(id) ON DELETE RESTRICT;
ALTER TABLE service_audit ADD CONSTRAINT service_audit_resource FOREIGN KEY ("resourceId") REFERENCES service_resources(id) ON DELETE RESTRICT;
ALTER TABLE bookings ADD CONSTRAINT bookings_buyer FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE bookings ADD CONSTRAINT bookings_pet FOREIGN KEY ("animalId") REFERENCES animals(id) ON DELETE RESTRICT;
ALTER TABLE booking_audit ADD CONSTRAINT booking_audit_booking FOREIGN KEY ("bookingId") REFERENCES bookings(id) ON DELETE RESTRICT;
ALTER TABLE booking_audit ADD CONSTRAINT booking_audit_actor FOREIGN KEY ("actorId") REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE service_blocks ADD CONSTRAINT block_interval CHECK("startsAt"<"endsAt" AND length(reason) BETWEEN 10 AND 500);
ALTER TABLE services ADD CONSTRAINT service_shape CHECK(version>0 AND kind IN('appointment','lodging') AND status IN('draft','pending','published','rejected','paused','archived') AND category IN('grooming','daycare','training','lodging') AND snapshot->>'currency'='COP' AND snapshot->>'collectionMode'='pay_at_business');
ALTER TABLE service_resources ADD CONSTRAINT resource_shape CHECK(version>0 AND capacity BETWEEN 1 AND 100 AND kind IN('appointment','lodging') AND status IN('active','inactive'));
ALTER TABLE bookings ADD CONSTRAINT booking_shape CHECK(version>0 AND status IN('requested','confirmed','in_progress','completed','cancelled','rejected','expired','no_show') AND "occupiedStartsAt"<="startsAt" AND "startsAt"<"endsAt" AND "endsAt"<="occupiedEndsAt" AND ((status='requested' AND "expiresAt" IS NOT NULL AND "expiresAt"<="startsAt") OR (status<>'requested' AND "expiresAt" IS NULL)) AND (snapshot#>>'{acceptance,totalMinor}')::bigint>0 AND snapshot#>>'{acceptance,service,currency}'='COP' AND snapshot#>>'{acceptance,service,collectionMode}'='pay_at_business' AND snapshot#>>'{acceptance,consent}'='true');
CREATE TRIGGER services_no_delete BEFORE DELETE ON services FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER resources_no_delete BEFORE DELETE ON service_resources FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER blocks_no_delete BEFORE DELETE ON service_blocks FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER bookings_no_delete BEFORE DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER service_audit_immutable BEFORE UPDATE OR DELETE ON service_audit FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER booking_audit_immutable BEFORE UPDATE OR DELETE ON booking_audit FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();

CREATE FUNCTION pettly_service_projection() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.snapshot->>'id',NEW.snapshot->>'organizationId',(NEW.snapshot->>'version')::int,NEW.snapshot->>'kind',NEW.snapshot->>'status',(NEW.snapshot->>'createdAt')::timestamp,(NEW.snapshot->>'updatedAt')::timestamp)
 IS DISTINCT FROM (NEW.id::text,NEW."organizationId"::text,NEW.version,NEW.kind,NEW.status,NEW."createdAt",NEW."updatedAt") THEN RAISE EXCEPTION 'Service/resource snapshot does not match indexed projection'; END IF;
 IF TG_TABLE_NAME='services' THEN
  IF (NEW.snapshot->>'name',NEW.snapshot->>'category') IS DISTINCT FROM (NEW.name,NEW.category) THEN RAISE EXCEPTION 'Service search projection mismatch'; END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
  IF (NEW.id,NEW."organizationId",NEW."createdAt") IS DISTINCT FROM (OLD.id,OLD."organizationId",OLD."createdAt") OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Immutable identity or stale aggregate revision'; END IF;
  IF TG_TABLE_NAME='service_resources' AND OLD.kind<>NEW.kind THEN RAISE EXCEPTION 'Resource kind is immutable'; END IF;
  IF TG_TABLE_NAME='services' AND OLD.status='archived' THEN RAISE EXCEPTION 'Archived service is terminal'; END IF;
 ELSIF NEW.version<>1 THEN RAISE EXCEPTION 'New aggregate starts at revision one'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER service_projection BEFORE INSERT OR UPDATE ON services FOR EACH ROW EXECUTE FUNCTION pettly_service_projection();
CREATE TRIGGER resource_projection BEFORE INSERT OR UPDATE ON service_resources FOR EACH ROW EXECUTE FUNCTION pettly_service_projection();

-- Fixed Colombian calendar, no DST: local date/minute semantics match the domain.
CREATE FUNCTION pettly_calendar_fits(calendar jsonb,kind text,a timestamp,b timestamp) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE first_day date=(a-INTERVAL '5 hours')::date; final_day date=(b-INTERVAL '5 hours')::date; d date; start_min int; end_min int;
BEGIN
 IF a>=b OR calendar IS NULL OR jsonb_typeof(calendar) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF kind='appointment' THEN
  IF first_day<>((b-INTERVAL '5 hours'-INTERVAL '1 millisecond')::date) THEN RETURN false; END IF;
  start_min=extract(hour FROM a-INTERVAL '5 hours')::int*60+extract(minute FROM a-INTERVAL '5 hours')::int;
  end_min=extract(hour FROM b-INTERVAL '5 hours'-INTERVAL '1 millisecond')::int*60+extract(minute FROM b-INTERVAL '5 hours'-INTERVAL '1 millisecond')::int+1;
  RETURN EXISTS(SELECT 1 FROM jsonb_array_elements(calendar) w WHERE (w->>'day')::int=extract(isodow FROM first_day)::int AND (w->>'startMinute')::int<=start_min AND (w->>'endMinute')::int>=end_min);
 END IF;
 IF final_day<=first_day OR final_day-first_day>30 THEN RETURN false; END IF;
 d=first_day;
 WHILE d<final_day LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(calendar) w WHERE (w->>'day')::int=extract(isodow FROM d)::int AND (w->>'startMinute')::int=0 AND (w->>'endMinute')::int=1440) THEN RETURN false; END IF;
  d=d+1;
 END LOOP;
 RETURN true;
END $$;

CREATE FUNCTION pettly_booking_peak(resource_id uuid) RETURNS bigint LANGUAGE sql STABLE AS $$
 WITH active AS (SELECT "occupiedStartsAt" a,"occupiedEndsAt" b FROM bookings WHERE "resourceId"=resource_id AND "occupiedEndsAt">NOW() AND (status IN('confirmed','in_progress','completed') OR status='requested' AND "expiresAt">NOW())),
 events AS (SELECT a t,1::bigint delta FROM active UNION ALL SELECT b,-1::bigint FROM active),
 grouped AS (SELECT t,sum(delta) delta FROM events GROUP BY t),
 running AS (SELECT sum(delta) OVER(ORDER BY t) n FROM grouped)
 SELECT COALESCE(max(n),0)::bigint FROM running;
$$;

CREATE FUNCTION pettly_booking_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r service_resources%ROWTYPE; s services%ROWTYPE; busy bigint; resource_id uuid;
BEGIN
 -- Lock actual rows even for callers that bypass application advisory locks.
 IF TG_OP='UPDATE' THEN
  IF (NEW.id,NEW."organizationId",NEW."buyerId",NEW."animalId",NEW."serviceId",NEW."idempotencyKey",NEW.fingerprint,NEW."createdAt") IS DISTINCT FROM (OLD.id,OLD."organizationId",OLD."buyerId",OLD."animalId",OLD."serviceId",OLD."idempotencyKey",OLD.fingerprint,OLD."createdAt") OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Immutable booking identity or stale revision'; END IF;
  IF OLD.status IN('cancelled','rejected','expired','no_show','completed') THEN RAISE EXCEPTION 'Closed booking is terminal'; END IF;
  IF NOT ((OLD.status='requested' AND NEW.status IN('requested','confirmed','rejected','cancelled','expired')) OR (OLD.status='confirmed' AND NEW.status IN('confirmed','requested','in_progress','cancelled','no_show')) OR (OLD.status='in_progress' AND NEW.status='completed')) THEN RAISE EXCEPTION 'Invalid booking state transition'; END IF;
  IF (NEW."startsAt",NEW."endsAt",NEW."occupiedStartsAt",NEW."occupiedEndsAt",NEW."resourceId") IS DISTINCT FROM (OLD."startsAt",OLD."endsAt",OLD."occupiedStartsAt",OLD."occupiedEndsAt",OLD."resourceId") AND NEW.snapshot->'acceptance' IS NOT DISTINCT FROM OLD.snapshot->'acceptance' THEN RAISE EXCEPTION 'Rescheduling requires renewed acceptance'; END IF;

  FOR resource_id IN SELECT DISTINCT v FROM unnest(ARRAY[OLD."resourceId",NEW."resourceId"]) v ORDER BY v LOOP PERFORM 1 FROM service_resources WHERE id=resource_id FOR UPDATE; END LOOP;
 ELSE
  IF NEW.version<>1 OR NEW.status NOT IN('requested','confirmed') THEN RAISE EXCEPTION 'Invalid new booking state'; END IF;
  PERFORM 1 FROM service_resources WHERE id=NEW."resourceId" FOR UPDATE;
 END IF;
 SELECT * INTO r FROM service_resources WHERE id=NEW."resourceId";
 PERFORM 1 FROM animals WHERE id=NEW."animalId" FOR UPDATE;
 IF (NEW.snapshot->>'id',NEW.snapshot->>'buyerId',NEW.snapshot->>'animalId',NEW.snapshot->>'serviceId',NEW.snapshot->>'resourceId',NEW.snapshot->>'organizationId',NEW.snapshot->>'idempotencyKey',NEW.snapshot->>'fingerprint',NEW.snapshot->>'status',(NEW.snapshot->>'version')::int,(NEW.snapshot->>'startsAt')::timestamp,(NEW.snapshot->>'endsAt')::timestamp,(NEW.snapshot->>'occupiedStartsAt')::timestamp,(NEW.snapshot->>'occupiedEndsAt')::timestamp,(NEW.snapshot->>'expiresAt')::timestamp,(NEW.snapshot->>'createdAt')::timestamp,(NEW.snapshot->>'updatedAt')::timestamp)
 IS DISTINCT FROM (NEW.id::text,NEW."buyerId"::text,NEW."animalId"::text,NEW."serviceId"::text,NEW."resourceId"::text,NEW."organizationId"::text,NEW."idempotencyKey"::text,NEW.fingerprint,NEW.status,NEW.version,NEW."startsAt",NEW."endsAt",NEW."occupiedStartsAt",NEW."occupiedEndsAt",NEW."expiresAt",NEW."createdAt",NEW."updatedAt") THEN RAISE EXCEPTION 'Booking snapshot must match indexed projection'; END IF;
 IF TG_OP='INSERT' OR NEW.snapshot->'acceptance' IS DISTINCT FROM OLD.snapshot->'acceptance' THEN
  SELECT * INTO s FROM services WHERE id=NEW."serviceId";
  IF s.status IS DISTINCT FROM 'published' OR r.status IS DISTINCT FROM 'active' OR s."organizationId" IS DISTINCT FROM NEW."organizationId" OR r."organizationId" IS DISTINCT FROM NEW."organizationId" OR s.kind IS DISTINCT FROM r.kind OR NOT (s.snapshot->'resourceIds' ? NEW."resourceId"::text) OR (NEW.snapshot#>>'{acceptance,service,version}')::int IS DISTINCT FROM s.version OR (NEW.snapshot#>>'{acceptance,resource,version}')::int IS DISTINCT FROM r.version THEN RAISE EXCEPTION 'Booking requires current published service and active compatible resource'; END IF;
  IF NOT EXISTS(SELECT 1 FROM animals WHERE id=NEW."animalId" AND "ownerUserId"=NEW."buyerId" AND "organizationId" IS NULL AND status='active') THEN RAISE EXCEPTION 'Booking pet ownership is required'; END IF;
  IF NOT pettly_calendar_fits(r.snapshot->'windows',r.kind,NEW."occupiedStartsAt",NEW."occupiedEndsAt") THEN RAISE EXCEPTION 'Booking is outside resource calendar'; END IF;
 END IF;
 IF NEW.status IN('confirmed','in_progress','completed') OR NEW.status='requested' AND NEW."expiresAt">NOW() THEN
  IF EXISTS(SELECT 1 FROM service_blocks WHERE "resourceId"=r.id AND "releasedAt" IS NULL AND "startsAt"<NEW."occupiedEndsAt" AND "endsAt">NEW."occupiedStartsAt") THEN RAISE EXCEPTION 'Booking overlaps resource block'; END IF;
  IF EXISTS(SELECT 1 FROM bookings WHERE id<>NEW.id AND "animalId"=NEW."animalId" AND "occupiedStartsAt"<NEW."occupiedEndsAt" AND "occupiedEndsAt">NEW."occupiedStartsAt" AND (status IN('confirmed','in_progress','completed') OR status='requested' AND "expiresAt">NOW())) THEN RAISE EXCEPTION 'Pet has an incompatible booking'; END IF;
  WITH active AS (SELECT greatest("occupiedStartsAt",NEW."occupiedStartsAt") a,least("occupiedEndsAt",NEW."occupiedEndsAt") b FROM bookings WHERE id<>NEW.id AND "resourceId"=r.id AND "occupiedStartsAt"<NEW."occupiedEndsAt" AND "occupiedEndsAt">NEW."occupiedStartsAt" AND (status IN('confirmed','in_progress','completed') OR status='requested' AND "expiresAt">NOW())),
  events AS (SELECT a t,1::bigint delta FROM active UNION ALL SELECT b,-1::bigint FROM active), grouped AS(SELECT t,sum(delta) delta FROM events GROUP BY t),running AS(SELECT sum(delta) OVER(ORDER BY t) n FROM grouped) SELECT COALESCE(max(n),0) INTO busy FROM running;
  IF busy>=r.capacity THEN RAISE EXCEPTION 'Resource capacity exceeded'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_guard BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION pettly_booking_guard();

CREATE FUNCTION pettly_resource_calendar_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.snapshot->>'capacity')::int IS DISTINCT FROM NEW.capacity THEN RAISE EXCEPTION 'Resource capacity projection mismatch'; END IF;
 IF TG_OP='UPDATE' THEN
  IF pettly_booking_peak(NEW.id)>NEW.capacity THEN RAISE EXCEPTION 'Resource capacity invalidates reservations'; END IF;
  IF EXISTS(SELECT 1 FROM bookings WHERE "resourceId"=NEW.id AND "occupiedEndsAt">NOW() AND (status IN('confirmed','in_progress','completed') OR status='requested' AND "expiresAt">NOW()) AND NOT pettly_calendar_fits(NEW.snapshot->'windows',NEW.kind,"occupiedStartsAt","occupiedEndsAt")) THEN RAISE EXCEPTION 'Calendar change invalidates reservations'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER resource_calendar_guard BEFORE INSERT OR UPDATE ON service_resources FOR EACH ROW EXECUTE FUNCTION pettly_resource_calendar_guard();
CREATE FUNCTION pettly_service_block_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM 1 FROM service_resources WHERE id=NEW."resourceId" FOR UPDATE;
 IF TG_OP='UPDATE' THEN
  IF OLD."releasedAt" IS NOT NULL OR NEW."releasedAt" IS NULL OR (NEW.id,NEW."resourceId",NEW."organizationId",NEW."startsAt",NEW."endsAt",NEW.reason,NEW."createdBy",NEW."createdAt") IS DISTINCT FROM (OLD.id,OLD."resourceId",OLD."organizationId",OLD."startsAt",OLD."endsAt",OLD.reason,OLD."createdBy",OLD."createdAt") THEN RAISE EXCEPTION 'Only one-way block release is allowed'; END IF;
 ELSE
  IF (SELECT count(*) FROM service_blocks WHERE "resourceId"=NEW."resourceId" AND "releasedAt" IS NULL AND "endsAt">NOW())>=100 THEN RAISE EXCEPTION 'Resource future block limit exceeded'; END IF;
  IF EXISTS(SELECT 1 FROM bookings WHERE "resourceId"=NEW."resourceId" AND "occupiedStartsAt"<NEW."endsAt" AND "occupiedEndsAt">NEW."startsAt" AND (status IN('confirmed','in_progress','completed') OR status='requested' AND "expiresAt">NOW())) OR EXISTS(SELECT 1 FROM service_blocks WHERE "resourceId"=NEW."resourceId" AND "releasedAt" IS NULL AND "startsAt"<NEW."endsAt" AND "endsAt">NEW."startsAt") THEN RAISE EXCEPTION 'Resource block overlaps accepted booking or block'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER service_block_guard BEFORE INSERT OR UPDATE ON service_blocks FOR EACH ROW EXECUTE FUNCTION pettly_service_block_guard();

CREATE FUNCTION pettly_booking_revision_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM booking_audit WHERE "bookingId"=NEW.id AND version=NEW.version AND snapshot=NEW.snapshot) THEN RAISE EXCEPTION 'Booking revision requires matching immutable evidence'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER booking_revision_evidence AFTER INSERT OR UPDATE ON bookings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_booking_revision_evidence();
CREATE FUNCTION pettly_service_revision_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='services' THEN
  IF NOT EXISTS(SELECT 1 FROM service_audit WHERE "serviceId"=NEW.id AND version=NEW.version AND snapshot=NEW.snapshot) THEN RAISE EXCEPTION 'Service revision requires matching immutable evidence'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM service_audit WHERE "resourceId"=NEW.id AND version=NEW.version AND snapshot=NEW.snapshot) THEN RAISE EXCEPTION 'Resource revision requires matching immutable evidence'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER service_revision_evidence AFTER INSERT OR UPDATE ON services DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_service_revision_evidence();
CREATE CONSTRAINT TRIGGER resource_revision_evidence AFTER INSERT OR UPDATE ON service_resources DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_service_revision_evidence();

ALTER TABLE service_audit ADD CONSTRAINT service_audit_shape CHECK(version>0 AND length(reason) BETWEEN 10 AND 500 AND (("serviceId" IS NOT NULL AND "resourceId" IS NULL) OR ("serviceId" IS NULL AND "resourceId" IS NOT NULL)));
ALTER TABLE booking_audit ADD CONSTRAINT booking_audit_shape CHECK(version>0 AND length(reason) BETWEEN 10 AND 500);
