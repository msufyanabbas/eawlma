import dataSource from '../data-source';
import { seedVRListings } from './vr-listings.seed';

/** Standalone runner: `npm run seed:vr`. */
async function main(): Promise<void> {
  await dataSource.initialize();
  await seedVRListings(dataSource);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
