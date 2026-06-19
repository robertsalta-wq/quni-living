import { execFileSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function getToken() {
  const cred = execFileSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  })
  return cred.match(/password=(.+)/)?.[1]?.trim()
}

function get(url, token, follow = true) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const headers =
      follow && token
        ? {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'quni-vic-freeze',
          }
        : {}
    https
      .get(u, { headers }, (res) => {
        if (follow && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location, null, false).then(resolve, reject)
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

function api(p) {
  return get(`https://api.github.com${p}`, getToken()).then((b) => JSON.parse(b.toString()))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const runId = process.argv[2] ? Number(process.argv[2]) : null

let run
if (runId) {
  run = await api(`/repos/robertsalta-wq/quni-living/actions/runs/${runId}`)
} else {
  for (let i = 0; i < 40; i++) {
    const runs = await api(
      '/repos/robertsalta-wq/quni-living/actions/workflows/vic-form1-freeze-once.yml/runs?per_page=1',
    )
    run = runs.workflow_runs[0]
    console.log(new Date().toISOString(), run.id, run.status, run.conclusion || '')
    if (run.status === 'completed') break
    await sleep(30000)
  }
}

console.log('final', run.id, run.status, run.conclusion, run.html_url)

if (run.conclusion !== 'success') {
  const jobs = await api(`/repos/robertsalta-wq/quni-living/actions/runs/${run.id}/jobs`)
  const job = jobs.jobs[0]
  const logBuf = await get(
    `https://api.github.com/repos/robertsalta-wq/quni-living/actions/jobs/${job.id}/logs`,
    getToken(),
  )
  let text
  try {
    text = zlib.gunzipSync(logBuf).toString('utf8')
  } catch {
    text = logBuf.toString('utf8')
  }
  console.log(
    text
      .split('\n')
      .filter((l) =>
        /vic-form1-freeze|Error|error|failed|layout|phrase|pageCount|blankSha|Resolved LO|renderDiff|Freeze complete|provenance|soffice not found/i.test(
          l,
        ),
      )
      .slice(-100)
      .join('\n'),
  )
  process.exit(1)
}

const arts = await api(`/repos/robertsalta-wq/quni-living/actions/runs/${run.id}/artifacts`)
const art = arts.artifacts.find((a) => a.name === 'vic-form1-freeze')
const zipBuf = await get(art.archive_download_url, getToken())
const outDir = path.join(root, 'tmp', 'vic-form1-freeze-artifact')
fs.mkdirSync(outDir, { recursive: true })
const zipPath = path.join(outDir, 'artifact.zip')
fs.writeFileSync(zipPath, zipBuf)
execSync(
  `powershell -NoProfile -Command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${outDir}'"`,
  { stdio: 'inherit' },
)
const provPath = path.join(outDir, 'docs', 'vic', 'form-1-blank-provenance.json')
console.log('=== PROVENANCE ===')
console.log(fs.readFileSync(provPath, 'utf8'))
