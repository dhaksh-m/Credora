import { getDb } from './database/index.js'
import { generateCertificates } from '../../packages/certificate-engine/src/index.js'
import { enqueueCampaignEmails } from '../../packages/email-engine/src/index.js'

export function createCampaign(args: { name: string; templateId: string; recipients: Array<Record<string, string>>; format?: 'png' | 'jpg' | 'pdf'; smtpId?: string }) {
  const db = getDb()
  const id = `cmp_${Date.now().toString(36)}`
  db.prepare(`INSERT INTO campaigns (id, name, template_id, status, attachment_format, recipient_count) VALUES (?,?,?,?,?,?)`).run(
    id, args.name, args.templateId, 'GENERATING', args.format ?? 'pdf', args.recipients.length
  )
  // Background-job style: run generation off renderer (§44/§105). Simplified in-process async here; renderer stays responsive via IPC.
  void (async () => {
    try {
      await generateCertificates({ templateId: args.templateId, recipients: args.recipients, campaignId: id, format: args.format ?? 'pdf' })
      db.prepare(`UPDATE campaigns SET status='SENDING', started_at=strftime('%s','now') WHERE id=?`).run(id)
      if (args.smtpId) await enqueueCampaignEmails(id, args.smtpId)
      db.prepare(`UPDATE campaigns SET status='COMPLETED', completed_at=strftime('%s','now') WHERE id=?`).run(id)
    } catch {
      db.prepare(`UPDATE campaigns SET status='FAILED' WHERE id=?`).run(id)
    }
  })()
  return { id }
}

export function campaignStatus(id: string) {
  const db = getDb()
  const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id)
  const deliveries = db.prepare(`SELECT status, COUNT(*) n FROM email_deliveries WHERE campaign_id = ? GROUP BY status`).all(id)
  return { campaign: c, deliveries }
}

export function pauseCampaign(id: string) {
  getDb().prepare(`UPDATE campaigns SET status='PAUSED' WHERE id=?`).run(id)
  return { ok: true }
}

export function resumeCampaign(id: string) {
  getDb().prepare(`UPDATE campaigns SET status='SENDING' WHERE id=?`).run(id)
  return { ok: true }
}

export function retryFailed(id: string) {
  getDb().prepare(`UPDATE email_deliveries SET status='QUEUED', attempts=attempts+1 WHERE campaign_id=? AND status NOT IN ('SENT','DELIVERED')`).run(id)
  return { ok: true }
}
