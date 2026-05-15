import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `preferred_theme` to users so the dark-mode toggle survives across
 * devices. `preferred_locale` already exists from the initial migration, so
 * we don't re-create it here.
 */
export class AddUserPreferredTheme1778103000000 implements MigrationInterface {
  name = 'AddUserPreferredTheme1778103000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_theme" varchar(10) NOT NULL DEFAULT 'light'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "preferred_theme"`,
    );
  }
}
