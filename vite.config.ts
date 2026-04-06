import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Merge: `.env.vercel` (vercel env pull) first, then Vite’s usual files (`.env`, `.env.local`, …) so overrides win.
export default defineConfig(({ mode }) => {
  const root = process.cwd()
  const vercelPath = path.join(root, '.env.vercel')
  const fromPull = fs.existsSync(vercelPath)
    ? dotenv.parse(fs.readFileSync(vercelPath))
    : {}
  const fromViteFiles = loadEnv(mode, root, '')
  const merged = { ...fromPull, ...fromViteFiles }

  const define: Record<string, string> = {}
  for (const [key, value] of Object.entries(merged)) {
    if (key.startsWith('VITE_')) {
      define[`import.meta.env.${key}`] = JSON.stringify(value ?? '')
    }
  }

  return {
    base: process.env.CAPACITOR_BUILD === 'true' ? './' : '/',
    plugins: [react()],
    define,
    server: {
      port: 5173,
      strictPort: true,
      host: 'localhost',
    },
  }
})
