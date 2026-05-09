import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNafathFields1778094000000 implements MigrationInterface {
  name = 'AddNafathFields1778094000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users"
        ADD COLUMN "nafath_national_id" varchar(16),
        ADD COLUMN "is_nafath_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_nafath_id"
         ON "users" ("nafath_national_id")
         WHERE "nafath_national_id" IS NOT NULL AND "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_users_nafath_id"`);
    await queryRunner.query(
      `ALTER TABLE "users"
        DROP COLUMN "is_nafath_verified",
        DROP COLUMN "nafath_national_id"`,
    );
  }
}
