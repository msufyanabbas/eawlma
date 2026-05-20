import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Email OTP login codes. Short-lived 6-digit codes emailed to a user so they
 * can sign in (or be routed to registration) without a password.
 *
 * The table is intentionally append-mostly: `OtpService.sendOtp` deletes any
 * prior rows for an address before inserting a fresh code, so at most one
 * live code exists per email at a time.
 */
export class AddEmailOtp1778400000000 implements MigrationInterface {
  name = 'AddEmailOtp1778400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_otps" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "email" varchar(320) NOT NULL,
        "otp" varchar(6) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "attempts" integer NOT NULL DEFAULT 0
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_email_otps_email" ON "email_otps" ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_email_otps_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_otps"`);
  }
}
