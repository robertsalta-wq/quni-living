import https from 'node:https'
import zlib from 'node:zlib'

const DIGEST = 'sha256:b8548113edb08452a41d4ec337ce8202961203d8390ee60187f545ca1418cbe0'

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
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }))
      })
      .on('error', reject)
  })
}

function parseTarPaths(buf) {
  const paths = []
  let offset = 0
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512)
    if (header.every((b) => b === 0)) break
    const name = header.subarray(0, 100).toString('utf8').replace(/\0/g, '').trim()
    const sizeOct = header.subarray(124, 136).toString('utf8').replace(/\0/g, '').trim()
    const size = parseInt(sizeOct, 8) || 0
    if (name) paths.push(name)
    offset += 512 + Math.ceil(size / 512) * 512
  }
  return paths
}

const tokRes = await get(
  'https://auth.docker.io/token?service=registry.docker.io&scope=repository:lankalana/libreoffice-headless:pull',
)
const token = JSON.parse(tokRes.body.toString()).token
const auth = { Authorization: `Bearer ${token}` }

const manRes = await get(`https://index.docker.io/v2/lankalana/libreoffice-headless/manifests/${DIGEST}`, {
  ...auth,
  Accept: 'application/vnd.docker.distribution.manifest.v2+json',
})
const manifest = JSON.parse(manRes.body.toString())
console.log('layers', manifest.layers?.length)

const hits = []
for (const layer of manifest.layers || []) {
  const blobRes = await get(
    `https://index.docker.io/v2/lankalana/libreoffice-headless/blobs/${layer.digest}`,
    auth,
  )
  let raw = blobRes.body
  if (layer.mediaType?.includes('gzip') || raw[0] === 0x1f && raw[1] === 0x8b) {
    raw = zlib.gunzipSync(raw)
  }
  const paths = parseTarPaths(raw)
  for (const p of paths) {
    if (/soffice|libreoffice/i.test(p)) hits.push(p)
  }
}
console.log('soffice-related paths:', [...new Set(hits)].slice(0, 50))
console.log('total hits', hits.length)
