/** Worker-only bridge from the central model catalog to the existing per-session model selector. */
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import * as PiAi from '@deepseek-ai/dsh-llm-pi-ai'
import { parseModelService } from '@deepseek-ai/dsh-team-models'

/** Registers only on a private Docker worker profile. */
export const name = 'team-runtime'
/** Worker transport and inference registry. */
export const inject = ['connection', 'webServer', 'llm']
/** Central control-plane location and refresh bounds. */
export interface Config {
  /** Control-plane origin reachable from this private worker. */
  gatewayURL: string
  /** Central catalog polling interval in milliseconds. */
  refreshMs: number
  /** Deadline for each catalog request in milliseconds. */
  timeoutMs: number
}
/** Deployment-varying catalog refresh configuration. */
export const Config: z<Config> = z.object({
  gatewayURL: z.string().required(), refreshMs: z.number().step(1).min(1000).default(15000),
  timeoutMs: z.number().step(1).min(1000).default(10000),
})

/** Mount the existing inference adapter over user-scoped proxy credentials.
 * @param ctx - private user's runtime.
 * @param config - control-plane catalog and polling settings.
 */
export async function apply(ctx: Context, config: Config): Promise<void> {
  const gateway = new URL(config.gatewayURL)
  const token = launchEnvironmentOf(ctx).get('DSH_TEAM_TOKEN')?.value
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('team-runtime: missing worker capability')
  const lifecycle = new AbortController()
  ctx.effect(() => () => { lifecycle.abort() }, 'team-runtime: catalog requests')
  const pull = async (): Promise<Record<string, PiAi.PiAiProviderProfile>> => {
    const response = await fetch(new URL('/internal/catalog', gateway), {
      headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.any([lifecycle.signal, AbortSignal.timeout(config.timeoutMs)]),
    })
    if (!response.ok) throw new Error('team-runtime: central model catalog unavailable')
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null || !('services' in body) || !Array.isArray(body.services)) throw new Error('team-runtime: invalid central catalog')
    const providers: Record<string, PiAi.PiAiProviderProfile> = {}
    for (const raw of body.services) {
      const service = parseModelService(raw)
      if (!service.enabled) continue
      providers[`team-${service.id}`] = {
        displayName: service.name,
        api: 'openai-completions',
        apiKeyEnv: 'DSH_TEAM_TOKEN',
        baseURL: new URL(`/internal/models/${service.id}/v1`, gateway).href,
        models: service.models.map(model => ({ id: model.id, name: model.name,
          contextWindow: model.contextWindow, maxTokens: model.maxTokens, input: model.vision ? ['text', 'image'] : ['text'] })),
        compat: { supportsStore: false, supportsDeveloperRole: false, maxTokensField: 'max_tokens', supportsUsageInStreaming: true,
          ...service.provider === 'deepseek' ? { thinkingFormat: 'deepseek' } : {},
          ...service.provider === 'qwen' || service.provider === 'bailian' ? { thinkingFormat: 'qwen' } : {},
          ...service.provider === 'zhipu' ? { thinkingFormat: 'zai' } : {} },
      }
    }
    return providers
  }
  let providers = await pull()
  const adapter = ctx.plugin(PiAi, { providers })
  await adapter.await()
  let version = JSON.stringify(providers)
  let refreshing = false
  const timer = setInterval(() => {
    if (refreshing) return
    refreshing = true
    void pull().then((next) => {
      if (lifecycle.signal.aborted) return
      const updated = JSON.stringify(next)
      if (updated === version) return
      providers = next
      adapter.update({ providers }, true)
      version = updated
    }).catch((_catalogError: unknown) => {
      if (!lifecycle.signal.aborted) ctx.logger.warn('team-runtime: model directory refresh failed; retained models remain subject to central authorization')
    }).finally(() => { refreshing = false })
  }, config.refreshMs)
  timer.unref()
  ctx.effect(() => () => { clearInterval(timer) }, 'team-runtime: catalog refresh')
  const home = resolveDshHome()
  await mkdir(home, { recursive: true, mode: 0o700 })
  const launchToken = new URL(ctx.connection.authenticatedUrl(ctx.webServer.getOrigin())).searchParams.get('token')
  if (!launchToken) throw new Error('team-runtime: browser authentication not ready')
  await writeFile(join(home, '.team-runtime-token'), launchToken, { mode: 0o600 })
}
