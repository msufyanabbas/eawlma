import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDufaat1778096000000 implements MigrationInterface {
  name = 'AddDufaat1778096000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "dufaat_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT '1',
        "rental_contract_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "landlord_id" uuid NOT NULL,
        "total_annual_amount" numeric(14,2) NOT NULL,
        "monthly_installment" numeric(14,2) NOT NULL,
        "platform_fee_rate" numeric(5,2) NOT NULL DEFAULT 2,
        "platform_fee" numeric(14,2) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'active',
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        CONSTRAINT "PK_dufaat_plans_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dufaat_plans_contract"
          FOREIGN KEY ("rental_contract_id") REFERENCES "rental_contracts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dufaat_plans_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dufaat_plans_landlord"
          FOREIGN KEY ("landlord_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dufaat_plans_tenant" ON "dufaat_plans" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dufaat_plans_status" ON "dufaat_plans" ("status")`,
    );

    await queryRunner.query(
      `CREATE TABLE "dufaat_installments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT '1',
        "plan_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "due_date" DATE NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "moyasar_payment_id" varchar(64),
        CONSTRAINT "PK_dufaat_installments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dufaat_installments_plan"
          FOREIGN KEY ("plan_id") REFERENCES "dufaat_plans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dufaat_installments_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dufaat_installments_plan" ON "dufaat_installments" ("plan_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dufaat_installments_status" ON "dufaat_installments" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dufaat_installments_due" ON "dufaat_installments" ("due_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_dufaat_installments_due"`);
    await queryRunner.query(`DROP INDEX "public"."idx_dufaat_installments_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_dufaat_installments_plan"`);
    await queryRunner.query(`DROP TABLE "dufaat_installments"`);
    await queryRunner.query(`DROP INDEX "public"."idx_dufaat_plans_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_dufaat_plans_tenant"`);
    await queryRunner.query(`DROP TABLE "dufaat_plans"`);
  }
}
