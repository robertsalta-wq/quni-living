/**
 * Post-build prerender for guide routes. Skipped for Capacitor (relative base, no static guide URLs).
 * Uses Vite ssrLoadModule so TSX/?raw imports resolve like the client build.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

if (process.env.CAPACITOR_BUILD === 'true') {
  console.log('prerender-guides: skipped (Capacitor build)')
  process.exit(0)
}

const distDir = path.join(root, 'dist')

const vite = await createServer({
  root,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
})

try {
  const { prerenderGuides } = await vite.ssrLoadModule('/src/prerender/entry-server.tsx')
  await prerenderGuides(distDir)
} finally {
  await vite.close()
}
