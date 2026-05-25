import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Simplified signup (email + optional password + role) no longer asks for a
 * phone number, so the `users.phone` column needs to allow NULLs. The unique
 * partial index on phone keeps working as-is — PostgreSQL treats each NULL
 * as distinct, so multiple OTP-only accounts can coexist without a phone.
 */
export class MakeUserPhoneOptional1778700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN phone SET NOT NULL`);
  }
}
