/** Administrator discovery preserves credential privacy and control-plane shutdown. */
import { createServer, request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import * as TeamServer from '../src/index.ts'
import { ModelDiscoveryError } from '../src/model-discovery.ts'

const discovery = vi.hoisted(() => ({ run: vi.fn<typeof import('../src/model-discovery.ts').discoverModels>() }))
vi.mock('../src/model-discovery.ts', async original => ({
  ...await original<typeof import('../src/model-discovery.ts')>(), discoverModels: discovery.run,
}))
vi.mock('../src/containers.ts', () => ({ TeamContainers: class {
  async preflight(): Promise<void> { /* Account administration needs no Docker fixture. */ }
  async recover(): Promise<void> { /* This fixture starts no worker. */ }
  async close(): Promise<void> { /* This fixture admits no Docker operations. */ }
} }))

let context: Context | undefined
let control: ReturnType<Context['plugin']> | undefined
let server: Server | undefined
let directory: string | undefined
let origin = ''
let cookie = ''
let csrf = ''

interface RequestOptions { cookie?: string; csrf?: string; origin?: string }
async function send(path: string, body?: object, options: RequestOptions = {}): Promise<{
  status: number | undefined
  headers: import('node:http').IncomingHttpHeaders
  body: Record<string, unknown>
}> {
  return new Promise((resolve, reject) => {
    const client = request(`${origin}/team/api/${path}`, { method: body ? 'POST' : 'GET', headers: {
      origin: options.origin ?? origin, cookie: options.cookie ?? cookie, 'x-hqzy-request': '1',
      'x-hqzy-csrf': options.csrf ?? csrf, 'content-type': 'application/json',
    } }, (response) => {
      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk: string) => { text += chunk })
      response.once('error', reject)
      response.once('end', () => {
        try {
          const body: unknown = JSON.parse(text)
          if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error('Expected an API object')
          resolve({ status: response.statusCode, headers: response.headers, body: body as Record<string, unknown> })
        } catch (error) { reject(error instanceof Error ? error : new Error('Invalid API response')) }
      })
    })
    client.once('error', reject)
    client.end(body ? JSON.stringify(body) : undefined)
  })
}

const connection = { provider: 'bailian', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKey: 'fixture-private-key' }
const definition = { ...connection, id: 'saved', name: 'Team models', enabled: true,
  models: [{ id: 'configured', name: 'Configured model', contextWindow: 131072, maxTokens: 8192, vision: false }] }

beforeEach(async () => {
  discovery.run.mockReset().mockResolvedValue({
    models: [{ id: 'configured', name: 'Configured model', contextWindow: 1000000, maxOutputTokens: 393216, vision: true }],
    defaultMaxTokens: 8192,
  })
  directory = await mkdtemp(join(tmpdir(), 'hqzy-discovery-api-'))
  const bootstrap = Buffer.alloc(32, 3).toString('base64url')
  await writeFile(join(directory, 'encryption'), Buffer.alloc(32, 1).toString('base64url'))
  await writeFile(join(directory, 'worker'), Buffer.alloc(32, 2).toString('base64url'))
  await writeFile(join(directory, 'bootstrap'), bootstrap)
  let handler: WebRoute['handler'] | undefined
  server = createServer((req, res) => {
    if (handler) void handler(req, res)
    else { res.writeHead(503); res.end() }
  })
  await new Promise<void>((resolve, reject) => { server?.once('error', reject); server?.listen(0, '127.0.0.1', resolve) })
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  context = new Context()
  context.provide('webServer', {
    registerFallback: (next: WebRoute['handler']) => { handler = next; return () => { handler = undefined } },
    registerUpgrade: () => () => {},
  })
  const parsed = TeamServer.Config['~standard'].validate({
    dataDir: join(directory, 'data'), publicOrigin: origin, encryptionKeyFile: join(directory, 'encryption'),
    workerSecretFile: join(directory, 'worker'), bootstrapEmail: 'admin@example.com', bootstrapTokenFile: join(directory, 'bootstrap'),
    workerImage: 'fixture:latest', workerGatewayURL: 'http://fixture.test', maxDiscoveryRequests: 1,
  })
  if ('then' in parsed || parsed.issues) throw new Error('Discovery fixture configuration failed validation')
  control = context.plugin(TeamServer, parsed.value as TeamServer.Config)
  await control.await()
  cookie = ''; csrf = ''
  expect((await send('accept', { token: bootstrap, password: 'A private administrator password' })).status).toBe(200)
  const login = await send('login', { email: 'admin@example.com', password: 'A private administrator password' })
  cookie = login.headers['set-cookie']?.[0]?.split(';')[0] ?? ''
  const me = await send('me')
  if (typeof me.body.csrf !== 'string') throw new Error('Administrator session missing CSRF')
  csrf = me.body.csrf
})

afterEach(async () => {
  await context?.fiber.dispose()
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve) => { server?.close(() => { resolve() }) })
  }
  if (directory) await rm(directory, { recursive: true, force: true })
  context = undefined; control = undefined; server = undefined; directory = undefined
})

it('requires an administrator and exact browser mutation credentials before discovery', async () => {
  expect((await send('model-discovery', connection, { cookie: '' })).status).toBe(401)
  expect((await send('model-discovery', connection, { csrf: '' })).status).toBe(403)
  expect((await send('model-discovery', connection, { origin: 'https://other.example' })).status).toBe(403)
  const invitation = await send('invite', { email: 'member@example.com', role: 'member' })
  if (typeof invitation.body.url !== 'string') throw new Error('Member invitation missing')
  await send('accept', { token: new URL(invitation.body.url).hash.slice(1), password: 'A private member password' })
  const login = await send('login', { email: 'member@example.com', password: 'A private member password' }, { cookie: '' })
  const memberCookie = login.headers['set-cookie']?.[0]?.split(';')[0] ?? ''
  const me = await send('me', undefined, { cookie: memberCookie })
  if (typeof me.body.csrf !== 'string') throw new Error('Member session missing CSRF')
  expect((await send('model-discovery', connection, { cookie: memberCookie, csrf: me.body.csrf })).status).toBe(403)
  expect(discovery.run).not.toHaveBeenCalled()
})

it('returns real capabilities and deployment defaults without returning the provider credential', async () => {
  const response = await send('model-discovery', connection)
  expect(response.status).toBe(200)
  expect(response.body).toMatchObject({ defaultMaxTokens: 8192, minimumContextWindow: 16384,
    models: [{ id: 'configured', contextWindow: 1000000, maxOutputTokens: 393216 }] })
  expect(JSON.stringify(response.body)).not.toContain(connection.apiKey)
  expect(discovery.run.mock.calls[0]?.[1]).toEqual({ timeoutMs: 15000, maxResponseBytes: 2097152, maxModels: 2000, defaultMaxTokens: 8192 })
})

it('preserves saved credentials for discovery and requires a new credential when changing platforms', async () => {
  expect((await send('services', definition)).status).toBe(200)
  const response = await send('model-discovery', { id: 'saved', provider: 'bailian', baseURL: connection.baseURL })
  expect(response.status).toBe(200)
  expect(discovery.run.mock.calls[0]?.[0]).toMatchObject({ apiKey: connection.apiKey })
  const changed = await send('model-discovery', { id: 'saved', provider: 'deepseek', baseURL: 'https://api.deepseek.com/v1' })
  expect(changed.status).toBe(400)
  expect(changed.body).toEqual({ error: 'missing-api-key' })
  expect(discovery.run).toHaveBeenCalledTimes(1)
})

it('reports provider authentication errors without invalidating the administrator session', async () => {
  discovery.run.mockRejectedValue(new ModelDiscoveryError('discovery-unauthorized'))
  const response = await send('model-discovery', connection)
  expect(response.status).toBe(400)
  expect(response.body).toEqual({ error: 'discovery-unauthorized' })
  expect((await send('me')).status).toBe(200)
})

it('refuses insufficient context capacity before saving a model', async () => {
  for (const contextWindow of [1024, 16383]) {
    const response = await send('services', { ...definition,
      models: [{ ...definition.models[0], contextWindow, maxTokens: 390 }] })
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'model-context-too-small' })
  }
  expect((await send('services')).body.services).toEqual([])
  expect((await send('services', { ...definition,
    models: [{ ...definition.models[0], contextWindow: 16384 }] })).status).toBe(200)
})

it('bounds concurrent discovery and cancels admitted work before closing the control plane', async () => {
  let admitted: (() => void) | undefined
  const entered = new Promise<void>((resolve) => { admitted = resolve })
  let signal: AbortSignal | undefined
  discovery.run.mockImplementation((_connection, _options, cancellation: AbortSignal) => new Promise<never>((_resolve, reject) => {
    signal = cancellation
    cancellation.addEventListener('abort', () => {
      const reason: unknown = cancellation.reason
      reject(reason instanceof Error ? reason : new Error('Discovery cancelled'))
    }, { once: true })
    admitted?.()
  }))
  const response = send('model-discovery', connection).catch(() => undefined)
  await entered
  expect((await send('model-discovery', connection)).status).toBe(429)
  await control?.dispose()
  await response
  expect(signal?.aborted).toBe(true)
})
