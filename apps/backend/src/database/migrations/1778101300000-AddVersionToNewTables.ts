import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BaseEntity carries a @VersionColumn for optimistic-locking purposes, so every
 * table that extends it needs a corresponding `version` column. The three
 * tables introduced in the previous batch (wishlists, wishlist_items,
 * listing_price_overrides, promo_codes, promo_usage) shipped without it,
 * which made TypeORM throw "column ... .version does not exist" on every read.
 *
 * This migration backfills the column on all five tables idempotently.
 */
export class AddVersionToNewTables1778101300000 implements MigrationInterface {
  name = 'AddVersionToNewTables1778101300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'wishlists',
      'wishlist_items',
      'listing_price_overrides',
      'promo_codes',
      'promo_usage',
    ];
    for (const t of tables) {
      await queryRunner.query(
        `ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'wishlists',
      'wishlist_items',
      'listing_price_overrides',
      'promo_codes',
      'promo_usage',
    ];
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE "${t}" DROP COLUMN IF EXISTS "version"`);
    }
  }
}
