import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `detected_language` to messages. The TranslationService writes the
 * Google-Translate-detected source language (ISO 639-1) on send, so reads
 * can short-circuit translation when source == target. NULL means detection
 * never ran or failed — the read path treats that as "translate anyway".
 */
export class AddMessageDetectedLanguage1778102000000 implements MigrationInterface {
  name = 'AddMessageDetectedLanguage1778102000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "detected_language" varchar(8) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN IF EXISTS "detected_language"`,
    );
  }
}
