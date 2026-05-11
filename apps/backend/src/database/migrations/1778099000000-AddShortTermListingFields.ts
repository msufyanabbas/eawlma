import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShortTermListingFields1778099000000 implements MigrationInterface {
  name = 'AddShortTermListingFields1778099000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extend the property_type enum with the new short-term + hotel values.
    // ROOM, ENTIRE_HOME, HOTEL_ROOM, REST_HOUSE. FARM and CHALET already exist.
    await queryRunner.query(`ALTER TYPE "listings_property_type_enum" ADD VALUE IF NOT EXISTS 'room'`);
    await queryRunner.query(`ALTER TYPE "listings_property_type_enum" ADD VALUE IF NOT EXISTS 'entire_home'`);
    await queryRunner.query(`ALTER TYPE "listings_property_type_enum" ADD VALUE IF NOT EXISTS 'hotel_room'`);
    await queryRunner.query(`ALTER TYPE "listings_property_type_enum" ADD VALUE IF NOT EXISTS 'rest_house'`);

    // Add the short-term / hotel columns. Defaults match the entity so that
    // existing rows keep working without explicit backfill.
    await queryRunner.query(`
      ALTER TABLE "listings"
        ADD COLUMN IF NOT EXISTS "max_guests" integer,
        ADD COLUMN IF NOT EXISTS "amenities_detailed" jsonb,
        ADD COLUMN IF NOT EXISTS "house_rules" text,
        ADD COLUMN IF NOT EXISTS "check_in_time" varchar(8) NOT NULL DEFAULT '15:00',
        ADD COLUMN IF NOT EXISTS "check_out_time" varchar(8) NOT NULL DEFAULT '11:00',
        ADD COLUMN IF NOT EXISTS "instant_book" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "cancellation_policy" varchar(16),
        ADD COLUMN IF NOT EXISTS "hotel_star_rating" integer,
        ADD COLUMN IF NOT EXISTS "hotel_name" varchar(200)
    `);

    // Partial index for the hotels listing page — only ~rare rows matter.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_listings_hotel_star" ON "listings" ("hotel_star_rating")
        WHERE "hotel_star_rating" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_listings_hotel_star"`);
    await queryRunner.query(`
      ALTER TABLE "listings"
        DROP COLUMN IF EXISTS "hotel_name",
        DROP COLUMN IF EXISTS "hotel_star_rating",
        DROP COLUMN IF EXISTS "cancellation_policy",
        DROP COLUMN IF EXISTS "instant_book",
        DROP COLUMN IF EXISTS "check_out_time",
        DROP COLUMN IF EXISTS "check_in_time",
        DROP COLUMN IF EXISTS "house_rules",
        DROP COLUMN IF EXISTS "amenities_detailed",
        DROP COLUMN IF EXISTS "max_guests"
    `);
    // Postgres can't drop enum values cleanly; leave the extended values in
    // place on rollback. They're harmless even if unused.
  }
}
