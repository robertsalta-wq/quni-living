/**
 * Extract libreoffice/program from pinned distroless lankalana image layer (registry blob).
 * The 7.6.7.2 digest image ships LO instdir only — no libc; run soffice.bin on the host.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', '..')

/** @type {Record<string, string>} digest → docker hub repo */
export const LO_PINNED_LAYER_REPOS = {
  'sha256:b8548113edb08452a41d4ec337ce8202961203d8390ee60187f545ca1418cbe0':
    'lankalana/libreoffice-headless',
}

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location, headers).then(resolve, reject)
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

function extractTarToDir(tarBuf, destDir) {
  let offset = 0
  while (offset + 512 <= tarBuf.length) {
    const header = tarBuf.subarray(offset, offset + 512)
    if (header.every((b) => b === 0)) break
    const name = header.subarray(0, 100).toString('utf8').replace(/\0/g, '').trim()
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0/g, '').trim()
    const fullName = (prefix ? `${prefix}/${name}` : name).replace(/^\.\//, '')
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0/g, ''), 8) || 0
    const type = header[156]
    offset += 512
    const content = tarBuf.subarray(offset, offset + size)
    offset += Math.ceil(size / 512) * 512
    if (!fullName || fullName === '.' || type === 53 /* directory */) continue
    const outPath = path.join(destDir, fullName)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, content)
    if (process.platform !== 'win32') {
      const mode = parseInt(header.subarray(100, 108).toString('utf8').replace(/\0/g, ''), 8)
      if (mode & 0o111) fs.chmodSync(outPath, mode & 0o777)
    }
  }
}

/**
 * @param {string} digestKey e.g. sha256:b854...
 * @returns {Promise<string>} absolute path to libreoffice/program
 */
export async function ensureLoProgramDirFromRegistry(digestKey) {
  const repo = LO_PINNED_LAYER_REPOS[digestKey]
  if (!repo) {
    throw new Error(`No registry layer mapping for digest ${digestKey}`)
  }
  const cacheRoot = path.join(root, 'tmp', 'lo-pinned', digestKey.replace('sha256:', ''))
  const programDir = path.join(cacheRoot, 'libreoffice', 'program')
  const sofficeBin = path.join(programDir, 'soffice.bin')
  if (fs.existsSync(sofficeBin)) return programDir

  const tok = JSON.parse(
    (
      await get(
        `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`,
      )
    ).toString(),
  ).token
  const auth = { Authorization: `Bearer ${tok}` }
  const manifest = JSON.parse(
    (
      await get(`https://index.docker.io/v2/${repo}/manifests/${digestKey}`, {
        ...auth,
        Accept: 'application/vnd.docker.distribution.manifest.v2+json',
      })
    ).toString(),
  )
  const layer = manifest.layers?.[0]
  if (!layer?.digest) throw new Error(`No layers in manifest for ${digestKey}`)

  let raw = await get(`https://index.docker.io/v2/${repo}/blobs/${layer.digest}`, auth)
  if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw)

  fs.mkdirSync(cacheRoot, { recursive: true })
  extractTarToDir(raw, cacheRoot)
  if (!fs.existsSync(sofficeBin)) {
    throw new Error(`Extracted layer missing ${sofficeBin}`)
  }
  return programDir
}

export function digestKeyFromImageRef(imageRef) {
  if (imageRef.includes('@sha256:')) return imageRef.slice(imageRef.indexOf('@') + 1)
  return null
}

export function sha256File(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}
