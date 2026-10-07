"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require$$0 = require("electron");
const node_path = require("node:path");
const node_crypto = require("node:crypto");
const node_fs = require("node:fs");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const sharp = require("sharp");
const archiver = require("archiver");
const initSqlJs = require("sql.js");
const nodemailer = require("nodemailer");
const require$$2 = require("path");
const require$$0$2 = require("child_process");
const require$$1 = require("os");
const require$$0$1 = require("fs");
const require$$0$3 = require("util");
const require$$0$4 = require("events");
const require$$0$5 = require("http");
const require$$1$1 = require("https");
const is = {
  dev: !require$$0.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      require$$0.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return require$$0.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      require$$0.app.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return require$$0.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window2, shortcutOptions) {
    if (!window2)
      return;
    const { webContents } = window2;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window2.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    require$$0.ipcMain.on("win:invoke", (event, action) => {
      const win = require$$0.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE, logo_path TEXT, created_at INTEGER DEFAULT (strftime('%s','now')), updated_at INTEGER);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, organization_id TEXT REFERENCES organizations(id), name TEXT, email TEXT, role TEXT DEFAULT 'owner', created_at INTEGER DEFAULT (strftime('%s','now')), updated_at INTEGER);
CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, organization_id TEXT REFERENCES organizations(id), name TEXT NOT NULL, description TEXT DEFAULT '', width INTEGER NOT NULL, height INTEGER NOT NULL, orientation TEXT DEFAULT 'landscape', background_path TEXT DEFAULT '', config_json TEXT NOT NULL, version INTEGER DEFAULT 1, created_at INTEGER DEFAULT (strftime('%s','now')), updated_at INTEGER DEFAULT (strftime('%s','now')));
CREATE TABLE IF NOT EXISTS template_versions (id TEXT PRIMARY KEY, template_id TEXT REFERENCES templates(id), version INTEGER, config_json TEXT, created_at INTEGER DEFAULT (strftime('%s','now')));
CREATE TABLE IF NOT EXISTS recipients (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, metadata_json TEXT DEFAULT '{}', created_at INTEGER DEFAULT (strftime('%s','now')), updated_at INTEGER);
CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, template_id TEXT REFERENCES templates(id), status TEXT DEFAULT 'DRAFT', attachment_format TEXT DEFAULT 'pdf', recipient_count INTEGER DEFAULT 0, success_count INTEGER DEFAULT 0, failed_count INTEGER DEFAULT 0, retry_count INTEGER DEFAULT 0, created_at INTEGER DEFAULT (strftime('%s','now')), started_at INTEGER, completed_at INTEGER);
CREATE TABLE IF NOT EXISTS certificates (id TEXT PRIMARY KEY, certificate_id TEXT UNIQUE NOT NULL, campaign_id TEXT REFERENCES campaigns(id), template_id TEXT REFERENCES templates(id), recipient_id TEXT REFERENCES recipients(id), recipient_snapshot_json TEXT DEFAULT '{}', png_path TEXT, jpg_path TEXT, pdf_path TEXT, status TEXT DEFAULT 'GENERATED', issued_at INTEGER, revoked_at INTEGER, created_at INTEGER DEFAULT (strftime('%s','now')), hash TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS certificate_events (id TEXT PRIMARY KEY, certificate_id TEXT NOT NULL, event_type TEXT NOT NULL, metadata_json TEXT DEFAULT '{}', created_at INTEGER DEFAULT (strftime('%s','now')));
CREATE TABLE IF NOT EXISTS email_deliveries (id TEXT PRIMARY KEY, campaign_id TEXT, certificate_id TEXT, recipient_id TEXT, email TEXT NOT NULL, status TEXT DEFAULT 'QUEUED', attempts INTEGER DEFAULT 0, last_error TEXT DEFAULT '', sent_at INTEGER, delivered_at INTEGER, opened_at INTEGER, clicked_at INTEGER, created_at INTEGER DEFAULT (strftime('%s','now')), updated_at INTEGER);
CREATE TABLE IF NOT EXISTS smtp_accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, host TEXT NOT NULL, port INTEGER NOT NULL, username TEXT NOT NULL, security_type TEXT DEFAULT 'STARTTLS', credential_reference TEXT NOT NULL, created_at INTEGER DEFAULT (strftime('%s','now')), updated_at INTEGER);
CREATE TABLE IF NOT EXISTS verification_records (certificate_id TEXT PRIMARY KEY, recipient_name TEXT, course TEXT, organization TEXT, issue_date INTEGER, status TEXT DEFAULT 'VALID', template_hash TEXT DEFAULT '', certificate_hash TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, timestamp INTEGER DEFAULT (strftime('%s','now')), action TEXT NOT NULL, resource TEXT, resource_id TEXT, details TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER DEFAULT (strftime('%s','now')));
`;
let db = null;
let saveTimer = null;
function dbPath() {
  return node_path.join(require$$0.app.getPath("userData"), "database", "credora.db");
}
function persist() {
  if (!db) return;
  try {
    const data = db.export();
    node_fs.writeFileSync(dbPath(), Buffer.from(data));
  } catch {
  }
}
function schedulePersist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persist();
  }, 500);
}
function wrap(sql) {
  return {
    run(...params) {
      db.run(sql, params);
      schedulePersist();
    },
    get(...params) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        if (stmt.step()) return stmt.getAsObject();
        return void 0;
      } finally {
        stmt.free();
      }
    },
    all(...params) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        return rows;
      } finally {
        stmt.free();
      }
    }
  };
}
async function initDatabase() {
  const dir = node_path.join(require$$0.app.getPath("userData"), "database");
  node_fs.mkdirSync(dir, { recursive: true });
  const SQL = await initSqlJs();
  if (node_fs.existsSync(dbPath())) {
    db = new SQL.Database(node_fs.readFileSync(dbPath()));
  } else {
    db = new SQL.Database();
  }
  db.exec(SCHEMA_SQL);
  db.exec(`INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_default','Default Organization','default')`);
  persist();
}
function runMigrations() {
  if (!db) throw new Error("DATABASE_ERROR: database not initialised");
  db.exec(SCHEMA_SQL);
  schedulePersist();
}
function getDb() {
  if (!db) throw new Error("DATABASE_ERROR: database not initialised");
  const ref = db;
  return { prepare: (sql) => wrap(sql), exec: (sql) => {
    ref.exec(sql);
    schedulePersist();
  } };
}
function workspaceRoot() {
  return require$$0.app.getPath("userData");
}
function initStorage() {
  for (const d of ["database", "templates", "certificates", "campaigns", "exports", "logs", "cache", "backups"]) {
    node_fs.mkdirSync(node_path.join(workspaceRoot(), d), { recursive: true });
  }
}
function pickBackground(src2) {
  const dest = node_path.join(workspaceRoot(), "templates", `bg_${Date.now()}.png`);
  node_fs.copyFileSync(src2, dest);
  return dest;
}
async function importExcelDialog(filePath) {
  const { parseExcel } = await Promise.resolve().then(() => require("./index-rD2--06T.js"));
  const { validateRecipients } = await Promise.resolve().then(() => require("./index-CcyGecD-.js"));
  const rows = parseExcel(filePath);
  return { filePath, rows, validation: validateRecipients(rows) };
}
async function exportZip(args) {
  const { createZip: createZip2 } = await Promise.resolve().then(() => index);
  return createZip2(args.certificateIds, args.outName);
}
function renderVariables(template, data) {
  let out = template;
  for (const [k, v] of Object.entries(data)) out = out.split(`{{${k}}}`).join(v);
  return out;
}
function generateCertificateId() {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const buf = new Uint32Array(7);
  crypto.getRandomValues(buf);
  for (const n of buf) s += chars[n % chars.length];
  return `CR-${year}-${s}`;
}
function sanitizeFilename(name) {
  return name.replace(/[<>:\"/\\|?*]/g, "_").trim().slice(0, 120);
}
async function generateCertificates(args) {
  const db2 = getDb();
  const tpl = db2.prepare("SELECT * FROM templates WHERE id = ?").get(args.templateId);
  if (!tpl) throw new Error("VALIDATION_ERROR: template not found");
  const config = JSON.parse(tpl["config_json"]);
  const outDir = node_path.join(workspaceRoot(), "certificates", args.campaignId ?? "adhoc");
  node_fs.mkdirSync(outDir, { recursive: true });
  let generated = 0, skipped = 0, failed = 0;
  const results = [];
  for (const r of args.recipients) {
    try {
      const email = (r["email"] ?? "").toLowerCase();
      if (args.campaignId && args.duplicatePolicy !== "always") {
        const dup = db2.prepare("SELECT certificate_id FROM certificates WHERE campaign_id = ? AND recipient_snapshot_json LIKE ?").get(args.campaignId, `%"${email}"%`);
        if (dup) {
          skipped++;
          results.push({ certificateId: dup.certificate_id, status: "SKIPPED_DUPLICATE" });
          continue;
        }
      }
      const certificateId = generateCertificateId();
      const data = { ...r, certificateId, organization: "Default Organization", date: (/* @__PURE__ */ new Date()).toLocaleDateString() };
      const verifyUrl = `https://verify.credora.com/c/${certificateId}`;
      const qr = await QRCode.toDataURL(verifyUrl, { width: 256, margin: 1 });
      const pattern = args.filenamePattern ?? "{{name}}_{{certificateId}}";
      const base = sanitizeFilename(renderVariables(pattern, { name: r["name"] ?? "certificate", certificateId }));
      const format2 = args.format ?? "pdf";
      const W = Number(tpl["width"]) || 1920, H = Number(tpl["height"]) || 1080;
      const texts = (config.objects ?? []).filter((o) => o.type === "text").map((o) => {
        const txt = escapeXml(renderVariables(o.text ?? "", data));
        return `<text x="${o.left}" y="${(o.top ?? 0) + (o.fontSize ?? 48)}" font-size="${o.fontSize ?? 48}" font-family="${o.fontFamily ?? "Georgia, serif"}" fill="${o.fill ?? "#1a1a1a"}">${txt}</text>`;
      }).join("");
      const qrObjs = (config.objects ?? []).filter((o) => o.type === "qr");
      const qrComposites = [];
      for (const o of qrObjs) {
        const buf = Buffer.from(qr.split(",")[1], "base64");
        qrComposites.push({ input: await sharp(buf).resize(Number(o.width) || 160, Number(o.height) || 160).toBuffer(), left: Math.round(o.left), top: Math.round(o.top) });
      }
      let canvas;
      if (tpl["background_path"]) {
        canvas = sharp(tpl["background_path"]).resize(W, H, { fit: "fill" });
      } else {
        canvas = sharp({ create: { width: W, height: H, channels: 3, background: "#faf7ef" } });
      }
      const svgOverlay = Buffer.from(`<svg width="${W}" height="${H}">${texts}</svg>`);
      canvas = canvas.composite([{ input: svgOverlay, left: 0, top: 0 }, ...qrComposites]);
      let filePath = "";
      if (format2 === "png") {
        filePath = node_path.join(outDir, `${base}.png`);
        await canvas.png().toFile(filePath);
      } else if (format2 === "jpg") {
        filePath = node_path.join(outDir, `${base}.jpg`);
        await canvas.jpeg({ quality: 92 }).toFile(filePath);
      } else {
        const pngBuf = await canvas.png().toBuffer();
        filePath = node_path.join(outDir, `${base}.pdf`);
        await svgToPdf(pngBuf, filePath, W, H);
      }
      const hash = node_crypto.createHash("sha256").update(`${certificateId}|${email}|${Date.now()}`).digest("hex");
      const id = `cert_${Date.now().toString(36)}_${generated}`;
      db2.prepare(`INSERT INTO certificates (id, certificate_id, campaign_id, template_id, recipient_id, recipient_snapshot_json, png_path, jpg_path, pdf_path, status, issued_at, hash)
        VALUES (?,?,?,?,?,?,?,?,?,?,strftime('%s','now'),?)`).run(
        id,
        certificateId,
        args.campaignId ?? null,
        args.templateId,
        null,
        JSON.stringify(data),
        format2 === "png" ? filePath : "",
        format2 === "jpg" ? filePath : "",
        format2 === "pdf" ? filePath : "",
        "ISSUED",
        hash
      );
      db2.prepare(`INSERT INTO certificate_events (id, certificate_id, event_type) VALUES (?,?,?)`).run(`evt_${id}`, certificateId, "ISSUED");
      db2.prepare(`INSERT OR REPLACE INTO verification_records (certificate_id, recipient_name, course, organization, issue_date, status, certificate_hash)
        VALUES (?,?,?,?,strftime('%s','now'),'VALID',?)`).run(certificateId, r["name"] ?? "", r["course"] ?? r["event"] ?? "", "Default Organization", hash);
      generated++;
      results.push({ certificateId, status: "ISSUED" });
    } catch {
      failed++;
    }
  }
  return { generated, skipped, failed, results };
}
function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function svgToPdf(img, outPath, w, h) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [w, h], margin: 0 });
    const stream = node_fs.createWriteStream(outPath);
    doc.pipe(stream);
    doc.image(img, 0, 0, { width: w, height: h });
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}
function listCertificates(filter = {}) {
  const db2 = getDb();
  if (filter.campaignId) return db2.prepare("SELECT * FROM certificates WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 500").all(filter.campaignId);
  if (filter.search) return db2.prepare("SELECT * FROM certificates WHERE certificate_id LIKE ? OR recipient_snapshot_json LIKE ? ORDER BY created_at DESC LIMIT 200").all(`%${filter.search}%`, `%${filter.search}%`);
  return db2.prepare("SELECT * FROM certificates ORDER BY created_at DESC LIMIT 200").all();
}
function revokeCertificate(id, reason) {
  const db2 = getDb();
  db2.prepare(`UPDATE certificates SET status='REVOKED', revoked_at=strftime('%s','now') WHERE certificate_id = ?`).run(id);
  db2.prepare(`INSERT INTO certificate_events (id, certificate_id, event_type, metadata_json) VALUES (?,?,?,?)`).run(`evt_rev_${Date.now().toString(36)}`, id, "REVOKED", JSON.stringify({ reason }));
  db2.prepare(`UPDATE verification_records SET status='REVOKED' WHERE certificate_id = ?`).run(id);
  return { ok: true };
}
function createZip(certificateIds, outName) {
  const db2 = getDb();
  const rows = db2.prepare(`SELECT * FROM certificates WHERE certificate_id IN (${certificateIds.map(() => "?").join(",")})`).all(...certificateIds);
  const outPath = node_path.join(workspaceRoot(), "exports", outName ?? `certificates_${Date.now()}.zip`);
  return new Promise((resolve, reject) => {
    const output = node_fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolve(outPath));
    archive.on("error", reject);
    archive.pipe(output);
    for (const r of rows) {
      const p = r["pdf_path"] || r["png_path"] || r["jpg_path"];
      if (p) archive.file(p, { name: p.split(/[/\\]/).pop() ?? "cert" });
    }
    void archive.finalize();
  });
}
const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createZip,
  generateCertificates,
  listCertificates,
  revokeCertificate
}, Symbol.toStringTag, { value: "Module" }));
function listTemplates() {
  return getDb().prepare("SELECT * FROM templates ORDER BY updated_at DESC").all();
}
function getTemplate(id) {
  return getDb().prepare("SELECT * FROM templates WHERE id = ?").get(id);
}
function saveTemplate(t) {
  const db2 = getDb();
  const id = t.id ?? `tpl_${Date.now().toString(36)}`;
  db2.prepare(
    `INSERT INTO templates (id, organization_id, name, description, width, height, orientation, background_path, config_json, version)
     VALUES (?,?,?,?,?,?,?,?,?,1)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description,
       width=excluded.width, height=excluded.height, background_path=excluded.background_path,
       config_json=excluded.config_json, version=templates.version+1, updated_at=strftime('%s','now')`
  ).run(id, "org_default", t.name, t.description ?? "", t.width, t.height, t.orientation ?? "landscape", t.background_path ?? "", t.config_json);
  db2.prepare(`INSERT INTO template_versions (id, template_id, version, config_json) VALUES (?,?,(SELECT version FROM templates WHERE id=?),?)`).run(
    `ver_${Date.now().toString(36)}`,
    id,
    id,
    t.config_json
  );
  return getTemplate(id);
}
async function secretGet(key) {
  try {
    const keytar = await import(
      /* @vite-ignore */
      "keytar"
    ).catch(() => null);
    if (keytar) return await keytar.default.getPassword("Credora-SMTP", key);
  } catch {
  }
  const vault = node_path.join(require$$0.app.getPath("userData"), "vault.json");
  if (!node_fs.existsSync(vault)) return null;
  try {
    const j = JSON.parse(node_fs.readFileSync(vault, "utf8"));
    const b64 = j[key];
    return b64 ? Buffer.from(b64, "base64").toString("utf8") : null;
  } catch {
    return null;
  }
}
async function secretSet(key, value) {
  try {
    const keytar = await import(
      /* @vite-ignore */
      "keytar"
    ).catch(() => null);
    if (keytar) {
      await keytar.default.setPassword("Credora-SMTP", key, value);
      return;
    }
  } catch {
  }
  const vault = node_path.join(require$$0.app.getPath("userData"), "vault.json");
  node_fs.mkdirSync(require$$0.app.getPath("userData"), { recursive: true });
  let j = {};
  if (node_fs.existsSync(vault)) {
    try {
      j = JSON.parse(node_fs.readFileSync(vault, "utf8"));
    } catch {
      j = {};
    }
  }
  j[key] = Buffer.from(value, "utf8").toString("base64");
  node_fs.writeFileSync(vault, JSON.stringify(j));
}
async function saveSmtpAccount(a) {
  const db2 = getDb();
  const id = a.id ?? `smtp_${Date.now().toString(36)}`;
  await secretSet(id, a.password);
  db2.prepare(`INSERT INTO smtp_accounts (id, name, host, port, username, security_type, credential_reference)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, host=excluded.host, port=excluded.port, username=excluded.username`).run(
    id,
    a.name,
    a.host,
    a.port,
    a.username,
    a.security_type ?? "STARTTLS",
    `Credora-SMTP:${id}`
  );
  return { id };
}
async function transporterFor(id) {
  const db2 = getDb();
  const acc = db2.prepare("SELECT * FROM smtp_accounts WHERE id = ?").get(id);
  if (!acc) throw new Error("SMTP_ERROR: account not found");
  const password = await secretGet(id);
  if (!password) throw new Error("SMTP_ERROR: missing credential");
  return nodemailer.createTransport({
    host: acc["host"],
    port: Number(acc["port"]),
    secure: Number(acc["port"]) === 465,
    auth: { user: acc["username"], pass: password }
  });
}
async function testSmtpConnection(id) {
  const t = await transporterFor(id);
  await t.verify();
  return { ok: true };
}
async function sendTestEmail(args) {
  const t = await transporterFor(args.smtpId);
  await t.sendMail({ from: "Credora", to: args.to, subject: "Credora test email", text: "SMTP connection successful." });
  return { ok: true };
}
async function enqueueCampaignEmails(campaignId, smtpId) {
  const db2 = getDb();
  const certs = db2.prepare("SELECT * FROM certificates WHERE campaign_id = ?").all(campaignId);
  const ins = db2.prepare(`INSERT OR IGNORE INTO email_deliveries (id, campaign_id, certificate_id, email, status) VALUES (?,?,?,?,'QUEUED')`);
  for (const c of certs) {
    const snap = JSON.parse(c["recipient_snapshot_json"] || "{}");
    ins.run(`${campaignId}_${c["certificate_id"]}`, campaignId, c["certificate_id"], snap["email"] ?? "");
  }
}
function createCampaign(args) {
  const db2 = getDb();
  const id = `cmp_${Date.now().toString(36)}`;
  db2.prepare(`INSERT INTO campaigns (id, name, template_id, status, attachment_format, recipient_count) VALUES (?,?,?,?,?,?)`).run(
    id,
    args.name,
    args.templateId,
    "GENERATING",
    args.format ?? "pdf",
    args.recipients.length
  );
  void (async () => {
    try {
      await generateCertificates({ templateId: args.templateId, recipients: args.recipients, campaignId: id, format: args.format ?? "pdf" });
      db2.prepare(`UPDATE campaigns SET status='SENDING', started_at=strftime('%s','now') WHERE id=?`).run(id);
      if (args.smtpId) await enqueueCampaignEmails(id, args.smtpId);
      db2.prepare(`UPDATE campaigns SET status='COMPLETED', completed_at=strftime('%s','now') WHERE id=?`).run(id);
    } catch {
      db2.prepare(`UPDATE campaigns SET status='FAILED' WHERE id=?`).run(id);
    }
  })();
  return { id };
}
function campaignStatus(id) {
  const db2 = getDb();
  const c = db2.prepare("SELECT * FROM campaigns WHERE id = ?").get(id);
  const deliveries = db2.prepare(`SELECT status, COUNT(*) n FROM email_deliveries WHERE campaign_id = ? GROUP BY status`).all(id);
  return { campaign: c, deliveries };
}
function pauseCampaign(id) {
  getDb().prepare(`UPDATE campaigns SET status='PAUSED' WHERE id=?`).run(id);
  return { ok: true };
}
function resumeCampaign(id) {
  getDb().prepare(`UPDATE campaigns SET status='SENDING' WHERE id=?`).run(id);
  return { ok: true };
}
function retryFailed(id) {
  getDb().prepare(`UPDATE email_deliveries SET status='QUEUED', attempts=attempts+1 WHERE campaign_id=? AND status NOT IN ('SENT','DELIVERED')`).run(id);
  return { ok: true };
}
function getSettings() {
  const rows = getDb().prepare("SELECT key, value FROM settings").all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
function setSettings(kv) {
  const db2 = getDb();
  const stmt = db2.prepare(`INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  for (const [k, v] of Object.entries(kv)) stmt.run(k, v);
  return getSettings();
}
function verifyLocal(certificateId) {
  const db2 = getDb();
  const rec = db2.prepare("SELECT * FROM verification_records WHERE certificate_id = ?").get(certificateId.trim());
  if (!rec) return { valid: false, status: "NOT_FOUND" };
  db2.prepare(`INSERT INTO certificate_events (id, certificate_id, event_type) VALUES (?,?,?)`).run(`evt_ver_${Date.now().toString(36)}`, certificateId, "VERIFIED");
  return {
    valid: rec["status"] === "VALID",
    status: rec["status"],
    recipient: rec["recipient_name"],
    course: rec["course"],
    organization: rec["organization"],
    certificateId
  };
}
function registerIpc() {
  require$$0.ipcMain.handle("certificates:generate", (_e, args) => generateCertificates(args));
  require$$0.ipcMain.handle("certificates:list", (_e, args) => listCertificates(args));
  require$$0.ipcMain.handle(
    "certificates:revoke",
    (_e, args) => revokeCertificate(args.id, args.reason)
  );
  require$$0.ipcMain.handle("certificates:verify", (_e, args) => verifyLocal(args.id));
  require$$0.ipcMain.handle("templates:list", () => listTemplates());
  require$$0.ipcMain.handle("templates:save", (_e, args) => saveTemplate(args));
  require$$0.ipcMain.handle("templates:get", (_e, id) => getTemplate(id));
  require$$0.ipcMain.handle("campaigns:create", (_e, args) => createCampaign(args));
  require$$0.ipcMain.handle("campaigns:status", (_e, id) => campaignStatus(id));
  require$$0.ipcMain.handle("campaigns:pause", (_e, id) => pauseCampaign(id));
  require$$0.ipcMain.handle("campaigns:resume", (_e, id) => resumeCampaign(id));
  require$$0.ipcMain.handle("campaigns:retryFailed", (_e, id) => retryFailed(id));
  require$$0.ipcMain.handle("email:saveAccount", (_e, args) => saveSmtpAccount(args));
  require$$0.ipcMain.handle("email:testConnection", (_e, id) => testSmtpConnection(id));
  require$$0.ipcMain.handle("email:sendTest", (_e, args) => sendTestEmail(args));
  require$$0.ipcMain.handle("files:importExcel", async () => {
    const r = await require$$0.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Excel/CSV", extensions: ["xlsx", "xls", "csv"] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    return importExcelDialog(r.filePaths[0]);
  });
  require$$0.ipcMain.handle("files:exportZip", (_e, args) => exportZip(args));
  require$$0.ipcMain.handle("files:pickBackground", async () => {
    const r = await require$$0.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    return pickBackground(r.filePaths[0]);
  });
  require$$0.ipcMain.handle("settings:get", () => getSettings());
  require$$0.ipcMain.handle("settings:set", (_e, args) => setSettings(args));
  require$$0.ipcMain.handle("verification:verifyLocal", (_e, id) => verifyLocal(id));
}
async function recoverJobs() {
  const db2 = getDb();
  const rows = db2.prepare(`SELECT id FROM campaigns WHERE status IN ('GENERATING','SENDING','VALIDATING','READY')`).all();
  for (const r of rows) {
    db2.prepare(`UPDATE campaigns SET status='PAUSED' WHERE id=?`).run(r.id);
  }
  return { recovered: rows.length };
}
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var src = { exports: {} };
var electronLogPreload = { exports: {} };
var hasRequiredElectronLogPreload;
function requireElectronLogPreload() {
  if (hasRequiredElectronLogPreload) return electronLogPreload.exports;
  hasRequiredElectronLogPreload = 1;
  (function(module2) {
    let electron = {};
    try {
      electron = require("electron");
    } catch (e) {
    }
    if (electron.ipcRenderer) {
      initialize2(electron);
    }
    {
      module2.exports = initialize2;
    }
    function initialize2({ contextBridge, ipcRenderer }) {
      if (!ipcRenderer) {
        return;
      }
      ipcRenderer.on("__ELECTRON_LOG_IPC__", (_, message) => {
        window.postMessage({ cmd: "message", ...message });
      });
      ipcRenderer.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((e) => console.error(new Error(
        `electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`
      )));
      const electronLog = {
        sendToMain(message) {
          try {
            ipcRenderer.send("__ELECTRON_LOG__", message);
          } catch (e) {
            console.error("electronLog.sendToMain ", e, "data:", message);
            ipcRenderer.send("__ELECTRON_LOG__", {
              cmd: "errorHandler",
              error: { message: e?.message, stack: e?.stack },
              errorName: "sendToMain"
            });
          }
        },
        log(...data) {
          electronLog.sendToMain({ data, level: "info" });
        }
      };
      for (const level of ["error", "warn", "info", "verbose", "debug", "silly"]) {
        electronLog[level] = (...data) => electronLog.sendToMain({
          data,
          level
        });
      }
      if (contextBridge && process.contextIsolated) {
        try {
          contextBridge.exposeInMainWorld("__electronLog", electronLog);
        } catch {
        }
      }
      if (typeof window === "object") {
        window.__electronLog = electronLog;
      } else {
        __electronLog = electronLog;
      }
    }
  })(electronLogPreload);
  return electronLogPreload.exports;
}
var renderer = { exports: {} };
var scope;
var hasRequiredScope;
function requireScope() {
  if (hasRequiredScope) return scope;
  hasRequiredScope = 1;
  scope = scopeFactory;
  function scopeFactory(logger) {
    return Object.defineProperties(scope2, {
      defaultLabel: { value: "", writable: true },
      labelPadding: { value: true, writable: true },
      maxLabelLength: { value: 0, writable: true },
      labelLength: {
        get() {
          switch (typeof scope2.labelPadding) {
            case "boolean":
              return scope2.labelPadding ? scope2.maxLabelLength : 0;
            case "number":
              return scope2.labelPadding;
            default:
              return 0;
          }
        }
      }
    });
    function scope2(label) {
      scope2.maxLabelLength = Math.max(scope2.maxLabelLength, label.length);
      const newScope = {};
      for (const level of logger.levels) {
        newScope[level] = (...d) => logger.logData(d, { level, scope: label });
      }
      newScope.log = newScope.info;
      return newScope;
    }
  }
  return scope;
}
var Buffering_1;
var hasRequiredBuffering;
function requireBuffering() {
  if (hasRequiredBuffering) return Buffering_1;
  hasRequiredBuffering = 1;
  class Buffering {
    constructor({ processMessage }) {
      this.processMessage = processMessage;
      this.buffer = [];
      this.enabled = false;
      this.begin = this.begin.bind(this);
      this.commit = this.commit.bind(this);
      this.reject = this.reject.bind(this);
    }
    addMessage(message) {
      this.buffer.push(message);
    }
    begin() {
      this.enabled = [];
    }
    commit() {
      this.enabled = false;
      this.buffer.forEach((item) => this.processMessage(item));
      this.buffer = [];
    }
    reject() {
      this.enabled = false;
      this.buffer = [];
    }
  }
  Buffering_1 = Buffering;
  return Buffering_1;
}
var Logger_1;
var hasRequiredLogger;
function requireLogger() {
  if (hasRequiredLogger) return Logger_1;
  hasRequiredLogger = 1;
  const scopeFactory = requireScope();
  const Buffering = requireBuffering();
  class Logger {
    static instances = {};
    dependencies = {};
    errorHandler = null;
    eventLogger = null;
    functions = {};
    hooks = [];
    isDev = false;
    levels = null;
    logId = null;
    scope = null;
    transports = {};
    variables = {};
    constructor({
      allowUnknownLevel = false,
      dependencies = {},
      errorHandler,
      eventLogger,
      initializeFn,
      isDev = false,
      levels = ["error", "warn", "info", "verbose", "debug", "silly"],
      logId,
      transportFactories = {},
      variables
    } = {}) {
      this.addLevel = this.addLevel.bind(this);
      this.create = this.create.bind(this);
      this.initialize = this.initialize.bind(this);
      this.logData = this.logData.bind(this);
      this.processMessage = this.processMessage.bind(this);
      this.allowUnknownLevel = allowUnknownLevel;
      this.buffering = new Buffering(this);
      this.dependencies = dependencies;
      this.initializeFn = initializeFn;
      this.isDev = isDev;
      this.levels = levels;
      this.logId = logId;
      this.scope = scopeFactory(this);
      this.transportFactories = transportFactories;
      this.variables = variables || {};
      for (const name of this.levels) {
        this.addLevel(name, false);
      }
      this.log = this.info;
      this.functions.log = this.log;
      this.errorHandler = errorHandler;
      errorHandler?.setOptions({ ...dependencies, logFn: this.error });
      this.eventLogger = eventLogger;
      eventLogger?.setOptions({ ...dependencies, logger: this });
      for (const [name, factory] of Object.entries(transportFactories)) {
        this.transports[name] = factory(this, dependencies);
      }
      Logger.instances[logId] = this;
    }
    static getInstance({ logId }) {
      return this.instances[logId] || this.instances.default;
    }
    addLevel(level, index2 = this.levels.length) {
      if (index2 !== false) {
        this.levels.splice(index2, 0, level);
      }
      this[level] = (...args) => this.logData(args, { level });
      this.functions[level] = this[level];
    }
    catchErrors(options) {
      this.processMessage(
        {
          data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
          level: "warn"
        },
        { transports: ["console"] }
      );
      return this.errorHandler.startCatching(options);
    }
    create(options) {
      if (typeof options === "string") {
        options = { logId: options };
      }
      return new Logger({
        dependencies: this.dependencies,
        errorHandler: this.errorHandler,
        initializeFn: this.initializeFn,
        isDev: this.isDev,
        transportFactories: this.transportFactories,
        variables: { ...this.variables },
        ...options
      });
    }
    compareLevels(passLevel, checkLevel, levels = this.levels) {
      const pass = levels.indexOf(passLevel);
      const check = levels.indexOf(checkLevel);
      if (check === -1 || pass === -1) {
        return true;
      }
      return check <= pass;
    }
    initialize(options = {}) {
      this.initializeFn({ logger: this, ...this.dependencies, ...options });
    }
    logData(data, options = {}) {
      if (this.buffering.enabled) {
        this.buffering.addMessage({ data, date: /* @__PURE__ */ new Date(), ...options });
      } else {
        this.processMessage({ data, ...options });
      }
    }
    processMessage(message, { transports = this.transports } = {}) {
      if (message.cmd === "errorHandler") {
        this.errorHandler.handle(message.error, {
          errorName: message.errorName,
          processType: "renderer",
          showDialog: Boolean(message.showDialog)
        });
        return;
      }
      let level = message.level;
      if (!this.allowUnknownLevel) {
        level = this.levels.includes(message.level) ? message.level : "info";
      }
      const normalizedMessage = {
        date: /* @__PURE__ */ new Date(),
        logId: this.logId,
        ...message,
        level,
        variables: {
          ...this.variables,
          ...message.variables
        }
      };
      for (const [transName, transFn] of this.transportEntries(transports)) {
        if (typeof transFn !== "function" || transFn.level === false) {
          continue;
        }
        if (!this.compareLevels(transFn.level, message.level)) {
          continue;
        }
        try {
          const transformedMsg = this.hooks.reduce((msg, hook) => {
            return msg ? hook(msg, transFn, transName) : msg;
          }, normalizedMessage);
          if (transformedMsg) {
            transFn({ ...transformedMsg, data: [...transformedMsg.data] });
          }
        } catch (e) {
          this.processInternalErrorFn(e);
        }
      }
    }
    processInternalErrorFn(_e) {
    }
    transportEntries(transports = this.transports) {
      const transportArray = Array.isArray(transports) ? transports : Object.entries(transports);
      return transportArray.map((item) => {
        switch (typeof item) {
          case "string":
            return this.transports[item] ? [item, this.transports[item]] : null;
          case "function":
            return [item.name, item];
          default:
            return Array.isArray(item) ? item : null;
        }
      }).filter(Boolean);
    }
  }
  Logger_1 = Logger;
  return Logger_1;
}
var RendererErrorHandler_1;
var hasRequiredRendererErrorHandler;
function requireRendererErrorHandler() {
  if (hasRequiredRendererErrorHandler) return RendererErrorHandler_1;
  hasRequiredRendererErrorHandler = 1;
  const consoleError = console.error;
  class RendererErrorHandler {
    logFn = null;
    onError = null;
    showDialog = false;
    preventDefault = true;
    constructor({ logFn = null } = {}) {
      this.handleError = this.handleError.bind(this);
      this.handleRejection = this.handleRejection.bind(this);
      this.startCatching = this.startCatching.bind(this);
      this.logFn = logFn;
    }
    handle(error, {
      logFn = this.logFn,
      errorName = "",
      onError = this.onError,
      showDialog = this.showDialog
    } = {}) {
      try {
        if (onError?.({ error, errorName, processType: "renderer" }) !== false) {
          logFn({ error, errorName, showDialog });
        }
      } catch {
        consoleError(error);
      }
    }
    setOptions({ logFn, onError, preventDefault, showDialog }) {
      if (typeof logFn === "function") {
        this.logFn = logFn;
      }
      if (typeof onError === "function") {
        this.onError = onError;
      }
      if (typeof preventDefault === "boolean") {
        this.preventDefault = preventDefault;
      }
      if (typeof showDialog === "boolean") {
        this.showDialog = showDialog;
      }
    }
    startCatching({ onError, showDialog } = {}) {
      if (this.isActive) {
        return;
      }
      this.isActive = true;
      this.setOptions({ onError, showDialog });
      window.addEventListener("error", (event) => {
        this.preventDefault && event.preventDefault?.();
        this.handleError(event.error || event);
      });
      window.addEventListener("unhandledrejection", (event) => {
        this.preventDefault && event.preventDefault?.();
        this.handleRejection(event.reason || event);
      });
    }
    handleError(error) {
      this.handle(error, { errorName: "Unhandled" });
    }
    handleRejection(reason) {
      const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
      this.handle(error, { errorName: "Unhandled rejection" });
    }
  }
  RendererErrorHandler_1 = RendererErrorHandler;
  return RendererErrorHandler_1;
}
var transform_1;
var hasRequiredTransform;
function requireTransform() {
  if (hasRequiredTransform) return transform_1;
  hasRequiredTransform = 1;
  transform_1 = { transform };
  function transform({
    logger,
    message,
    transport,
    initialData = message?.data || [],
    transforms = transport?.transforms
  }) {
    return transforms.reduce((data, trans) => {
      if (typeof trans === "function") {
        return trans({ data, logger, message, transport });
      }
      return data;
    }, initialData);
  }
  return transform_1;
}
var console_1$1;
var hasRequiredConsole$1;
function requireConsole$1() {
  if (hasRequiredConsole$1) return console_1$1;
  hasRequiredConsole$1 = 1;
  const { transform } = requireTransform();
  console_1$1 = consoleTransportRendererFactory;
  const consoleMethods = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  function consoleTransportRendererFactory(logger) {
    return Object.assign(transport, {
      format: "{h}:{i}:{s}.{ms}{scope} › {text}",
      transforms: [formatDataFn],
      writeFn({ message: { level, data } }) {
        const consoleLogFn = consoleMethods[level] || consoleMethods.info;
        setTimeout(() => consoleLogFn(...data));
      }
    });
    function transport(message) {
      transport.writeFn({
        message: { ...message, data: transform({ logger, message, transport }) }
      });
    }
  }
  function formatDataFn({
    data = [],
    logger = {},
    message = {},
    transport = {}
  }) {
    if (typeof transport.format === "function") {
      return transport.format({
        data,
        level: message?.level || "info",
        logger,
        message,
        transport
      });
    }
    if (typeof transport.format !== "string") {
      return data;
    }
    data.unshift(transport.format);
    if (typeof data[1] === "string" && data[1].match(/%[1cdfiOos]/)) {
      data = [`${data[0]}${data[1]}`, ...data.slice(2)];
    }
    const date = message.date || /* @__PURE__ */ new Date();
    data[0] = data[0].replace(/\{(\w+)}/g, (substring, name) => {
      switch (name) {
        case "level":
          return message.level;
        case "logId":
          return message.logId;
        case "scope": {
          const scope2 = message.scope || logger.scope?.defaultLabel;
          return scope2 ? ` (${scope2})` : "";
        }
        case "text":
          return "";
        case "y":
          return date.getFullYear().toString(10);
        case "m":
          return (date.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return date.getDate().toString(10).padStart(2, "0");
        case "h":
          return date.getHours().toString(10).padStart(2, "0");
        case "i":
          return date.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return date.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return date.getMilliseconds().toString(10).padStart(3, "0");
        case "iso":
          return date.toISOString();
        default:
          return message.variables?.[name] || substring;
      }
    }).trim();
    return data;
  }
  return console_1$1;
}
var ipc$1;
var hasRequiredIpc$1;
function requireIpc$1() {
  if (hasRequiredIpc$1) return ipc$1;
  hasRequiredIpc$1 = 1;
  const { transform } = requireTransform();
  ipc$1 = ipcTransportRendererFactory;
  const RESTRICTED_TYPES = /* @__PURE__ */ new Set([Promise, WeakMap, WeakSet]);
  function ipcTransportRendererFactory(logger) {
    return Object.assign(transport, {
      depth: 5,
      transforms: [serializeFn]
    });
    function transport(message) {
      if (!window.__electronLog) {
        logger.processMessage(
          {
            data: ["electron-log: logger isn't initialized in the main process"],
            level: "error"
          },
          { transports: ["console"] }
        );
        return;
      }
      try {
        const serialized = transform({
          initialData: message,
          logger,
          message,
          transport
        });
        __electronLog.sendToMain(serialized);
      } catch (e) {
        logger.transports.console({
          data: ["electronLog.transports.ipc", e, "data:", message.data],
          level: "error"
        });
      }
    }
  }
  function isPrimitive(value) {
    return Object(value) !== value;
  }
  function serializeFn({
    data,
    depth,
    seen = /* @__PURE__ */ new WeakSet(),
    transport = {}
  } = {}) {
    const actualDepth = depth || transport.depth || 5;
    if (seen.has(data)) {
      return "[Circular]";
    }
    if (actualDepth < 1) {
      if (isPrimitive(data)) {
        return data;
      }
      if (Array.isArray(data)) {
        return "[Array]";
      }
      return `[${typeof data}]`;
    }
    if (["function", "symbol"].includes(typeof data)) {
      return data.toString();
    }
    if (isPrimitive(data)) {
      return data;
    }
    if (RESTRICTED_TYPES.has(data.constructor)) {
      return `[${data.constructor.name}]`;
    }
    if (Array.isArray(data)) {
      return data.map((item) => serializeFn({
        data: item,
        depth: actualDepth - 1,
        seen
      }));
    }
    if (data instanceof Date) {
      return data.toISOString();
    }
    if (data instanceof Error) {
      return data.stack;
    }
    if (data instanceof Map) {
      return new Map(
        Array.from(data).map(([key, value]) => [
          serializeFn({ data: key, depth: actualDepth - 1, seen }),
          serializeFn({ data: value, depth: actualDepth - 1, seen })
        ])
      );
    }
    if (data instanceof Set) {
      return new Set(
        Array.from(data).map(
          (val) => serializeFn({ data: val, depth: actualDepth - 1, seen })
        )
      );
    }
    seen.add(data);
    return Object.fromEntries(
      Object.entries(data).map(
        ([key, value]) => [
          key,
          serializeFn({ data: value, depth: actualDepth - 1, seen })
        ]
      )
    );
  }
  return ipc$1;
}
var hasRequiredRenderer;
function requireRenderer() {
  if (hasRequiredRenderer) return renderer.exports;
  hasRequiredRenderer = 1;
  (function(module2) {
    const Logger = requireLogger();
    const RendererErrorHandler = requireRendererErrorHandler();
    const transportConsole = requireConsole$1();
    const transportIpc = requireIpc$1();
    if (typeof process === "object" && process.type === "browser") {
      console.warn(
        "electron-log/renderer is loaded in the main process. It could cause unexpected behaviour."
      );
    }
    module2.exports = createLogger();
    module2.exports.Logger = Logger;
    module2.exports.default = module2.exports;
    function createLogger() {
      const logger = new Logger({
        allowUnknownLevel: true,
        errorHandler: new RendererErrorHandler(),
        initializeFn: () => {
        },
        logId: "default",
        transportFactories: {
          console: transportConsole,
          ipc: transportIpc
        },
        variables: {
          processType: "renderer"
        }
      });
      logger.errorHandler.setOptions({
        logFn({ error, errorName, showDialog }) {
          logger.transports.console({
            data: [errorName, error].filter(Boolean),
            level: "error"
          });
          logger.transports.ipc({
            cmd: "errorHandler",
            error: {
              cause: error?.cause,
              code: error?.code,
              name: error?.name,
              message: error?.message,
              stack: error?.stack
            },
            errorName,
            logId: logger.logId,
            showDialog
          });
        }
      });
      if (typeof window === "object") {
        window.addEventListener("message", (event) => {
          const { cmd, logId, ...message } = event.data || {};
          const instance = Logger.getInstance({ logId });
          if (cmd === "message") {
            instance.processMessage(message, { transports: ["console"] });
          }
        });
      }
      return new Proxy(logger, {
        get(target, prop) {
          if (typeof target[prop] !== "undefined") {
            return target[prop];
          }
          return (...data) => logger.logData(data, { level: prop });
        }
      });
    }
  })(renderer);
  return renderer.exports;
}
var packageJson;
var hasRequiredPackageJson;
function requirePackageJson() {
  if (hasRequiredPackageJson) return packageJson;
  hasRequiredPackageJson = 1;
  const fs = require$$0$1;
  const path = require$$2;
  packageJson = {
    findAndReadPackageJson,
    tryReadJsonAt
  };
  function findAndReadPackageJson() {
    return tryReadJsonAt(getMainModulePath()) || tryReadJsonAt(extractPathFromArgs()) || tryReadJsonAt(process.resourcesPath, "app.asar") || tryReadJsonAt(process.resourcesPath, "app") || tryReadJsonAt(process.cwd()) || { name: void 0, version: void 0 };
  }
  function tryReadJsonAt(...searchPaths) {
    if (!searchPaths[0]) {
      return void 0;
    }
    try {
      const searchPath = path.join(...searchPaths);
      const fileName = findUp("package.json", searchPath);
      if (!fileName) {
        return void 0;
      }
      const json = JSON.parse(fs.readFileSync(fileName, "utf8"));
      const name = json?.productName || json?.name;
      if (!name || name.toLowerCase() === "electron") {
        return void 0;
      }
      if (name) {
        return { name, version: json?.version };
      }
      return void 0;
    } catch (e) {
      return void 0;
    }
  }
  function findUp(fileName, cwd) {
    let currentPath = cwd;
    while (true) {
      const parsedPath = path.parse(currentPath);
      const root = parsedPath.root;
      const dir = parsedPath.dir;
      if (fs.existsSync(path.join(currentPath, fileName))) {
        return path.resolve(path.join(currentPath, fileName));
      }
      if (currentPath === root) {
        return null;
      }
      currentPath = dir;
    }
  }
  function extractPathFromArgs() {
    const matchedArgs = process.argv.filter((arg) => {
      return arg.indexOf("--user-data-dir=") === 0;
    });
    if (matchedArgs.length === 0 || typeof matchedArgs[0] !== "string") {
      return null;
    }
    const userDataDir = matchedArgs[0];
    return userDataDir.replace("--user-data-dir=", "");
  }
  function getMainModulePath() {
    try {
      return require.main?.filename;
    } catch {
      return void 0;
    }
  }
  return packageJson;
}
var NodeExternalApi_1;
var hasRequiredNodeExternalApi;
function requireNodeExternalApi() {
  if (hasRequiredNodeExternalApi) return NodeExternalApi_1;
  hasRequiredNodeExternalApi = 1;
  const childProcess = require$$0$2;
  const os = require$$1;
  const path = require$$2;
  const packageJson2 = requirePackageJson();
  class NodeExternalApi {
    appName = void 0;
    appPackageJson = void 0;
    platform = process.platform;
    getAppLogPath(appName = this.getAppName()) {
      if (this.platform === "darwin") {
        return path.join(this.getSystemPathHome(), "Library/Logs", appName);
      }
      return path.join(this.getAppUserDataPath(appName), "logs");
    }
    getAppName() {
      const appName = this.appName || this.getAppPackageJson()?.name;
      if (!appName) {
        throw new Error(
          "electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()"
        );
      }
      return appName;
    }
    /**
     * @private
     * @returns {undefined}
     */
    getAppPackageJson() {
      if (typeof this.appPackageJson !== "object") {
        this.appPackageJson = packageJson2.findAndReadPackageJson();
      }
      return this.appPackageJson;
    }
    getAppUserDataPath(appName = this.getAppName()) {
      return appName ? path.join(this.getSystemPathAppData(), appName) : void 0;
    }
    getAppVersion() {
      return this.getAppPackageJson()?.version;
    }
    getElectronLogPath() {
      return this.getAppLogPath();
    }
    getMacOsVersion() {
      const release = Number(os.release().split(".")[0]);
      if (release <= 19) {
        return `10.${release - 4}`;
      }
      return release - 9;
    }
    /**
     * @protected
     * @returns {string}
     */
    getOsVersion() {
      let osName = os.type().replace("_", " ");
      let osVersion = os.release();
      if (osName === "Darwin") {
        osName = "macOS";
        osVersion = this.getMacOsVersion();
      }
      return `${osName} ${osVersion}`;
    }
    /**
     * @return {PathVariables}
     */
    getPathVariables() {
      const appName = this.getAppName();
      const appVersion = this.getAppVersion();
      const self = this;
      return {
        appData: this.getSystemPathAppData(),
        appName,
        appVersion,
        get electronDefaultDir() {
          return self.getElectronLogPath();
        },
        home: this.getSystemPathHome(),
        libraryDefaultDir: this.getAppLogPath(appName),
        libraryTemplate: this.getAppLogPath("{appName}"),
        temp: this.getSystemPathTemp(),
        userData: this.getAppUserDataPath(appName)
      };
    }
    getSystemPathAppData() {
      const home = this.getSystemPathHome();
      switch (this.platform) {
        case "darwin": {
          return path.join(home, "Library/Application Support");
        }
        case "win32": {
          return process.env.APPDATA || path.join(home, "AppData/Roaming");
        }
        default: {
          return process.env.XDG_CONFIG_HOME || path.join(home, ".config");
        }
      }
    }
    getSystemPathHome() {
      return os.homedir?.() || process.env.HOME;
    }
    getSystemPathTemp() {
      return os.tmpdir();
    }
    getVersions() {
      return {
        app: `${this.getAppName()} ${this.getAppVersion()}`,
        electron: void 0,
        os: this.getOsVersion()
      };
    }
    isDev() {
      return process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";
    }
    isElectron() {
      return Boolean(process.versions.electron);
    }
    onAppEvent(_eventName, _handler) {
    }
    onAppReady(handler) {
      handler();
    }
    onEveryWebContentsEvent(eventName, handler) {
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(channel, listener) {
    }
    onIpcInvoke(channel, listener) {
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(url, logFunction = console.error) {
      const startMap = { darwin: "open", win32: "start", linux: "xdg-open" };
      const start = startMap[process.platform] || "xdg-open";
      childProcess.exec(`${start} ${url}`, {}, (err) => {
        if (err) {
          logFunction(err);
        }
      });
    }
    setAppName(appName) {
      this.appName = appName;
    }
    setPlatform(platform2) {
      this.platform = platform2;
    }
    setPreloadFileForSessions({
      filePath,
      // eslint-disable-line no-unused-vars
      includeFutureSession = true,
      // eslint-disable-line no-unused-vars
      getSessions = () => []
      // eslint-disable-line no-unused-vars
    }) {
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(channel, message) {
    }
    showErrorBox(title, message) {
    }
  }
  NodeExternalApi_1 = NodeExternalApi;
  return NodeExternalApi_1;
}
var ElectronExternalApi_1;
var hasRequiredElectronExternalApi;
function requireElectronExternalApi() {
  if (hasRequiredElectronExternalApi) return ElectronExternalApi_1;
  hasRequiredElectronExternalApi = 1;
  const path = require$$2;
  const NodeExternalApi = requireNodeExternalApi();
  class ElectronExternalApi extends NodeExternalApi {
    /**
     * @type {typeof Electron}
     */
    electron = void 0;
    /**
     * @param {object} options
     * @param {typeof Electron} [options.electron]
     */
    constructor({ electron } = {}) {
      super();
      this.electron = electron;
    }
    getAppName() {
      let appName;
      try {
        appName = this.appName || this.electron.app?.name || this.electron.app?.getName();
      } catch {
      }
      return appName || super.getAppName();
    }
    getAppUserDataPath(appName) {
      return this.getPath("userData") || super.getAppUserDataPath(appName);
    }
    getAppVersion() {
      let appVersion;
      try {
        appVersion = this.electron.app?.getVersion();
      } catch {
      }
      return appVersion || super.getAppVersion();
    }
    getElectronLogPath() {
      return this.getPath("logs") || super.getElectronLogPath();
    }
    /**
     * @private
     * @param {any} name
     * @returns {string|undefined}
     */
    getPath(name) {
      try {
        return this.electron.app?.getPath(name);
      } catch {
        return void 0;
      }
    }
    getVersions() {
      return {
        app: `${this.getAppName()} ${this.getAppVersion()}`,
        electron: `Electron ${process.versions.electron}`,
        os: this.getOsVersion()
      };
    }
    getSystemPathAppData() {
      return this.getPath("appData") || super.getSystemPathAppData();
    }
    isDev() {
      if (this.electron.app?.isPackaged !== void 0) {
        return !this.electron.app.isPackaged;
      }
      if (typeof process.execPath === "string") {
        const execFileName = path.basename(process.execPath).toLowerCase();
        return execFileName.startsWith("electron");
      }
      return super.isDev();
    }
    onAppEvent(eventName, handler) {
      this.electron.app?.on(eventName, handler);
      return () => {
        this.electron.app?.off(eventName, handler);
      };
    }
    onAppReady(handler) {
      if (this.electron.app?.isReady()) {
        handler();
      } else if (this.electron.app?.once) {
        this.electron.app?.once("ready", handler);
      } else {
        handler();
      }
    }
    onEveryWebContentsEvent(eventName, handler) {
      this.electron.webContents?.getAllWebContents()?.forEach((webContents) => {
        webContents.on(eventName, handler);
      });
      this.electron.app?.on("web-contents-created", onWebContentsCreated);
      return () => {
        this.electron.webContents?.getAllWebContents().forEach((webContents) => {
          webContents.off(eventName, handler);
        });
        this.electron.app?.off("web-contents-created", onWebContentsCreated);
      };
      function onWebContentsCreated(_, webContents) {
        webContents.on(eventName, handler);
      }
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(channel, listener) {
      this.electron.ipcMain?.on(channel, listener);
    }
    onIpcInvoke(channel, listener) {
      this.electron.ipcMain?.handle?.(channel, listener);
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(url, logFunction = console.error) {
      this.electron.shell?.openExternal(url).catch(logFunction);
    }
    setPreloadFileForSessions({
      filePath,
      includeFutureSession = true,
      getSessions = () => [this.electron.session?.defaultSession]
    }) {
      for (const session of getSessions().filter(Boolean)) {
        setPreload(session);
      }
      if (includeFutureSession) {
        this.onAppEvent("session-created", (session) => {
          setPreload(session);
        });
      }
      function setPreload(session) {
        if (typeof session.registerPreloadScript === "function") {
          session.registerPreloadScript({
            filePath,
            id: "electron-log-preload",
            type: "frame"
          });
        } else {
          session.setPreloads([...session.getPreloads(), filePath]);
        }
      }
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(channel, message) {
      this.electron.BrowserWindow?.getAllWindows()?.forEach((wnd) => {
        if (wnd.webContents?.isDestroyed() === false && wnd.webContents?.isCrashed() === false) {
          wnd.webContents.send(channel, message);
        }
      });
    }
    showErrorBox(title, message) {
      this.electron.dialog?.showErrorBox(title, message);
    }
  }
  ElectronExternalApi_1 = ElectronExternalApi;
  return ElectronExternalApi_1;
}
var initialize;
var hasRequiredInitialize;
function requireInitialize() {
  if (hasRequiredInitialize) return initialize;
  hasRequiredInitialize = 1;
  const fs = require$$0$1;
  const os = require$$1;
  const path = require$$2;
  const preloadInitializeFn = requireElectronLogPreload();
  let preloadInitialized = false;
  let spyConsoleInitialized = false;
  initialize = {
    initialize({
      externalApi,
      getSessions,
      includeFutureSession,
      logger,
      preload = true,
      spyRendererConsole = false
    }) {
      externalApi.onAppReady(() => {
        try {
          if (preload) {
            initializePreload({
              externalApi,
              getSessions,
              includeFutureSession,
              logger,
              preloadOption: preload
            });
          }
          if (spyRendererConsole) {
            initializeSpyRendererConsole({ externalApi, logger });
          }
        } catch (err) {
          logger.warn(err);
        }
      });
    }
  };
  function initializePreload({
    externalApi,
    getSessions,
    includeFutureSession,
    logger,
    preloadOption
  }) {
    let preloadPath = typeof preloadOption === "string" ? preloadOption : void 0;
    if (preloadInitialized) {
      logger.warn(new Error("log.initialize({ preload }) already called").stack);
      return;
    }
    preloadInitialized = true;
    try {
      preloadPath = path.resolve(
        __dirname,
        "../renderer/electron-log-preload.js"
      );
    } catch {
    }
    if (!preloadPath || !fs.existsSync(preloadPath)) {
      preloadPath = path.join(
        externalApi.getAppUserDataPath() || os.tmpdir(),
        "electron-log-preload.js"
      );
      const preloadCode = `
      try {
        (${preloadInitializeFn.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
      fs.writeFileSync(preloadPath, preloadCode, "utf8");
    }
    externalApi.setPreloadFileForSessions({
      filePath: preloadPath,
      includeFutureSession,
      getSessions
    });
  }
  function initializeSpyRendererConsole({ externalApi, logger }) {
    if (spyConsoleInitialized) {
      logger.warn(
        new Error("log.initialize({ spyRendererConsole }) already called").stack
      );
      return;
    }
    spyConsoleInitialized = true;
    const levels = ["debug", "info", "warn", "error"];
    externalApi.onEveryWebContentsEvent(
      "console-message",
      (event, level, message) => {
        logger.processMessage({
          data: [message],
          level: levels[level],
          variables: { processType: "renderer" }
        });
      }
    );
  }
  return initialize;
}
var ErrorHandler_1;
var hasRequiredErrorHandler;
function requireErrorHandler() {
  if (hasRequiredErrorHandler) return ErrorHandler_1;
  hasRequiredErrorHandler = 1;
  class ErrorHandler {
    externalApi = void 0;
    isActive = false;
    logFn = void 0;
    onError = void 0;
    showDialog = true;
    constructor({
      externalApi,
      logFn = void 0,
      onError = void 0,
      showDialog = void 0
    } = {}) {
      this.createIssue = this.createIssue.bind(this);
      this.handleError = this.handleError.bind(this);
      this.handleRejection = this.handleRejection.bind(this);
      this.setOptions({ externalApi, logFn, onError, showDialog });
      this.startCatching = this.startCatching.bind(this);
      this.stopCatching = this.stopCatching.bind(this);
    }
    handle(error, {
      logFn = this.logFn,
      onError = this.onError,
      processType = "browser",
      showDialog = this.showDialog,
      errorName = ""
    } = {}) {
      error = normalizeError(error);
      try {
        if (typeof onError === "function") {
          const versions = this.externalApi?.getVersions() || {};
          const createIssue = this.createIssue;
          const result = onError({
            createIssue,
            error,
            errorName,
            processType,
            versions
          });
          if (result === false) {
            return;
          }
        }
        errorName ? logFn(errorName, error) : logFn(error);
        if (showDialog && !errorName.includes("rejection") && this.externalApi) {
          this.externalApi.showErrorBox(
            `A JavaScript error occurred in the ${processType} process`,
            error.stack
          );
        }
      } catch {
        console.error(error);
      }
    }
    setOptions({ externalApi, logFn, onError, showDialog }) {
      if (typeof externalApi === "object") {
        this.externalApi = externalApi;
      }
      if (typeof logFn === "function") {
        this.logFn = logFn;
      }
      if (typeof onError === "function") {
        this.onError = onError;
      }
      if (typeof showDialog === "boolean") {
        this.showDialog = showDialog;
      }
    }
    startCatching({ onError, showDialog } = {}) {
      if (this.isActive) {
        return;
      }
      this.isActive = true;
      this.setOptions({ onError, showDialog });
      process.on("uncaughtException", this.handleError);
      process.on("unhandledRejection", this.handleRejection);
    }
    stopCatching() {
      this.isActive = false;
      process.removeListener("uncaughtException", this.handleError);
      process.removeListener("unhandledRejection", this.handleRejection);
    }
    createIssue(pageUrl, queryParams) {
      this.externalApi?.openUrl(
        `${pageUrl}?${new URLSearchParams(queryParams).toString()}`
      );
    }
    handleError(error) {
      this.handle(error, { errorName: "Unhandled" });
    }
    handleRejection(reason) {
      const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
      this.handle(error, { errorName: "Unhandled rejection" });
    }
  }
  function normalizeError(e) {
    if (e instanceof Error) {
      return e;
    }
    if (e && typeof e === "object") {
      if (e.message) {
        return Object.assign(new Error(e.message), e);
      }
      try {
        return new Error(JSON.stringify(e));
      } catch (serErr) {
        return new Error(`Couldn't normalize error ${String(e)}: ${serErr}`);
      }
    }
    return new Error(`Can't normalize error ${String(e)}`);
  }
  ErrorHandler_1 = ErrorHandler;
  return ErrorHandler_1;
}
var EventLogger_1;
var hasRequiredEventLogger;
function requireEventLogger() {
  if (hasRequiredEventLogger) return EventLogger_1;
  hasRequiredEventLogger = 1;
  class EventLogger {
    disposers = [];
    format = "{eventSource}#{eventName}:";
    formatters = {
      app: {
        "certificate-error": ({ args }) => {
          return this.arrayToObject(args.slice(1, 4), [
            "url",
            "error",
            "certificate"
          ]);
        },
        "child-process-gone": ({ args }) => {
          return args.length === 1 ? args[0] : args;
        },
        "render-process-gone": ({ args: [webContents, details] }) => {
          return details && typeof details === "object" ? { ...details, ...this.getWebContentsDetails(webContents) } : [];
        }
      },
      webContents: {
        "console-message": ({ args: [level, message, line, sourceId] }) => {
          if (level < 3) {
            return void 0;
          }
          return { message, source: `${sourceId}:${line}` };
        },
        "did-fail-load": ({ args }) => {
          return this.arrayToObject(args, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]);
        },
        "did-fail-provisional-load": ({ args }) => {
          return this.arrayToObject(args, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]);
        },
        "plugin-crashed": ({ args }) => {
          return this.arrayToObject(args, ["name", "version"]);
        },
        "preload-error": ({ args }) => {
          return this.arrayToObject(args, ["preloadPath", "error"]);
        }
      }
    };
    events = {
      app: {
        "certificate-error": true,
        "child-process-gone": true,
        "render-process-gone": true
      },
      webContents: {
        // 'console-message': true,
        "did-fail-load": true,
        "did-fail-provisional-load": true,
        "plugin-crashed": true,
        "preload-error": true,
        "unresponsive": true
      }
    };
    externalApi = void 0;
    level = "error";
    scope = "";
    constructor(options = {}) {
      this.setOptions(options);
    }
    setOptions({
      events,
      externalApi,
      level,
      logger,
      format: format2,
      formatters,
      scope: scope2
    }) {
      if (typeof events === "object") {
        this.events = events;
      }
      if (typeof externalApi === "object") {
        this.externalApi = externalApi;
      }
      if (typeof level === "string") {
        this.level = level;
      }
      if (typeof logger === "object") {
        this.logger = logger;
      }
      if (typeof format2 === "string" || typeof format2 === "function") {
        this.format = format2;
      }
      if (typeof formatters === "object") {
        this.formatters = formatters;
      }
      if (typeof scope2 === "string") {
        this.scope = scope2;
      }
    }
    startLogging(options = {}) {
      this.setOptions(options);
      this.disposeListeners();
      for (const eventName of this.getEventNames(this.events.app)) {
        this.disposers.push(
          this.externalApi.onAppEvent(eventName, (...handlerArgs) => {
            this.handleEvent({ eventSource: "app", eventName, handlerArgs });
          })
        );
      }
      for (const eventName of this.getEventNames(this.events.webContents)) {
        this.disposers.push(
          this.externalApi.onEveryWebContentsEvent(
            eventName,
            (...handlerArgs) => {
              this.handleEvent(
                { eventSource: "webContents", eventName, handlerArgs }
              );
            }
          )
        );
      }
    }
    stopLogging() {
      this.disposeListeners();
    }
    arrayToObject(array, fieldNames) {
      const obj = {};
      fieldNames.forEach((fieldName, index2) => {
        obj[fieldName] = array[index2];
      });
      if (array.length > fieldNames.length) {
        obj.unknownArgs = array.slice(fieldNames.length);
      }
      return obj;
    }
    disposeListeners() {
      this.disposers.forEach((disposer) => disposer());
      this.disposers = [];
    }
    formatEventLog({ eventName, eventSource, handlerArgs }) {
      const [event, ...args] = handlerArgs;
      if (typeof this.format === "function") {
        return this.format({ args, event, eventName, eventSource });
      }
      const formatter = this.formatters[eventSource]?.[eventName];
      let formattedArgs = args;
      if (typeof formatter === "function") {
        formattedArgs = formatter({ args, event, eventName, eventSource });
      }
      if (!formattedArgs) {
        return void 0;
      }
      const eventData = {};
      if (Array.isArray(formattedArgs)) {
        eventData.args = formattedArgs;
      } else if (typeof formattedArgs === "object") {
        Object.assign(eventData, formattedArgs);
      }
      if (eventSource === "webContents") {
        Object.assign(eventData, this.getWebContentsDetails(event?.sender));
      }
      const title = this.format.replace("{eventSource}", eventSource === "app" ? "App" : "WebContents").replace("{eventName}", eventName);
      return [title, eventData];
    }
    getEventNames(eventMap) {
      if (!eventMap || typeof eventMap !== "object") {
        return [];
      }
      return Object.entries(eventMap).filter(([_, listen]) => listen).map(([eventName]) => eventName);
    }
    getWebContentsDetails(webContents) {
      if (!webContents?.loadURL) {
        return {};
      }
      try {
        return {
          webContents: {
            id: webContents.id,
            url: webContents.getURL()
          }
        };
      } catch {
        return {};
      }
    }
    handleEvent({ eventName, eventSource, handlerArgs }) {
      const log2 = this.formatEventLog({ eventName, eventSource, handlerArgs });
      if (log2) {
        const logFns = this.scope ? this.logger.scope(this.scope) : this.logger;
        logFns?.[this.level]?.(...log2);
      }
    }
  }
  EventLogger_1 = EventLogger;
  return EventLogger_1;
}
var format;
var hasRequiredFormat;
function requireFormat() {
  if (hasRequiredFormat) return format;
  hasRequiredFormat = 1;
  const { transform } = requireTransform();
  format = {
    concatFirstStringElements,
    formatScope,
    formatText,
    formatVariables,
    timeZoneFromOffset,
    format({ message, logger, transport, data = message?.data }) {
      switch (typeof transport.format) {
        case "string": {
          return transform({
            message,
            logger,
            transforms: [formatVariables, formatScope, formatText],
            transport,
            initialData: [transport.format, ...data]
          });
        }
        case "function": {
          return transport.format({
            data,
            level: message?.level || "info",
            logger,
            message,
            transport
          });
        }
        default: {
          return data;
        }
      }
    }
  };
  function concatFirstStringElements({ data }) {
    if (typeof data[0] !== "string" || typeof data[1] !== "string") {
      return data;
    }
    if (data[0].match(/%[1cdfiOos]/)) {
      return data;
    }
    return [`${data[0]} ${data[1]}`, ...data.slice(2)];
  }
  function timeZoneFromOffset(minutesOffset) {
    const minutesPositive = Math.abs(minutesOffset);
    const sign = minutesOffset > 0 ? "-" : "+";
    const hours = Math.floor(minutesPositive / 60).toString().padStart(2, "0");
    const minutes = (minutesPositive % 60).toString().padStart(2, "0");
    return `${sign}${hours}:${minutes}`;
  }
  function formatScope({ data, logger, message }) {
    const { defaultLabel, labelLength } = logger?.scope || {};
    const template = data[0];
    let label = message.scope;
    if (!label) {
      label = defaultLabel;
    }
    let scopeText;
    if (label === "") {
      scopeText = labelLength > 0 ? "".padEnd(labelLength + 3) : "";
    } else if (typeof label === "string") {
      scopeText = ` (${label})`.padEnd(labelLength + 3);
    } else {
      scopeText = "";
    }
    data[0] = template.replace("{scope}", scopeText);
    return data;
  }
  function formatVariables({ data, message }) {
    let template = data[0];
    if (typeof template !== "string") {
      return data;
    }
    template = template.replace("{level}]", `${message.level}]`.padEnd(6, " "));
    const date = message.date || /* @__PURE__ */ new Date();
    data[0] = template.replace(/\{(\w+)}/g, (substring, name) => {
      switch (name) {
        case "level":
          return message.level || "info";
        case "logId":
          return message.logId;
        case "y":
          return date.getFullYear().toString(10);
        case "m":
          return (date.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return date.getDate().toString(10).padStart(2, "0");
        case "h":
          return date.getHours().toString(10).padStart(2, "0");
        case "i":
          return date.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return date.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return date.getMilliseconds().toString(10).padStart(3, "0");
        case "z":
          return timeZoneFromOffset(date.getTimezoneOffset());
        case "iso":
          return date.toISOString();
        default: {
          return message.variables?.[name] || substring;
        }
      }
    }).trim();
    return data;
  }
  function formatText({ data }) {
    const template = data[0];
    if (typeof template !== "string") {
      return data;
    }
    const textTplPosition = template.lastIndexOf("{text}");
    if (textTplPosition === template.length - 6) {
      data[0] = template.replace(/\s?{text}/, "");
      if (data[0] === "") {
        data.shift();
      }
      return data;
    }
    const templatePieces = template.split("{text}");
    let result = [];
    if (templatePieces[0] !== "") {
      result.push(templatePieces[0]);
    }
    result = result.concat(data.slice(1));
    if (templatePieces[1] !== "") {
      result.push(templatePieces[1]);
    }
    return result;
  }
  return format;
}
var object = { exports: {} };
var hasRequiredObject;
function requireObject() {
  if (hasRequiredObject) return object.exports;
  hasRequiredObject = 1;
  (function(module2) {
    const util = require$$0$3;
    module2.exports = {
      serialize,
      maxDepth({ data, transport, depth = transport?.depth ?? 6 }) {
        if (!data) {
          return data;
        }
        if (depth < 1) {
          if (Array.isArray(data)) return "[array]";
          if (typeof data === "object" && data) return "[object]";
          return data;
        }
        if (Array.isArray(data)) {
          return data.map((child) => module2.exports.maxDepth({
            data: child,
            depth: depth - 1
          }));
        }
        if (typeof data !== "object") {
          return data;
        }
        if (data && typeof data.toISOString === "function") {
          return data;
        }
        if (data === null) {
          return null;
        }
        if (data instanceof Error) {
          return data;
        }
        const newJson = {};
        for (const i in data) {
          if (!Object.prototype.hasOwnProperty.call(data, i)) continue;
          newJson[i] = module2.exports.maxDepth({
            data: data[i],
            depth: depth - 1
          });
        }
        return newJson;
      },
      toJSON({ data }) {
        return JSON.parse(JSON.stringify(data, createSerializer()));
      },
      toString({ data, transport }) {
        const inspectOptions = transport?.inspectOptions || {};
        const simplifiedData = data.map((item) => {
          if (item === void 0) {
            return void 0;
          }
          try {
            const str = JSON.stringify(item, createSerializer(), "  ");
            return str === void 0 ? void 0 : JSON.parse(str);
          } catch (e) {
            return item;
          }
        });
        return util.formatWithOptions(inspectOptions, ...simplifiedData);
      }
    };
    function createSerializer(options = {}) {
      const seen = /* @__PURE__ */ new WeakSet();
      return function(key, value) {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return void 0;
          }
          seen.add(value);
        }
        return serialize(key, value, options);
      };
    }
    function serialize(key, value, options = {}) {
      const serializeMapAndSet = options?.serializeMapAndSet !== false;
      if (value instanceof Error) {
        return value.stack;
      }
      if (!value) {
        return value;
      }
      if (typeof value === "function") {
        return `[function] ${value.toString()}`;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (serializeMapAndSet && value instanceof Map && Object.fromEntries) {
        return Object.fromEntries(value);
      }
      if (serializeMapAndSet && value instanceof Set && Array.from) {
        return Array.from(value);
      }
      return value;
    }
  })(object);
  return object.exports;
}
var style;
var hasRequiredStyle;
function requireStyle() {
  if (hasRequiredStyle) return style;
  hasRequiredStyle = 1;
  style = {
    transformStyles,
    applyAnsiStyles({ data }) {
      return transformStyles(data, styleToAnsi, resetAnsiStyle);
    },
    removeStyles({ data }) {
      return transformStyles(data, () => "");
    }
  };
  const ANSI_COLORS = {
    unset: "\x1B[0m",
    black: "\x1B[30m",
    red: "\x1B[31m",
    green: "\x1B[32m",
    yellow: "\x1B[33m",
    blue: "\x1B[34m",
    magenta: "\x1B[35m",
    cyan: "\x1B[36m",
    white: "\x1B[37m",
    gray: "\x1B[90m"
  };
  function styleToAnsi(style2) {
    const color = style2.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
    return ANSI_COLORS[color] || "";
  }
  function resetAnsiStyle(string) {
    return string + ANSI_COLORS.unset;
  }
  function transformStyles(data, onStyleFound, onStyleApplied) {
    const foundStyles = {};
    return data.reduce((result, item, index2, array) => {
      if (foundStyles[index2]) {
        return result;
      }
      if (typeof item === "string") {
        let valueIndex = index2;
        let styleApplied = false;
        item = item.replace(/%[1cdfiOos]/g, (match) => {
          valueIndex += 1;
          if (match !== "%c") {
            return match;
          }
          const style2 = array[valueIndex];
          if (typeof style2 === "string") {
            foundStyles[valueIndex] = true;
            styleApplied = true;
            return onStyleFound(style2, item);
          }
          return match;
        });
        if (styleApplied && onStyleApplied) {
          item = onStyleApplied(item);
        }
      }
      result.push(item);
      return result;
    }, []);
  }
  return style;
}
var console_1;
var hasRequiredConsole;
function requireConsole() {
  if (hasRequiredConsole) return console_1;
  hasRequiredConsole = 1;
  const {
    concatFirstStringElements,
    format: format2
  } = requireFormat();
  const { maxDepth, toJSON } = requireObject();
  const {
    applyAnsiStyles,
    removeStyles
  } = requireStyle();
  const { transform } = requireTransform();
  const consoleMethods = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  console_1 = consoleTransportFactory;
  const separator = process.platform === "win32" ? ">" : "›";
  const DEFAULT_FORMAT = `%c{h}:{i}:{s}.{ms}{scope}%c ${separator} {text}`;
  Object.assign(consoleTransportFactory, {
    DEFAULT_FORMAT
  });
  function consoleTransportFactory(logger) {
    return Object.assign(transport, {
      colorMap: {
        error: "red",
        warn: "yellow",
        info: "cyan",
        verbose: "unset",
        debug: "gray",
        silly: "gray",
        default: "unset"
      },
      format: DEFAULT_FORMAT,
      level: "silly",
      transforms: [
        addTemplateColors,
        format2,
        formatStyles,
        concatFirstStringElements,
        maxDepth,
        toJSON
      ],
      useStyles: process.env.FORCE_STYLES,
      writeFn({ message }) {
        const consoleLogFn = consoleMethods[message.level] || consoleMethods.info;
        consoleLogFn(...message.data);
      }
    });
    function transport(message) {
      const data = transform({ logger, message, transport });
      transport.writeFn({
        message: { ...message, data }
      });
    }
  }
  function addTemplateColors({ data, message, transport }) {
    if (typeof transport.format !== "string" || !transport.format.includes("%c")) {
      return data;
    }
    return [
      `color:${levelToStyle(message.level, transport)}`,
      "color:unset",
      ...data
    ];
  }
  function canUseStyles(useStyleValue, level) {
    if (typeof useStyleValue === "boolean") {
      return useStyleValue;
    }
    const useStderr = level === "error" || level === "warn";
    const stream = useStderr ? process.stderr : process.stdout;
    return stream && stream.isTTY;
  }
  function formatStyles(args) {
    const { message, transport } = args;
    const useStyles = canUseStyles(transport.useStyles, message.level);
    const nextTransform = useStyles ? applyAnsiStyles : removeStyles;
    return nextTransform(args);
  }
  function levelToStyle(level, transport) {
    return transport.colorMap[level] || transport.colorMap.default;
  }
  return console_1;
}
var File_1;
var hasRequiredFile$1;
function requireFile$1() {
  if (hasRequiredFile$1) return File_1;
  hasRequiredFile$1 = 1;
  const EventEmitter = require$$0$4;
  const fs = require$$0$1;
  const os = require$$1;
  class File extends EventEmitter {
    asyncWriteQueue = [];
    bytesWritten = 0;
    hasActiveAsyncWriting = false;
    path = null;
    initialSize = void 0;
    writeOptions = null;
    writeAsync = false;
    constructor({
      path,
      writeOptions = { encoding: "utf8", flag: "a", mode: 438 },
      writeAsync = false
    }) {
      super();
      this.path = path;
      this.writeOptions = writeOptions;
      this.writeAsync = writeAsync;
    }
    get size() {
      return this.getSize();
    }
    clear() {
      try {
        fs.writeFileSync(this.path, "", {
          mode: this.writeOptions.mode,
          flag: "w"
        });
        this.reset();
        return true;
      } catch (e) {
        if (e.code === "ENOENT") {
          return true;
        }
        this.emit("error", e, this);
        return false;
      }
    }
    crop(bytesAfter) {
      try {
        const content = readFileSyncFromEnd(this.path, bytesAfter || 4096);
        this.clear();
        this.writeLine(`[log cropped]${os.EOL}${content}`);
      } catch (e) {
        this.emit(
          "error",
          new Error(`Couldn't crop file ${this.path}. ${e.message}`),
          this
        );
      }
    }
    getSize() {
      if (this.initialSize === void 0) {
        try {
          const stats = fs.statSync(this.path);
          this.initialSize = stats.size;
        } catch (e) {
          this.initialSize = 0;
        }
      }
      return this.initialSize + this.bytesWritten;
    }
    increaseBytesWrittenCounter(text) {
      this.bytesWritten += Buffer.byteLength(text, this.writeOptions.encoding);
    }
    isNull() {
      return false;
    }
    nextAsyncWrite() {
      const file2 = this;
      if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0) {
        return;
      }
      const text = this.asyncWriteQueue.join("");
      this.asyncWriteQueue = [];
      this.hasActiveAsyncWriting = true;
      fs.writeFile(this.path, text, this.writeOptions, (e) => {
        file2.hasActiveAsyncWriting = false;
        if (e) {
          file2.emit(
            "error",
            new Error(`Couldn't write to ${file2.path}. ${e.message}`),
            this
          );
        } else {
          file2.increaseBytesWrittenCounter(text);
        }
        file2.nextAsyncWrite();
      });
    }
    reset() {
      this.initialSize = void 0;
      this.bytesWritten = 0;
    }
    toString() {
      return this.path;
    }
    writeLine(text) {
      text += os.EOL;
      if (this.writeAsync) {
        this.asyncWriteQueue.push(text);
        this.nextAsyncWrite();
        return;
      }
      try {
        fs.writeFileSync(this.path, text, this.writeOptions);
        this.increaseBytesWrittenCounter(text);
      } catch (e) {
        this.emit(
          "error",
          new Error(`Couldn't write to ${this.path}. ${e.message}`),
          this
        );
      }
    }
  }
  File_1 = File;
  function readFileSyncFromEnd(filePath, bytesCount) {
    const buffer = Buffer.alloc(bytesCount);
    const stats = fs.statSync(filePath);
    const readLength = Math.min(stats.size, bytesCount);
    const offset = Math.max(0, stats.size - bytesCount);
    const fd = fs.openSync(filePath, "r");
    const totalBytes = fs.readSync(fd, buffer, 0, readLength, offset);
    fs.closeSync(fd);
    return buffer.toString("utf8", 0, totalBytes);
  }
  return File_1;
}
var NullFile_1;
var hasRequiredNullFile;
function requireNullFile() {
  if (hasRequiredNullFile) return NullFile_1;
  hasRequiredNullFile = 1;
  const File = requireFile$1();
  class NullFile extends File {
    clear() {
    }
    crop() {
    }
    getSize() {
      return 0;
    }
    isNull() {
      return true;
    }
    writeLine() {
    }
  }
  NullFile_1 = NullFile;
  return NullFile_1;
}
var FileRegistry_1;
var hasRequiredFileRegistry;
function requireFileRegistry() {
  if (hasRequiredFileRegistry) return FileRegistry_1;
  hasRequiredFileRegistry = 1;
  const EventEmitter = require$$0$4;
  const fs = require$$0$1;
  const path = require$$2;
  const File = requireFile$1();
  const NullFile = requireNullFile();
  class FileRegistry extends EventEmitter {
    store = {};
    constructor() {
      super();
      this.emitError = this.emitError.bind(this);
    }
    /**
     * Provide a File object corresponding to the filePath
     * @param {string} filePath
     * @param {WriteOptions} [writeOptions]
     * @param {boolean} [writeAsync]
     * @return {File}
     */
    provide({ filePath, writeOptions = {}, writeAsync = false }) {
      let file2;
      try {
        filePath = path.resolve(filePath);
        if (this.store[filePath]) {
          return this.store[filePath];
        }
        file2 = this.createFile({ filePath, writeOptions, writeAsync });
      } catch (e) {
        file2 = new NullFile({ path: filePath });
        this.emitError(e, file2);
      }
      file2.on("error", this.emitError);
      this.store[filePath] = file2;
      return file2;
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @param {boolean} async
     * @return {File}
     * @private
     */
    createFile({ filePath, writeOptions, writeAsync }) {
      this.testFileWriting({ filePath, writeOptions });
      return new File({ path: filePath, writeOptions, writeAsync });
    }
    /**
     * @param {Error} error
     * @param {File} file
     * @private
     */
    emitError(error, file2) {
      this.emit("error", error, file2);
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @private
     */
    testFileWriting({ filePath, writeOptions }) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, "", { flag: "a", mode: writeOptions.mode });
    }
  }
  FileRegistry_1 = FileRegistry;
  return FileRegistry_1;
}
var file;
var hasRequiredFile;
function requireFile() {
  if (hasRequiredFile) return file;
  hasRequiredFile = 1;
  const fs = require$$0$1;
  const os = require$$1;
  const path = require$$2;
  const FileRegistry = requireFileRegistry();
  const { transform } = requireTransform();
  const { removeStyles } = requireStyle();
  const {
    format: format2,
    concatFirstStringElements
  } = requireFormat();
  const { toString } = requireObject();
  file = fileTransportFactory;
  const globalRegistry = new FileRegistry();
  function fileTransportFactory(logger, { registry = globalRegistry, externalApi } = {}) {
    let pathVariables;
    if (registry.listenerCount("error") < 1) {
      registry.on("error", (e, file2) => {
        logConsole(`Can't write to ${file2}`, e);
      });
    }
    return Object.assign(transport, {
      fileName: getDefaultFileName(logger.variables.processType),
      format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
      getFile,
      inspectOptions: { depth: 5 },
      level: "silly",
      maxSize: 1024 ** 2,
      readAllLogs,
      sync: true,
      transforms: [removeStyles, format2, concatFirstStringElements, toString],
      writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
      archiveLogFn(file2) {
        const oldPath = file2.toString();
        const inf = path.parse(oldPath);
        try {
          fs.renameSync(oldPath, path.join(inf.dir, `${inf.name}.old${inf.ext}`));
        } catch (e) {
          logConsole("Could not rotate log", e);
          const quarterOfMaxSize = Math.round(transport.maxSize / 4);
          file2.crop(Math.min(quarterOfMaxSize, 256 * 1024));
        }
      },
      resolvePathFn(vars) {
        return path.join(vars.libraryDefaultDir, vars.fileName);
      },
      setAppName(name) {
        logger.dependencies.externalApi.setAppName(name);
      }
    });
    function transport(message) {
      const file2 = getFile(message);
      const needLogRotation = transport.maxSize > 0 && file2.size > transport.maxSize;
      if (needLogRotation) {
        transport.archiveLogFn(file2);
        file2.reset();
      }
      const content = transform({ logger, message, transport });
      file2.writeLine(content);
    }
    function initializeOnFirstAccess() {
      if (pathVariables) {
        return;
      }
      pathVariables = Object.create(
        Object.prototype,
        {
          ...Object.getOwnPropertyDescriptors(
            externalApi.getPathVariables()
          ),
          fileName: {
            get() {
              return transport.fileName;
            },
            enumerable: true
          }
        }
      );
      if (typeof transport.archiveLog === "function") {
        transport.archiveLogFn = transport.archiveLog;
        logConsole("archiveLog is deprecated. Use archiveLogFn instead");
      }
      if (typeof transport.resolvePath === "function") {
        transport.resolvePathFn = transport.resolvePath;
        logConsole("resolvePath is deprecated. Use resolvePathFn instead");
      }
    }
    function logConsole(message, error = null, level = "error") {
      const data = [`electron-log.transports.file: ${message}`];
      if (error) {
        data.push(error);
      }
      logger.transports.console({ data, date: /* @__PURE__ */ new Date(), level });
    }
    function getFile(msg) {
      initializeOnFirstAccess();
      const filePath = transport.resolvePathFn(pathVariables, msg);
      return registry.provide({
        filePath,
        writeAsync: !transport.sync,
        writeOptions: transport.writeOptions
      });
    }
    function readAllLogs({ fileFilter = (f) => f.endsWith(".log") } = {}) {
      initializeOnFirstAccess();
      const logsPath = path.dirname(transport.resolvePathFn(pathVariables));
      if (!fs.existsSync(logsPath)) {
        return [];
      }
      return fs.readdirSync(logsPath).map((fileName) => path.join(logsPath, fileName)).filter(fileFilter).map((logPath) => {
        try {
          return {
            path: logPath,
            lines: fs.readFileSync(logPath, "utf8").split(os.EOL)
          };
        } catch {
          return null;
        }
      }).filter(Boolean);
    }
  }
  function getDefaultFileName(processType = process.type) {
    switch (processType) {
      case "renderer":
        return "renderer.log";
      case "worker":
        return "worker.log";
      default:
        return "main.log";
    }
  }
  return file;
}
var ipc;
var hasRequiredIpc;
function requireIpc() {
  if (hasRequiredIpc) return ipc;
  hasRequiredIpc = 1;
  const { maxDepth, toJSON } = requireObject();
  const { transform } = requireTransform();
  ipc = ipcTransportFactory;
  function ipcTransportFactory(logger, { externalApi }) {
    Object.assign(transport, {
      depth: 3,
      eventId: "__ELECTRON_LOG_IPC__",
      level: logger.isDev ? "silly" : false,
      transforms: [toJSON, maxDepth]
    });
    return externalApi?.isElectron() ? transport : void 0;
    function transport(message) {
      if (message?.variables?.processType === "renderer") {
        return;
      }
      externalApi?.sendIpc(transport.eventId, {
        ...message,
        data: transform({ logger, message, transport })
      });
    }
  }
  return ipc;
}
var remote;
var hasRequiredRemote;
function requireRemote() {
  if (hasRequiredRemote) return remote;
  hasRequiredRemote = 1;
  const http = require$$0$5;
  const https = require$$1$1;
  const { transform } = requireTransform();
  const { removeStyles } = requireStyle();
  const { toJSON, maxDepth } = requireObject();
  remote = remoteTransportFactory;
  function remoteTransportFactory(logger) {
    return Object.assign(transport, {
      client: { name: "electron-application" },
      depth: 6,
      level: false,
      requestOptions: {},
      transforms: [removeStyles, toJSON, maxDepth],
      makeBodyFn({ message }) {
        return JSON.stringify({
          client: transport.client,
          data: message.data,
          date: message.date.getTime(),
          level: message.level,
          scope: message.scope,
          variables: message.variables
        });
      },
      processErrorFn({ error }) {
        logger.processMessage(
          {
            data: [`electron-log: can't POST ${transport.url}`, error],
            level: "warn"
          },
          { transports: ["console", "file"] }
        );
      },
      sendRequestFn({ serverUrl, requestOptions, body }) {
        const httpTransport = serverUrl.startsWith("https:") ? https : http;
        const request = httpTransport.request(serverUrl, {
          method: "POST",
          ...requestOptions,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": body.length,
            ...requestOptions.headers
          }
        });
        request.write(body);
        request.end();
        return request;
      }
    });
    function transport(message) {
      if (!transport.url) {
        return;
      }
      const body = transport.makeBodyFn({
        logger,
        message: { ...message, data: transform({ logger, message, transport }) },
        transport
      });
      const request = transport.sendRequestFn({
        serverUrl: transport.url,
        requestOptions: transport.requestOptions,
        body: Buffer.from(body, "utf8")
      });
      request.on("error", (error) => transport.processErrorFn({
        error,
        logger,
        message,
        request,
        transport
      }));
    }
  }
  return remote;
}
var createDefaultLogger_1;
var hasRequiredCreateDefaultLogger;
function requireCreateDefaultLogger() {
  if (hasRequiredCreateDefaultLogger) return createDefaultLogger_1;
  hasRequiredCreateDefaultLogger = 1;
  const Logger = requireLogger();
  const ErrorHandler = requireErrorHandler();
  const EventLogger = requireEventLogger();
  const transportConsole = requireConsole();
  const transportFile = requireFile();
  const transportIpc = requireIpc();
  const transportRemote = requireRemote();
  createDefaultLogger_1 = createDefaultLogger;
  function createDefaultLogger({ dependencies, initializeFn }) {
    const defaultLogger = new Logger({
      dependencies,
      errorHandler: new ErrorHandler(),
      eventLogger: new EventLogger(),
      initializeFn,
      isDev: dependencies.externalApi?.isDev(),
      logId: "default",
      transportFactories: {
        console: transportConsole,
        file: transportFile,
        ipc: transportIpc,
        remote: transportRemote
      },
      variables: {
        processType: "main"
      }
    });
    defaultLogger.default = defaultLogger;
    defaultLogger.Logger = Logger;
    defaultLogger.processInternalErrorFn = (e) => {
      defaultLogger.transports.console.writeFn({
        message: {
          data: ["Unhandled electron-log error", e],
          level: "error"
        }
      });
    };
    return defaultLogger;
  }
  return createDefaultLogger_1;
}
var main;
var hasRequiredMain;
function requireMain() {
  if (hasRequiredMain) return main;
  hasRequiredMain = 1;
  const electron = require$$0;
  const ElectronExternalApi = requireElectronExternalApi();
  const { initialize: initialize2 } = requireInitialize();
  const createDefaultLogger = requireCreateDefaultLogger();
  const externalApi = new ElectronExternalApi({ electron });
  const defaultLogger = createDefaultLogger({
    dependencies: { externalApi },
    initializeFn: initialize2
  });
  main = defaultLogger;
  externalApi.onIpc("__ELECTRON_LOG__", (_, message) => {
    if (message.scope) {
      defaultLogger.Logger.getInstance(message).scope(message.scope);
    }
    const date = new Date(message.date);
    processMessage({
      ...message,
      date: date.getTime() ? date : /* @__PURE__ */ new Date()
    });
  });
  externalApi.onIpcInvoke("__ELECTRON_LOG__", (_, { cmd = "", logId }) => {
    switch (cmd) {
      case "getOptions": {
        const logger = defaultLogger.Logger.getInstance({ logId });
        return {
          levels: logger.levels,
          logId
        };
      }
      default: {
        processMessage({ data: [`Unknown cmd '${cmd}'`], level: "error" });
        return {};
      }
    }
  });
  function processMessage(message) {
    defaultLogger.Logger.getInstance(message)?.processMessage(message);
  }
  return main;
}
var node;
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node;
  hasRequiredNode = 1;
  const NodeExternalApi = requireNodeExternalApi();
  const createDefaultLogger = requireCreateDefaultLogger();
  const externalApi = new NodeExternalApi();
  const defaultLogger = createDefaultLogger({
    dependencies: { externalApi }
  });
  node = defaultLogger;
  return node;
}
const isRenderer = typeof process === "undefined" || (process.type === "renderer" || process.type === "worker");
const isMain = typeof process === "object" && process.type === "browser";
if (isRenderer) {
  requireElectronLogPreload();
  src.exports = requireRenderer();
} else if (isMain) {
  src.exports = requireMain();
} else {
  src.exports = requireNode();
}
var srcExports = src.exports;
const log = /* @__PURE__ */ getDefaultExportFromCjs(srcExports);
let mainWindow = null;
function createWindow() {
  mainWindow = new require$$0.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: false,
    webPreferences: {
      preload: node_path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      // §6 non-negotiable
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler((details) => {
    require$$0.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(node_path.join(__dirname, "../../dist/index.html"));
  }
}
require$$0.app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.credora.desktop");
  require$$0.app.on("browser-window-created", (_, window2) => optimizer.watchWindowShortcuts(window2));
  try {
    initStorage();
    await initDatabase();
    runMigrations();
    registerIpc();
    void recoverJobs();
  } catch (err) {
    log.error("Startup init failed", err);
  }
  createWindow();
  require$$0.app.on("activate", () => {
    if (require$$0.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
require$$0.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") require$$0.app.quit();
});
if (process.defaultApp) {
  if (process.argv.length >= 2) require$$0.app.setAsDefaultProtocolClient("credora", process.execPath, [process.argv[1]]);
} else {
  require$$0.app.setAsDefaultProtocolClient("credora");
}
function notify(title, body) {
  if (require$$0.Notification.isSupported()) new require$$0.Notification({ title, body }).show();
}
exports.notify = notify;
