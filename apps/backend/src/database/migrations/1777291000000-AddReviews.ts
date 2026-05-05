import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `reviews` table for the agent-review feature. One review per
 * (agent, reviewer) pair enforced by a partial unique index that ignores
 * soft-deleted rows.
 */
export class AddReviews1777291000000 implements MigrationInterface {
  name = 'AddReviews1777291000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "agent_id" uuid NOT NULL,
        "reviewer_id" uuid NOT NULL,
        "listing_id" uuid,
        "rating" smallint NOT NULL,
        "comment" text NOT NULL,
        "reply" text,
        "replied_at" TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_reviews_agent_reviewer"
      ON "reviews" ("agent_id", "reviewer_id")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_reviews_agent" ON "reviews" ("agent_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_agent"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_reviews_agent_reviewer"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
  }
}
