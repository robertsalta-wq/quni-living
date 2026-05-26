import type { ServerResponse } from 'node:http'

type JsonResponse = ServerResponse & {
  status: (code: number) => JsonResponse
  json: (body: unknown) => void
}

export function setCorsHeaders(res: ServerResponse, origin: string) {
  const allowOrigin = origin || '*'
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Conversation-Notify-Secret')
  res.setHeader('Access-Control-Max-Age', '86400')
}

export function corsJson(
  res: ServerResponse,
  body: unknown,
  status = 200,
  origin: string,
) {
  const r = res as JsonResponse
  setCorsHeaders(r, origin)
  r.setHeader('Content-Type', 'application/json')
  return r.status(status).json(body)
}

export function handleOptions(res: ServerResponse, origin: string) {
  const r = res as JsonResponse
  setCorsHeaders(r, origin)
  return r.status(204).end()
}
