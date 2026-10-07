import { contextBridge, ipcRenderer } from 'electron'

// §6: only expose whitelisted, secure IPC — never window.require('fs')
const api = {
  certificates: {
    generate: (args: unknown) => ipcRenderer.invoke('certificates:generate', args),
    list: (args: unknown) => ipcRenderer.invoke('certificates:list', args),
    revoke: (args: unknown) => ipcRenderer.invoke('certificates:revoke', args),
    verify: (args: unknown) => ipcRenderer.invoke('certificates:verify', args)
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    save: (args: unknown) => ipcRenderer.invoke('templates:save', args),
    get: (id: string) => ipcRenderer.invoke('templates:get', id)
  },
  campaigns: {
    create: (args: unknown) => ipcRenderer.invoke('campaigns:create', args),
    status: (id: string) => ipcRenderer.invoke('campaigns:status', id),
    pause: (id: string) => ipcRenderer.invoke('campaigns:pause', id),
    resume: (id: string) => ipcRenderer.invoke('campaigns:resume', id),
    retryFailed: (id: string) => ipcRenderer.invoke('campaigns:retryFailed', id)
  },
  email: {
    saveAccount: (args: unknown) => ipcRenderer.invoke('email:saveAccount', args),
    testConnection: (id: string) => ipcRenderer.invoke('email:testConnection', id),
    sendTest: (args: unknown) => ipcRenderer.invoke('email:sendTest', args)
  },
  files: {
    importExcel: () => ipcRenderer.invoke('files:importExcel'),
    exportZip: (args: unknown) => ipcRenderer.invoke('files:exportZip', args),
    pickBackground: () => ipcRenderer.invoke('files:pickBackground')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (args: unknown) => ipcRenderer.invoke('settings:set', args)
  },
  verification: {
    verifyLocal: (id: string) => ipcRenderer.invoke('verification:verifyLocal', id)
  }
}

contextBridge.exposeInMainWorld('credora', api)
export type CredoraApi = typeof api
