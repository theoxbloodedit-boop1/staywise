import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('invitation UI source regression: pending creation retains one-time token without global session rehydration', async () => {
  const source = await fs.readFile('src/pages/TeamAutomationsPage.tsx', 'utf8');
  const handler = source.slice(source.indexOf('const handleInvite'), source.indexOf('\n  return ('));
  assert.match(handler, /setInvitationToken\(invitation\.invitation_token\)/);
  assert.match(handler, /await load\(\)/);
  assert.doesNotMatch(source, /onRefreshContext|hydrateFromBackend/);
  assert.doesNotMatch(handler, /localStorage|sessionStorage|console\./);
  const app = await fs.readFile('src/App.tsx', 'utf8');
  assert.match(app, /<TeamPage orgId=\{session\.organizationId\} \/>/);
});
