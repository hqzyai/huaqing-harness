/** Explicit LAN HTTP admission retains exact origins and authenticated browser sessions. */
import { createServer, request, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import * as TeamServer from '../src/index.ts'

vi.mock('../src/containers.ts', () => ({ TeamContainers: class {
  async preflight(): Promise<void> { /* Docker admission is independent of browser origin validation. */ }
  async recover(): Promise<void> { /* Account requests do not create a user runtime. */ }
  async close(): Promise<void> { /* This fixture has no admitted Docker operations. */ }
} }))

let context: Context | undefined
let server: Server | undefined
let directory: string | undefined
afterEach(async () => {
  await context?.fiber.dispose()
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve) => { server?.close(() => { resolve() }) })
  }
  if (directory) await rm(directory, { recursive: true, force: true })
  context = undefined
  server = undefined
  directory = undefined
})

function configOf(publicOrigin: string, allowInsecureHttp?: boolean): TeamServer.Config {
  const parsed = TeamServer.Config['~standard'].validate({
    dataDir: join(directory ?? tmpdir(), 'data'), publicOrigin, allowInsecureHttp,
    encryptionKeyFile: join(directory ?? tmpdir(), 'encryption-key'),
    workerSecretFile: join(directory ?? tmpdir(), 'worker-key'),
    bootstrapEmail: 'admin@example.com', bootstrapTokenFile: join(directory ?? tmpdir(), 'bootstrap-token'),
    workerImage: 'fixture:latest', workerGatewayURL: 'http://fixture.test',
  })
  if ('then' in parsed || parsed.issues) throw new Error('Fixture team configuration failed validation')
  return parsed.value as TeamServer.Config
}

it.each([
  ['http://10.1.2.3:18400', undefined],
  ['http://172.16.0.1:18400', false],
  ['http://192.168.2.11:18400', false],
  ['http://8.8.8.8:18400', true],
  ['http://172.15.255.255:18400', true],
  ['http://172.32.0.1:18400', true],
  ['http://192.169.0.1:18400', true],
  ['http://169.254.0.1:18400', true],
  ['http://internal.example:18400', true],
  ['http://[fd00::1]:18400', true],
  ['ftp://192.168.2.11:18400', true],
  ['http://user@192.168.2.11:18400', true],
  ['http://192.168.2.11:18400/path', true],
  ['http://192.168.2.11:18400?query=1', true],
  ['http://192.168.2.11:18400#fragment', true],
] as const)('refuses disallowed browser origin %s with LAN HTTP opt-in %s', async (origin, optIn) => {
  context = new Context()
  await expect(TeamServer.apply(context, configOf(origin, optIn))).rejects.toThrow('publicOrigin requires')
})

it.each([
  ['http://10.1.2.3:18400', true, 'hqzy_session', false],
  ['http://172.31.255.255:18400', true, 'hqzy_session', false],
  ['http://192.168.2.11:18400', true, 'hqzy_session', false],
  ['http://localhost:18400', undefined, 'hqzy_dev_session', false],
  ['https://team.example:18400', undefined, '__Host-hqzy_session', true],
] as const)('authenticates at %s while rejecting other browser origins', async (origin, optIn, cookieName, secure) => {
  directory = await mkdtemp(join(tmpdir(), 'hqzy-control-origin-'))
  const bootstrap = Buffer.alloc(32, 3).toString('base64url')
  await writeFile(join(directory, 'encryption-key'), Buffer.alloc(32, 1).toString('base64url'))
  await writeFile(join(directory, 'worker-key'), Buffer.alloc(32, 2).toString('base64url'))
  await writeFile(join(directory, 'bootstrap-token'), bootstrap)
  let handler: WebRoute['handler'] | undefined
  server = createServer((req, res) => {
    if (handler) void handler(req, res)
    else { res.writeHead(503); res.end() }
  })
  await new Promise<void>((resolve, reject) => { server?.once('error', reject); server?.listen(0, '127.0.0.1', resolve) })
  const port = (server.address() as AddressInfo).port
  context = new Context()
  context.provide('webServer', {
    registerFallback: (next: WebRoute['handler']) => { handler = next; return () => { handler = undefined } },
    registerUpgrade: () => () => {},
  })
  const control = context.plugin(TeamServer, configOf(origin, optIn))
  await control.await()
  const send = async (path: string, body?: object, headers: IncomingHttpHeaders = {}): Promise<{
    status: number | undefined
    headers: IncomingHttpHeaders
    body: string
  }> => new Promise((resolve, reject) => {
    const client = request({ hostname: '127.0.0.1', port, path, method: body ? 'POST' : 'GET', headers: {
      host: new URL(origin).host, origin, 'x-hqzy-request': '1', 'content-type': 'application/json', ...headers,
    } }, (response) => {
      let received = ''
      response.setEncoding('utf8')
      response.on('data', (chunk: string) => { received += chunk })
      response.once('error', reject)
      response.once('end', () => { resolve({ status: response.statusCode, headers: response.headers, body: received }) })
    })
    client.once('error', reject)
    client.end(body ? JSON.stringify(body) : undefined)
  })
  const password = 'A private administrator password'
  expect((await send('/team/api/accept', { token: bootstrap, password })).status).toBe(200)
  const login = await send('/team/api/login', { email: 'admin@example.com', password })
  expect(login.status).toBe(200)
  const cookie = login.headers['set-cookie']?.[0]
  expect(cookie).toMatch(new RegExp(`^${cookieName}=`))
  expect(cookie).toContain('; HttpOnly; SameSite=Strict;')
  expect(cookie?.includes('; Secure')).toBe(secure)
  const sessionCookie = cookie?.split(';')[0]
  const me = await send('/team/api/me', undefined, { cookie: sessionCookie })
  expect(me.status).toBe(200)
  expect(JSON.parse(me.body)).toMatchObject({ user: { email: 'admin@example.com', role: 'admin' } })
  expect((await send('/team/api/me', undefined, { host: 'attacker.example', cookie: sessionCookie })).status).toBe(403)
  expect((await send('/team/api/login', { email: 'admin@example.com', password }, { origin: 'http://attacker.example' })).status).toBe(403)
  expect((await send('/team/api/me')).status).toBe(401)
  await control.dispose()
  expect(handler).toBeUndefined()
})
