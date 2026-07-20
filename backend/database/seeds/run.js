/**
 * database/seeds/run.js
 * Run with: npm run seed
 */

require('dotenv').config();
const path = require('path');
const fs   = require('fs');

async function runSeeds() {
  const seedsDir = __dirname;

  const files = fs.readdirSync(seedsDir)
    .filter(f => f.match(/^\d{3}_.*\.js$/) && f !== 'run.js')
    .sort();

  if (files.length === 0) {
    console.log('[Seed] No seed files found.');
    return;
  }

  console.log(`[Seed] Running ${files.length} seed file(s)...\n`);

  for (const file of files) {
    const seeder = require(path.join(seedsDir, file));
    try {
      await seeder.seed();
      console.log(`\n[Seed] ✓ ${file} complete`);
    } catch (err) {
      console.error(`\n[Seed] ✗ ${file} FAILED`);
      console.error(err.message);
      process.exit(1);
    }
  }

  console.log('\n[Seed] Done. Open SSMS to verify your data.');
  process.exit(0);
}

runSeeds();
