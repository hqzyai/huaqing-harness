/** Team control plane: first-party accounts, administrator model configuration, and private user runtimes. */
import { readFile } from 'node:fs/promises'
import { mkdirSync, chmodSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIP } from 'node:net'
import { timingSafeEqual } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import { createServer, type Server } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { TeamAuth, TeamAuthError, type TeamUserId, type TeamSession } from '@deepseek-ai/dsh-team-auth'
import { TeamContainers } from './containers.ts'
import { TeamModels, TeamModelError, parseModelConnection, parseModelService } from '@deepseek-ai/dsh-team-models'
import { HttpFailure, json, objectOf, proxyRuntime, proxyRuntimeUpgrade, readJson } from './http.ts'
import { portalPage } from './portal.ts'
import { discoverModels, ModelDiscoveryError } from './model-discovery.ts'

/** The control plane owns an HTTP listener supplied by its dsh profile. */
export const name = 'team-server'
/** Required route carrier. No user Agent or filesystem service is mounted in this profile. */
export const inject = ['webServer']

/** Deployment configuration. Secret files must be readable only by the control-plane operator. */
export interface Config {
  /** Private directory for the identity and model databases. */
  dataDir: string
  /** Public HTTPS origin; HTTP requires loopback or an explicitly enabled private IPv4 origin. */
  publicOrigin: string
  /** Permit unencrypted HTTP for a literal RFC 1918 IPv4 origin. Defaults to false. */
  allowInsecureHttp: boolean
  /** File containing the base64url-encoded 32-byte model credential encryption key. */
  encryptionKeyFile: string
  /** File containing the base64url-encoded 32-byte worker capability signing key. */
  workerSecretFile: string
  /** Initial administrator email, paired with bootstrapTokenFile. */
  bootstrapEmail?: string
  /** File containing the initial administrator activation token. */
  bootstrapTokenFile?: string
  /** Docker image used when creating a private user runtime. */
  workerImage: string
  /** Docker resource-name and ownership-label prefix for this deployment. */
  workerPrefix: string
  /** Control-plane origin reachable from a private worker. */
  workerGatewayURL: string
  /** Gateway container to join each user network; empty uses local loopback publishing. */
  gatewayContainer: string
  /** Docker memory limit for each user runtime, such as 2g. */
  workerMemory: string
  /** Docker CPU quota for each user runtime. */
  workerCpus: number
  /** Maximum processes in each user runtime. */
  workerPids: number
  /** Timeout in milliseconds for Docker operations and runtime readiness. */
  startupTimeoutMs: number
  /** Absolute browser-session lifetime in milliseconds. */
  sessionTtlMs: number
  /** Maximum browser-session inactivity in milliseconds. */
  sessionIdleMs: number
  /** Invitation and initial activation lifetime in milliseconds. */
  inviteTtlMs: number
  /** Password-reset link lifetime in milliseconds. */
  resetTtlMs: number
  /** Login attempt counting window in milliseconds. */
  loginWindowMs: number
  /** Allowed attempts per verified IP and normalized email within a login window. */
  loginAttempts: number
  /** Maximum encoded bytes in proxied requests and inference JSON. */
  maxBodyBytes: number
  /** Inference deadline and runtime proxy idle timeout in milliseconds. */
  requestTimeoutMs: number
  /** Authorization recheck interval for active transports in milliseconds. */
  revokeCheckMs: number
  /** Expired session, link and login-limit cleanup interval in milliseconds. */
  maintenanceMs: number
  /** Maximum simultaneous inference requests admitted for one user. */
  maxInferencePerUser: number
  /** Maximum simultaneous inference requests admitted by this control plane. */
  maxInferenceTotal: number
  /** Literal socket-peer IPs permitted to supply the login client X-Real-IP header. */
  trustedProxyIPs: string[]
  /** Maximum duration in milliseconds for one administrator model discovery. */
  discoveryTimeoutMs: number
  /** Maximum total provider response bytes admitted by one discovery, including pagination. */
  discoveryMaxResponseBytes: number
  /** Maximum model entries collected by one discovery. */
  discoveryMaxModels: number
  /** Maximum administrator model discovery requests admitted concurrently. */
  maxDiscoveryRequests: number
  /** Suggested per-reply output limit; provider capabilities remain authoritative. */
  modelDefaultMaxTokens: number
  /** Minimum true model context window accepted on catalog writes. */
  modelMinimumContextWindow: number
}

/** Validate resource limits and lifetimes at profile load. */
export const Config: z<Config> = z.object({
  dataDir: z.string().required(), publicOrigin: z.string().required(), allowInsecureHttp: z.boolean().default(false),
  encryptionKeyFile: z.string().required(), workerSecretFile: z.string().required(),
  bootstrapEmail: z.string(), bootstrapTokenFile: z.string(), workerImage: z.string().required(),
  workerPrefix: z.string().default('hqzy'), workerGatewayURL: z.string().required(), gatewayContainer: z.string().default(''),
  workerMemory: z.string().default('2g'), workerCpus: z.number().min(0.1).default(2), workerPids: z.number().step(1).min(32).default(256),
  startupTimeoutMs: z.number().step(1).min(1000).max(300000).default(120000),
  sessionTtlMs: z.number().step(1).min(1000).default(604800000), sessionIdleMs: z.number().step(1).min(1000).default(43200000),
  inviteTtlMs: z.number().step(1).min(1000).default(86400000), resetTtlMs: z.number().step(1).min(1000).default(3600000),
  loginWindowMs: z.number().step(1).min(1000).default(900000), loginAttempts: z.number().step(1).min(1).default(20),
  maxBodyBytes: z.number().step(1).min(1024).default(33554432), requestTimeoutMs: z.number().step(1).min(1000).default(300000),
  revokeCheckMs: z.number().step(1).min(100).default(1000), maintenanceMs: z.number().step(1).min(1000).default(60000),
  maxInferencePerUser: z.number().step(1).min(1).default(2), maxInferenceTotal: z.number().step(1).min(1).default(4),
  trustedProxyIPs: z.array(z.string()).default([]),
  discoveryTimeoutMs: z.number().step(1).min(1000).max(120000).default(15000),
  discoveryMaxResponseBytes: z.number().step(1).min(1024).max(16777216).default(2097152),
  discoveryMaxModels: z.number().step(1).min(1).max(10000).default(2000),
  maxDiscoveryRequests: z.number().step(1).min(1).default(4),
  modelDefaultMaxTokens: z.number().step(1).min(1).default(8192),
  modelMinimumContextWindow: z.number().step(1).min(4097).default(16384),
})

function textField(input: Record<string, unknown>, key: string): string {
  const value = input[key]
  if (typeof value !== 'string') throw new HttpFailure(400, 'invalid')
  return value
}

function equalSecret(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function cookieOf(req: IncomingMessage, name: string): string {
  const matches = (req.headers.cookie ?? '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${name}=`))
  return matches.length === 1 ? matches[0]?.slice(name.length + 1) ?? '' : ''
}

/** Mount the complete team deployment; all worker traffic is session-routed.
 * @param ctx - dsh profile context containing only trusted control-plane plugins.
 * @param config - validated deployment parameters.
 */
export async function apply(ctx: Context, config: Config): Promise<void> {
  const origin = new URL(config.publicOrigin)
  const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(origin.hostname)
  const [first, second] = origin.hostname.split('.').map(Number)
  const privateIPv4 = isIP(origin.hostname) === 4 && (first === 10
    || (first === 172 && second !== undefined && second >= 16 && second <= 31)
    || (first === 192 && second === 168))
  if (origin.origin !== config.publicOrigin.replace(/\/$/, '') || origin.username || origin.password
    || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && (loopback || (config.allowInsecureHttp && privateIPv4))))) {
    throw new Error('team-server: publicOrigin requires HTTPS, loopback HTTP, or explicitly enabled private IPv4 HTTP')
  }
  for (const address of config.trustedProxyIPs) if (!isIP(address)) throw new Error('team-server: trustedProxyIPs must contain literal IP addresses')
  if ((config.bootstrapEmail === undefined) !== (config.bootstrapTokenFile === undefined)) throw new Error('team-server: bootstrap email and token file must be configured together')
  const secure = origin.protocol === 'https:'
  const cookieName = secure ? '__Host-hqzy_session' : loopback ? 'hqzy_dev_session' : 'hqzy_session'
  const dataDir = resolve(config.dataDir)
  mkdirSync(dataDir, { recursive: true, mode: 0o700 })
  chmodSync(dataDir, 0o700)
  const encryptionKey = (await readFile(config.encryptionKeyFile, 'utf8')).trim()
  const tokenSecret = (await readFile(config.workerSecretFile, 'utf8')).trim()
  const releases: (() => void | Promise<void>)[] = []
  ctx.effect(() => async () => {
    for (const release of releases.splice(0).reverse()) {
      try { await release() }
      catch (_cleanupError) { ctx.logger.error('team-server: cleanup failed; remaining resources will still be released') }
    }
  }, 'team-server: control-plane lifetime')
  const auth = new TeamAuth(join(dataDir, 'identity.sqlite'), config)
  releases.push(() => { auth.close() })
  const fontCSS = fileURLToPath(import.meta.resolve('@deepseek-ai/dsh-client-ui-theme/brand-font.css'))
  const logo = fileURLToPath(import.meta.resolve('@deepseek-ai/dsh-web-frontend/dist/hqzyai-logomark.svg'))
  const models = new TeamModels(join(dataDir, 'models.sqlite'), encryptionKey)
  releases.push(() => { models.close() })
  chmodSync(join(dataDir, 'models.sqlite'), 0o600)
  const active = new Map<TeamUserId, number>()
  const inferenceAbort = new Set<AbortController>()
  const discoveryAbort = new Set<AbortController>()
  const requests = new Set<ServerResponse>()
  const sockets = new Set<Duplex>()
  const operations = new Set<Promise<void>>()
  const track = (operation: Promise<void>): Promise<void> => {
    operations.add(operation)
    void operation.then(() => { operations.delete(operation) }, () => { operations.delete(operation) })
    return operation
  }
  let stopping = false
  const listeners = new Map<string, Server>()
  const openWorkerListener = async (id: TeamUserId, host: string): Promise<void> => {
    if (stopping) throw new Error('team-server: gateway stopping')
    if (listeners.has(host)) return
    const listener = createServer((req, res) => {
      try {
        if (stopping || !req.url?.startsWith('/internal/') || workerUser(req) !== id) throw new HttpFailure(403, 'forbidden')
      } catch (_unauthorizedWorker) { json(res, 403, { error: 'forbidden' }); return }
      void track(handler(req, res))
    })
    listeners.set(host, listener)
    try {
      await new Promise<void>((resolve, reject) => {
        listener.once('error', reject)
        listener.listen(Number(new URL(config.workerGatewayURL).port || 80), host, () => { listener.off('error', reject); resolve() })
      })
    } catch (error) { listeners.delete(host); listener.close(); throw error }
  }
  releases.push(async () => {
    await Promise.all([...listeners.values()].map(listener => new Promise<void>((resolve) => {
      listener.closeAllConnections()
      listener.close(() => { resolve() })
    })))
    listeners.clear()
  })
  const containers = new TeamContainers({ image: config.workerImage, prefix: config.workerPrefix,
    gatewayURL: config.workerGatewayURL, gatewayContainer: config.gatewayContainer, tokenSecret,
    memory: config.workerMemory, cpus: config.workerCpus, pids: config.workerPids, startupTimeoutMs: config.startupTimeoutMs },
  async (id, host) => { await openWorkerListener(id, host) })
  releases.push(async () => {
    stopping = true
    for (const controller of inferenceAbort) controller.abort()
    for (const controller of discoveryAbort) controller.abort()
    for (const response of requests) response.destroy()
    for (const socket of sockets) socket.destroy()
    try { await containers.close() }
    finally { await Promise.allSettled(operations) }
  })
  await containers.preflight()
  if (config.bootstrapEmail && config.bootstrapTokenFile) {
    const created = auth.bootstrap(config.bootstrapEmail, (await readFile(config.bootstrapTokenFile, 'utf8')).trim())
    if (created) ctx.logger.info('team-server: initial administrator invited; use the activation link held by the deployment operator')
  }
  const maintenance = setInterval(() => { auth.prune(Date.now()) }, config.maintenanceMs)
  maintenance.unref()
  releases.push(() => { clearInterval(maintenance) })

  const sessionOf = (req: IncomingMessage, touch = true): TeamSession | undefined => auth.authenticate(cookieOf(req, cookieName), touch)
  const setCookie = (res: ServerResponse, token: string, maxAge: number): void => {
    res.setHeader('set-cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(maxAge / 1000)}${secure ? '; Secure' : ''}`)
  }
  const browserMutation = (req: IncomingMessage, session?: TeamSession): void => {
    if (req.headers.origin !== origin.origin || req.headers['x-hqzy-request'] !== '1'
      || (session && !equalSecret(String(req.headers['x-hqzy-csrf'] ?? ''), session.digest))) throw new HttpFailure(403, 'forbidden')
  }
  const workerUser = (req: IncomingMessage): TeamUserId => {
    const token = req.headers.authorization?.replace(/^Bearer /, '')
    if (!token || token.length !== 43) throw new HttpFailure(401, 'forbidden')
    const user = auth.users().find(user => user.active && !user.disabled && equalSecret(token, containers.workerToken(user.id)))
    if (!user) throw new HttpFailure(401, 'forbidden')
    return user.id
  }
  const invitation = (token: string): string => `${origin.origin}/team/accept#${token}`

  const api = async (req: IncomingMessage, res: ServerResponse, path: string): Promise<void> => {
    if (path === '/team/api/login' && req.method === 'POST') {
      browserMutation(req)
      const body = objectOf(await readJson(req, 16384))
      const socketIP = req.socket.remoteAddress ?? ''
      const claimedIP = req.headers['x-real-ip']
      const remote = config.trustedProxyIPs.includes(socketIP) && typeof claimedIP === 'string' && isIP(claimedIP) ? claimedIP : socketIP
      const result = await auth.login(textField(body, 'email'), textField(body, 'password'), remote)
      auth.logout(cookieOf(req, cookieName))
      setCookie(res, result.token, config.sessionTtlMs)
      json(res, 200, { user: result.session.user })
      return
    }
    if (path === '/team/api/accept' && req.method === 'POST') {
      browserMutation(req)
      const body = objectOf(await readJson(req, 16384))
      await auth.acceptLink(textField(body, 'token'), textField(body, 'password'))
      setCookie(res, '', 0)
      json(res, 200, { ok: true })
      return
    }
    const session = sessionOf(req, path !== '/team/api/me')
    if (!session) throw new HttpFailure(401, 'forbidden')
    if (req.method === 'GET' && path === '/team/api/me') { json(res, 200, { user: session.user, csrf: session.digest }); return }
    if (req.method === 'GET' && path === '/team/api/catalog') { json(res, 200, { services: models.list(true) }); return }
    if (req.method === 'POST') browserMutation(req, session)
    if (path === '/team/api/logout' && req.method === 'POST') {
      auth.logout(cookieOf(req, cookieName)); setCookie(res, '', 0); json(res, 200, { ok: true }); return
    }
    if (session.user.role !== 'admin') throw new HttpFailure(403, 'forbidden')
    if (path === '/team/api/users' && req.method === 'GET') { json(res, 200, { users: auth.users() }); return }
    if (path === '/team/api/services' && req.method === 'GET') { json(res, 200, { services: models.list(false) }); return }
    if (req.method !== 'POST') throw new HttpFailure(405, 'invalid')
    const body = objectOf(await readJson(req, 262144))
    if (path === '/team/api/model-discovery') {
      const connection = models.resolveConnection(parseModelConnection(body))
      if (discoveryAbort.size >= config.maxDiscoveryRequests) throw new HttpFailure(429, 'discovery-rate-limit')
      const controller = new AbortController()
      discoveryAbort.add(controller)
      const disconnected = (): void => { controller.abort() }
      res.once('close', disconnected)
      try {
        const result = await discoverModels(connection, {
          timeoutMs: config.discoveryTimeoutMs, maxResponseBytes: config.discoveryMaxResponseBytes,
          maxModels: config.discoveryMaxModels, defaultMaxTokens: config.modelDefaultMaxTokens,
        }, controller.signal)
        json(res, 200, { ...result, minimumContextWindow: config.modelMinimumContextWindow })
      } finally {
        res.off('close', disconnected)
        discoveryAbort.delete(controller)
      }
    } else if (path === '/team/api/invite') {
      if (body.role !== 'admin' && body.role !== 'member') throw new HttpFailure(400, 'invalid')
      json(res, 201, { url: invitation(auth.invite(session.user.id, textField(body, 'email'), body.role)) })
    } else if (path === '/team/api/reset') {
      json(res, 201, { url: invitation(auth.resetLink(session.user.id, textField(body, 'id') as TeamUserId)) })
    } else if (path === '/team/api/disable') {
      if (typeof body.disabled !== 'boolean') throw new HttpFailure(400, 'invalid')
      const id = textField(body, 'id') as TeamUserId
      auth.setDisabled(session.user.id, id, body.disabled)
      if (body.disabled) {
        try { await containers.stop(id) }
        catch (_dockerStopFailed) { throw new HttpFailure(503, 'account-disabled-stop-failed') }
      }
      json(res, 200, { ok: true })
    } else if (path === '/team/api/services') {
      let service
      try { service = parseModelService(body) }
      catch (_invalidConfiguration) { throw new HttpFailure(400, 'invalid-model-service') }
      if (service.models.some(model => model.contextWindow < config.modelMinimumContextWindow)) {
        throw new HttpFailure(400, 'model-context-too-small')
      }
      try { models.save(service) }
      catch (error) {
        if (error instanceof TeamModelError) throw new HttpFailure(400, error.code)
        throw error
      }
      json(res, 200, { ok: true })
    } else throw new HttpFailure(404, 'invalid')
  }

  const internal = async (req: IncomingMessage, res: ServerResponse, path: string): Promise<void> => {
    const id = workerUser(req)
    if (path === '/internal/catalog' && req.method === 'GET') { json(res, 200, { services: models.list(true) }); return }
    const match = /^\/internal\/models\/([a-z][a-z0-9-]{0,47})\/v1\/chat\/completions$/.exec(path)
    if (!match?.[1] || req.method !== 'POST') throw new HttpFailure(404, 'forbidden')
    if ((active.get(id) ?? 0) >= config.maxInferencePerUser || inferenceAbort.size >= config.maxInferenceTotal) throw new HttpFailure(429, 'rate-limit')
    active.set(id, (active.get(id) ?? 0) + 1)
    const controller = new AbortController()
    inferenceAbort.add(controller)
    const disconnected = (): void => { controller.abort() }
    res.once('close', disconnected)
    const revocation = setInterval(() => {
      const current = auth.users().find(user => user.id === id)
      if (!current?.active || current.disabled) controller.abort()
    }, config.revokeCheckMs)
    try {
      const body = objectOf(await readJson(req, config.maxBodyBytes))
      const route = models.route(match[1], textField(body, 'model'))
      if (!route) throw new HttpFailure(403, 'model-unavailable')
      const model = route.model
      for (const field of ['max_tokens', 'max_completion_tokens']) {
        const limit = body[field]
        if (limit !== undefined && (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit <= 0 || limit > model.maxTokens)) {
          throw new HttpFailure(400, 'model-output-limit')
        }
      }
      body.max_tokens = body.max_tokens ?? body.max_completion_tokens ?? model.maxTokens
      delete body.max_completion_tokens
      const response = await fetch(`${route.service.baseURL}/chat/completions`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${route.apiKey}` },
        body: JSON.stringify(body), redirect: 'manual', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(config.requestTimeoutMs)]),
      })
      // Upstream errors can quote headers or credentials. Return only a status code.
      if (!response.ok || !response.body) {
        await response.body?.cancel()
        json(res, response.status === 429 ? 429 : 502, { error: { message: 'Model service rejected the request. Contact your administrator.', code: 'model-upstream-error' } })
        return
      }
      res.writeHead(200, { 'content-type': response.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store', 'x-accel-buffering': 'no' })
      await pipeline(Readable.from(response.body), res, { signal: controller.signal })
    } finally {
      clearInterval(revocation)
      res.off('close', disconnected)
      inferenceAbort.delete(controller)
      const remaining = (active.get(id) ?? 1) - 1
      if (remaining === 0) active.delete(id)
      else active.set(id, remaining)
    }
  }

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    requests.add(res)
    res.once('close', () => { requests.delete(res) })
    res.setHeader('x-content-type-options', 'nosniff')
    res.setHeader('referrer-policy', 'no-referrer')
    try {
      if (stopping) throw new HttpFailure(503, 'unavailable')
      const url = new URL(req.url ?? '/', origin)
      const internalHost = new URL(config.workerGatewayURL).host
      if ((req.headers.host !== origin.host && !(url.pathname.startsWith('/internal/') && req.headers.host === internalHost))
        || url.origin !== origin.origin) throw new HttpFailure(403, 'forbidden')
      if (req.headers.origin && req.headers.origin !== origin.origin) throw new HttpFailure(403, 'forbidden')
      const font = /^\/team\/fonts\/([a-z0-9-]+\.woff2)$/.exec(url.pathname)
      if (req.method === 'GET' && (font?.[1] || url.pathname === '/team/brand-font.css' || url.pathname === '/team/logo.svg')) {
        const filename = font?.[1] ? join(dirname(fontCSS), 'fonts', font[1]) : url.pathname === '/team/logo.svg' ? logo : fontCSS
        const bytes = await readFile(filename)
        res.writeHead(200, { 'content-type': font ? 'font/woff2' : filename === logo ? 'image/svg+xml' : 'text/css',
          'cache-control': 'public, max-age=3600' })
        res.end(bytes)
        return
      }
      if (url.pathname.startsWith('/internal/')) { await internal(req, res, url.pathname); return }
      if (url.pathname.startsWith('/team/api/')) { await api(req, res, url.pathname); return }
      if (url.pathname === '/team/health' && req.method === 'GET') { json(res, 200, { ok: true }); return }
      if (['/team/login', '/team/accept', '/team/admin', '/team/account'].includes(url.pathname) && req.method === 'GET') {
        const page = portalPage(req.headers['accept-language'] ?? 'zh', {
          defaultMaxTokens: config.modelDefaultMaxTokens, minimumContextWindow: config.modelMinimumContextWindow,
        })
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': page.csp, 'cache-control': 'no-store' })
        res.end(page.html)
        return
      }
      const session = sessionOf(req)
      if (!session) {
        if ((req.headers.accept ?? '').includes('text/html') && req.method === 'GET') {
          res.writeHead(303, { location: '/team/login', 'cache-control': 'no-store' }); res.end(); return
        }
        throw new HttpFailure(401, 'forbidden')
      }
      const token = cookieOf(req, cookieName)
      const runtime = await containers.ensure(session.user.id)
      if (!auth.authenticate(token, false)) throw new HttpFailure(401, 'forbidden')
      try {
        await proxyRuntime(req, res, runtime, { maxBodyBytes: config.maxBodyBytes, idleTimeoutMs: config.requestTimeoutMs,
          revokeCheckMs: config.revokeCheckMs, authorized: () => auth.authenticate(token, false) !== undefined })
      } catch (error) { containers.invalidate(session.user.id); throw error }
    } catch (error) {
      if (res.destroyed) return
      if (res.headersSent) { res.destroy(); return }
      if (error instanceof HttpFailure) json(res, error.status, { error: error.code })
      else if (error instanceof ModelDiscoveryError) {
        json(res, error.code === 'discovery-rate-limit' ? 429 : 400, { error: error.code })
      }
      else if (error instanceof TeamModelError) json(res, 400, { error: error.code })
      else if (error instanceof TeamAuthError) json(res, error.code === 'rate-limit' ? 429 : error.code === 'forbidden' ? 403 : 400, { error: error.code })
      else {
        // Never log submitted bodies, Docker command arguments, cookies or upstream credentials.
        ctx.logger.error('team-server: request failed; inspect control-plane/Docker health; no response was committed')
        json(res, 503, { error: 'unavailable' })
      }
    }
  }
  releases.push(ctx.webServer.registerFallback((req, res) => track(handler(req, res))))
  const upgrade = async (req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> => {
    sockets.add(socket)
    try {
      const url = new URL(req.url ?? '/', origin)
      if (stopping || req.headers.host !== origin.host || req.headers.origin !== origin.origin
        || url.origin !== origin.origin || url.search) {
        throw new HttpFailure(403, 'forbidden')
      }
      const session = sessionOf(req)
      if (!session) throw new HttpFailure(401, 'forbidden')
      const token = cookieOf(req, cookieName)
      const runtime = await containers.ensure(session.user.id)
      if (socket.destroyed || !auth.authenticate(token, false)) { socket.destroy(); return }
      await proxyRuntimeUpgrade(req, socket, head, runtime, { idleTimeoutMs: config.requestTimeoutMs,
        revokeCheckMs: config.revokeCheckMs, authorized: () => !stopping && auth.authenticate(token, false) !== undefined })
    } catch (_upgradeFailed) { socket.destroy() }
    finally { sockets.delete(socket) }
  }
  releases.push(ctx.webServer.registerUpgrade({ path: '/api/remote.mux', handler: (req, socket, head) => track(upgrade(req, socket, head)) }))
  await containers.recover(auth.users().filter(user => user.active && !user.disabled).map(user => user.id))
  ctx.logger.info(`team-server: ready at ${origin.origin}/team/login`)
}
