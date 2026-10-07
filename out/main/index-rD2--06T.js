"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const XLSX = require("xlsx");
const node_fs = require("node:fs");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const XLSX__namespace = /* @__PURE__ */ _interopNamespaceDefault(XLSX);
function parseExcel(filePath) {
  const buf = node_fs.readFileSync(filePath);
  const wb = XLSX__namespace.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX__namespace.utils.sheet_to_json(ws, { defval: "" });
  return json.map((r) => {
    const lower = {};
    for (const [k, v] of Object.entries(r)) lower[k.trim().toLowerCase()] = String(v ?? "");
    return { name: lower["name"] ?? "", email: lower["email"] ?? "", ...lower };
  });
}
exports.parseExcel = parseExcel;
