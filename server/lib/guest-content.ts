import { decryptField } from '../security.js';

/** The same boundary is used by the portal and guide search. No free-text guide
 * content is public before stay verification: it can contain addresses or codes
 * in arbitrary fields. Hiding individual UI fields is not a security boundary. */
export function projectGuestSections(rows: any[], verified: boolean) {
  if (!verified) return [];
  return rows.filter(row => row.is_visible === 1 || row.is_visible === true).map(row => {
    const parsed = typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json;
    const content = { ...(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}) };
    if (row.section_key === 'checkin') {
      for (const key of ['smartLockCode', 'lockboxInstructions']) {
        if (content[key]) content[key] = decryptField(content[key]);
      }
    }
    if (row.section_key === 'wifi_home' && content.wifiPassword) content.wifiPassword = decryptField(content.wifiPassword);
    return { section_key: row.section_key, title: row.title, sort_order: row.sort_order, content };
  });
}
