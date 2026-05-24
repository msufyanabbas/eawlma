import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * REGA (General Authority for Real Estate) workflow + supplementary
 * verification timestamps. We already have `license_number` (REGA broker
 * licence), `phone_verified`, `is_nafath_verified` and `national_id` —
 * this migration only adds the columns that don't yet exist so it composes
 * cleanly with the existing schema.
 */
export class AddRegaAndVerificationFields1778600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS rega_license_expiry DATE,
        ADD COLUMN IF NOT EXISTS rega_verified BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS rega_verified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS nafath_verified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS rega_license_expiry,
        DROP COLUMN IF EXISTS rega_verified,
        DROP COLUMN IF EXISTS rega_verified_at,
        DROP COLUMN IF EXISTS nafath_verified_at,
        DROP COLUMN IF EXISTS phone_verified_at
    `);
  }
}
