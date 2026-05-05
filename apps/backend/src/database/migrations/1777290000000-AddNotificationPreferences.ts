import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `notification_preferences` JSONB column to `users` so per-user
 * email/push preferences can be persisted from the dashboard Settings page.
 *
 * Default value is NULL — the NotificationsService treats missing/null as
 * opted-in for backwards compatibility with existing users.
 */
export class AddNotificationPreferences1777290000000 implements MigrationInterface {
  name = 'AddNotificationPreferences1777290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "notification_preferences" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "notification_preferences"
    `);
  }
}
