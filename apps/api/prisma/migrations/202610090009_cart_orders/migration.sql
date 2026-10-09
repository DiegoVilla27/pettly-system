-- AlterTable
ALTER TABLE "inventory_holds" ADD COLUMN     "orderId" UUID;

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID,
    "currency" CHAR(3),
    "items" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_quotes" (
    "id" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "cartVersion" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "fingerprint" VARCHAR(1000) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "paymentId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_policies" (
    "organizationId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_policies_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "order_audit_entries" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(30) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "requestId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_policy_audit_entries" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "requestId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_policy_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "checkout_quotes_buyerId_createdAt_id_idx" ON "checkout_quotes"("buyerId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "checkout_quotes_expiresAt_idx" ON "checkout_quotes"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_quoteId_key" ON "orders"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_paymentId_key" ON "orders"("paymentId");

-- CreateIndex
CREATE INDEX "orders_buyerId_createdAt_id_idx" ON "orders"("buyerId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "orders_organizationId_status_createdAt_id_idx" ON "orders"("organizationId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "orders_status_expiresAt_id_idx" ON "orders"("status", "expiresAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_buyerId_idempotencyKey_key" ON "orders"("buyerId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "order_audit_entries_orderId_createdAt_id_idx" ON "order_audit_entries"("orderId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "order_policy_audit_entries_organizationId_createdAt_id_idx" ON "order_policy_audit_entries"("organizationId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "order_policy_audit_entries_organizationId_version_key" ON "order_policy_audit_entries"("organizationId", "version");

-- AddForeignKey
ALTER TABLE "inventory_holds" ADD CONSTRAINT "inventory_holds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_quotes" ADD CONSTRAINT "checkout_quotes_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_quotes" ADD CONSTRAINT "checkout_quotes_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "checkout_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_policies" ADD CONSTRAINT "order_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_audit_entries" ADD CONSTRAINT "order_audit_entries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_audit_entries" ADD CONSTRAINT "order_audit_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_policy_audit_entries" ADD CONSTRAINT "order_policy_audit_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_policy_audit_entries" ADD CONSTRAINT "order_policy_audit_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE carts ADD CONSTRAINT cart_fields CHECK(version>0 AND jsonb_typeof(items)='array' AND jsonb_array_length(items)<=50 AND ((jsonb_array_length(items)=0 AND "organizationId" IS NULL AND currency IS NULL) OR (jsonb_array_length(items)>0 AND "organizationId" IS NOT NULL AND currency IN ('COP','USD','EUR'))));
CREATE FUNCTION pettly_cart_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE line jsonb; BEGIN
 IF TG_OP='UPDATE' AND (OLD.id<>NEW.id OR OLD."userId"<>NEW."userId" OR OLD."createdAt"<>NEW."createdAt" OR NEW.version<>OLD.version+1) THEN RAISE EXCEPTION 'Cart identity and version must be preserved'; END IF;
 FOR line IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
 IF (line->>'quantity')::int NOT BETWEEN 1 AND 99 OR (line->>'variantId')::uuid IS NULL THEN RAISE EXCEPTION 'Invalid cart line'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT v->>'variantId') FROM jsonb_array_elements(NEW.items) v)<>jsonb_array_length(NEW.items) THEN RAISE EXCEPTION 'Duplicate cart line'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER cart_guard BEFORE INSERT OR UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION pettly_cart_guard();
CREATE FUNCTION pettly_checkout_valid(s jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$ DECLARE l jsonb; subtotal bigint=0; taxes bigint=0; BEGIN
 IF jsonb_typeof(s)<>'object' OR jsonb_typeof(s->'lines')<>'array' OR jsonb_array_length(s->'lines') NOT BETWEEN 1 AND 50 OR s->>'currency' NOT IN ('COP','USD','EUR') OR s->>'fulfillment' NOT IN ('pickup','delivery') OR s->>'taxMode' NOT IN ('included','added') OR s->>'collector' NOT IN ('seller','platform') OR length(trim(s->>'terms')) NOT BETWEEN 10 AND 2000 OR (s->>'policyVersion')::int<1 THEN RETURN false; END IF;
 FOR l IN SELECT * FROM jsonb_array_elements(s->'lines') LOOP
 IF (l->>'quantity')::int NOT BETWEEN 1 AND 99 OR (l->>'unitPriceMinor')::bigint<1 OR (l->>'subtotalMinor')::bigint<>(l->>'quantity')::bigint*(l->>'unitPriceMinor')::bigint OR (l->>'taxMinor')::bigint<0 OR (l->>'holdId')::uuid IS NULL OR (l->>'variantId')::uuid IS NULL OR (l->>'productVersion')::int<1 THEN RETURN false; END IF;
 subtotal=subtotal+(l->>'subtotalMinor')::bigint;taxes=taxes+(l->>'taxMinor')::bigint;
 END LOOP;
 IF (SELECT count(DISTINCT v->>'variantId') FROM jsonb_array_elements(s->'lines') v)<>jsonb_array_length(s->'lines') OR (SELECT count(DISTINCT v->>'holdId') FROM jsonb_array_elements(s->'lines') v)<>jsonb_array_length(s->'lines') THEN RETURN false; END IF;
 RETURN subtotal=(s->>'subtotalMinor')::bigint AND (s->>'shippingMinor')::bigint>=0 AND (s->>'totalMinor')::bigint BETWEEN 1 AND 9007199254740991 AND (s->>'totalMinor')::bigint=subtotal+(s->>'shippingMinor')::bigint+COALESCE((s->>'taxMinor')::bigint,0) AND ((s->>'taxMode'='included' AND s->'taxMinor'='null'::jsonb AND taxes=0) OR (s->>'taxMode'='added' AND (s->>'taxMinor')::bigint>=taxes));
END $$;
ALTER TABLE checkout_quotes ADD CONSTRAINT quote_fields CHECK("cartVersion">0 AND "expiresAt">"createdAt" AND "expiresAt"<="createdAt"+interval '5 minutes' AND pettly_checkout_valid(snapshot) IS TRUE);
CREATE TRIGGER checkout_quote_immutable BEFORE UPDATE ON checkout_quotes FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
ALTER TABLE orders ADD CONSTRAINT order_fields CHECK(version>0 AND status IN ('awaiting_payment','paid','preparing','dispatched','ready_for_pickup','delivered','cancelled','expired') AND pettly_checkout_valid(snapshot) IS TRUE AND "totalMinor"=(snapshot->>'totalMinor')::bigint AND currency=snapshot->>'currency' AND "organizationId"=(snapshot->>'organizationId')::uuid AND "expiresAt">"createdAt" AND "expiresAt"<="createdAt"+interval '15 minutes' AND ((status IN ('awaiting_payment','cancelled','expired') AND "paymentId" IS NULL AND "paidAt" IS NULL) OR (status IN ('paid','preparing','dispatched','ready_for_pickup','delivered') AND "paymentId" IS NOT NULL AND "paidAt"<"expiresAt")) AND (status<>'expired' OR "updatedAt">="expiresAt"));
CREATE FUNCTION pettly_order_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' THEN
 IF NEW.status<>'awaiting_payment' OR NEW.version<>1 OR NOT EXISTS(SELECT 1 FROM checkout_quotes q WHERE q.id=NEW."quoteId" AND q."buyerId"=NEW."buyerId" AND q.snapshot=NEW.snapshot AND q."expiresAt">NEW."createdAt") THEN RAISE EXCEPTION 'Order requires an accepted live buyer quote'; END IF;
 ELSE
 IF (OLD.id,OLD."buyerId",OLD."organizationId",OLD."quoteId",OLD."idempotencyKey",OLD.fingerprint,OLD.snapshot,OLD."totalMinor",OLD.currency,OLD."expiresAt",OLD."createdAt") IS DISTINCT FROM (NEW.id,NEW."buyerId",NEW."organizationId",NEW."quoteId",NEW."idempotencyKey",NEW.fingerprint,NEW.snapshot,NEW."totalMinor",NEW.currency,NEW."expiresAt",NEW."createdAt") OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Immutable order snapshot or invalid version'; END IF;
 IF NOT ((OLD.status='awaiting_payment' AND NEW.status IN ('paid','cancelled','expired')) OR (OLD.status='paid' AND NEW.status='preparing') OR (OLD.status='preparing' AND ((NEW.status='dispatched' AND NEW.snapshot->>'fulfillment'='delivery') OR (NEW.status='ready_for_pickup' AND NEW.snapshot->>'fulfillment'='pickup'))) OR (OLD.status IN ('dispatched','ready_for_pickup') AND NEW.status='delivered')) OR (OLD."paymentId" IS NOT NULL AND (OLD."paymentId",OLD."paidAt") IS DISTINCT FROM (NEW."paymentId",NEW."paidAt")) THEN RAISE EXCEPTION 'Invalid order transition'; END IF;
 END IF;
 RETURN NEW; END $$;
CREATE TRIGGER order_guard BEFORE INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION pettly_order_guard();
CREATE TRIGGER order_no_delete BEFORE DELETE ON orders FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
ALTER TABLE order_policies ADD CONSTRAINT policy_fields CHECK(version>0 AND jsonb_typeof(data)='object');
ALTER TABLE order_audit_entries ADD CONSTRAINT order_audit_fields CHECK(length(trim(reason))>=10 AND action IN ('created','paid','preparing','dispatched','ready_for_pickup','delivered','cancelled','expired') AND ((action IN ('paid','expired') AND "actorId" IS NULL) OR (action NOT IN ('paid','expired') AND "actorId" IS NOT NULL)));
ALTER TABLE order_policy_audit_entries ADD CONSTRAINT policy_audit_fields CHECK(version>0 AND length(trim(reason))>=10);
CREATE TRIGGER order_audit_append_only BEFORE UPDATE OR DELETE ON order_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE TRIGGER order_policy_audit_append_only BEFORE UPDATE OR DELETE ON order_policy_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE FUNCTION pettly_order_policy_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM organizations WHERE id=NEW."organizationId" AND type='business') OR (TG_OP='UPDATE' AND (NEW."organizationId"<>OLD."organizationId" OR NEW.version<>OLD.version+1)) THEN RAISE EXCEPTION 'Invalid business policy or version'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER order_policy_guard BEFORE INSERT OR UPDATE ON order_policies FOR EACH ROW EXECUTE FUNCTION pettly_order_policy_guard();
ALTER TABLE inventory_movements DROP CONSTRAINT movement_fields;
ALTER TABLE inventory_movements ADD CONSTRAINT movement_fields CHECK(kind IN ('receipt','issue','adjustment','hold','release','consume','expire') AND length(trim(reason))>=10 AND "onHandAfter">=0 AND "reservedAfter" BETWEEN 0 AND "onHandAfter" AND "versionAfter">=2 AND ((kind='expire' AND "actorId" IS NULL) OR (kind<>'expire' AND ("actorId" IS NOT NULL OR kind IN ('release','consume')))) AND ((kind IN ('hold','release','consume','expire'))=("holdId" IS NOT NULL)));
CREATE FUNCTION pettly_order_movement_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW."actorId" IS NULL AND NEW.kind<>'expire' AND NOT EXISTS(SELECT 1 FROM inventory_holds WHERE id=NEW."holdId" AND "orderId" IS NOT NULL) THEN RAISE EXCEPTION 'System movement requires order reservation'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER order_movement_guard BEFORE INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION pettly_order_movement_guard();
CREATE FUNCTION pettly_order_hold_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND OLD."orderId" IS DISTINCT FROM NEW."orderId" THEN RAISE EXCEPTION 'Order reservation identity is immutable'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER order_hold_guard BEFORE UPDATE ON inventory_holds FOR EACH ROW EXECUTE FUNCTION pettly_order_hold_guard();
CREATE FUNCTION pettly_order_stock_consistency() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE oid uuid; o orders%ROWTYPE; l jsonb; h inventory_holds%ROWTYPE; BEGIN
 IF TG_TABLE_NAME='orders' THEN oid=COALESCE(NEW.id,OLD.id); ELSE oid=COALESCE(NEW."orderId",OLD."orderId"); END IF;
 IF oid IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO o FROM orders WHERE id=oid;IF o.id IS NULL THEN RAISE EXCEPTION 'Missing order'; END IF;
 IF (SELECT count(*) FROM inventory_holds WHERE "orderId"=oid)<>jsonb_array_length(o.snapshot->'lines') THEN RAISE EXCEPTION 'Order reservations must cover every line'; END IF;
 FOR l IN SELECT * FROM jsonb_array_elements(o.snapshot->'lines') LOOP
 SELECT * INTO h FROM inventory_holds WHERE id=(l->>'holdId')::uuid;
 IF h.id IS NULL OR h."orderId" IS DISTINCT FROM oid OR h."referenceId"<>oid OR h."organizationId"<>o."organizationId" OR h."variantId"<>(l->>'variantId')::uuid OR h.quantity<>(l->>'quantity')::int OR h."expiresAt"<>o."expiresAt" OR (o.status='awaiting_payment' AND h.status<>'active' AND NOT(h.status='expired' AND h."updatedAt">=o."expiresAt")) OR (o.status IN ('cancelled','expired') AND h.status NOT IN ('released','expired')) OR (o.status IN ('paid','preparing','dispatched','ready_for_pickup','delivered') AND h.status<>'consumed') THEN RAISE EXCEPTION 'Order status and immutable reservations must agree'; END IF;
 END LOOP;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER order_stock_consistent AFTER INSERT OR UPDATE ON orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_order_stock_consistency();
CREATE CONSTRAINT TRIGGER order_hold_consistent AFTER INSERT OR UPDATE OR DELETE ON inventory_holds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_order_stock_consistency();

ALTER TABLE order_audit_entries ADD COLUMN version integer NOT NULL CHECK(version>0);
CREATE UNIQUE INDEX order_audit_revision_unique ON order_audit_entries("orderId",version);
ALTER TABLE order_policy_audit_entries ADD COLUMN snapshot jsonb NOT NULL;
CREATE FUNCTION pettly_order_audit_consistency() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM order_audit_entries WHERE "orderId"=NEW.id AND version=NEW.version AND action=CASE WHEN NEW.status='awaiting_payment' THEN 'created' ELSE NEW.status END) THEN RAISE EXCEPTION 'Order revision requires immutable matching audit'; END IF;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER order_revision_audited AFTER INSERT OR UPDATE ON orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_order_audit_consistency();
CREATE FUNCTION pettly_order_policy_audit_consistency() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM order_policy_audit_entries WHERE "organizationId"=NEW."organizationId" AND version=NEW.version AND snapshot=NEW.data) THEN RAISE EXCEPTION 'Commercial policy revision requires audited snapshot'; END IF;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER order_policy_revision_audited AFTER INSERT OR UPDATE ON order_policies DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_order_policy_audit_consistency();

CREATE INDEX inventory_holds_orderId_idx ON inventory_holds("orderId");
CREATE FUNCTION pettly_quote_cart_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM carts c WHERE c.id=NEW."cartId" AND c."userId"=NEW."buyerId" AND c.version=NEW."cartVersion" AND c."organizationId"=(NEW.snapshot->>'organizationId')::uuid AND c.currency=NEW.snapshot->>'currency') THEN RAISE EXCEPTION 'Quote must match current buyer cart'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER quote_cart_guard BEFORE INSERT ON checkout_quotes FOR EACH ROW EXECUTE FUNCTION pettly_quote_cart_guard();
