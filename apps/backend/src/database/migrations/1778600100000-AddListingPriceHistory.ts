import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `listing_price_history` records every price mutation on a listing so the
 * detail page can render the historical trend and badges like
 * "Reduced by 5%". A row is inserted automatically by ListingsService.update
 * whenever the price field actually changes.
 */
export class AddListingPriceHistory1778600100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS listing_price_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        price NUMERIC(14,2) NOT NULL,
        previous_price NUMERIC(14,2),
        change_percent NUMERIC(6,2),
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        note VARCHAR(255)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_price_history_listing
        ON listing_price_history(listing_id, recorded_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_price_history_listing`);
    await queryRunner.query(`DROP TABLE IF EXISTS listing_price_history`);
  }
}
