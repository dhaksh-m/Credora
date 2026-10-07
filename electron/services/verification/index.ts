import { getDb } from '../../../electron/services/database/index.js'

// §49 local verification, offline. Public sync exposes only safe fields (§51/§88).
export function verifyLocal(certificateId: string) {
  const db = getDb()
  const rec = db.prepare('SELECT * FROM verification_records WHERE certificate_id = ?').get(certificateId.trim()) as Record<string, unknown> | undefined
  if (!rec) return { valid: false, status: 'NOT_FOUND' as const }
  db.prepare(`INSERT INTO certificate_events (id, certificate_id, event_type) VALUES (?,?,?)`).run(`evt_ver_${Date.now().toString(36)}`, certificateId, 'VERIFIED')
  return {
    valid: rec['status'] === 'VALID',
    status: rec['status'],
    recipient: rec['recipient_name'],
    course: rec['course'],
    organization: rec['organization'],
    certificateId
  }
}

export function publicPayload(certificateId: string) {
  const r = verifyLocal(certificateId)
  if (!('recipient' in r)) return null
  // never expose email, internal ids, SMTP, paths, private metadata
  return { certificateId, recipient: r.recipient, course: r.course, organization: r.organization, status: r.status }
}
