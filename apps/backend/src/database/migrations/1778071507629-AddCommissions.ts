import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommissions1778071507629 implements MigrationInterface {
    name = 'AddCommissions1778071507629'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "commitment_oaths" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "user_id" uuid NOT NULL, "oath_type" character varying(32) NOT NULL, "oath_text" text NOT NULL, "accepted_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ip_address" character varying(64), "listing_id" uuid, CONSTRAINT "PK_27c4306781f4ecfa4c812ee0890" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_oaths_user" ON "commitment_oaths" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "commissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "listing_id" uuid NOT NULL, "agent_id" uuid NOT NULL, "buyer_id" uuid, "transaction_value" numeric(14,2) NOT NULL, "agent_commission_rate" numeric(5,2) NOT NULL DEFAULT '2.5', "platform_commission_rate" numeric(5,2) NOT NULL DEFAULT '0.5', "agent_commission_amount" numeric(14,2) NOT NULL, "platform_commission_amount" numeric(14,2) NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'pending', "notes" text, CONSTRAINT "PK_2701379966e2e670bb5ff0ae78e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_commissions_status" ON "commissions" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_commissions_agent" ON "commissions" ("agent_id") `);
        await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "provider_payload" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "attachment_urls" SET DEFAULT '{}'::text[]`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "read_by" SET DEFAULT '{}'::uuid[]`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changed_fields" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "listing_daily_metrics" ALTER COLUMN "sources" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "listing_daily_metrics" ALTER COLUMN "devices" SET DEFAULT '{}'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "listing_daily_metrics" ALTER COLUMN "devices" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "listing_daily_metrics" ALTER COLUMN "sources" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changed_fields" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "read_by" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "attachment_urls" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "data" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "provider_payload" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."idx_commissions_agent"`);
        await queryRunner.query(`DROP INDEX "public"."idx_commissions_status"`);
        await queryRunner.query(`DROP TABLE "commissions"`);
        await queryRunner.query(`DROP INDEX "public"."idx_oaths_user"`);
        await queryRunner.query(`DROP TABLE "commitment_oaths"`);
    }

}
