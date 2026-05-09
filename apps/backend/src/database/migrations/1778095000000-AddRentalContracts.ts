import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRentalContracts1778095000000 implements MigrationInterface {
  name = 'AddRentalContracts1778095000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "rental_contracts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT '1',
        "listing_id" uuid NOT NULL,
        "agent_id" uuid,
        "landlord_user_id" uuid NOT NULL,
        "tenant_user_id" uuid NOT NULL,
        "tenant_national_id" varchar(64) NOT NULL,
        "landlord_national_id" varchar(64),
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        "monthly_rent" numeric(14,2) NOT NULL,
        "annual_rent" numeric(14,2) NOT NULL,
        "ejar_contract_id" varchar(64),
        "ejar_contract_number" varchar(64),
        "ejar_url" varchar(1024),
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        CONSTRAINT "PK_rental_contracts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rental_contracts_listing"
          FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rental_contracts_agent"
          FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_rental_contracts_landlord"
          FOREIGN KEY ("landlord_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rental_contracts_tenant"
          FOREIGN KEY ("tenant_user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rental_contracts_listing" ON "rental_contracts" ("listing_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rental_contracts_landlord" ON "rental_contracts" ("landlord_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rental_contracts_tenant" ON "rental_contracts" ("tenant_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rental_contracts_status" ON "rental_contracts" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_rental_contracts_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_rental_contracts_tenant"`);
    await queryRunner.query(`DROP INDEX "public"."idx_rental_contracts_landlord"`);
    await queryRunner.query(`DROP INDEX "public"."idx_rental_contracts_listing"`);
    await queryRunner.query(`DROP TABLE "rental_contracts"`);
  }
}
