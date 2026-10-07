export type CertificateStatus = 'DRAFT' | 'GENERATED' | 'ISSUED' | 'SENT' | 'DELIVERED' | 'REVOKED';
export type CampaignStatus = 'DRAFT' | 'VALIDATING' | 'READY' | 'GENERATING' | 'SENDING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type EmailStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'TEMP_FAIL' | 'RATE_LIMITED' | 'INVALID' | 'SMTP_FAIL' | 'AUTH_FAIL' | 'BOUNCED' | 'REJECTED';

export interface TemplateConfig {
  objects: Array<{
    id: string; type: 'text' | 'image' | 'qr' | 'shape';
    text?: string; left: number; top: number; width?: number; height?: number;
    fontSize?: number; fontFamily?: string; fill?: string; angle?: number;
  }>;
  background?: string;
}

export interface RecipientRow { name: string; email: string; [k: string]: string }

export const DYNAMIC_VARS = ['{{name}}', '{{firstName}}', '{{email}}', '{{course}}', '{{event}}', '{{date}}', '{{certificateId}}', '{{organization}}'] as const;

export function renderVariables(template: string, data: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(data)) out = out.split(`{{${k}}}`).join(v);
  return out;
}

// CR-2026-XXXXXXX — unique, non-sequential, URL-safe (§28)
export function generateCertificateId(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const buf = new Uint32Array(7);
  crypto.getRandomValues(buf);
  for (const n of buf) s += chars[n % chars.length];
  return `CR-${year}-${s}`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:\"/\\|?*]/g, '_').trim().slice(0, 120);
}
