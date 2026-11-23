/** Central catalog projection, startup readiness and disposable adapter registrations. */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import * as TeamRuntime from '../src/index.ts'

const contexts: Context[] = []
const directories: string[] = []
afterEach(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

const service = { id: 'team', provider: 'deepseek', name: 'Managed DeepSeek', baseURL: 'https://api.deepseek.com/v1', enabled: true,
  models: [{ id: 'configured', name: 'Configured model', contextWindow: 65536, maxTokens: 8192, vision: false }] }

async function context() {
  const home = await mkdtemp(join(tmpdir(), 'hqzy-runtime-'))
  directories.push(home)
  vi.stubEnv('DSH_HOME', home)
  vi.stubEnv('DSH_TEAM_TOKEN', 'w'.repeat(43))
  const ctx = new Context()
  contexts.push(ctx)
  ctx.provide('connection', { authenticatedUrl: (origin: string) => `${origin}/?token=${'b'.repeat(43)}` })
  ctx.provide('webServer', { getOrigin: () => 'http://127.0.0.1:3080' })
  const llm = ctx.plugin(LlmRuntime)
  await llm.await()
  return { ctx, home }
}

describe('team worker catalog bridge', () => {
  it('becomes ready without writing profile settings and publishes only centrally configured models', async () => {
    const { ctx, home } = await context()
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ services: [service] })))
    vi.stubGlobal('fetch', fetcher)
    const runtime = ctx.plugin(TeamRuntime, { gatewayURL: 'http://control.test', refreshMs: 1000, timeoutMs: 1000 })
    await runtime.await()
    expect(await readFile(join(home, '.team-runtime-token'), 'utf8')).toBe('b'.repeat(43))
    expect(ctx.llm.listProviders()).toMatchObject([{ id: 'team-team', name: 'Managed DeepSeek' }])
    expect(await ctx.llm.listModels('team-team')).toMatchObject([{ id: 'configured', name: 'Configured model' }])
    expect(fetcher).toHaveBeenCalledOnce()
    await runtime.dispose()
    expect(ctx.llm.listProviders()).toEqual([])
  })

  it('refreshes the catalog and drops disabled routes without restarting the worker', async () => {
    vi.useFakeTimers()
    const { ctx } = await context()
    let enabled = true
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ services: [{ ...service, enabled }] }))))
    const runtime = ctx.plugin(TeamRuntime, { gatewayURL: 'http://control.test', refreshMs: 1000, timeoutMs: 1000 })
    await runtime.await()
    expect(ctx.llm.listProviders()).toHaveLength(1)
    enabled = false
    await vi.advanceTimersByTimeAsync(1000)
    expect(ctx.llm.listProviders()).toEqual([])
    await runtime.dispose()
  })

  it('fails startup loudly when the central catalog cannot be trusted', async () => {
    const { ctx } = await context()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unavailable', { status: 503 })))
    const runtime = ctx.plugin(TeamRuntime, { gatewayURL: 'http://control.test', refreshMs: 1000, timeoutMs: 1000 })
    await expect(runtime.await()).rejects.toThrow('central model catalog unavailable')
    expect(ctx.llm.listProviders()).toEqual([])
  })
})
