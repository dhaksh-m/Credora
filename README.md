# Credora — Create. Issue. Verify.

Desktop Certificate Lifecycle Platform for Windows 10/11.

## Quickstart

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run dist
```

Output:

```text
release/
├── Credora-Setup-1.0.0.exe
├── Credora-Portable-1.0.0.exe
└── latest.yml
```

## Stack

Electron + React + TypeScript + SQLite (better-sqlite3) + Fabric.js + Sharp + PDFKit + Nodemailer + SheetJS + Archiver + QRCode.

See `Credora_Desktop_EXE_Specification.md` (spec v1.0, 141 sections) for full product definition.
Offline-first. User data lives under `%APPDATA%\Credora\` via `app.getPath('userData')`.
SMTP secrets live in Windows Credential Manager via `keytar`, never in SQLite plaintext.

## Project layout

```text
electron/       main, preload, ipc, services, security
src/            React UI (pages, components, stores)
packages/       certificate-engine, email-engine, excel-engine, validation, shared-types
database/       schema, migrations, seed
assets/         icons, fonts, templates
build/          icon.ico, installer assets
scripts/        build/package/release helpers
```
