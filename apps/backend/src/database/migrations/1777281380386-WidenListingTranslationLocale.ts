import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widens listing_translations.locale from the AR/EN enum to varchar(8) so
 * that AI-generated translations into 30 BCP-47 locales (fr, de, zh-Hans, …)
 * can be stored without altering the enum each time we add a language.
 */
export class WidenListingTranslationLocale1777281380386 implements MigrationInterface {
  name = 'WidenListingTranslationLocale1777281380386';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The unique index references the column — drop it first so we can swap types.
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_listing_translation_locale"`);
    // Cast through text so existing 'ar'/'en' values are preserved.
    await queryRunner.query(`
      ALTER TABLE "listing_translations"
      ALTER COLUMN "locale" TYPE varchar(8) USING "locale"::text
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."listing_translations_locale_enum"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_listing_translation_locale" ON "listing_translations" ("listing_id", "locale")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_listing_translation_locale"`);
    await queryRunner.query(
      `CREATE TYPE "public"."listing_translations_locale_enum" AS ENUM('ar', 'en')`,
    );
    await queryRunner.query(`
      ALTER TABLE "listing_translations"
      ALTER COLUMN "locale" TYPE "public"."listing_translations_locale_enum"
      USING "locale"::"public"."listing_translations_locale_enum"
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_listing_translation_locale" ON "listing_translations" ("listing_id", "locale")`,
    );
  }
}
