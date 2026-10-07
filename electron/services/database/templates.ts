import { getDb } from './index.js'

export function listTemplates() {
  return getDb().prepare('SELECT * FROM templates ORDER BY updated_at DESC').all()
}

export function getTemplate(id: string) {
  return getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id)
}

export function saveTemplate(t: {
  id?: string
  name: string
  description?: string
  width: number
  height: number
  orientation?: string
  background_path?: string
  config_json: string
}): unknown {
  const db = getDb()
  const id = t.id ?? `tpl_${Date.now().toString(36)}`
  db.prepare(
    `INSERT INTO templates (id, organization_id, name, description, width, height, orientation, background_path, config_json, version)
     VALUES (?,?,?,?,?,?,?,?,?,1)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description,
       width=excluded.width, height=excluded.height, background_path=excluded.background_path,
       config_json=excluded.config_json, version=templates.version+1, updated_at=strftime('%s','now')`
  ).run(id, 'org_default', t.name, t.description ?? '', t.width, t.height, t.orientation ?? 'landscape', t.background_path ?? '', t.config_json)
  db.prepare(`INSERT INTO template_versions (id, template_id, version, config_json) VALUES (?,?,(SELECT version FROM templates WHERE id=?),?)`).run(
    `ver_${Date.now().toString(36)}`, id, id, t.config_json
  )
  return getTemplate(id)
}
