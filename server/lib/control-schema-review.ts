export interface SchemaReviewRow { kind: string; name: string; definition: string }

/** Catalog/permission metadata only. No account/session/audit contents. */
export const CONTROL_SCHEMA_REVIEW_SQL = `
SELECT kind, name, definition FROM (
 SELECT 'column'::text AS kind, c.relname || '.' || a.attname AS name,
   format_type(a.atttypid,a.atttypmod) || '|notnull=' || a.attnotnull::text ||
   '|default=' || coalesce(pg_get_expr(d.adbin,d.adrelid),'') AS definition
 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped
 AND (c.relname IN ('admin_profiles','admin_role_permissions','admin_sessions',
 'admin_audit_logs','admin_support_tickets','admin_support_notes',
 'admin_announcements','admin_feature_flags')
 OR (c.relname='organizations' AND a.attname='control_version')
 OR (c.relname='users' AND a.attname IN ('account_status','control_revoked_before','control_version')))
 UNION ALL
 SELECT 'constraint', c.relname || '.' || x.conname, pg_get_constraintdef(x.oid)
 FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND (c.relname IN ('admin_profiles','admin_role_permissions',
 'admin_sessions','admin_audit_logs','admin_support_tickets','admin_support_notes',
 'admin_announcements','admin_feature_flags') OR
 (c.relname='users' AND x.contype='c' AND pg_get_constraintdef(x.oid) LIKE '%account_status%'))
 UNION ALL
 SELECT 'index', indexname, indexdef FROM pg_indexes
 WHERE schemaname='public' AND tablename IN ('admin_profiles','admin_role_permissions',
 'admin_sessions','admin_audit_logs','admin_support_tickets','admin_support_notes',
 'admin_announcements','admin_feature_flags')
 UNION ALL
 SELECT 'trigger', c.relname || '.' || t.tgname,
   pg_get_triggerdef(t.oid) || '|enabled=' || t.tgenabled::text
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname='admin_audit_logs' AND NOT t.tgisinternal
 UNION ALL
 SELECT 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
 pg_get_functiondef(p.oid) || '|security_definer=' || p.prosecdef::text
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='reject_admin_audit_mutation'
 UNION ALL
 SELECT 'permission', role || ':' || permission, 'present'
 FROM public.admin_role_permissions
) review ORDER BY kind,name;
`;

export function compareControlSchema(expected: SchemaReviewRow[], actual: SchemaReviewRow[]) {
  const key = (row: SchemaReviewRow) => `${row.kind}:${row.name}`;
  for (const rows of [expected, actual]) {
    const keys = rows.map(key);
    if (new Set(keys).size !== keys.length) throw new Error('Duplicate catalog identity; refusing ambiguous comparison');
  }
  const normalize = (s: string) => s.trim();
  const e = new Map(expected.map(row => [key(row), row]));
  const a = new Map(actual.map(row => [key(row), row]));
  const missing = [...e.keys()].filter(k => !a.has(k));
  const changed = [...e.keys()].filter(k => a.has(k) && normalize(e.get(k)!.definition) !== normalize(a.get(k)!.definition));
  const unexpected = [...a.keys()].filter(k => !e.has(k));
  return { matches: missing.length === 0 && changed.length === 0 && unexpected.length === 0, missing, changed, unexpected };
}
