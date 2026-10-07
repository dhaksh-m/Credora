import { app, BrowserWindow, shell, Notification } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpc } from './ipc/index.js'
import { initDatabase, runMigrations } from './services/database/index.js'
import { initStorage } from './services/storage/index.js'
import { recoverJobs } from './services/jobs.js'
import log from 'electron-log'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true, // §6 non-negotiable
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.credora.desktop')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  try {
    initStorage() // %APPDATA%/Credora via app.getPath — §8, never install dir
    await initDatabase()
    runMigrations()
    registerIpc()
    void recoverJobs() // §45/§77 crash recovery: resume safe ops, never blind-resend
  } catch (err) {
    log.error('Startup init failed', err)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Custom protocol credora://verify/<id> — §50
if (process.defaultApp) {
  if (process.argv.length >= 2) app.setAsDefaultProtocolClient('credora', process.execPath, [process.argv[1]])
} else {
  app.setAsDefaultProtocolClient('credora')
}

export function notify(title: string, body: string): void {
  if (Notification.isSupported()) new Notification({ title, body }).show()
}
