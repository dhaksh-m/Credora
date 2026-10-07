import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import initSqlJs, { type Database as SqlJsDb } from 'sql.js'
import { SCHEMA_SQL } from '../../../database/schema/schema.js'

// sql.js (WASM) — no native build tools required. Persists to credora.db file.
// For production scale, swap back to better-sqlite3 once VS Build Tools are installed.

let db: SqlJsDb | null = null
let saveTimer: NodeJS.Timeout | null = null

export function dbPath(): string {
  return join(app.getPath('userData'), 'database', 'credora.db')
}

function persist(): void {
  if (!db) return
  try {
    const data = db.export()
    writeFileSync(dbPath(), Buffer.from(data))
  } catch { /* log-only in production */ }
}

export function schedulePersist(): void {
  if (saveTimer) return
  saveTimer = setTimeout(() => { saveTimer = null; persist() }, 500)
}

interface Statement {
  run: (...params: unknown[]) => void
  get: (...params: unknown[]) => Record<string, unknown> | undefined
  all: (...params: unknown[]) => Record<string, unknown>[]
}

function wrap(sql: string): Statement {
  return {
    run(...params: unknown[]) {
      db!.run(sql, params as never)
      schedulePersist()
    },
    get(...params: unknown[]) {
      const stmt = db!.prepare(sql)
      try {
        stmt.bind(params as never)
        if (stmt.step()) return stmt.getAsObject() as Record<string, unknown>
        return undefined
      } finally {
        stmt.free()
      }
    },
    all(...params: unknown[]) {
      const stmt = db!.prepare(sql)
      try {
        stmt.bind(params as never)
        const rows: Record<string, unknown>[] = []
        while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>)
        return rows
      } finally {
        stmt.free()
      }
    }
  }
}

export async function initDatabase(): Promise<void> {
  const dir = join(app.getPath('userData'), 'database')
  mkdirSync(dir, { recursive: true })
  const SQL = await initSqlJs()
  if (existsSync(dbPath())) {
    db = new SQL.Database(readFileSync(dbPath()))
  } else {
    db = new SQL.Database()
  }
  db.exec(SCHEMA_SQL)
  db.exec(`INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_default','Default Organization','default')`)
  persist()
}

export function runMigrations(): void {
  if (!db) throw new Error('DATABASE_ERROR: database not initialised')
  db.exec(SCHEMA_SQL)
  schedulePersist()
}

export function getDb(): { prepare: (sql: string) => Statement; exec: (sql: string) => void } {
  if (!db) throw new Error('DATABASE_ERROR: database not initialised')
  const ref = db
  return { prepare: (sql: string) => wrap(sql), exec: (sql: string) => { ref.exec(sql); schedulePersist() } }
}
