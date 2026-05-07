import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgencyFields1778090500000 implements MigrationInterface {
  name = 'AddAgencyFields1778090500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "agency_name" varchar(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "license_number" varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_number" varchar(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "registration_number"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "license_number"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "agency_name"`);
  }
}
