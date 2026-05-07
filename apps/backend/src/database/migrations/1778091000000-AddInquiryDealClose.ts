import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInquiryDealClose1778091000000 implements MigrationInterface {
  name = 'AddInquiryDealClose1778091000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "transaction_value" numeric(14,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inquiries" DROP COLUMN IF EXISTS "closed_at"`);
    await queryRunner.query(`ALTER TABLE "inquiries" DROP COLUMN IF EXISTS "transaction_value"`);
  }
}
