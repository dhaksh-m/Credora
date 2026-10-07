import { getDb } from './index.js'

export function getSettings(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function setSettings(kv: Record<string, string>): Record<string, string> {
  const db = getDb()
  const stmt = db.prepare(`INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`)
  for (const [k, v] of Object.entries(kv)) stmt.run(k, v)
  return getSettings()
}
