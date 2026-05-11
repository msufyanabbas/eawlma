import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckInInstructions1778100300000 implements MigrationInterface {
  name = 'AddCheckInInstructions1778100300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "check_in_instructions" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings" DROP COLUMN IF EXISTS "check_in_instructions"`,
    );
  }
}
