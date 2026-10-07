"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validateRecipients(rows) {
  const issues = [];
  const seen = /* @__PURE__ */ new Map();
  const duplicateEmails = [];
  const invalidEmails = [];
  const missingNames = [];
  const valid = [];
  rows.forEach((r, i) => {
    const row = i + 1;
    let ok = true;
    const email = (r.email ?? "").trim().toLowerCase();
    const name = (r.name ?? "").trim();
    if (!name) {
      issues.push({ row, field: "name", message: "Missing name", severity: "error" });
      missingNames.push(row);
      ok = false;
    }
    if (!email || !EMAIL_RE.test(email)) {
      issues.push({ row, field: "email", message: "Invalid email", severity: "error" });
      invalidEmails.push(r.email ?? "");
      ok = false;
    } else if (seen.has(email)) {
      issues.push({ row, field: "email", message: "Duplicate email", severity: "warning" });
      duplicateEmails.push(email);
    } else seen.set(email, row);
    if ((r.name ?? "").length > 120) issues.push({ row, field: "name", message: "Excessively long text", severity: "warning" });
    if (ok) valid.push(r);
  });
  return { valid, issues, duplicateEmails, invalidEmails, missingNames };
}
exports.validateRecipients = validateRecipients;
