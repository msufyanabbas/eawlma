import { MigrationInterface, QueryRunner } from "typeorm";

export class AddListings1777276680252 implements MigrationInterface {
    name = 'AddListings1777276680252'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "key" character varying(64) NOT NULL, "name_ar" character varying(200) NOT NULL, "name_en" character varying(200) NOT NULL, "color" character varying(16), CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_tag_key" ON "tags" ("key") `);
        await queryRunner.query(`CREATE TABLE "amenities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "key" character varying(64) NOT NULL, "name_ar" character varying(200) NOT NULL, "name_en" character varying(200) NOT NULL, "icon" character varying(64), "category" character varying(32) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_c0777308847b3556086f2fb233e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_amenity_key" ON "amenities" ("key") `);
        await queryRunner.query(`CREATE TYPE "public"."listing_media_type_enum" AS ENUM('image', 'video', 'tour_360', 'floorplan')`);
        await queryRunner.query(`CREATE TABLE "listing_media" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "listing_id" uuid NOT NULL, "type" "public"."listing_media_type_enum" NOT NULL, "url" character varying(1024) NOT NULL, "thumbnail_url" character varying(1024), "caption" character varying(500), "position" integer NOT NULL DEFAULT '0', "width" integer, "height" integer, "duration_seconds" integer, CONSTRAINT "PK_95a44b7c28e30592adad8b85e51" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_media_listing_position" ON "listing_media" ("listing_id", "position") `);
        await queryRunner.query(`CREATE INDEX "idx_media_listing" ON "listing_media" ("listing_id") `);
        await queryRunner.query(`CREATE TYPE "public"."listings_type_enum" AS ENUM('sale', 'rent')`);
        await queryRunner.query(`CREATE TYPE "public"."listings_property_type_enum" AS ENUM('apartment', 'villa', 'townhouse', 'studio', 'penthouse', 'duplex', 'land', 'commercial', 'office', 'warehouse', 'farm', 'chalet', 'hotel_apartment', 'building')`);
        await queryRunner.query(`CREATE TYPE "public"."listings_status_enum" AS ENUM('draft', 'pending_review', 'active', 'rejected', 'expired', 'sold', 'rented', 'archived')`);
        await queryRunner.query(`CREATE TYPE "public"."listings_rent_period_enum" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly')`);
        await queryRunner.query(`CREATE TYPE "public"."listings_furnishing_enum" AS ENUM('unfurnished', 'semi_furnished', 'furnished')`);
        await queryRunner.query(`CREATE TABLE "listings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "reference_code" character varying(32) NOT NULL, "type" "public"."listings_type_enum" NOT NULL, "property_type" "public"."listings_property_type_enum" NOT NULL, "status" "public"."listings_status_enum" NOT NULL DEFAULT 'draft', "source_locale" character varying(8) NOT NULL DEFAULT 'ar', "title" character varying(200) NOT NULL, "description" text NOT NULL, "price" numeric(14,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'SAR', "rent_period" "public"."listings_rent_period_enum", "is_negotiable" boolean NOT NULL DEFAULT false, "bedrooms" integer, "bathrooms" integer, "area" numeric(10,2), "land_area" numeric(12,2), "parking_spaces" integer, "floors" integer, "floor_number" integer, "year_built" integer, "furnishing" "public"."listings_furnishing_enum", "has_elevator" boolean NOT NULL DEFAULT false, "has_pool" boolean NOT NULL DEFAULT false, "has_garden" boolean NOT NULL DEFAULT false, "has_gym" boolean NOT NULL DEFAULT false, "has_maid_room" boolean NOT NULL DEFAULT false, "has_driver_room" boolean NOT NULL DEFAULT false, "has_central_ac" boolean NOT NULL DEFAULT false, "has_kitchen_appliances" boolean NOT NULL DEFAULT false, "has_security" boolean NOT NULL DEFAULT false, "is_corner_unit" boolean NOT NULL DEFAULT false, "country" character varying(2) NOT NULL DEFAULT 'SA', "region" character varying(100) NOT NULL, "city" character varying(100) NOT NULL, "district" character varying(150), "address" jsonb NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "owner_id" uuid NOT NULL, "agency_id" uuid, "is_featured" boolean NOT NULL DEFAULT false, "featured_until" TIMESTAMP WITH TIME ZONE, "view_count" integer NOT NULL DEFAULT '0', "inquiry_count" integer NOT NULL DEFAULT '0', "save_count" integer NOT NULL DEFAULT '0', "published_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" text, CONSTRAINT "PK_520ecac6c99ec90bcf5a603cdcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_listings_reference" ON "listings" ("reference_code") `);
        await queryRunner.query(`CREATE INDEX "idx_listings_geo" ON "listings" ("lat", "lng") `);
        await queryRunner.query(`CREATE INDEX "idx_listings_published_at" ON "listings" ("published_at") `);
        await queryRunner.query(`CREATE INDEX "idx_listings_price" ON "listings" ("price") `);
        await queryRunner.query(`CREATE INDEX "idx_listings_district" ON "listings" ("district") `);
        await queryRunner.query(`CREATE INDEX "idx_listings_city" ON "listings" ("city") `);
        await queryRunner.query(`CREATE INDEX "idx_listings_property_type" ON "listings" ("property_type") `);
        await queryRunner.query(`CREATE INDEX "idx_listings_type_status" ON "listings" ("type", "status") `);
        await queryRunner.query(`CREATE INDEX "idx_listings_status" ON "listings" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_listings_owner" ON "listings" ("owner_id") `);
        await queryRunner.query(`CREATE TYPE "public"."listing_translations_locale_enum" AS ENUM('ar', 'en')`);
        await queryRunner.query(`CREATE TABLE "listing_translations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "listing_id" uuid NOT NULL, "locale" "public"."listing_translations_locale_enum" NOT NULL, "title" character varying(200) NOT NULL, "description" text NOT NULL, "is_machine_translated" boolean NOT NULL DEFAULT false, "translated_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_857943ae13a7cd3c39b9d9ba862" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_listing_translation_locale" ON "listing_translations" ("listing_id", "locale") `);
        await queryRunner.query(`CREATE TABLE "listing_amenities" ("listing_id" uuid NOT NULL, "amenity_id" uuid NOT NULL, CONSTRAINT "PK_c630b140853ba36dcfa1938cd6a" PRIMARY KEY ("listing_id", "amenity_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cdd6875fe6fc870e4db2139b77" ON "listing_amenities" ("listing_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_8b046c936f07781b43d87c34c7" ON "listing_amenities" ("amenity_id") `);
        await queryRunner.query(`CREATE TABLE "listing_tags" ("listing_id" uuid NOT NULL, "tag_id" uuid NOT NULL, CONSTRAINT "PK_106cd705e8b833be59c6a645cb9" PRIMARY KEY ("listing_id", "tag_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d545ceb30768fbbeb7649cae18" ON "listing_tags" ("listing_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_758e1e7412359ad0cafb2f744c" ON "listing_tags" ("tag_id") `);
        await queryRunner.query(`ALTER TABLE "listing_media" ADD CONSTRAINT "FK_d6e41836cd0907f44729c12285e" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listings" ADD CONSTRAINT "FK_9f5b6113628f91bcf8a8e2dfa3c" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listing_translations" ADD CONSTRAINT "FK_03606bc79dd242c46539032e365" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listing_amenities" ADD CONSTRAINT "FK_cdd6875fe6fc870e4db2139b776" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "listing_amenities" ADD CONSTRAINT "FK_8b046c936f07781b43d87c34c71" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "listing_tags" ADD CONSTRAINT "FK_d545ceb30768fbbeb7649cae18f" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "listing_tags" ADD CONSTRAINT "FK_758e1e7412359ad0cafb2f744c9" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE`);

        // Reference-code sequence (used by ListingsService.generateReferenceCode)
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS listings_reference_seq START WITH 1 INCREMENT BY 1`);

        // Full-text search GIN indexes (Postgres "simple" config — language-agnostic, fits AR + EN)
        await queryRunner.query(`CREATE INDEX "idx_listings_fts" ON "listings" USING GIN (to_tsvector('simple', title || ' ' || description))`);
        await queryRunner.query(`CREATE INDEX "idx_listing_translations_fts" ON "listing_translations" USING GIN (to_tsvector('simple', title || ' ' || description))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_listing_translations_fts"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_listings_fts"`);
        await queryRunner.query(`DROP SEQUENCE IF EXISTS listings_reference_seq`);
        await queryRunner.query(`ALTER TABLE "listing_tags" DROP CONSTRAINT "FK_758e1e7412359ad0cafb2f744c9"`);
        await queryRunner.query(`ALTER TABLE "listing_tags" DROP CONSTRAINT "FK_d545ceb30768fbbeb7649cae18f"`);
        await queryRunner.query(`ALTER TABLE "listing_amenities" DROP CONSTRAINT "FK_8b046c936f07781b43d87c34c71"`);
        await queryRunner.query(`ALTER TABLE "listing_amenities" DROP CONSTRAINT "FK_cdd6875fe6fc870e4db2139b776"`);
        await queryRunner.query(`ALTER TABLE "listing_translations" DROP CONSTRAINT "FK_03606bc79dd242c46539032e365"`);
        await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "FK_9f5b6113628f91bcf8a8e2dfa3c"`);
        await queryRunner.query(`ALTER TABLE "listing_media" DROP CONSTRAINT "FK_d6e41836cd0907f44729c12285e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_758e1e7412359ad0cafb2f744c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d545ceb30768fbbeb7649cae18"`);
        await queryRunner.query(`DROP TABLE "listing_tags"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b046c936f07781b43d87c34c7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cdd6875fe6fc870e4db2139b77"`);
        await queryRunner.query(`DROP TABLE "listing_amenities"`);
        await queryRunner.query(`DROP INDEX "public"."uq_listing_translation_locale"`);
        await queryRunner.query(`DROP TABLE "listing_translations"`);
        await queryRunner.query(`DROP TYPE "public"."listing_translations_locale_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_listings_owner"`);
        await queryRunner.query(`DROP INDEX "public"."idx_listings_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_listings_type_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_listings_property_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_listings_city"`);
        await queryRunner.query(`DROP INDEX "public"."idx_listings_district"`);
        await queryRunner.query(`DROP INDEX "public"."idx_listings_price"`);
        await queryRunner.query(`DROP INDEX "public"."idx_listings_published_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_listings_geo"`);
        await queryRunner.query(`DROP INDEX "public"."uq_listings_reference"`);
        await queryRunner.query(`DROP TABLE "listings"`);
        await queryRunner.query(`DROP TYPE "public"."listings_furnishing_enum"`);
        await queryRunner.query(`DROP TYPE "public"."listings_rent_period_enum"`);
        await queryRunner.query(`DROP TYPE "public"."listings_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."listings_property_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."listings_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_media_listing"`);
        await queryRunner.query(`DROP INDEX "public"."idx_media_listing_position"`);
        await queryRunner.query(`DROP TABLE "listing_media"`);
        await queryRunner.query(`DROP TYPE "public"."listing_media_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."uq_amenity_key"`);
        await queryRunner.query(`DROP TABLE "amenities"`);
        await queryRunner.query(`DROP INDEX "public"."uq_tag_key"`);
        await queryRunner.query(`DROP TABLE "tags"`);
    }

}
