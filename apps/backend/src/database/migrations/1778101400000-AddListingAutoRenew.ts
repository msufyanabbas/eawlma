import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `auto_renew` to listings. When true, the daily sweep extends
 * `expires_at` by 90 days instead of marking the listing EXPIRED.
 *
 * `expires_at` itself already exists from the original AddListings migration.
 */
export class AddListingAutoRenew1778101400000 implements MigrationInterface {
  name = 'AddListingAutoRenew1778101400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "auto_renew" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "auto_renew"`);
  }
}
