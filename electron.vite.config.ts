import { defineConfig, defineViteConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const external = ['electron', 'keytar', 'sharp', 'sql.js', 'nodemailer', 'qrcode', 'pdfkit', 'archiver', 'xlsx']

export default defineConfig({
  main: defineViteConfig({
    build: {
      outDir: resolve(here, 'out/main'),
      lib: { entry: resolve(here, 'electron/main.ts'), formats: ['cjs'], fileName: () => 'index.js' },
      rollupOptions: { external }
    }
  }),
  preload: defineViteConfig({
    build: {
      outDir: resolve(here, 'out/preload'),
      lib: { entry: resolve(here, 'electron/preload.ts'), formats: ['cjs'], fileName: () => 'index.js' }
    }
  }),
  renderer: {
    root: resolve(here, 'src'),
    build: {
      outDir: resolve(here, 'dist'),
      emptyOutDir: true,
      rollupOptions: { input: resolve(here, 'src/index.html') }
    },
    plugins: [react()]
  }
})
