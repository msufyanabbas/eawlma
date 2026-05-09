import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyRequests1778093000000 implements MigrationInterface {
  name = 'AddPropertyRequests1778093000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "property_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT '1',
        "user_id" uuid,
        "property_type" varchar(32) NOT NULL,
        "city" varchar(120) NOT NULL,
        "min_budget" numeric(14,2),
        "max_budget" numeric(14,2),
        "bedrooms" integer,
        "message" text,
        "contact_phone" varchar(32) NOT NULL,
        "contact_email" varchar(320),
        "status" varchar(16) NOT NULL DEFAULT 'open',
        CONSTRAINT "PK_property_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_property_requests_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_property_requests_status" ON "property_requests" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_property_requests_user" ON "property_requests" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_property_requests_city" ON "property_requests" ("city")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_property_requests_city"`);
    await queryRunner.query(`DROP INDEX "public"."idx_property_requests_user"`);
    await queryRunner.query(`DROP INDEX "public"."idx_property_requests_status"`);
    await queryRunner.query(`DROP TABLE "property_requests"`);
  }
}
