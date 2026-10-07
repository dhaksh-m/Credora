import type { RecipientRow } from '../../shared-types/src/index.js'

export interface ValidationIssue { row: number; field: string; message: string; severity: 'error' | 'warning' }
export interface ValidationResult { valid: RecipientRow[]; issues: ValidationIssue[]; duplicateEmails: string[]; invalidEmails: string[]; missingNames: number[] }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateRecipients(rows: RecipientRow[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, number>();
  const duplicateEmails: string[] = [];
  const invalidEmails: string[] = [];
  const missingNames: number[] = [];
  const valid: RecipientRow[] = [];

  rows.forEach((r, i) => {
    const row = i + 1;
    let ok = true;
    const email = (r.email ?? '').trim().toLowerCase();
    const name = (r.name ?? '').trim();
    if (!name) { issues.push({ row, field: 'name', message: 'Missing name', severity: 'error' }); missingNames.push(row); ok = false; }
    if (!email || !EMAIL_RE.test(email)) { issues.push({ row, field: 'email', message: 'Invalid email', severity: 'error' }); invalidEmails.push(r.email ?? ''); ok = false; }
    else if (seen.has(email)) { issues.push({ row, field: 'email', message: 'Duplicate email', severity: 'warning' }); duplicateEmails.push(email); }
    else seen.set(email, row);
    if ((r.name ?? '').length > 120) issues.push({ row, field: 'name', message: 'Excessively long text', severity: 'warning' });
    if (ok) valid.push(r);
  });
  return { valid, issues, duplicateEmails, invalidEmails, missingNames };
}

// fingerprint: recipient+email+template+campaign (§27)
export function duplicateFingerprint(email: string, templateId: string, campaign: string): string {
  return `${email.trim().toLowerCase()}|${templateId}|${campaign.trim().toLowerCase()}`;
}
