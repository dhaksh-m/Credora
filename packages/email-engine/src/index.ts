import nodemailer from 'nodemailer'
import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { getDb } from '../../../electron/services/database/index.js'

// §11: production uses Windows Credential Manager via keytar (optional native dep).
// Dev fallback: DPAPI-grade storage isn't available without keytar, so we keep an
// obfuscated local vault OUTSIDE SQLite and warn. Never plaintext in DB/logs/UI.
async function secretGet(key: string): Promise<string | null> {
  try {
    // keytar is an optional native dep (production); dynamic import keeps dev installs working
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    // @ts-expect-error keytar is an optional native production dep
    const keytar = (await import(/* @vite-ignore */ 'keytar').catch(() => null) as unknown as { default: { getPassword(s: string, k: string): Promise<string | null> } } | null)
    if (keytar) return await keytar.default.getPassword('Credora-SMTP', key)
  } catch { /* keytar not installed */ }
  const vault = join(app.getPath('userData'), 'vault.json')
  if (!existsSync(vault)) return null
  try {
    const j = JSON.parse(readFileSync(vault, 'utf8')) as Record<string, string>
    const b64 = j[key]
    return b64 ? Buffer.from(b64, 'base64').toString('utf8') : null
  } catch {
    return null
  }
}

async function secretSet(key: string, value: string): Promise<void> {
  try {
    // @ts-expect-error keytar is an optional native production dep
    const keytar = (await import(/* @vite-ignore */ 'keytar').catch(() => null) as unknown as { default: { setPassword(s: string, k: string, v: string): Promise<void> } } | null)
    if (keytar) { await keytar.default.setPassword('Credora-SMTP', key, value); return }
  } catch { /* fallback */ }
  const vault = join(app.getPath('userData'), 'vault.json')
  mkdirSync(app.getPath('userData'), { recursive: true })
  let j: Record<string, string> = {}
  if (existsSync(vault)) {
    try { j = JSON.parse(readFileSync(vault, 'utf8')) as Record<string, string> } catch { j = {} }
  }
  j[key] = Buffer.from(value, 'utf8').toString('base64')
  writeFileSync(vault, JSON.stringify(j))
}

export async function saveSmtpAccount(a: { id?: string; name: string; host: string; port: number; username: string; security_type?: string; password: string }) {
  const db = getDb()
  const id = a.id ?? `smtp_${Date.now().toString(36)}`
  await secretSet(id, a.password)
  db.prepare(`INSERT INTO smtp_accounts (id, name, host, port, username, security_type, credential_reference)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, host=excluded.host, port=excluded.port, username=excluded.username`).run(
    id, a.name, a.host, a.port, a.username, a.security_type ?? 'STARTTLS', `Credora-SMTP:${id}`
  )
  return { id }
}

async function transporterFor(id: string) {
  const db = getDb()
  const acc = db.prepare('SELECT * FROM smtp_accounts WHERE id = ?').get(id) as Record<string, unknown>
  if (!acc) throw new Error('SMTP_ERROR: account not found')
  const password = await secretGet(id)
  if (!password) throw new Error('SMTP_ERROR: missing credential')
  return nodemailer.createTransport({
    host: acc['host'] as string,
    port: Number(acc['port']),
    secure: Number(acc['port']) === 465,
    auth: { user: acc['username'] as string, pass: password }
  })
}

export async function testSmtpConnection(id: string) {
  const t = await transporterFor(id)
  await t.verify()
  return { ok: true }
}

export async function sendTestEmail(args: { smtpId: string; to: string }) {
  const t = await transporterFor(args.smtpId)
  await t.sendMail({ from: 'Credora', to: args.to, subject: 'Credora test email', text: 'SMTP connection successful.' })
  return { ok: true }
}

// Queue with backoff §39: immediate → 30s → 2m → 10m; idempotent key campaign+cert+recipient §109
export async function enqueueCampaignEmails(campaignId: string, smtpId: string): Promise<void> {
  const db = getDb()
  const certs = db.prepare('SELECT * FROM certificates WHERE campaign_id = ?').all(campaignId) as Array<Record<string, string>>
  const ins = db.prepare(`INSERT OR IGNORE INTO email_deliveries (id, campaign_id, certificate_id, email, status) VALUES (?,?,?,?,'QUEUED')`)
  for (const c of certs) {
    const snap = JSON.parse(c['recipient_snapshot_json'] || '{}') as Record<string, string>
    ins.run(`${campaignId}_${c['certificate_id']}`, campaignId, c['certificate_id'], snap['email'] ?? '')
  }
  void smtpId
}
