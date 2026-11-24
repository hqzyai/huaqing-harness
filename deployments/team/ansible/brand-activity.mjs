/** Count running sessions through the worker's normal authenticated read-only API. */
import assert from 'node:assert/strict'
import { readFile, readdir, readlink, stat } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { basename } from 'node:path'
import { randomUUID } from 'node:crypto'

let phase = 'worker-authentication'
try {
  const ip = Object.values(networkInterfaces()).flat().find(value => value?.family === 'IPv4' && !value.internal)?.address
  assert.ok(ip)
  const origin = `http://${ip}:3080`
  const token = (await readFile('/home/node/.dsh/.team-runtime-token', 'utf8')).trim()
  const authenticated = new URL('/', origin)
  authenticated.searchParams.set('token', token)
  const entry = await fetch(authenticated, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  assert.equal(entry.status, 303)
  const cookie = entry.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  assert.ok(cookie)
  await entry.body?.cancel()
  phase = 'session-list'
  const response = await fetch(new URL('/api/session/list', origin), {
    method: 'POST', headers: { 'content-type': 'application/json', origin, cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method: 'session/list', payload: { args: { _request: {} } } }),
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.result?.ok, true)
  const items = body.result.value?.items
  assert.ok(Array.isArray(items) && items.every(value => typeof value.running === 'boolean'))
  let childProcesses = 0
  phase = 'main-executable'
  assert.equal(basename(await readlink('/proc/1/exe')), 'node')
  phase = 'proc-read'
  for (const name of await readdir('/proc')) {
    if (!/^[0-9]+$/.test(name) || name === '1' || Number(name) === process.pid) continue
    try {
      if ((await stat(`/proc/${name}`)).isDirectory()) childProcesses++
    } catch (error) {
      // A process can exit between directory enumeration and the stat.
      if (error?.code === 'ENOENT') continue
      throw error
    }
  }
  console.log(JSON.stringify({ total: items.length, running: items.filter(value => value.running).length, childProcesses }))
} catch (error) {
  const errorTypes = new Set(['AssertionError', 'TypeError', 'Error', 'AbortError', 'TimeoutError'])
  console.log(JSON.stringify({ probeError: { phase, errorType: errorTypes.has(error?.name) ? error.name : 'Error' } }))
  process.exitCode = 1
}
