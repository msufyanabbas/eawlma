import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromoCodes1778101200000 implements MigrationInterface {
  name = 'AddPromoCodes1778101200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promo_codes" (
        "id"                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code"                  varchar(32) NOT NULL,
        "type"                  varchar(16) NOT NULL,
        "discount_value"        numeric(14,2) NOT NULL,
        "min_booking_amount"    numeric(14,2) NOT NULL DEFAULT 0,
        "max_discount_amount"   numeric(14,2),
        "valid_from"            timestamptz NOT NULL,
        "valid_until"           timestamptz NOT NULL,
        "max_uses"              integer,
        "used_count"            integer NOT NULL DEFAULT 0,
        "is_active"             boolean NOT NULL DEFAULT true,
        "applicable_to"         varchar(24) NOT NULL DEFAULT 'all',
        "listing_id"            uuid REFERENCES "listings"("id") ON DELETE SET NULL,
        "created_by"            uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at"            timestamptz NOT NULL DEFAULT now(),
        "updated_at"            timestamptz NOT NULL DEFAULT now(),
        "deleted_at"            timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_promo_codes_code" ON "promo_codes" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_promo_active" ON "promo_codes" ("is_active")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promo_usage" (
        "id"                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "promo_code_id"     uuid NOT NULL REFERENCES "promo_codes"("id") ON DELETE CASCADE,
        "user_id"           uuid NOT NULL,
        "booking_id"        uuid,
        "discount_applied"  numeric(14,2) NOT NULL,
        "used_at"           timestamptz NOT NULL,
        "created_at"        timestamptz NOT NULL DEFAULT now(),
        "updated_at"        timestamptz NOT NULL DEFAULT now(),
        "deleted_at"        timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_promo_usage_code" ON "promo_usage" ("promo_code_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_promo_usage_user" ON "promo_usage" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_usage"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_codes"`);
  }
}
