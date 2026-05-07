import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWallet1778090000000 implements MigrationInterface {
  name = 'AddWallet1778090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "wallets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT '1',
        "user_id" uuid NOT NULL,
        "balance" numeric(14,2) NOT NULL DEFAULT 0,
        "currency" varchar(8) NOT NULL DEFAULT 'SAR',
        CONSTRAINT "PK_wallets_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_wallets_user" ON "wallets" ("user_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE "wallet_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL DEFAULT '1',
        "wallet_id" uuid NOT NULL,
        "type" varchar(24) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "balance_before" numeric(14,2) NOT NULL,
        "balance_after" numeric(14,2) NOT NULL,
        "description" text,
        "reference_id" varchar(64),
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        CONSTRAINT "PK_wallet_transactions_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wallet_txn_wallet" ON "wallet_transactions" ("wallet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wallet_txn_status" ON "wallet_transactions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wallet_txn_reference" ON "wallet_transactions" ("reference_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_wallet_txn_reference"`);
    await queryRunner.query(`DROP INDEX "public"."idx_wallet_txn_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_wallet_txn_wallet"`);
    await queryRunner.query(`DROP TABLE "wallet_transactions"`);
    await queryRunner.query(`DROP INDEX "public"."idx_wallets_user"`);
    await queryRunner.query(`DROP TABLE "wallets"`);
  }
}
