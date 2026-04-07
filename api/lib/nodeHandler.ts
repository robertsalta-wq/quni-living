/// <reference types="node" />
import type { IncomingMessage } from 'node:http'

/**
 * Read a header from Node `IncomingMessage` headers (keys are lowercased).
 * Pass `name` in lowercase, e.g. `'authorization'`, `'x-internal-doc-flow-secret'`.
 */
export function headerString(headers: IncomingMessage['headers'], name: string): string {
  const v = headers[name]
  if (v == null) return ''
  return Array.isArray(v) ? String(v[0] ?? '') : String(v)
}

type JsonBodyReq = IncomingMessage & { body?: unknown }

/** Vercel may set `req.body`; otherwise read the IncomingMessage stream (Node.js). */
export async function readJsonBody(req: JsonBodyReq): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      const s = req.body.toString('utf8')
      return s.trim() ? JSON.parse(s) : {}
    }
    if (typeof req.body === 'string') {
      return req.body.trim() ? JSON.parse(req.body) : {}
    }
    if (typeof req.body === 'object') {
      return req.body
    }
  }
  const raw = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
  if (!raw || !raw.trim()) return {}
  return JSON.parse(raw)
}
