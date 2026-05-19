import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceTokens1778300000000 implements MigrationInterface {
  name = 'AddDeviceTokens1778300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "version" integer NOT NULL DEFAULT 1,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" varchar(512) NOT NULL UNIQUE,
        "platform" varchar(16) NOT NULL DEFAULT 'android',
        "device_model" varchar(100),
        "is_active" boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_device_tokens_user" ON "device_tokens" ("user_id")`,
    );
    // Partial index — almost every read filters on is_active = true, so a
    // partial index keeps the working set tiny vs. a full btree.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_device_tokens_active" ON "device_tokens" ("user_id") WHERE "is_active" = TRUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_device_tokens_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_device_tokens_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "device_tokens"`);
  }
}
