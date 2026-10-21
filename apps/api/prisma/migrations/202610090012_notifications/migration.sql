-- AlterTable
ALTER TABLE "notification_outbox" ADD COLUMN     "failureKind" VARCHAR(30),
ADD COLUMN     "mailPurpose" VARCHAR(40),
ADD COLUMN     "notificationId" UUID,
ADD COLUMN     "retryOfId" UUID;

-- CreateTable
CREATE TABLE "notification_inbox" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventKey" VARCHAR(120) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "eventType" VARCHAR(60) NOT NULL,
    "subjectType" VARCHAR(30) NOT NULL,
    "subjectId" UUID NOT NULL,
    "subjectVersion" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notification_inbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "userId" UUID NOT NULL,
    "ordersEmail" BOOLEAN NOT NULL DEFAULT true,
    "adoptionsEmail" BOOLEAN NOT NULL DEFAULT true,
    "bookingsEmail" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "notification_retry_audit" (
    "id" UUID NOT NULL,
    "failedOutboxId" UUID NOT NULL,
    "newOutboxId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_retry_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_inbox_userId_createdAt_id_idx" ON "notification_inbox"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "notification_inbox_userId_readAt_createdAt_id_idx" ON "notification_inbox"("userId", "readAt", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_inbox_userId_eventKey_key" ON "notification_inbox"("userId", "eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "notification_retry_audit_failedOutboxId_key" ON "notification_retry_audit"("failedOutboxId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_retry_audit_newOutboxId_key" ON "notification_retry_audit"("newOutboxId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_outbox_retryOfId_key" ON "notification_outbox"("retryOfId");

-- AddForeignKey
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification_inbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE notification_inbox ADD CONSTRAINT notification_recipient_fk FOREIGN KEY("userId") REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_fk FOREIGN KEY("userId") REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE notification_retry_audit ADD CONSTRAINT notification_retry_actor_fk FOREIGN KEY("actorId") REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE notification_retry_audit ADD CONSTRAINT notification_retry_parent_fk FOREIGN KEY("failedOutboxId") REFERENCES notification_outbox(id) ON DELETE RESTRICT;
ALTER TABLE notification_retry_audit ADD CONSTRAINT notification_retry_child_fk FOREIGN KEY("newOutboxId") REFERENCES notification_outbox(id) ON DELETE RESTRICT;
ALTER TABLE notification_outbox ADD CONSTRAINT notification_retry_of_fk FOREIGN KEY("retryOfId") REFERENCES notification_outbox(id) ON DELETE RESTRICT;
ALTER TABLE notification_inbox ADD CONSTRAINT notification_fields CHECK(category IN('orders','adoptions','organizations','bookings') AND "subjectVersion">0 AND length(title) BETWEEN 1 AND 150 AND length(body) BETWEEN 1 AND 2000 AND ("readAt" IS NULL OR "readAt">="createdAt"));
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preference_version CHECK(version>0);
ALTER TABLE notification_outbox ADD CONSTRAINT notification_failure_kind CHECK("failureKind" IS NULL OR "failureKind" IN('delivery_failed','expired','superseded','preferences_disabled'));
ALTER TABLE notification_retry_audit ADD CONSTRAINT notification_retry_reason CHECK(length(reason) BETWEEN 10 AND 500);
CREATE FUNCTION pettly_notification_read_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.id,NEW."userId",NEW."eventKey",NEW.category,NEW."eventType",NEW."subjectType",NEW."subjectId",NEW."subjectVersion",NEW.status,NEW.title,NEW.body,NEW.details,NEW."createdAt") IS DISTINCT FROM (OLD.id,OLD."userId",OLD."eventKey",OLD.category,OLD."eventType",OLD."subjectType",OLD."subjectId",OLD."subjectVersion",OLD.status,OLD.title,OLD.body,OLD.details,OLD."createdAt") OR OLD."readAt" IS NOT NULL OR NEW."readAt" IS NULL THEN RAISE EXCEPTION 'Notification content is immutable and read timestamp is one-way'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_read_guard BEFORE UPDATE ON notification_inbox FOR EACH ROW EXECUTE FUNCTION pettly_notification_read_guard();
CREATE TRIGGER notification_inbox_no_delete BEFORE DELETE ON notification_inbox FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER notification_retry_audit_immutable BEFORE UPDATE OR DELETE ON notification_retry_audit FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE FUNCTION pettly_notification_preferences_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' THEN IF NEW.version<>1 THEN RAISE EXCEPTION 'Preferences start at version one'; END IF;
 ELSIF NEW."userId"<>OLD."userId" OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Immutable preference owner or stale version'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_preferences_guard BEFORE INSERT OR UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION pettly_notification_preferences_guard();
CREATE FUNCTION pettly_notification_retry_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE parent notification_outbox%ROWTYPE; BEGIN
 IF TG_OP='UPDATE' THEN
  IF (NEW."notificationId",NEW."retryOfId",NEW."mailPurpose") IS DISTINCT FROM (OLD."notificationId",OLD."retryOfId",OLD."mailPurpose") THEN RAISE EXCEPTION 'Delivery identity is immutable'; END IF;
 ELSIF NEW."retryOfId" IS NOT NULL THEN
  SELECT * INTO parent FROM notification_outbox WHERE id=NEW."retryOfId" FOR UPDATE;
  IF parent."notificationId" IS NULL OR parent."failedAt" IS NULL OR parent."deliveredAt" IS NOT NULL OR parent."failureKind" IS DISTINCT FROM 'delivery_failed' OR parent."expiresAt"<=NOW() OR NEW."notificationId" IS DISTINCT FROM parent."notificationId" OR NEW."expiresAt" IS DISTINCT FROM parent."expiresAt" OR NEW."mailPurpose" IS DISTINCT FROM parent."mailPurpose" THEN RAISE EXCEPTION 'Only a live failed business delivery can be retried'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_retry_guard BEFORE INSERT OR UPDATE ON notification_outbox FOR EACH ROW EXECUTE FUNCTION pettly_notification_retry_guard();
CREATE FUNCTION pettly_notification_retry_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW."retryOfId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM notification_retry_audit WHERE "newOutboxId"=NEW.id AND "failedOutboxId"=NEW."retryOfId") THEN RAISE EXCEPTION 'Retry requires immutable administrator evidence'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER notification_retry_evidence AFTER INSERT ON notification_outbox DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_notification_retry_evidence();
