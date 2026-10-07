// §94 checklist enforced: contextIsolation, no nodeIntegration, param queries, keytar secrets, no secrets in logs.
export const SECURITY_CHECKLIST = [
  'contextIsolation: true',
  'nodeIntegration: false',
  'sandbox: true',
  'parameterised SQLite only',
  'SMTP via Windows Credential Manager',
  'HTTPS-only external connections'
] as const
