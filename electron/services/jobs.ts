import { getDb } from './database/index.js'

// §45/§77/§108: recover unfinished campaigns; never blind-resend (§109 — queue rows are idempotent).
export async function recoverJobs(): Promise<{ recovered: number }> {
  const db = getDb()
  const rows = db.prepare(`SELECT id FROM campaigns WHERE status IN ('GENERATING','SENDING','VALIDATING','READY')`).all() as Array<{ id: string }>
  for (const r of rows) {
    db.prepare(`UPDATE campaigns SET status='PAUSED' WHERE id=?`).run(r.id)
  }
  return { recovered: rows.length }
}
