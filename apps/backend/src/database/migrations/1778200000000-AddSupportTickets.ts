import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportTickets1778200000000 implements MigrationInterface {
  name = 'AddSupportTickets1778200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tickets table — tracked column set mirrors the SupportTicket entity.
    // Indexes are partial-free on purpose: status and category are low-
    // cardinality but the admin filter list scans them on every page load,
    // so a full btree index is the cheap option.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "version" integer NOT NULL DEFAULT 1,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "subject" varchar(200) NOT NULL,
        "description" text NOT NULL,
        "category" varchar(32) NOT NULL DEFAULT 'general',
        "priority" varchar(16) NOT NULL DEFAULT 'medium',
        "status" varchar(16) NOT NULL DEFAULT 'open',
        "assigned_to_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "resolved_at" timestamptz,
        "resolution" text,
        "ticket_number" varchar(20) UNIQUE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "version" integer NOT NULL DEFAULT 1,
        "ticket_id" uuid NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
        "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "message" text NOT NULL,
        "is_staff" boolean NOT NULL DEFAULT false,
        "attachment_url" varchar(1024)
      )
    `);

    // Human-friendly ticket numbers (TKT-1000, TKT-1001, …). Sequence starts
    // at 1000 so the very first ticket isn't a single-digit one.
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "ticket_number_seq" START WITH 1000 INCREMENT BY 1`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_support_tickets_user" ON "support_tickets" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_support_tickets_status" ON "support_tickets" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_support_tickets_category" ON "support_tickets" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_support_messages_ticket" ON "support_messages" ("ticket_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_support_messages_ticket"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_support_tickets_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_support_tickets_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_support_tickets_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "ticket_number_seq"`);
  }
}
