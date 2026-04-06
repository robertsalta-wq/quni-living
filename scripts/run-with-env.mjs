/**
 * Load `.env.vercel` (from `vercel env pull`) then `.env.local` (overrides).
 * Use for commands that do not read those files themselves, e.g. `vercel dev`.
 */
import dotenv from 'dotenv'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function load(rel, override) {
  const p = path.join(root, rel)
  if (fs.existsSync(p)) dotenv.config({ path: p, override })
}

load('.env.vercel', false)
load('.env.local', true)

const [cmd, ...args] = process.argv.slice(2)
if (!cmd) {
  console.error('Usage: node scripts/run-with-env.mjs <command> [args...]')
  console.error('Example: node scripts/run-with-env.mjs npx vercel dev')
  process.exit(1)
}

const child = spawn(cmd, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  cwd: root,
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
