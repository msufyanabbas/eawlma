import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingNumGuests1778099500000 implements MigrationInterface {
  name = 'AddBookingNumGuests1778099500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "num_guests" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "num_guests"`);
  }
}
