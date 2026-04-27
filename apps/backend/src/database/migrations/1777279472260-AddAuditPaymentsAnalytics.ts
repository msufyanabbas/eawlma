import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditPaymentsAnalytics1777279472260 implements MigrationInterface {
    name = 'AddAuditPaymentsAnalytics1777279472260'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_conversations_participants"`);
        await queryRunner.query(`DROP INDEX "public"."idx_messages_read_by"`);
        await queryRunner.query(`CREATE TYPE "public"."plans_key_enum" AS ENUM('free', 'starter', 'pro', 'agency', 'enterprise')`);
        await queryRunner.query(`CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "key" "public"."plans_key_enum" NOT NULL, "name_ar" character varying(100) NOT NULL, "name_en" character varying(100) NOT NULL, "price" numeric(12,2) NOT NULL DEFAULT '0', "currency" character varying(3) NOT NULL DEFAULT 'SAR', "billing_period" character varying(16) NOT NULL DEFAULT 'monthly', "listing_quota" integer NOT NULL DEFAULT '1', "featured_quota" integer NOT NULL DEFAULT '0', "agent_seats" integer NOT NULL DEFAULT '1', "features" jsonb NOT NULL DEFAULT '[]'::jsonb, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_plans_key" ON "plans" ("key") `);
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_plan_key_enum" AS ENUM('free', 'starter', 'pro', 'agency', 'enterprise')`);
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'expired')`);
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "user_id" uuid NOT NULL, "agency_id" uuid, "plan_id" uuid NOT NULL, "plan_key" "public"."subscriptions_plan_key_enum" NOT NULL, "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'active', "current_period_start" TIMESTAMP WITH TIME ZONE NOT NULL, "current_period_end" TIMESTAMP WITH TIME ZONE NOT NULL, "cancel_at_period_end" boolean NOT NULL DEFAULT false, "trial_end" TIMESTAMP WITH TIME ZONE, "listing_quota" integer NOT NULL, "featured_quota" integer NOT NULL, CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_subscriptions_plan" ON "subscriptions" ("plan_key") `);
        await queryRunner.query(`CREATE INDEX "idx_subscriptions_status" ON "subscriptions" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_subscriptions_user" ON "subscriptions" ("user_id") `);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('initiated', 'pending', 'authorized', 'captured', 'failed', 'refunded', 'voided')`);
        await queryRunner.query(`CREATE TYPE "public"."payments_purpose_enum" AS ENUM('featured_listing', 'subscription', 'lead_pack')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "user_id" uuid NOT NULL, "amount" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'SAR', "status" "public"."payments_status_enum" NOT NULL DEFAULT 'initiated', "purpose" "public"."payments_purpose_enum" NOT NULL, "provider" character varying(32) NOT NULL DEFAULT 'moyasar', "provider_payment_id" character varying(128), "description" text, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "failure_message" text, "refunded_amount" integer NOT NULL DEFAULT '0', "provider_payload" jsonb NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_payments_purpose" ON "payments" ("purpose") `);
        await queryRunner.query(`CREATE INDEX "idx_payments_provider_id" ON "payments" ("provider_payment_id") `);
        await queryRunner.query(`CREATE INDEX "idx_payments_status" ON "payments" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_payments_user" ON "payments" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "actor_id" uuid, "action" character varying(64) NOT NULL, "entity_type" character varying(64) NOT NULL, "entity_id" uuid, "changed_fields" jsonb NOT NULL DEFAULT '{}'::jsonb, "ip_address" inet, "user_agent" character varying(512), "request_id" character varying(64), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_audit_created" ON "audit_logs" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_action" ON "audit_logs" ("action") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_entity" ON "audit_logs" ("entity_type", "entity_id") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_actor" ON "audit_logs" ("actor_id") `);
        await queryRunner.query(`CREATE TABLE "listing_daily_metrics" ("listing_id" uuid NOT NULL, "date" date NOT NULL, "impressions" integer NOT NULL DEFAULT '0', "unique_impressions" integer NOT NULL DEFAULT '0', "detail_views" integer NOT NULL DEFAULT '0', "inquiries" integer NOT NULL DEFAULT '0', "saves" integer NOT NULL DEFAULT '0', "contact_clicks" integer NOT NULL DEFAULT '0', "whatsapp_clicks" integer NOT NULL DEFAULT '0', "phone_clicks" integer NOT NULL DEFAULT '0', "sources" jsonb NOT NULL DEFAULT '{}'::jsonb, "devices" jsonb NOT NULL DEFAULT '{}'::jsonb, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fc633eff21b17463c4c1d19c422" PRIMARY KEY ("listing_id", "date"))`);
        await queryRunner.query(`CREATE INDEX "idx_metrics_date" ON "listing_daily_metrics" ("date") `);
        await queryRunner.query(`CREATE INDEX "idx_metrics_listing" ON "listing_daily_metrics" ("listing_id") `);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "attachment_urls" SET DEFAULT '{}'::text[]`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "read_by" SET DEFAULT '{}'::uuid[]`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_427785468fb7d2733f59e7d7d39" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_177183f29f438c488b5e8510cdb" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_177183f29f438c488b5e8510cdb"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_427785468fb7d2733f59e7d7d39"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1"`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "read_by" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "attachment_urls" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "data" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP INDEX "public"."idx_metrics_listing"`);
        await queryRunner.query(`DROP INDEX "public"."idx_metrics_date"`);
        await queryRunner.query(`DROP TABLE "listing_daily_metrics"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_actor"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_entity"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_action"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_created"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP INDEX "public"."idx_payments_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_payments_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_payments_provider_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_payments_purpose"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_purpose_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_subscriptions_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_subscriptions_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_subscriptions_plan"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_plan_key_enum"`);
        await queryRunner.query(`DROP INDEX "public"."uq_plans_key"`);
        await queryRunner.query(`DROP TABLE "plans"`);
        await queryRunner.query(`DROP TYPE "public"."plans_key_enum"`);
        await queryRunner.query(`CREATE INDEX "idx_messages_read_by" ON "messages" ("read_by") `);
        await queryRunner.query(`CREATE INDEX "idx_conversations_participants" ON "conversations" ("participant_ids") `);
    }

}
