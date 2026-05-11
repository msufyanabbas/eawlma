import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDamageDeposit1778100200000 implements MigrationInterface {
  name = 'AddDamageDeposit1778100200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "damage_deposit" numeric(14,2) NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN IF NOT EXISTS "deposit_amount" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "deposit_status" varchar(16) NOT NULL DEFAULT 'held',
        ADD COLUMN IF NOT EXISTS "deposit_released_at" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings"
        DROP COLUMN IF EXISTS "deposit_released_at",
        DROP COLUMN IF EXISTS "deposit_status",
        DROP COLUMN IF EXISTS "deposit_amount"
    `);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "damage_deposit"`);
  }
}
