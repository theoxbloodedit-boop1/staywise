import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { CONTROL_SCHEMA_REVIEW_SQL, compareControlSchema, type SchemaReviewRow } from '../server/lib/control-schema-review.js';

// Offline only: never imports the application DB and never opens Neon connections.
const engine = new PGlite();
try {
  await engine.exec(await fs.readFile('db/schema.sql', 'utf8'));
  for (const name of ['002_platform_crm.sql', '003_security_invitations.sql', '004_private_media.sql', '005_control_center.sql']) {
    await engine.exec(await fs.readFile(`db/migrations/${name}`, 'utf8'));
  }
  const expected = (await engine.query<SchemaReviewRow>(CONTROL_SCHEMA_REVIEW_SQL)).rows;
  const actualPath = process.argv[2];
  if (actualPath) {
    const actual: unknown = JSON.parse(await fs.readFile(actualPath, 'utf8'));
    if (!Array.isArray(actual) || !actual.every(row => row && ['kind', 'name', 'definition'].every(key => typeof row[key] === 'string'))) throw Error('Expected an array of catalog rows');
    const result = compareControlSchema(expected, actual);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.matches ? 0 : 2;
  } else {
    await fs.writeFile('docs/control-center/sql/005_catalog_review.sql', '-- READ ONLY. Run only on reviewed staging. Export result as JSON.\n' + CONTROL_SCHEMA_REVIEW_SQL);
    await fs.writeFile('docs/control-center/sql/005_expected_catalog.json', JSON.stringify(expected, null, 2) + '\n');
    console.log(`Generated read-only catalog query and ${expected.length} expected metadata rows. No remote database contacted.`);
  }
} finally { await engine.close(); }
