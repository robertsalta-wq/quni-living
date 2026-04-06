/**
 * Production build with Vite base './' so bundled assets load in Capacitor WebView.
 */
import { spawnSync } from 'node:child_process'

const env = { ...process.env, CAPACITOR_BUILD: 'true' }
const shell = process.platform === 'win32'
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell, env })
  if (r.error) throw r.error
  process.exit(r.status ?? 1)
}

const tsc = spawnSync('npx', ['tsc', '-b'], { stdio: 'inherit', shell, env })
if (tsc.status !== 0) process.exit(tsc.status ?? 1)
run('npx', ['vite', 'build'])
