/**
 * Resize a splash master into Capacitor legacy drawable-port-* / drawable-land-* buckets.
 *
 * Default master: docs/brand/quni-logo-export-phase2/android/quni-splash-cream.png
 * (or android/app-icon-source/quni-splash-cream.png after copy)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const BUCKETS = [
  { folder: 'drawable-port-mdpi', width: 320, height: 480 },
  { folder: 'drawable-port-hdpi', width: 480, height: 800 },
  { folder: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { folder: 'drawable-port-xxhdpi', width: 1080, height: 1920 },
  { folder: 'drawable-port-xxxhdpi', width: 1440, height: 2560 },
  { folder: 'drawable-land-mdpi', width: 480, height: 320 },
  { folder: 'drawable-land-hdpi', width: 800, height: 480 },
  { folder: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { folder: 'drawable-land-xxhdpi', width: 1920, height: 1080 },
  { folder: 'drawable-land-xxxhdpi', width: 2560, height: 1440 },
]

const DEFAULT_MASTER = path.join(
  repoRoot,
  'android',
  'app-icon-source',
  'quni-splash-cream.png',
)

function parseMaster(argv) {
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--master' && argv[i + 1]) {
      return path.resolve(process.cwd(), argv[++i])
    }
  }
  return DEFAULT_MASTER
}

async function main() {
  const master = parseMaster(process.argv)
  if (!fs.existsSync(master)) {
    console.error(`Missing splash master:\n  ${master}`)
    process.exit(1)
  }

  const sharp = (await import('sharp')).default
  const buf = await fs.promises.readFile(master)
  const resDir = path.join(repoRoot, 'android', 'app', 'src', 'main', 'res')

  for (const { folder, width, height } of BUCKETS) {
    const dir = path.join(resDir, folder)
    await fs.promises.mkdir(dir, { recursive: true })
    await sharp(buf)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .png()
      .toFile(path.join(dir, 'splash.png'))
  }

  console.log(`Wrote ${BUCKETS.length} splash.png buckets from:\n  ${master}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
