import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSavedListings1777286944877 implements MigrationInterface {
    name = 'AddSavedListings1777286944877'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "saved_listings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "user_id" uuid NOT NULL, "listing_id" uuid NOT NULL, "notes" text, CONSTRAINT "PK_76fecd34cd602bd01b86147e025" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_saved_listing" ON "saved_listings" ("listing_id") `);
        await queryRunner.query(`CREATE INDEX "idx_saved_user" ON "saved_listings" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_saved_user_listing" ON "saved_listings" ("user_id", "listing_id") `);
        await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "provider_payload" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "attachment_urls" SET DEFAULT '{}'::text[]`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "read_by" SET DEFAULT '{}'::uuid[]`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changed_fields" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "listing_daily_metrics" ALTER COLUMN "sources" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "listing_daily_metrics" ALTER COLUMN "devices" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "saved_listings" ADD CONSTRAINT "FK_c254fef47020a5109201fe0ebf0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "saved_listings" ADD CONSTRAINT "FK_d5a474776e90e4df0c516dcba05" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "saved_listings" DROP CONSTRAINT "FK_d5a474776e90e4df0c516dcba05"`);
        await queryRunner.query(`ALTER TABLE "saved_listings" DROP CONSTRAINT "FK_c254fef47020a5109201fe0ebf0"`);
        await queryRunner.query(`ALTER TABLE "listing_daily_metrics" ALTER COLUMN "devices" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "listing_daily_metrics" ALTER COLUMN "sources" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "changed_fields" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "read_by" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "attachment_urls" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "data" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "provider_payload" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."uq_saved_user_listing"`);
        await queryRunner.query(`DROP INDEX "public"."idx_saved_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_saved_listing"`);
        await queryRunner.query(`DROP TABLE "saved_listings"`);
    }

}
