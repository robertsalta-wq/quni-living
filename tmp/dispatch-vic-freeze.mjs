/**
 * Dispatch vic-form1-freeze-once workflow, poll until done, download artifact.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'tmp', 'vic-form1-freeze-artifact')

function getToken() {
  const cred = execFileSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  })
  const token = cred.match(/password=(.+)/)?.[1]?.trim()
  if (!token) throw new Error('No git credential token for github.com')
  return token
}

function request(method, urlPath, body) {
  const token = getToken()
  const bodyStr = body == null ? null : JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: urlPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'quni-vic-freeze',
          ...(bodyStr
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
            : {}),
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8')
          let parsed = {}
          try {
            parsed = raw ? JSON.parse(raw) : {}
          } catch {
            parsed = { raw }
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed })
        })
      },
    )
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

function getFollow(url, binary = false) {
  const token = getToken()
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const isGitHubApi = u.hostname === 'api.github.com'
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: isGitHubApi
        ? {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'quni-vic-freeze',
          }
        : {},
    }
    https
      .get(opts, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return getFollow(res.headers.location, binary).then(resolve, reject)
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          let buf = Buffer.concat(chunks)
          if (res.headers['content-encoding'] === 'gzip') buf = zlib.gunzipSync(buf)
          resolve(binary ? buf : buf.toString('utf8'))
        })
      })
      .on('error', reject)
  })
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const dispatch = await request(
    'POST',
    '/repos/robertsalta-wq/quni-living/actions/workflows/vic-form1-freeze-once.yml/dispatches',
    { ref: 'vic/form1-blank-freeze' },
  )
  console.log('dispatch status', dispatch.status)
  if (dispatch.status !== 204) {
    console.error(JSON.stringify(dispatch.body, null, 2))
    process.exit(1)
  }

  await sleep(15000)

  let run = null
  for (let i = 0; i < 90; i++) {
    const runs = await request(
      'GET',
      '/repos/robertsalta-wq/quni-living/actions/workflows/vic-form1-freeze-once.yml/runs?per_page=5',
    )
    run = runs.body.workflow_runs?.find((r) => r.head_sha?.startsWith('a98a24f')) ?? runs.body.workflow_runs?.[0]
    if (!run) throw new Error('No workflow run found')
    console.log(`poll ${i + 1}: run ${run.id} status=${run.status} conclusion=${run.conclusion ?? 'pending'}`)
    if (run.status === 'completed') break
    await sleep(30000)
  }

  if (run.status !== 'completed') {
    console.error('Workflow did not complete in time')
    process.exit(1)
  }

  console.log('final', run.html_url, run.conclusion)
  if (run.conclusion !== 'success') {
    const jobs = await request('GET', `/repos/robertsalta-wq/quni-living/actions/runs/${run.id}/jobs`)
    const job = jobs.body.jobs?.[0]
    if (job) {
      const logUrl = `https://api.github.com/repos/robertsalta-wq/quni-living/actions/jobs/${job.id}/logs`
      const log = await getFollow(logUrl)
      const tail = log.split('\n').slice(-60).join('\n')
      console.error(tail)
    }
    process.exit(1)
  }

  const arts = await request('GET', `/repos/robertsalta-wq/quni-living/actions/runs/${run.id}/artifacts`)
  const art = arts.body.artifacts?.find((a) => a.name === 'vic-form1-freeze')
  if (!art) throw new Error('vic-form1-freeze artifact not found')

  const zipBuf = await getFollow(art.archive_download_url, true)
  fs.mkdirSync(outDir, { recursive: true })
  const zipPath = path.join(outDir, 'vic-form1-freeze.zip')
  fs.writeFileSync(zipPath, zipBuf)
  console.log('saved zip', zipPath)

  const { execFileSync: exec } = await import('node:child_process')
  try {
    exec('tar', ['-xf', zipPath, '-C', outDir], { stdio: 'inherit' })
  } catch {
    exec(
      'powershell',
      ['-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${outDir}' -Force`],
      { stdio: 'inherit' },
    )
  }
  console.log('extracted to', outDir)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
