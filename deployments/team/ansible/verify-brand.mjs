/** Verify the running worker's product identity through its normal Session API. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { randomUUID } from 'node:crypto'

let phase = 'worker-authentication'
let sessionId
let rpc
const report = { product: 'Huaqing Harness', success: false, credentialsSaved: false }
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
  const page = await fetch(new URL('/', origin), { headers: { cookie }, signal: AbortSignal.timeout(15000) })
  assert.equal(page.status, 200)
  assert.match(await page.text(), /<title>Huaqing Harness<\/title>/)
  const manifest = await fetch(new URL('/manifest.webmanifest', origin), { headers: { cookie }, signal: AbortSignal.timeout(15000) })
  assert.equal(manifest.status, 200)
  assert.equal((await manifest.json()).name, 'Huaqing Harness')
  report.pageTitleVerified = true
  report.pwaNameVerified = true
  rpc = async (method, args) => {
    const response = await fetch(new URL(`/api/${method}`, origin), {
      method: 'POST', headers: { 'content-type': 'application/json', origin, cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method, payload: { args } }),
      signal: AbortSignal.timeout(30000),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.result?.ok, true)
    return body.result.value
  }
  phase = 'model-selection'
  const catalog = await rpc('session/modelCatalog', {})
  const models = catalog.groups.flatMap(group => (group.models ?? []).map(model => ({ provider: group.id, model: model.id })))
  const selected = models.find(value => /deepseek.*flash/i.test(value.model)) ?? models[0]
  assert.ok(selected)
  phase = 'create-verification-session'
  sessionId = (await rpc('session/create', { request: { cwd: '/workspace', sessionId: `session-${randomUUID()}` } })).sessionId
  await rpc('session/rename', { request: { sessionId, title: 'Huaqing Harness branding verification' } })
  await rpc('session/selectModel', { request: { sessionId, ...selected } })
  phase = 'identity-question'
  const admitted = await rpc('session/prompt', { request: {
    requestId: randomUUID(), sessionId, mode: 'queue', clientTimeZone: 'Asia/Shanghai',
    content: [{ type: 'text', text: '你是谁？请用一句话介绍你的产品身份。请勿调用工具。' }],
  } })
  assert.equal(admitted.accepted, true)
  phase = 'assistant-response'
  const deadline = Date.now() + 120000
  let completed = false
  while (Date.now() < deadline) {
    const projection = await rpc('session/projections', { request: { sessionId } })
    if (projection?.kind === 'sequenced') {
      const page = await rpc('session/page', { request: {
        address: { kind: 'session', sessionId }, throughSeq: projection.asOfSeq, maxMessages: 40,
      } })
      const events = page.records.filter(record => record.type === 'event').map(record => record.event)
      if (events.some(event => event.type === 'turn/end')) {
        const replies = events.filter(event => event.type === 'assistant/message')
          .flatMap(event => event.data.message.content).filter(block => block.type === 'text').map(block => block.text).join('\n')
        report.reply = replies.replace(/sk-[A-Za-z0-9._-]+/g, '<REDACTED>').slice(0, 600)
        report.identityVerified = /Huaqing Harness/i.test(replies) && !/DeepSeek[ -]Harness/i.test(replies)
        report.loggedSystemIdentityVerified = events.some(event => event.type === 'system/message'
          && event.data.message.content.some(block => block.type === 'text'
            && block.text.startsWith('You are Huaqing Harness, an AI agent.')))
        report.model = selected.model
        report.provider = selected.provider
        report.turnCompleted = true
        report.toolCalls = events.filter(event => event.type === 'tool/call').length
        assert.equal(report.identityVerified, true)
        assert.equal(report.toolCalls, 0)
        completed = true
        break
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  assert.ok(completed)
  report.success = true
} catch (error) {
  report.phase = phase
  report.errorType = error instanceof Error ? error.name : 'UnknownError'
} finally {
  if (sessionId && rpc) {
    try {
      const archived = await rpc('workspace/archiveSession', { request: { sessionId, stopActivity: true } })
      report.testSessionArchived = archived.archivedSessionIds.includes(sessionId)
      if (!report.testSessionArchived) report.success = false
    } catch {
      report.success = false
      report.cleanupFailed = true
    }
  }
}
console.log(JSON.stringify(report))
if (!report.success) process.exitCode = 1
