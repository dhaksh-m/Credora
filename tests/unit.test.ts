import { describe, it, expect } from 'vitest'
import { renderVariables, generateCertificateId, sanitizeFilename } from '../packages/shared-types/src/index.js'
import { validateRecipients, duplicateFingerprint } from '../packages/validation/src/index.js'

describe('shared-types', () => {
  it('replaces variables', () => {
    expect(renderVariables('Hello {{name}} ({{certificateId}})', { name: 'Dhaksh', certificateId: 'CR-2026-X' })).toBe('Hello Dhaksh (CR-2026-X)')
  })
  it('generates unique URL-safe IDs', () => {
    const a = generateCertificateId(), b = generateCertificateId()
    expect(a).toMatch(/^CR-\d{4}-[A-Z2-9]{7}$/)
    expect(a).not.toBe(b)
  })
  it('sanitizes Windows filenames', () => {
    expect(sanitizeFilename('a<b:c>d')).toBe('a_b_c_d')
  })
})

describe('validation', () => {
  it('flags invalid + duplicate emails and missing names', () => {
    const r = validateRecipients([
      { name: 'A', email: 'a@x.com' },
      { name: '', email: 'bad' },
      { name: 'B', email: 'a@x.com' }
    ])
    expect(r.valid.length).toBe(2) // duplicate is warning-severity, still processable (§26)
    expect(r.invalidEmails.length).toBe(1)
    expect(r.missingNames.length).toBe(1)
    expect(r.duplicateEmails).toEqual(['a@x.com'])
  })
  it('fingerprint distinguishes campaigns', () => {
    expect(duplicateFingerprint('A@x.com', 't1', 'Camp')).not.toBe(duplicateFingerprint('A@x.com', 't1', 'Other'))
  })
})
