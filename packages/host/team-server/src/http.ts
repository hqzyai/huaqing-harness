/** Bounded JSON parsing and authenticated, streaming reverse proxy transport. */
import { request } from 'node:http'
import type { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'node:http'
import type { Duplex } from 'node:stream'
import type { TeamRuntime } from './containers.ts'

/** A bounded HTTP failure, translated by the application. */
export class HttpFailure extends Error {
  constructor(readonly status: number, readonly code: string) { super(code) }
}

/** Read JSON without admitting unbounded chunked bodies.
 * @param req - incoming HTTP request.
 * @param limit - maximum encoded body bytes.
 * @returns parsed JSON, still untrusted.
 */
export async function readJson(req: IncomingMessage, limit: number): Promise<unknown> {
  if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') throw new HttpFailure(415, 'json-required')
  let length = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    const value: unknown = chunk
    if (typeof value !== 'string' && !(value instanceof Uint8Array)) throw new HttpFailure(400, 'invalid-input')
    const data = typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value)
    length += data.length
    if (length > limit) throw new HttpFailure(413, 'body-too-large')
    chunks.push(data)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch (_invalidJson) { throw new HttpFailure(400, 'invalid-json') }
}

/** Require a JSON object before inspecting endpoint fields.
 * @param value - parsed JSON.
 * @returns object fields.
 */
export function objectOf(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new HttpFailure(400, 'invalid-input')
  return value as Record<string, unknown>
}

/** Emit a cache-disabled JSON result.
 * @param res - owned response.
 * @param status - HTTP status.
 * @param value - credential-free JSON body.
 */
export function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

const HOP_HEADERS = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'])

/** Tunnel the existing Remote WebSocket without exposing the worker credential.
 * @param req - admitted browser upgrade request.
 * @param socket - browser transport, owned until both sides close.
 * @param head - bytes already consumed by the HTTP parser.
 * @param runtime - server-selected private upstream.
 * @param options - handshake timeout and live session authorization.
 * @returns after both transports close.
 */
export async function proxyRuntimeUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, runtime: TeamRuntime,
  options: { idleTimeoutMs: number; revokeCheckMs: number; authorized: () => boolean }): Promise<void> {
  const url = new URL(req.url ?? '/', runtime.origin)
  if (url.origin !== runtime.origin || url.pathname !== '/api/remote.mux' || url.search || req.method !== 'GET'
    || req.headers.upgrade?.toLowerCase() !== 'websocket') throw new HttpFailure(403, 'forbidden')
  const headers: OutgoingHttpHeaders = { host: url.host, cookie: runtime.cookie, origin: runtime.origin, connection: 'Upgrade', upgrade: 'websocket' }
  for (const key of ['sec-websocket-key', 'sec-websocket-version', 'sec-websocket-protocol', 'sec-websocket-extensions']) {
    if (req.headers[key] !== undefined) headers[key] = req.headers[key]
  }
  await new Promise<void>((resolve) => {
    const upstream = request(url, { method: 'GET', headers })
    let peer: Duplex | undefined
    let closing = false
    let browserClosed = socket.destroyed
    let requestClosed = false
    let peerClosed = true
    const complete = (): void => { if (browserClosed && requestClosed && peerClosed) resolve() }
    const close = (): void => {
      if (closing) return
      closing = true
      clearInterval(revocation)
      upstream.destroy()
      peer?.destroy()
      socket.destroy()
    }
    const revocation = setInterval(() => { if (!options.authorized()) close() }, options.revokeCheckMs)
    revocation.unref()
    socket.once('error', close)
    socket.once('close', () => { browserClosed = true; close(); complete() })
    upstream.once('close', () => { requestClosed = true; complete() })
    upstream.once('error', close)
    upstream.setTimeout(options.idleTimeoutMs, close)
    upstream.once('response', (response) => { response.destroy(); close() })
    upstream.once('upgrade', (response, transport, upstreamHead) => {
      peer = transport
      peerClosed = false
      transport.once('error', close)
      transport.once('close', () => { peerClosed = true; close(); complete() })
      if (closing || !options.authorized()) { close(); transport.destroy(); return }
      upstream.setTimeout(0)
      const lines = ['HTTP/1.1 101 Switching Protocols']
      for (const [key, value] of Object.entries(response.headers)) {
        if (value !== undefined && ['upgrade', 'connection', 'sec-websocket-accept', 'sec-websocket-protocol', 'sec-websocket-extensions'].includes(key)) {
          for (const item of Array.isArray(value) ? value : [value]) lines.push(`${key}: ${item}`)
        }
      }
      socket.write(lines.join('\r\n') + '\r\n\r\n')
      if (upstreamHead.length) socket.write(upstreamHead)
      if (head.length) transport.write(head)
      transport.pipe(socket)
      socket.pipe(transport)
    })
    if (browserClosed || !options.authorized()) close()
    upstream.end()
  })
}

/** Proxy a single user's request, keeping the runtime credential entirely server-side.
 * @param req - authenticated browser request.
 * @param res - browser response.
 * @param runtime - server-selected private upstream.
 * @param options - request limits and a live authorization predicate for long streams.
 * @returns when the entire upstream response settles.
 */
export async function proxyRuntime(req: IncomingMessage, res: ServerResponse, runtime: TeamRuntime,
  options: { maxBodyBytes: number; idleTimeoutMs: number; revokeCheckMs: number; authorized: () => boolean }): Promise<void> {
  const url = new URL(req.url ?? '/', runtime.origin)
  if (url.origin !== runtime.origin || url.searchParams.has('token') || url.pathname === '/connect') throw new HttpFailure(403, 'forbidden')
  const extraHop = new Set((req.headers.connection ?? '').split(',').map(value => value.trim().toLowerCase()))
  const headers: OutgoingHttpHeaders = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined && !HOP_HEADERS.has(key) && !extraHop.has(key)
      && !['cookie', 'authorization', 'host', 'forwarded', 'origin', 'referer'].includes(key)
      && !key.startsWith('x-forwarded-') && !key.startsWith('x-hqzy-')) headers[key] = value
  }
  headers.host = new URL(runtime.origin).host
  headers.cookie = runtime.cookie
  if (req.headers.origin) headers.origin = runtime.origin
  // Compression stays in the worker; forwarding Content-Encoding unchanged preserves streaming.
  await new Promise<void>((resolve, reject) => {
    let settled = false
    const upstream = request(url, { method: req.method, headers })
    const settle = (error?: Error): void => {
      if (settled) return
      settled = true
      clearInterval(revocation)
      req.off('aborted', aborted)
      res.off('close', closed)
      if (error) reject(error)
      else resolve()
    }
    const aborted = (): void => { upstream.destroy(); settle() }
    const closed = (): void => { upstream.destroy(); settle() }
    const revocation = setInterval(() => {
      if (options.authorized()) return
      upstream.destroy()
      res.destroy()
      settle()
    }, options.revokeCheckMs)
    revocation.unref()
    req.once('aborted', aborted)
    res.once('close', closed)
    upstream.setTimeout(options.idleTimeoutMs, () => { upstream.destroy(new Error('upstream-idle-timeout')) })
    upstream.once('error', (error) => { settle(error) })
    upstream.once('response', (response) => {
      const result: OutgoingHttpHeaders = {}
      for (const [key, value] of Object.entries(response.headers)) {
        if (value !== undefined && !HOP_HEADERS.has(key) && key !== 'set-cookie') result[key] = value
      }
      if (typeof result.location === 'string') {
        const redirect = new URL(result.location, runtime.origin)
        if (redirect.origin === runtime.origin) result.location = `${redirect.pathname}${redirect.search}${redirect.hash}`
      }
      result['cache-control'] = 'no-store'
      res.writeHead(response.statusCode ?? 502, result)
      response.once('error', (error) => { res.destroy(); settle(error) })
      response.once('end', () => { settle() })
      response.pipe(res)
    })
    let bytes = 0
    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length
      if (bytes > options.maxBodyBytes) {
        req.unpipe(upstream)
        upstream.destroy()
        if (!res.headersSent) json(res, 413, { error: 'body-too-large' })
        else res.destroy()
        settle()
      }
    })
    req.pipe(upstream)
  })
}
