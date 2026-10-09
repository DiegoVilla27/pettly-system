-- Additive business Catalog and durable Inventory. No memberships or stock are seeded.
CREATE TABLE "catalog_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_products" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "brand" VARCHAR(100),
    "currency" CHAR(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_variants" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "attributes" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_photos" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_audit_entries" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "productId" UUID,
    "categoryId" UUID,
    "action" VARCHAR(40) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "requestId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_stock" (
    "variantId" UUID NOT NULL,
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_stock_pkey" PRIMARY KEY ("variantId")
);

CREATE TABLE "inventory_holds" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "referenceId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_holds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID,
    "holdId" UUID,
    "kind" VARCHAR(20) NOT NULL,
    "onHandDelta" INTEGER NOT NULL,
    "reservedDelta" INTEGER NOT NULL,
    "onHandAfter" INTEGER NOT NULL,
    "reservedAfter" INTEGER NOT NULL,
    "versionAfter" INTEGER NOT NULL,
    "idempotencyKey" VARCHAR(80) NOT NULL,
    "fingerprint" VARCHAR(1000) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "requestId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_categories_slug_key" ON "catalog_categories"("slug");

CREATE INDEX "catalog_products_organizationId_status_createdAt_id_idx" ON "catalog_products"("organizationId", "status", "createdAt", "id");

CREATE INDEX "catalog_products_status_categoryId_createdAt_id_idx" ON "catalog_products"("status", "categoryId", "createdAt", "id");

CREATE INDEX "catalog_products_name_search_idx" ON "catalog_products" USING GIN ("name" gin_trgm_ops);

CREATE UNIQUE INDEX "catalog_products_id_organizationId_key" ON "catalog_products"("id", "organizationId");

CREATE INDEX "catalog_variants_productId_status_idx" ON "catalog_variants"("productId", "status");

CREATE UNIQUE INDEX "catalog_variants_organizationId_sku_key" ON "catalog_variants"("organizationId", "sku");

CREATE UNIQUE INDEX "catalog_variants_id_organizationId_key" ON "catalog_variants"("id", "organizationId");

CREATE UNIQUE INDEX "catalog_photos_mediaId_key" ON "catalog_photos"("mediaId");

CREATE INDEX "catalog_photos_productId_position_idx" ON "catalog_photos"("productId", "position");

CREATE INDEX "catalog_audit_entries_productId_createdAt_id_idx" ON "catalog_audit_entries"("productId", "createdAt", "id");

CREATE INDEX "catalog_audit_entries_categoryId_createdAt_id_idx" ON "catalog_audit_entries"("categoryId", "createdAt", "id");

CREATE INDEX "inventory_holds_status_expiresAt_variantId_idx" ON "inventory_holds"("status", "expiresAt", "variantId");

CREATE INDEX "inventory_holds_variantId_status_idx" ON "inventory_holds"("variantId", "status");

CREATE INDEX "inventory_movements_variantId_createdAt_id_idx" ON "inventory_movements"("variantId", "createdAt", "id");

CREATE UNIQUE INDEX "inventory_movements_organizationId_idempotencyKey_key" ON "inventory_movements"("organizationId", "idempotencyKey");

ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_variants" ADD CONSTRAINT "catalog_variants_productId_organizationId_fkey" FOREIGN KEY ("productId", "organizationId") REFERENCES "catalog_products"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_photos" ADD CONSTRAINT "catalog_photos_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_photos" ADD CONSTRAINT "catalog_photos_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_audit_entries" ADD CONSTRAINT "catalog_audit_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_audit_entries" ADD CONSTRAINT "catalog_audit_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_audit_entries" ADD CONSTRAINT "catalog_audit_entries_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "catalog_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_holds" ADD CONSTRAINT "inventory_holds_variantId_organizationId_fkey" FOREIGN KEY ("variantId", "organizationId") REFERENCES "catalog_variants"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variantId_organizationId_fkey" FOREIGN KEY ("variantId", "organizationId") REFERENCES "catalog_variants"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "inventory_holds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE catalog_categories ADD CONSTRAINT category_fields CHECK (status IN ('active','inactive','archived') AND version>0 AND length(trim(name))>=2 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE catalog_products ADD CONSTRAINT product_fields CHECK (status IN ('draft','pending','published','rejected','paused','archived') AND version>0 AND currency IN ('COP','USD','EUR') AND length(trim(name))>=2 AND length(trim(description))>=10);
ALTER TABLE catalog_products ADD CONSTRAINT product_review CHECK (("reviewedBy" IS NULL AND "reviewedAt" IS NULL AND "reviewReason" IS NULL) OR ("reviewedBy" IS NOT NULL AND "reviewedAt" IS NOT NULL AND length(trim("reviewReason"))>=10 AND "reviewedBy"<>"createdBy"));
ALTER TABLE catalog_products ADD CONSTRAINT published_product_review CHECK (status NOT IN ('published','rejected') OR "reviewedBy" IS NOT NULL);
ALTER TABLE catalog_variants ADD CONSTRAINT variant_fields CHECK (status IN ('active','archived') AND sku ~ '^[A-Z0-9][A-Z0-9._-]*$' AND "priceMinor">0 AND jsonb_typeof(attributes)='object');
ALTER TABLE catalog_photos ADD CONSTRAINT product_photo_position CHECK (position>=0);
ALTER TABLE catalog_audit_entries ADD CONSTRAINT catalog_audit_fields CHECK (("productId" IS NULL)<>("categoryId" IS NULL) AND length(trim(reason))>=10 AND action IN ('category.created','category.updated','product.created','product.updated','product.submit','product.review','product.pause','product.archive','variant.created','variant.updated','variant.archived','photo.created','photo.removed'));
CREATE TRIGGER catalog_audit_append_only BEFORE UPDATE OR DELETE ON catalog_audit_entries FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
ALTER TABLE inventory_stock ADD CONSTRAINT stock_balance CHECK ("onHand" BETWEEN 0 AND 1000000000 AND reserved BETWEEN 0 AND "onHand" AND version>0);
ALTER TABLE inventory_holds ADD CONSTRAINT hold_fields CHECK (quantity BETWEEN 1 AND 1000000 AND status IN ('active','released','consumed','expired') AND "expiresAt">"createdAt" AND "expiresAt"<="createdAt"+interval '30 minutes');
ALTER TABLE inventory_movements ADD CONSTRAINT movement_fields CHECK (kind IN ('receipt','issue','adjustment','hold','release','consume','expire') AND length(trim(reason))>=10 AND "onHandAfter">=0 AND "reservedAfter" BETWEEN 0 AND "onHandAfter" AND "versionAfter">=2 AND ((kind='expire' AND "actorId" IS NULL) OR (kind<>'expire' AND "actorId" IS NOT NULL)) AND ((kind IN ('hold','release','consume','expire'))=("holdId" IS NOT NULL)));
ALTER TABLE inventory_movements ADD CONSTRAINT movement_deltas CHECK ((kind='receipt' AND "onHandDelta">0 AND "reservedDelta"=0) OR (kind='issue' AND "onHandDelta"<0 AND "reservedDelta"=0) OR (kind='adjustment' AND "onHandDelta"<>0 AND "reservedDelta"=0) OR (kind='hold' AND "onHandDelta"=0 AND "reservedDelta">0) OR (kind IN ('release','expire') AND "onHandDelta"=0 AND "reservedDelta"<0) OR (kind='consume' AND "onHandDelta"="reservedDelta" AND "onHandDelta"<0));
CREATE TRIGGER inventory_movement_append_only BEFORE UPDATE OR DELETE ON inventory_movements FOR EACH ROW EXECUTE FUNCTION pettly_reject_audit_mutation();
CREATE FUNCTION pettly_catalog_photo_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM 1 FROM catalog_products WHERE id=NEW."productId" FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM media_assets WHERE id=NEW."mediaId" AND "resourceId"=NEW."productId" AND "deletedAt" IS NULL) THEN RAISE EXCEPTION 'Photo resource mismatch'; END IF;
 IF (SELECT count(*) FROM catalog_photos WHERE "productId"=NEW."productId" AND id<>NEW.id)>=10 THEN RAISE EXCEPTION 'Photo limit reached'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER catalog_photo_guard BEFORE INSERT OR UPDATE ON catalog_photos FOR EACH ROW EXECUTE FUNCTION pettly_catalog_photo_guard();
CREATE FUNCTION pettly_catalog_business_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM organizations WHERE id=NEW."organizationId" AND type='business') THEN RAISE EXCEPTION 'Product requires business'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER catalog_business_guard BEFORE INSERT OR UPDATE ON catalog_products FOR EACH ROW EXECUTE FUNCTION pettly_catalog_business_guard();
CREATE FUNCTION pettly_catalog_variant_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM 1 FROM catalog_products WHERE id=NEW."productId" FOR UPDATE;
 IF (SELECT count(*) FROM catalog_variants WHERE "productId"=NEW."productId" AND id<>NEW.id)>=50 THEN RAISE EXCEPTION 'Variant limit reached'; END IF;
 IF TG_OP='UPDATE' AND (OLD.id<>NEW.id OR OLD."productId"<>NEW."productId" OR OLD."organizationId"<>NEW."organizationId" OR (OLD.status='archived' AND NEW.status<>'archived')) THEN RAISE EXCEPTION 'Variant identity or terminal state changed'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER catalog_variant_guard BEFORE INSERT OR UPDATE ON catalog_variants FOR EACH ROW EXECUTE FUNCTION pettly_catalog_variant_guard();
CREATE FUNCTION pettly_inventory_hold_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND (OLD.id<>NEW.id OR OLD."variantId"<>NEW."variantId" OR OLD."organizationId"<>NEW."organizationId" OR OLD."referenceId"<>NEW."referenceId" OR OLD.quantity<>NEW.quantity OR OLD."expiresAt"<>NEW."expiresAt" OR OLD."createdAt"<>NEW."createdAt" OR (OLD.status<>'active' AND NEW.status<>OLD.status)) THEN RAISE EXCEPTION 'Hold identity or terminal state changed'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER inventory_hold_guard BEFORE UPDATE ON inventory_holds FOR EACH ROW EXECUTE FUNCTION pettly_inventory_hold_guard();
CREATE FUNCTION pettly_inventory_ledger_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE variant uuid; balance inventory_stock%ROWTYPE; physical bigint; reserved_sum bigint; held bigint; last_version integer;
BEGIN
 variant=COALESCE(NEW."variantId",OLD."variantId");
 SELECT * INTO balance FROM inventory_stock WHERE "variantId"=variant;
 SELECT "onHandAfter","reservedAfter","versionAfter" INTO physical,reserved_sum,last_version FROM inventory_movements WHERE "variantId"=variant ORDER BY "versionAfter" DESC LIMIT 1;
 physical=COALESCE(physical,0);reserved_sum=COALESCE(reserved_sum,0);last_version=COALESCE(last_version,1);
 SELECT COALESCE(sum(quantity),0) INTO held FROM inventory_holds WHERE "variantId"=variant AND status='active';
 IF (balance."variantId" IS NULL AND (physical<>0 OR held<>0 OR last_version>1)) OR (balance."variantId" IS NOT NULL AND (balance."onHand"<>physical OR balance.reserved<>reserved_sum OR balance.reserved<>held OR balance.version<>last_version)) THEN RAISE EXCEPTION 'Stock, ledger and reservations must agree'; END IF;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER inventory_stock_consistent AFTER INSERT OR UPDATE OR DELETE ON inventory_stock DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_inventory_ledger_consistency();
CREATE CONSTRAINT TRIGGER inventory_hold_consistent AFTER INSERT OR UPDATE OR DELETE ON inventory_holds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_inventory_ledger_consistency();
CREATE CONSTRAINT TRIGGER inventory_movement_consistent AFTER INSERT OR UPDATE OR DELETE ON inventory_movements DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pettly_inventory_ledger_consistency();

CREATE UNIQUE INDEX inventory_movement_version_unique ON inventory_movements("variantId","versionAfter");
CREATE FUNCTION pettly_inventory_movement_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE last inventory_movements%ROWTYPE; reservation inventory_holds%ROWTYPE;
BEGIN
 SELECT * INTO last FROM inventory_movements WHERE "variantId"=NEW."variantId" ORDER BY "versionAfter" DESC LIMIT 1;
 IF NEW."versionAfter"<>COALESCE(last."versionAfter",1)+1 OR NEW."onHandAfter"<>COALESCE(last."onHandAfter",0)+NEW."onHandDelta" OR NEW."reservedAfter"<>COALESCE(last."reservedAfter",0)+NEW."reservedDelta" THEN RAISE EXCEPTION 'Movement must continue the previous balance and version'; END IF;
 IF NEW."holdId" IS NOT NULL THEN
 SELECT * INTO reservation FROM inventory_holds WHERE id=NEW."holdId";
 IF reservation."variantId"<>NEW."variantId" OR reservation."organizationId"<>NEW."organizationId" OR abs(NEW."reservedDelta")<>reservation.quantity THEN RAISE EXCEPTION 'Movement and reservation must share variant, organization and quantity'; END IF;
 END IF;
 RETURN NEW; END $$;
CREATE TRIGGER inventory_movement_guard BEFORE INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION pettly_inventory_movement_guard();

ALTER TABLE inventory_holds ADD CONSTRAINT hold_deadline_transition CHECK ((status<>'consumed' OR "updatedAt"<"expiresAt") AND (status<>'expired' OR "updatedAt">="expiresAt"));
