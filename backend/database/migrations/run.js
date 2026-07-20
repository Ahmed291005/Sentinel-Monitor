/**
 * database/migrations/run.js
 * Run with: npm run migrate
 */

require('dotenv').config();
const path = require('path');
const fs   = require('fs');

async function runMigrations() {
  const migrationsDir = __dirname;

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.match(/^\d{3}_.*\.js$/) && f !== 'run.js')
    .sort();

  if (files.length === 0) {
    console.log('[Migrate] No migration files found.');
    return;
  }

  console.log(`[Migrate] Running ${files.length} migration(s)...\n`);

  for (const file of files) {
    const migration = require(path.join(migrationsDir, file));
    try {
      await migration.up();
      console.log(`\n[Migrate] ✓ ${file} complete`);
    } catch (err) {
      console.error(`\n[Migrate] ✗ ${file} FAILED`);
      console.error(err.message);
      process.exit(1);
    }
  }

  console.log('\n[Migrate] All migrations complete. Check SSMS to see your tables.');
  process.exit(0);
}

runMigrations();
