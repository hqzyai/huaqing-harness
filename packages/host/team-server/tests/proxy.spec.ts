/** Real HTTP proxy checks for per-user credential containment and revocation. */
import { createServer, request, type IncomingMessage, type ServerResponse, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { proxyRuntime, proxyRuntimeUpgrade } from '../src/http.ts'

const servers: Server[] = []
async function listen(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<string> {
  const server = createServer(handler)
  servers.push(server)
  await new Promise<void>((resolve) => { server.listen(0, '127.0.0.1', resolve) })
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections()
    await new Promise<void>((resolve) => { server.close(() => { resolve() }) })
  }
})

describe('private runtime reverse proxy', () => {
  it('tunnels Remote upgrades with private credentials and closes both sockets on revocation', async () => {
    let observed: IncomingMessage['headers'] = {}
    let received = ''
    const upstream = createServer()
    servers.push(upstream)
    upstream.on('upgrade', (req, socket, head) => {
      observed = req.headers
      received += head.toString()
      socket.on('data', (data: Buffer) => { received += data.toString(); socket.write('worker-reply') })
      socket.once('end', () => { socket.destroy() })
      socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSet-Cookie: worker=secret\r\n\r\n')
    })
    await new Promise<void>((resolve) => { upstream.listen(0, '127.0.0.1', resolve) })
    const origin = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`
    let admitted = true
    const gateway = createServer()
    servers.push(gateway)
    let settled: Promise<void> | undefined
    gateway.on('upgrade', (req, socket, head) => {
      settled = proxyRuntimeUpgrade(req, socket, head, { origin, cookie: 'worker=assigned' },
        { idleTimeoutMs: 1000, revokeCheckMs: 10, authorized: () => admitted })
    })
    await new Promise<void>((resolve) => { gateway.listen(0, '127.0.0.1', resolve) })
    const client = request(`http://127.0.0.1:${(gateway.address() as AddressInfo).port}/api/remote.mux`, {
      headers: { connection: 'Upgrade', upgrade: 'websocket', cookie: 'browser=secret', authorization: 'Bearer browser' },
    })
    const upgraded = new Promise<{ response: IncomingMessage; socket: import('node:stream').Duplex }>((resolve, reject) => {
      client.once('upgrade', (response, socket) => { resolve({ response, socket }) })
      client.once('error', reject)
    })
    client.end()
    const { response, socket } = await upgraded
    const closed = new Promise<void>((resolve) => { socket.once('close', resolve) })
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(observed.cookie).toBe('worker=assigned')
    expect(observed.authorization).toBeUndefined()
    const reply = new Promise<string>((resolve) => { socket.once('data', (data: Buffer) => { resolve(data.toString()) }) })
    socket.write('browser-message')
    expect(await reply).toBe('worker-reply')
    expect(received).toBe('browser-message')
    admitted = false
    await closed
    await settled
  })

  it('substitutes only the server-selected runtime cookie and contains upstream cookies', async () => {
    let observed: IncomingMessage['headers'] = {}
    const upstream = await listen((req, res) => {
      observed = req.headers
      res.writeHead(200, { 'set-cookie': 'worker-secret=do-not-expose; HttpOnly', 'content-type': 'text/plain' })
      res.end('private user response')
    })
    const gateway = await listen((req, res) => {
      void proxyRuntime(req, res, { origin: upstream, cookie: 'private-runtime-cookie=assigned-user' },
        { maxBodyBytes: 1024, idleTimeoutMs: 1000, revokeCheckMs: 100, authorized: () => true }).catch(() => { res.destroy() })
    })
    const response = await fetch(`${gateway}/api/remote.mux`, { headers: { cookie: 'hqzy_session=browser-secret',
      authorization: 'Bearer browser-input', origin: gateway, 'x-forwarded-host': 'attacker.invalid', 'x-hqzy-csrf': 'browser-csrf' } })
    expect(await response.text()).toBe('private user response')
    expect(response.headers.getSetCookie()).toEqual([])
    expect(observed.cookie).toBe('private-runtime-cookie=assigned-user')
    expect(observed.authorization).toBeUndefined()
    expect(observed['x-hqzy-csrf']).toBeUndefined()
    expect(observed['x-forwarded-host']).toBeUndefined()
    expect(observed.origin).toBe(upstream)
  })

  it('refuses runtime-token exchange through a team browser session', async () => {
    let hits = 0
    const upstream = await listen((_req, res) => { hits++; res.end() })
    const gateway = await listen((req, res) => {
      void proxyRuntime(req, res, { origin: upstream, cookie: 'worker=private' },
        { maxBodyBytes: 1024, idleTimeoutMs: 1000, revokeCheckMs: 100, authorized: () => true })
        .catch(() => { res.writeHead(403); res.end() })
    })
    expect((await fetch(`${gateway}/?token=attacker`)).status).toBe(403)
    expect((await fetch(`${gateway}/connect?token=attacker`)).status).toBe(403)
    expect(hits).toBe(0)
  })

  it('disconnects an already streaming response when its login is revoked', async () => {
    const upstream = await listen((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.write('data: first\n\n')
    })
    let admitted = true
    const gateway = await listen((req, res) => {
      void proxyRuntime(req, res, { origin: upstream, cookie: 'worker=private' },
        { maxBodyBytes: 1024, idleTimeoutMs: 1000, revokeCheckMs: 10, authorized: () => admitted }).catch(() => { res.destroy() })
    })
    const response = await fetch(gateway)
    const reader = response.body?.getReader()
    expect(reader).toBeDefined()
    expect((await reader?.read())?.done).toBe(false)
    admitted = false
    await expect(reader?.read()).rejects.toThrow()
  })
})
