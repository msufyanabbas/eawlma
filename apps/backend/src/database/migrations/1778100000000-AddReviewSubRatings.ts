import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewSubRatings1778100000000 implements MigrationInterface {
  name = 'AddReviewSubRatings1778100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reviews"
        ADD COLUMN IF NOT EXISTS "booking_id" uuid,
        ADD COLUMN IF NOT EXISTS "cleanliness_rating" smallint,
        ADD COLUMN IF NOT EXISTS "accuracy_rating" smallint,
        ADD COLUMN IF NOT EXISTS "communication_rating" smallint,
        ADD COLUMN IF NOT EXISTS "location_rating" smallint
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reviews_listing" ON "reviews" ("listing_id") WHERE "listing_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reviews_booking" ON "reviews" ("booking_id") WHERE "booking_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_booking"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_listing"`);
    await queryRunner.query(`
      ALTER TABLE "reviews"
        DROP COLUMN IF EXISTS "location_rating",
        DROP COLUMN IF EXISTS "communication_rating",
        DROP COLUMN IF EXISTS "accuracy_rating",
        DROP COLUMN IF EXISTS "cleanliness_rating",
        DROP COLUMN IF EXISTS "booking_id"
    `);
  }
}
