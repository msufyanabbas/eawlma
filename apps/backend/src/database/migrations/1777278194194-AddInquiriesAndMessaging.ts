import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInquiriesAndMessaging1777278194194 implements MigrationInterface {
    name = 'AddInquiriesAndMessaging1777278194194'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "listing_id" uuid, "participant_ids" uuid array NOT NULL, "last_message_at" TIMESTAMP WITH TIME ZONE, "last_message_preview" character varying(280), "last_sender_id" uuid, CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_conversations_listing" ON "conversations" ("listing_id") `);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "conversation_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "body" text NOT NULL, "attachment_urls" text array NOT NULL DEFAULT '{}'::text[], "read_by" uuid array NOT NULL DEFAULT '{}'::uuid[], "delivered_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_messages_sender" ON "messages" ("sender_id") `);
        await queryRunner.query(`CREATE INDEX "idx_messages_conversation_created" ON "messages" ("conversation_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_messages_conversation" ON "messages" ("conversation_id") `);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('inquiry_received', 'message_received', 'listing_approved', 'listing_rejected', 'listing_expiring', 'listing_expired', 'payment_succeeded', 'payment_failed', 'account_verified', 'price_drop', 'saved_search_match')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_channel_enum" AS ENUM('in_app', 'email', 'sms', 'push')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "user_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "channel" "public"."notifications_channel_enum" NOT NULL DEFAULT 'in_app', "title" character varying(255) NOT NULL, "body" text NOT NULL, "data" jsonb NOT NULL DEFAULT '{}'::jsonb, "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_created" ON "notifications" ("user_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_unread" ON "notifications" ("user_id", "read_at") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user" ON "notifications" ("user_id") `);
        await queryRunner.query(`CREATE TYPE "public"."inquiries_status_enum" AS ENUM('new', 'contacted', 'qualified', 'unqualified', 'closed')`);
        await queryRunner.query(`CREATE TABLE "inquiries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "listing_id" uuid NOT NULL, "agent_id" uuid NOT NULL, "user_id" uuid, "guest_name" character varying(200), "guest_email" character varying(320), "guest_phone" character varying(32), "preferred_contact_method" character varying(16), "message" text NOT NULL, "status" "public"."inquiries_status_enum" NOT NULL DEFAULT 'new', "agent_notes" text, "next_action" character varying(500), "next_action_at" TIMESTAMP WITH TIME ZONE, "responded_at" TIMESTAMP WITH TIME ZONE, "source_ip" inet, "user_agent" character varying(512), CONSTRAINT "PK_ceacaa439988b25eb9459e694d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_inquiries_listing_status" ON "inquiries" ("listing_id", "status") `);
        await queryRunner.query(`CREATE INDEX "idx_inquiries_status" ON "inquiries" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_inquiries_agent" ON "inquiries" ("agent_id") `);
        await queryRunner.query(`CREATE INDEX "idx_inquiries_user" ON "inquiries" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_inquiries_listing" ON "inquiries" ("listing_id") `);
        await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_c14948d6807e84b810dd4bed949" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inquiries" ADD CONSTRAINT "FK_437eb598d6803090964641a1fb7" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inquiries" ADD CONSTRAINT "FK_605cc5383d87f6ea4dd43008427" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inquiries" ADD CONSTRAINT "FK_a896a1864d60d5707403e0a0810" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        // GIN index on the conversation participant array — supports fast
        // `participant_ids @> ARRAY[:userId]` and `:uid = ANY(participant_ids)` lookups.
        await queryRunner.query(`CREATE INDEX "idx_conversations_participants" ON "conversations" USING GIN ("participant_ids")`);

        // GIN on message read_by — used by the unread-count fallback query.
        await queryRunner.query(`CREATE INDEX "idx_messages_read_by" ON "messages" USING GIN ("read_by")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_messages_read_by"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_conversations_participants"`);
        await queryRunner.query(`ALTER TABLE "inquiries" DROP CONSTRAINT "FK_a896a1864d60d5707403e0a0810"`);
        await queryRunner.query(`ALTER TABLE "inquiries" DROP CONSTRAINT "FK_605cc5383d87f6ea4dd43008427"`);
        await queryRunner.query(`ALTER TABLE "inquiries" DROP CONSTRAINT "FK_437eb598d6803090964641a1fb7"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_c14948d6807e84b810dd4bed949"`);
        await queryRunner.query(`DROP INDEX "public"."idx_inquiries_listing"`);
        await queryRunner.query(`DROP INDEX "public"."idx_inquiries_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_inquiries_agent"`);
        await queryRunner.query(`DROP INDEX "public"."idx_inquiries_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_inquiries_listing_status"`);
        await queryRunner.query(`DROP TABLE "inquiries"`);
        await queryRunner.query(`DROP TYPE "public"."inquiries_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notifications_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notifications_user_unread"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notifications_user_created"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_channel_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_messages_conversation"`);
        await queryRunner.query(`DROP INDEX "public"."idx_messages_conversation_created"`);
        await queryRunner.query(`DROP INDEX "public"."idx_messages_sender"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP INDEX "public"."idx_conversations_listing"`);
        await queryRunner.query(`DROP TABLE "conversations"`);
    }

}
