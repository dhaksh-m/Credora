"use strict";
const electron = require("electron");
const api = {
  certificates: {
    generate: (args) => electron.ipcRenderer.invoke("certificates:generate", args),
    list: (args) => electron.ipcRenderer.invoke("certificates:list", args),
    revoke: (args) => electron.ipcRenderer.invoke("certificates:revoke", args),
    verify: (args) => electron.ipcRenderer.invoke("certificates:verify", args)
  },
  templates: {
    list: () => electron.ipcRenderer.invoke("templates:list"),
    save: (args) => electron.ipcRenderer.invoke("templates:save", args),
    get: (id) => electron.ipcRenderer.invoke("templates:get", id)
  },
  campaigns: {
    create: (args) => electron.ipcRenderer.invoke("campaigns:create", args),
    status: (id) => electron.ipcRenderer.invoke("campaigns:status", id),
    pause: (id) => electron.ipcRenderer.invoke("campaigns:pause", id),
    resume: (id) => electron.ipcRenderer.invoke("campaigns:resume", id),
    retryFailed: (id) => electron.ipcRenderer.invoke("campaigns:retryFailed", id)
  },
  email: {
    saveAccount: (args) => electron.ipcRenderer.invoke("email:saveAccount", args),
    testConnection: (id) => electron.ipcRenderer.invoke("email:testConnection", id),
    sendTest: (args) => electron.ipcRenderer.invoke("email:sendTest", args)
  },
  files: {
    importExcel: () => electron.ipcRenderer.invoke("files:importExcel"),
    exportZip: (args) => electron.ipcRenderer.invoke("files:exportZip", args),
    pickBackground: () => electron.ipcRenderer.invoke("files:pickBackground")
  },
  settings: {
    get: () => electron.ipcRenderer.invoke("settings:get"),
    set: (args) => electron.ipcRenderer.invoke("settings:set", args)
  },
  verification: {
    verifyLocal: (id) => electron.ipcRenderer.invoke("verification:verifyLocal", id)
  }
};
electron.contextBridge.exposeInMainWorld("credora", api);
