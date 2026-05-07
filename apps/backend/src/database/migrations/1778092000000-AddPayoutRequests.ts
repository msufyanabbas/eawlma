import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayoutRequests1778092000000 implements MigrationInterface {
  name = 'AddPayoutRequests1778092000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payout_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT '1',
        "agent_id" uuid NOT NULL,
        "wallet_id" uuid NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "iban_number" varchar(34) NOT NULL,
        "bank_name" varchar(100) NOT NULL,
        "beneficiary_name" varchar(200) NOT NULL,
        "moyasar_disbursement_id" varchar(64),
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "failure_reason" text,
        "admin_notes" text,
        "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "processed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_payout_requests_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payouts_agent" ON "payout_requests" ("agent_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payouts_status" ON "payout_requests" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payouts_moyasar" ON "payout_requests" ("moyasar_disbursement_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_payouts_moyasar"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payouts_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payouts_agent"`);
    await queryRunner.query(`DROP TABLE "payout_requests"`);
  }
}
