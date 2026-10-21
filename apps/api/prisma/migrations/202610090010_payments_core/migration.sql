-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "reference" VARCHAR(200),
    "checkoutUrl" VARCHAR(2000),
    "status" VARCHAR(30) NOT NULL,
    "distributionStatus" VARCHAR(20) NOT NULL,
    "allocation" JSONB NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "feeMinor" BIGINT,
    "version" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_events" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "eventId" VARCHAR(200) NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "observation" JSONB NOT NULL,
    "outcome" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_ledger_entries" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "platformMinor" BIGINT NOT NULL,
    "sellerMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_audit_entries" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "actorId" UUID,
    "requestId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_outbox_jobs" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "nextAt" TIMESTAMP(3) NOT NULL,
    "leaseId" UUID,
    "leaseUntil" TIMESTAMP(3),
    "lastError" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_outbox_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_attempts_buyerId_createdAt_id_idx" ON "payment_attempts"("buyerId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "payment_attempts_organizationId_status_createdAt_id_idx" ON "payment_attempts"("organizationId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "payment_attempts_orderId_status_idx" ON "payment_attempts"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_buyerId_idempotencyKey_key" ON "payment_attempts"("buyerId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_provider_reference_key" ON "payment_attempts"("provider", "reference");

-- CreateIndex
CREATE INDEX "payment_provider_events_paymentId_createdAt_id_idx" ON "payment_provider_events"("paymentId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_events_provider_eventId_key" ON "payment_provider_events"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_ledger_entries_paymentId_kind_key" ON "payment_ledger_entries"("paymentId", "kind");

-- CreateIndex
CREATE INDEX "payment_audit_entries_paymentId_createdAt_id_idx" ON "payment_audit_entries"("paymentId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "payment_outbox_jobs_status_nextAt_id_idx" ON "payment_outbox_jobs"("status", "nextAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_outbox_jobs_paymentId_kind_key" ON "payment_outbox_jobs"("paymentId", "kind");

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_provider_events" ADD CONSTRAINT "payment_provider_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_ledger_entries" ADD CONSTRAINT "payment_ledger_entries_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_ledger_entries" ADD CONSTRAINT "payment_ledger_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "payment_provider_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_audit_entries" ADD CONSTRAINT "payment_audit_entries_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_audit_entries" ADD CONSTRAINT "payment_audit_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_outbox_jobs" ADD CONSTRAINT "payment_outbox_jobs_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Existing snapshots/deadlines remain immutable; new orders may use 30 minutes.
ALTER TABLE orders DROP CONSTRAINT order_fields;
ALTER TABLE orders ADD CONSTRAINT order_fields CHECK(version>0 AND status IN ('awaiting_payment','paid','preparing','dispatched','ready_for_pickup','delivered','cancelled','expired') AND pettly_checkout_valid(snapshot) IS TRUE AND "totalMinor"=(snapshot->>'totalMinor')::bigint AND currency=snapshot->>'currency' AND "organizationId"=(snapshot->>'organizationId')::uuid AND "expiresAt">"createdAt" AND "expiresAt"<="createdAt"+interval '30 minutes' AND ((status IN ('awaiting_payment','cancelled','expired') AND "paymentId" IS NULL AND "paidAt" IS NULL) OR (status IN ('paid','preparing','dispatched','ready_for_pickup','delivered') AND "paymentId" IS NOT NULL AND "paidAt"<"expiresAt")) AND (status<>'expired' OR "updatedAt">="expiresAt"));

-- Allocations use integer minor units and round commission half-up once.
CREATE FUNCTION pettly_allocation_valid(a jsonb, subtotal bigint, total bigint) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT a = jsonb_build_object(
  'policyId','product-subtotal-v1:'||(a->>'rateBasisPoints'),
  'rateBasisPoints',(a->>'rateBasisPoints')::int,'base','product_subtotal',
  'baseMinor',subtotal,'totalMinor',total,
  'platformMinor',floor((subtotal::numeric*(a->>'rateBasisPoints')::int+5000)/10000)::bigint,
  'sellerMinor',total-floor((subtotal::numeric*(a->>'rateBasisPoints')::int+5000)/10000)::bigint,
  'processingFeeBearer','seller')
 AND (a->>'rateBasisPoints')::int BETWEEN 0 AND 10000 AND subtotal BETWEEN 0 AND total;
$$;
CREATE FUNCTION pettly_quote_payment_terms() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.snapshot->>'currency' IS DISTINCT FROM 'COP' OR NEW.snapshot->'contact'->>'countryCode' IS DISTINCT FROM 'CO'
 OR (NEW.snapshot->>'fulfillment'='pickup' AND NEW.snapshot->'pickupAddress'->>'countryCode' IS DISTINCT FROM 'CO')
 OR pettly_allocation_valid(NEW.snapshot->'commission',(NEW.snapshot->>'subtotalMinor')::bigint,(NEW.snapshot->>'totalMinor')::bigint) IS NOT TRUE
 THEN RAISE EXCEPTION 'New checkout requires Colombia COP and immutable split terms'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER quote_payment_terms BEFORE INSERT ON checkout_quotes FOR EACH ROW EXECUTE FUNCTION pettly_quote_payment_terms();
ALTER TABLE payment_attempts ADD CONSTRAINT payment_fields CHECK (
 version>0 AND currency='COP' AND "amountMinor" BETWEEN 1 AND 9007199254740991
 AND "feeMinor" BETWEEN 0 AND 9007199254740991
 AND status IN ('created','processing','pending','approved','declined','cancelled','expired','reconciliation_required')
 AND "distributionStatus" IN ('unconfirmed','pending','distributed','failed')
 AND "expiresAt">"createdAt" AND "updatedAt">="createdAt"
 AND pettly_allocation_valid(allocation,(allocation->>'baseMinor')::bigint,"amountMinor") IS TRUE
 AND ("checkoutUrl" IS NULL OR "checkoutUrl" LIKE 'https://%')
 AND (reference IS NULL OR length(reference)>0));
-- Reconciliation can coexist with a later attempt to record late/double collections safely.
CREATE UNIQUE INDEX payment_one_live_attempt ON payment_attempts("orderId") WHERE status IN ('created','processing','pending','approved');
CREATE FUNCTION pettly_payment_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' THEN
 IF NEW.status<>'created' OR NEW.version<>1 OR NEW.reference IS NOT NULL OR NEW."checkoutUrl" IS NOT NULL OR NEW."feeMinor" IS NOT NULL OR NEW."distributionStatus"<>'unconfirmed'
 OR NOT EXISTS(SELECT 1 FROM orders o WHERE o.id=NEW."orderId" AND o.status='awaiting_payment' AND o."expiresAt">NEW."createdAt" AND o."expiresAt"=NEW."expiresAt" AND o."buyerId"=NEW."buyerId" AND o."organizationId"=NEW."organizationId" AND o.currency=NEW.currency AND o."totalMinor"=NEW."amountMinor" AND o.snapshot->'commission'=NEW.allocation)
 THEN RAISE EXCEPTION 'Payment requires the accepted live order allocation'; END IF;
 ELSE
 IF (OLD.id,OLD."orderId",OLD."buyerId",OLD."organizationId",OLD."idempotencyKey",OLD.provider,OLD.allocation,OLD."amountMinor",OLD.currency,OLD."expiresAt",OLD."createdAt") IS DISTINCT FROM (NEW.id,NEW."orderId",NEW."buyerId",NEW."organizationId",NEW."idempotencyKey",NEW.provider,NEW.allocation,NEW."amountMinor",NEW.currency,NEW."expiresAt",NEW."createdAt") OR NEW.version<>OLD.version+1 OR (OLD.reference IS NOT NULL AND OLD.reference IS DISTINCT FROM NEW.reference) THEN RAISE EXCEPTION 'Immutable payment contract or invalid revision'; END IF;
 IF NOT ((OLD.status='created' AND NEW.status IN ('processing','cancelled','expired')) OR (OLD.status IN ('processing','pending') AND NEW.status IN ('pending','approved','declined','cancelled','reconciliation_required')) OR (OLD.status='approved' AND NEW.status IN ('approved','reconciliation_required')) OR (OLD.status IN ('declined','cancelled','expired') AND NEW.status IN ('approved','reconciliation_required')) OR (OLD.status='reconciliation_required' AND NEW.status IN ('approved','reconciliation_required'))) THEN RAISE EXCEPTION 'Invalid payment transition'; END IF;
 IF OLD."distributionStatus"='distributed' AND NEW."distributionStatus"<>'distributed' THEN RAISE EXCEPTION 'Confirmed distribution cannot be silently erased'; END IF;
 END IF;
 RETURN NEW; END $$;
CREATE TRIGGER payment_guard BEFORE INSERT OR UPDATE ON payment_attempts FOR EACH ROW EXECUTE FUNCTION pettly_payment_guard();
CREATE TRIGGER payment_no_delete BEFORE DELETE ON payment_attempts FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
ALTER TABLE payment_provider_events ADD CONSTRAINT payment_event_fields CHECK(outcome IN ('applied','ignored','reconciliation_required') AND jsonb_typeof(observation)='object' AND length("eventId")>0);
ALTER TABLE payment_ledger_entries ADD CONSTRAINT payment_ledger_fields CHECK(kind='capture' AND "amountMinor" BETWEEN 1 AND 9007199254740991 AND "platformMinor">=0 AND "sellerMinor">=0 AND "platformMinor"+"sellerMinor"="amountMinor");
ALTER TABLE payment_audit_entries ADD CONSTRAINT payment_audit_fields CHECK(version>0 AND action IN ('created','processing','pending','approved','declined','cancelled','expired','reconciliation_required','reconciliation_requested'));
CREATE TRIGGER payment_events_immutable BEFORE UPDATE OR DELETE ON payment_provider_events FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER payment_ledger_immutable BEFORE UPDATE OR DELETE ON payment_ledger_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER payment_audit_immutable BEFORE UPDATE OR DELETE ON payment_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE FUNCTION pettly_payment_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM payment_audit_entries WHERE "paymentId"=NEW.id AND version=NEW.version AND action=NEW.status) THEN RAISE EXCEPTION 'Payment revision requires audit'; END IF;
 IF NEW.status='approved' AND NOT EXISTS(SELECT 1 FROM orders WHERE id=NEW."orderId" AND "paymentId"=NEW.id AND status IN ('paid','preparing','dispatched','ready_for_pickup','delivered')) THEN RAISE EXCEPTION 'Approved payment requires matching paid order'; END IF;
 IF NEW.status='approved' AND NOT EXISTS(SELECT 1 FROM payment_ledger_entries WHERE "paymentId"=NEW.id) THEN RAISE EXCEPTION 'Approved payment requires capture evidence'; END IF;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER payment_evidence AFTER INSERT OR UPDATE ON payment_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_payment_evidence();
CREATE FUNCTION pettly_payment_ledger_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM payment_attempts p JOIN payment_provider_events e ON e.id=NEW."eventId" AND e."paymentId"=p.id WHERE p.id=NEW."paymentId" AND e.provider=p.provider AND e.observation->>'status'='approved' AND e.observation->>'currency'=p.currency AND (e.observation->>'amountMinor')::bigint=p."amountMinor" AND (e.observation->>'paymentId')::uuid=p.id AND e.observation->>'reference'=p.reference AND NEW."amountMinor"=p."amountMinor" AND NEW."platformMinor"=(p.allocation->>'platformMinor')::bigint AND NEW."sellerMinor"=(p.allocation->>'sellerMinor')::bigint)
 THEN RAISE EXCEPTION 'Capture ledger requires exact authoritative payment evidence'; END IF;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER payment_ledger_evidence AFTER INSERT ON payment_ledger_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_payment_ledger_guard();
ALTER TABLE payment_outbox_jobs ADD CONSTRAINT payment_job_fields CHECK(kind IN ('checkout','reconcile') AND status IN ('queued','retry','done') AND attempts>=0 AND (("leaseId" IS NULL)=("leaseUntil" IS NULL)) AND ("leaseUntil" IS NULL OR "leaseUntil">"updatedAt"));
CREATE FUNCTION pettly_payment_job_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND (OLD.id,OLD."paymentId",OLD.kind,OLD."createdAt") IS DISTINCT FROM (NEW.id,NEW."paymentId",NEW.kind,NEW."createdAt") THEN RAISE EXCEPTION 'Payment job identity is immutable'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER payment_job_guard BEFORE UPDATE ON payment_outbox_jobs FOR EACH ROW EXECUTE FUNCTION pettly_payment_job_guard();
