import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AI moderation columns on `listings`. Populated by ModerationService when a
 * listing is created: `moderation_score` is 0-100 (higher = more problematic),
 * `moderation_category` classifies the verdict, `moderation_reasons` holds the
 * model's flagged reasons, and `requires_review` forces the listing into the
 * admin moderation queue regardless of score.
 */
export class AddListingModeration1778500000000 implements MigrationInterface {
  name = 'AddListingModeration1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listings"
      ADD COLUMN IF NOT EXISTS "moderation_score" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "moderation_category" varchar(32),
      ADD COLUMN IF NOT EXISTS "moderation_reasons" jsonb NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "requires_review" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "listings"
      DROP COLUMN IF EXISTS "moderation_score",
      DROP COLUMN IF EXISTS "moderation_category",
      DROP COLUMN IF EXISTS "moderation_reasons",
      DROP COLUMN IF EXISTS "requires_review"
    `);
  }
}
