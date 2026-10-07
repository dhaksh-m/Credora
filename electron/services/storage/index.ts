import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync, copyFileSync, existsSync } from 'node:fs'

// §8: user data under app.getPath('userData') — never install dir
export function workspaceRoot(): string {
  return app.getPath('userData')
}

export function initStorage(): void {
  for (const d of ['database', 'templates', 'certificates', 'campaigns', 'exports', 'logs', 'cache', 'backups']) {
    mkdirSync(join(workspaceRoot(), d), { recursive: true })
  }
}

export function pickBackground(src: string): string {
  const dest = join(workspaceRoot(), 'templates', `bg_${Date.now()}.png`)
  copyFileSync(src, dest)
  return dest
}

export async function importExcelDialog(filePath: string) {
  const { parseExcel } = await import('../../../packages/excel-engine/src/index.js')
  const { validateRecipients } = await import('../../../packages/validation/src/index.js')
  const rows = parseExcel(filePath)
  return { filePath, rows, validation: validateRecipients(rows) }
}

export async function exportZip(args: { certificateIds: string[]; outName?: string }) {
  const { createZip } = await import('../../../packages/certificate-engine/src/index.js')
  return createZip(args.certificateIds, args.outName)
}

export function appPaths() {
  return {
    root: workspaceRoot(),
    certificates: join(workspaceRoot(), 'certificates'),
    exports: join(workspaceRoot(), 'exports')
  }
}

export function pathExists(p: string): boolean {
  return existsSync(p)
}
