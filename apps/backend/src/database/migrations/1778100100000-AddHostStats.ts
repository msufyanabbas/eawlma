import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHostStats1778100100000 implements MigrationInterface {
  name = 'AddHostStats1778100100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "response_rate" numeric(5,2),
        ADD COLUMN IF NOT EXISTS "response_time" varchar(64),
        ADD COLUMN IF NOT EXISTS "is_superhost" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "total_completed_bookings" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "total_earnings" numeric(14,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_superhost" ON "users" ("is_superhost") WHERE "is_superhost" = TRUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_superhost"`);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "total_earnings",
        DROP COLUMN IF EXISTS "total_completed_bookings",
        DROP COLUMN IF EXISTS "is_superhost",
        DROP COLUMN IF EXISTS "response_time",
        DROP COLUMN IF EXISTS "response_rate"
    `);
  }
}
