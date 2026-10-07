import { ipcMain, dialog, app } from 'electron'
import { generateCertificates, listCertificates, revokeCertificate } from '../../packages/certificate-engine/src/index.js'
import { listTemplates, saveTemplate, getTemplate } from '../services/database/templates.js'
import { createCampaign, campaignStatus, pauseCampaign, resumeCampaign, retryFailed } from '../services/campaigns.js'
import { saveSmtpAccount, testSmtpConnection, sendTestEmail } from '../../packages/email-engine/src/index.js'
import { importExcelDialog, exportZip, pickBackground } from '../services/storage/index.js'
import { getSettings, setSettings } from '../services/database/settings.js'
import { verifyLocal } from '../services/verification/index.js'

export function registerIpc(): void {
  ipcMain.handle('certificates:generate', (_e, args) => generateCertificates(args as never))
  ipcMain.handle('certificates:list', (_e, args) => listCertificates(args as never))
  ipcMain.handle('certificates:revoke', (_e, args) =>
    revokeCertificate((args as { id: string; reason: string }).id, (args as { reason: string }).reason)
  )
  ipcMain.handle('certificates:verify', (_e, args) => verifyLocal((args as { id: string }).id))
  ipcMain.handle('templates:list', () => listTemplates())
  ipcMain.handle('templates:save', (_e, args) => saveTemplate(args as never))
  ipcMain.handle('templates:get', (_e, id) => getTemplate(id as string))
  ipcMain.handle('campaigns:create', (_e, args) => createCampaign(args as never))
  ipcMain.handle('campaigns:status', (_e, id) => campaignStatus(id as string))
  ipcMain.handle('campaigns:pause', (_e, id) => pauseCampaign(id as string))
  ipcMain.handle('campaigns:resume', (_e, id) => resumeCampaign(id as string))
  ipcMain.handle('campaigns:retryFailed', (_e, id) => retryFailed(id as string))
  ipcMain.handle('email:saveAccount', (_e, args) => saveSmtpAccount(args as never))
  ipcMain.handle('email:testConnection', (_e, id) => testSmtpConnection(id as string))
  ipcMain.handle('email:sendTest', (_e, args) => sendTestEmail(args as never))
  ipcMain.handle('files:importExcel', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Excel/CSV', extensions: ['xlsx', 'xls', 'csv'] }] })
    if (r.canceled || !r.filePaths[0]) return null
    return importExcelDialog(r.filePaths[0])
  })
  ipcMain.handle('files:exportZip', (_e, args) => exportZip(args as never))
  ipcMain.handle('files:pickBackground', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }] })
    if (r.canceled || !r.filePaths[0]) return null
    return pickBackground(r.filePaths[0])
  })
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, args) => setSettings(args as Record<string, string>))
  ipcMain.handle('verification:verifyLocal', (_e, id) => verifyLocal(id as string))
  void app
}
