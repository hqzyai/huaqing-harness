/** Shutdown must retain identity storage until admitted password work commits. */
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import * as TeamServer from '../src/index.ts'

const hashing = vi.hoisted(() => ({
  pause: undefined as ((complete: () => void) => void) | undefined,
}))
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return { ...actual, scrypt: (password: import('node:crypto').BinaryLike, salt: import('node:crypto').BinaryLike,
    length: number, options: import('node:crypto').ScryptOptions, callback: (error: Error | null, result: Buffer) => void) => {
    actual.scrypt(password, salt, length, options, (error, result) => {
      const complete = (): void => { callback(error, result) }
      if (hashing.pause) hashing.pause(complete)
      else complete()
    })
  } }
})
vi.mock('../src/containers.ts', () => ({ TeamContainers: class {
  async preflight(): Promise<void> { /* Docker reachability is independent of request drainage. */ }
  async recover(): Promise<void> { /* No user worker is needed for password activation. */ }
  async close(): Promise<void> { /* No Docker work is admitted by this fixture. */ }
} }))

let context: Context | undefined
let server: Server | undefined
let directory: string | undefined
let releaseHash: (() => void) | undefined
afterEach(async () => {
  releaseHash?.()
  hashing.pause = undefined
  await context?.fiber.dispose()
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve) => { server?.close(() => { resolve() }) })
  }
  if (directory) await rm(directory, { recursive: true, force: true })
  context = undefined
  server = undefined
  directory = undefined
  releaseHash = undefined
})

it('awaits a paused activation and its durable write before closing SQLite', async () => {
  directory = await mkdtemp(join(tmpdir(), 'hqzy-control-lifecycle-'))
  const encryption = join(directory, 'encryption-key')
  const worker = join(directory, 'worker-key')
  const bootstrap = join(directory, 'bootstrap-token')
  await writeFile(encryption, Buffer.alloc(32, 1).toString('base64url'))
  await writeFile(worker, Buffer.alloc(32, 2).toString('base64url'))
  await writeFile(bootstrap, Buffer.alloc(32, 3).toString('base64url'))
  let handler: WebRoute['handler'] | undefined
  server = createServer((req, res) => {
    if (handler) void handler(req, res)
    else { res.writeHead(503); res.end() }
  })
  await new Promise<void>((resolve, reject) => { server?.once('error', reject); server?.listen(0, '127.0.0.1', resolve) })
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  context = new Context()
  context.provide('webServer', {
    registerFallback: (next: WebRoute['handler']) => { handler = next; return () => { handler = undefined } },
    registerUpgrade: () => () => {},
  })
  const parsed = TeamServer.Config['~standard'].validate({ dataDir: join(directory, 'data'), publicOrigin: origin,
    encryptionKeyFile: encryption, workerSecretFile: worker, bootstrapEmail: 'admin@example.com', bootstrapTokenFile: bootstrap,
    workerImage: 'fixture:latest', workerGatewayURL: 'http://fixture.test' })
  if ('then' in parsed || parsed.issues) throw new Error('Fixture team configuration failed validation')
  const control = context.plugin(TeamServer, parsed.value as TeamServer.Config)
  await control.await()
  const paused = new Promise<void>((resolve) => {
    hashing.pause = (complete) => { releaseHash = complete; resolve() }
  })
  const response = fetch(`${origin}/team/api/accept`, { method: 'POST', headers: {
    origin, 'content-type': 'application/json', 'x-hqzy-request': '1',
  }, body: JSON.stringify({ token: await readFile(bootstrap, 'utf8'), password: 'A private administrator password' }) })
    .catch(() => undefined)
  await paused
  let disposed = false
  const disposal = control.dispose().then(() => { disposed = true })
  await new Promise<void>((resolve) => { setImmediate(resolve) })
  expect(handler).toBeUndefined()
  expect(disposed).toBe(false)
  releaseHash?.()
  releaseHash = undefined
  await disposal
  await response
  const db = new DatabaseSync(join(directory, 'data', 'identity.sqlite'), { readOnly: true })
  try {
    expect(db.prepare('SELECT email,active FROM users').get()).toMatchObject({ email: 'admin@example.com', active: 1 })
    expect(db.prepare('SELECT action FROM audit WHERE action=?').all('password-set')).toHaveLength(1)
    expect(db.prepare('SELECT digest FROM links').all()).toEqual([])
  } finally { db.close() }
})
