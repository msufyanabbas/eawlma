import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDealDisputeFields1778098000000 implements MigrationInterface {
  name = 'AddDealDisputeFields1778098000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inquiries"
        ADD COLUMN IF NOT EXISTS "deal_closed_by_agent" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "deal_confirmed_by_buyer" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "deal_status" varchar(32) NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS "dispute_reason" text,
        ADD COLUMN IF NOT EXISTS "dispute_raised_by" uuid,
        ADD COLUMN IF NOT EXISTS "dispute_raised_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "admin_resolution" text,
        ADD COLUMN IF NOT EXISTS "admin_resolved_by" uuid,
        ADD COLUMN IF NOT EXISTS "admin_resolved_at" TIMESTAMP WITH TIME ZONE
    `);

    // Filtered index for the admin disputes panel — only disputed rows are
    // interesting, and there are few of them, so a partial index keeps the
    // dashboard query cheap without bloating the base index size.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_inquiries_deal_status_disputed"
         ON "inquiries" ("deal_status")
         WHERE "deal_status" = 'disputed'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inquiries_deal_status_disputed"`);
    await queryRunner.query(`
      ALTER TABLE "inquiries"
        DROP COLUMN IF EXISTS "admin_resolved_at",
        DROP COLUMN IF EXISTS "admin_resolved_by",
        DROP COLUMN IF EXISTS "admin_resolution",
        DROP COLUMN IF EXISTS "dispute_raised_at",
        DROP COLUMN IF EXISTS "dispute_raised_by",
        DROP COLUMN IF EXISTS "dispute_reason",
        DROP COLUMN IF EXISTS "deal_status",
        DROP COLUMN IF EXISTS "deal_confirmed_by_buyer",
        DROP COLUMN IF EXISTS "deal_closed_by_agent"
    `);
  }
}
