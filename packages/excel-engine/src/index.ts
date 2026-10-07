import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import type { RecipientRow } from '../../shared-types/src/index.js'

// Streaming-friendly parse; validates signature upstream (§60)
export function parseExcel(filePath: string): RecipientRow[] {
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  return json.map((r) => {
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) lower[k.trim().toLowerCase()] = String(v ?? '');
    return { name: lower['name'] ?? '', email: lower['email'] ?? '', ...lower } as RecipientRow;
  });
}
