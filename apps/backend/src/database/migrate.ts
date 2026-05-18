import 'reflect-metadata';
import AppDataSource from './data-source';

async function main(): Promise<void> {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Running migrations...');
  const migrations = await AppDataSource.runMigrations();
  console.log(`Done! ${migrations.length} migrations executed.`);
  await AppDataSource.destroy();
  process.exit(0);
}

main().catch((e: Error) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
