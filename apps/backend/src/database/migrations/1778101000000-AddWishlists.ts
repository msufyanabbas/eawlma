import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWishlists1778101000000 implements MigrationInterface {
  name = 'AddWishlists1778101000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wishlists" (
        "id"          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id"     uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name"        varchar(120) NOT NULL,
        "emoji"       varchar(8),
        "is_default"  boolean NOT NULL DEFAULT false,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        "deleted_at"  timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_wishlists_user" ON "wishlists" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wishlist_items" (
        "id"            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "wishlist_id"   uuid NOT NULL REFERENCES "wishlists"("id") ON DELETE CASCADE,
        "listing_id"    uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        "updated_at"    timestamptz NOT NULL DEFAULT now(),
        "deleted_at"    timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_wishlist_listing"
         ON "wishlist_items" ("wishlist_id", "listing_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_wishlist_items_listing"
         ON "wishlist_items" ("listing_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wishlist_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wishlists"`);
  }
}
