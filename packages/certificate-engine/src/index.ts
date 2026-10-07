import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import sharp from 'sharp'
import archiver from 'archiver'
import { createWriteStream } from 'node:fs'
import { getDb } from '../../../electron/services/database/index.js'
import { workspaceRoot } from '../../../electron/services/storage/index.js'
import { generateCertificateId, renderVariables, sanitizeFilename, type TemplateConfig } from '../../shared-types/src/index.js'

export interface GenerateArgs {
  templateId: string
  recipients: Array<Record<string, string>>
  campaignId?: string
  campaignName?: string
  format?: 'png' | 'jpg' | 'pdf'
  duplicatePolicy?: 'skip' | 'warn' | 'always'
  filenamePattern?: string
}

// Pipeline §78: resolve vars → overrides → bg → fields → QR → overflow → render → hash → store
export async function generateCertificates(args: GenerateArgs) {
  const db = getDb()
  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(args.templateId) as Record<string, unknown> | undefined
  if (!tpl) throw new Error('VALIDATION_ERROR: template not found')
  const config = JSON.parse(tpl['config_json'] as string) as TemplateConfig
  const outDir = join(workspaceRoot(), 'certificates', args.campaignId ?? 'adhoc')
  mkdirSync(outDir, { recursive: true })

  let generated = 0, skipped = 0, failed = 0
  const results: Array<{ certificateId: string; status: string }> = []

  for (const r of args.recipients) {
    try {
      const email = (r['email'] ?? '').toLowerCase()
      if (args.campaignId && args.duplicatePolicy !== 'always') {
        const dup = db.prepare('SELECT certificate_id FROM certificates WHERE campaign_id = ? AND recipient_snapshot_json LIKE ?').get(args.campaignId, `%"${email}"%`) as { certificate_id: string } | undefined
        if (dup) { skipped++; results.push({ certificateId: dup.certificate_id, status: 'SKIPPED_DUPLICATE' }); continue }
      }
      const certificateId = generateCertificateId()
      const data = { ...r, certificateId, organization: 'Default Organization', date: new Date().toLocaleDateString() }
      const verifyUrl = `https://verify.credora.com/c/${certificateId}`
      const qr = await QRCode.toDataURL(verifyUrl, { width: 256, margin: 1 })

      const pattern = args.filenamePattern ?? '{{name}}_{{certificateId}}'
      const base = sanitizeFilename(renderVariables(pattern, { name: r['name'] ?? 'certificate', certificateId }))
      const format = args.format ?? 'pdf'

      // Render: SVG composite via sharp (offline, exact positioning)
      const W = Number(tpl['width']) || 1920, H = Number(tpl['height']) || 1080
      const texts = (config.objects ?? []).filter((o) => o.type === 'text').map((o) => {
        const txt = escapeXml(renderVariables(o.text ?? '', data))
        return `<text x="${o.left}" y="${(o.top ?? 0) + (o.fontSize ?? 48)}" font-size="${o.fontSize ?? 48}" font-family="${o.fontFamily ?? 'Georgia, serif'}" fill="${o.fill ?? '#1a1a1a'}">${txt}</text>`
      }).join('')
      const qrObjs = (config.objects ?? []).filter((o) => o.type === 'qr')
      const qrComposites: { input: Buffer; left: number; top: number }[] = []
      for (const o of qrObjs) {
        const buf = Buffer.from(qr.split(',')[1], 'base64')
        qrComposites.push({ input: await sharp(buf).resize(Number(o.width) || 160, Number(o.height) || 160).toBuffer(), left: Math.round(o.left), top: Math.round(o.top) })
      }
      let canvas: sharp.Sharp
      if (tpl['background_path']) {
        canvas = sharp(tpl['background_path'] as string).resize(W, H, { fit: 'fill' })
      } else {
        canvas = sharp({ create: { width: W, height: H, channels: 3, background: '#faf7ef' } })
      }
      const svgOverlay = Buffer.from(`<svg width="${W}" height="${H}">${texts}</svg>`)
      canvas = canvas.composite([{ input: svgOverlay, left: 0, top: 0 }, ...qrComposites])

      let filePath = ''
      if (format === 'png') { filePath = join(outDir, `${base}.png`); await canvas.png().toFile(filePath) }
      else if (format === 'jpg') { filePath = join(outDir, `${base}.jpg`); await canvas.jpeg({ quality: 92 }).toFile(filePath) }
      else {
        const pngBuf = await canvas.png().toBuffer()
        filePath = join(outDir, `${base}.pdf`)
        await svgToPdf(pngBuf, filePath, W, H)
      }

      const hash = createHash('sha256').update(`${certificateId}|${email}|${Date.now()}`).digest('hex')
      const id = `cert_${Date.now().toString(36)}_${generated}`
      db.prepare(`INSERT INTO certificates (id, certificate_id, campaign_id, template_id, recipient_id, recipient_snapshot_json, png_path, jpg_path, pdf_path, status, issued_at, hash)
        VALUES (?,?,?,?,?,?,?,?,?,?,strftime('%s','now'),?)`).run(
        id, certificateId, args.campaignId ?? null, args.templateId, null, JSON.stringify(data),
        format === 'png' ? filePath : '', format === 'jpg' ? filePath : '', format === 'pdf' ? filePath : '', 'ISSUED', hash
      )
      db.prepare(`INSERT INTO certificate_events (id, certificate_id, event_type) VALUES (?,?,?)`).run(`evt_${id}`, certificateId, 'ISSUED')
      db.prepare(`INSERT OR REPLACE INTO verification_records (certificate_id, recipient_name, course, organization, issue_date, status, certificate_hash)
        VALUES (?,?,?,?,strftime('%s','now'),'VALID',?)`).run(certificateId, r['name'] ?? '', r['course'] ?? r['event'] ?? '', 'Default Organization', hash)
      generated++
      results.push({ certificateId, status: 'ISSUED' })
    } catch {
      failed++
    }
  }
  return { generated, skipped, failed, results }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function svgToPdf(img: Buffer, outPath: string, w: number, h: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [w, h], margin: 0 })
    const stream = createWriteStream(outPath)
    doc.pipe(stream)
    doc.image(img, 0, 0, { width: w, height: h })
    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

export function listCertificates(filter: { campaignId?: string; search?: string } = {}) {
  const db = getDb()
  if (filter.campaignId) return db.prepare('SELECT * FROM certificates WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 500').all(filter.campaignId)
  if (filter.search) return db.prepare('SELECT * FROM certificates WHERE certificate_id LIKE ? OR recipient_snapshot_json LIKE ? ORDER BY created_at DESC LIMIT 200').all(`%${filter.search}%`, `%${filter.search}%`)
  return db.prepare('SELECT * FROM certificates ORDER BY created_at DESC LIMIT 200').all()
}

export function revokeCertificate(id: string, reason: string) {
  const db = getDb()
  db.prepare(`UPDATE certificates SET status='REVOKED', revoked_at=strftime('%s','now') WHERE certificate_id = ?`).run(id)
  db.prepare(`INSERT INTO certificate_events (id, certificate_id, event_type, metadata_json) VALUES (?,?,?,?)`).run(`evt_rev_${Date.now().toString(36)}`, id, 'REVOKED', JSON.stringify({ reason }))
  db.prepare(`UPDATE verification_records SET status='REVOKED' WHERE certificate_id = ?`).run(id)
  return { ok: true }
}

export function createZip(certificateIds: string[], outName?: string): Promise<string> {
  const db = getDb()
  const rows = db.prepare(`SELECT * FROM certificates WHERE certificate_id IN (${certificateIds.map(() => '?').join(',')})`).all(...certificateIds) as Array<Record<string, string>>
  const outPath = join(workspaceRoot(), 'exports', outName ?? `certificates_${Date.now()}.zip`)
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath)
    const archive = archiver('zip', { zlib: { level: 9 } })
    output.on('close', () => resolve(outPath))
    archive.on('error', reject)
    archive.pipe(output)
    for (const r of rows) {
      const p = r['pdf_path'] || r['png_path'] || r['jpg_path']
      if (p) archive.file(p, { name: p.split(/[/\\]/).pop() ?? 'cert' })
    }
    void archive.finalize()
  })
}
