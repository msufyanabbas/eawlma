import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceOverrides1778101100000 implements MigrationInterface {
  name = 'AddPriceOverrides1778101100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listing_price_overrides" (
        "id"          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "listing_id"  uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "date"        date NOT NULL,
        "price"       numeric(14,2) NOT NULL,
        "reason"      varchar(120),
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        "deleted_at"  timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_listing_override_date"
         ON "listing_price_overrides" ("listing_id", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_listing_override_listing"
         ON "listing_price_overrides" ("listing_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "listing_price_overrides"`);
  }
}
