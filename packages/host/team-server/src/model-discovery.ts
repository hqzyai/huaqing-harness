/** Bounded provider catalog discovery without inference calls or browser-visible credentials. */
import { parseModelConnection, type ResolvedTeamModelConnection } from '@deepseek-ai/dsh-team-models'

/** Provider-reported model fields; absent capabilities require administrator input. */
export interface DiscoveredTeamModel {
  id: string
  name: string
  contextWindow?: number
  maxOutputTokens?: number
  vision?: boolean
}
/** Credential-free result of an authenticated provider catalog request. */
export interface ModelDiscoveryResult {
  models: DiscoveredTeamModel[]
  defaultMaxTokens: number
  listUnavailable?: boolean
}
/** Deployment limits apply to the entire discovery operation, including every page. */
export interface ModelDiscoveryOptions {
  timeoutMs: number
  maxResponseBytes: number
  maxModels: number
  defaultMaxTokens: number
}
/** Localized failure codes never include provider response bodies or credentials. */
export class ModelDiscoveryError extends Error {
  constructor(readonly code: 'discovery-unauthorized' | 'discovery-forbidden' | 'discovery-rate-limit'
    | 'discovery-timeout' | 'discovery-unavailable' | 'discovery-unsupported' | 'discovery-invalid-response') { super(code) }
}

function objectOf(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ModelDiscoveryError('discovery-invalid-response')
  return value as Record<string, unknown>
}

function optionalObject(value: unknown): Record<string, unknown> | undefined {
  return value === undefined || value === null ? undefined : objectOf(value)
}

function optionalLimit(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw new ModelDiscoveryError('discovery-invalid-response')
  return value
}

function optionalModalities(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new ModelDiscoveryError('discovery-invalid-response')
  return value.map((item: string) => item.toLowerCase())
}

function modelOf(value: unknown, workspace: boolean): DiscoveredTeamModel | undefined {
  const model = objectOf(value)
  const id = workspace ? model.model : model.id
  if (typeof id !== 'string' || !/^[A-Za-z0-9_.:/-]{1,200}$/.test(id)) throw new ModelDiscoveryError('discovery-invalid-response')
  const inference = workspace ? optionalObject(model.inference_metadata) : undefined
  const input = optionalModalities(workspace ? inference?.request_modality : model.input_modalities)
  const output = optionalModalities(workspace ? inference?.response_modality : model.output_modalities)
  if (output?.length && !output.includes('text')) return undefined
  if (workspace && model.capabilities !== undefined) {
    const capabilities = optionalModalities(model.capabilities)
    if (capabilities?.length && !capabilities.some(item => ['tg', 'reasoning', 'vu'].includes(item))) return undefined
  }
  const info = workspace ? optionalObject(model.model_info) : model
  const contextWindow = optionalLimit(info?.context_window)
  const maxOutputTokens = optionalLimit(info?.max_output_tokens)
  const name = typeof model.name === 'string' && model.name.trim() ? model.name.trim().slice(0, 100) : id.slice(0, 100)
  return { id, name, ...contextWindow !== undefined ? { contextWindow } : {},
    ...maxOutputTokens !== undefined ? { maxOutputTokens } : {}, ...input?.length ? { vision: input.includes('image') } : {} }
}

async function cancelBody(response: Response): Promise<void> {
  try { await response.body?.cancel() }
  catch (_closedBody) { /* The provider transport may already have closed or aborted its response body. */ }
}

async function readJson(response: Response, budget: { remaining: number }, signal: AbortSignal): Promise<unknown> {
  const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  if (!response.body || (type !== 'application/json' && !type?.endsWith('+json'))) {
    await cancelBody(response)
    throw new ModelDiscoveryError('discovery-invalid-response')
  }
  const declaredLength = response.headers.get('content-length')
  if (declaredLength !== null && /^\d+$/.test(declaredLength) && Number(declaredLength) > budget.remaining) {
    await cancelBody(response)
    throw new ModelDiscoveryError('discovery-invalid-response')
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let cancellation: Promise<void> | undefined
  const cancel = (): void => {
    cancellation ??= reader.cancel().catch((_closedBody: unknown) => { /* Abort may race the fetch transport closing the same reader. */ })
  }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    signal.throwIfAborted()
    while (true) {
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      budget.remaining -= value.byteLength
      if (budget.remaining < 0) throw new ModelDiscoveryError('discovery-invalid-response')
      chunks.push(value)
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    cancel()
    await cancellation
    reader.releaseLock()
  }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))) }
  catch (_invalidJson) { throw new ModelDiscoveryError('discovery-invalid-response') }
}

async function fetchJson(url: string, connection: ResolvedTeamModelConnection, fetcher: typeof fetch,
  budget: { remaining: number }, signal: AbortSignal): Promise<Record<string, unknown>> {
  signal.throwIfAborted()
  const response = await fetcher(url, { method: 'GET', redirect: 'manual', signal,
    headers: { authorization: `Bearer ${connection.apiKey}`, accept: 'application/json' } })
  if (!response.ok) {
    await cancelBody(response)
    if (response.status === 401) throw new ModelDiscoveryError('discovery-unauthorized')
    if (response.status === 403) throw new ModelDiscoveryError('discovery-forbidden')
    if (response.status === 429) throw new ModelDiscoveryError('discovery-rate-limit')
    if (response.status === 404 || response.status === 405) throw new ModelDiscoveryError('discovery-unsupported')
    throw new ModelDiscoveryError('discovery-unavailable')
  }
  return objectOf(await readJson(response, budget, signal))
}

async function workspaceModels(connection: ResolvedTeamModelConnection, options: ModelDiscoveryOptions,
  fetcher: typeof fetch, budget: { remaining: number }, signal: AbortSignal): Promise<DiscoveredTeamModel[]> {
  const models = new Map<string, DiscoveredTeamModel>()
  let consumed = 0
  for (let page = 1; ; page++) {
    const url = new URL('/api/v1/models', connection.baseURL)
    url.searchParams.set('page_no', String(page))
    url.searchParams.set('page_size', String(Math.min(100, options.maxModels)))
    for (const capability of ['TG', 'Reasoning', 'VU']) url.searchParams.append('capabilities', capability)
    const payload = await fetchJson(url.href, connection, fetcher, budget, signal)
    if (payload.success !== true) throw new ModelDiscoveryError('discovery-invalid-response')
    const output = objectOf(payload.output)
    if (typeof output.total !== 'number' || !Number.isSafeInteger(output.total) || output.total < 0 || output.total > options.maxModels
      || output.page_no !== page || typeof output.page_size !== 'number' || !Number.isSafeInteger(output.page_size) || output.page_size <= 0
      || output.page_size > Math.min(100, options.maxModels)
      || !Array.isArray(output.models) || output.models.length > output.page_size) throw new ModelDiscoveryError('discovery-invalid-response')
    consumed += output.models.length
    if (consumed > options.maxModels || consumed > output.total) throw new ModelDiscoveryError('discovery-invalid-response')
    for (const raw of output.models) {
      const model = modelOf(raw, true)
      if (model) models.set(model.id, model)
    }
    if (consumed >= output.total) return [...models.values()]
    if (output.models.length === 0) throw new ModelDiscoveryError('discovery-invalid-response')
  }
}

/** Read authenticated model metadata without inference, redirects, or persistent edits.
 * @param connection - provider URL and server-only credential; the URL is checked before network admission.
 * @param options - complete-operation time, bytes and model limits plus the UI's suggested output budget.
 * @param signal - caller-owned cancellation; rejection settles after the active response is cancelled.
 * @param fetcher - HTTP transport, injectable for provider fixture responses.
 * @returns only provider-reported capabilities and the configured output-budget suggestion.
 */
export async function discoverModels(connection: ResolvedTeamModelConnection, options: ModelDiscoveryOptions,
  signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<ModelDiscoveryResult> {
  const parsed = parseModelConnection(connection)
  signal.throwIfAborted()
  // These platforms do not document a compatible catalog endpoint authenticated by the configured inference key.
  if (connection.provider === 'volcengine' || connection.provider === 'zhipu') throw new ModelDiscoveryError('discovery-unsupported')
  const deadline = AbortSignal.timeout(options.timeoutMs)
  const combined = AbortSignal.any([signal, deadline])
  const budget = { remaining: options.maxResponseBytes }
  try {
    let models: DiscoveredTeamModel[]
    if ((connection.provider === 'qwen' || connection.provider === 'bailian') && new URL(connection.baseURL).hostname.includes('.maas.')) {
      models = await workspaceModels(connection, options, fetcher, budget, combined)
    } else {
      const payload = await fetchJson(`${parsed.baseURL}/models`, connection, fetcher, budget, combined)
      if (!Array.isArray(payload.data) || payload.data.length > options.maxModels) throw new ModelDiscoveryError('discovery-invalid-response')
      const unique = new Map<string, DiscoveredTeamModel>()
      for (const raw of payload.data) {
        const model = modelOf(raw, false)
        if (model) unique.set(model.id, model)
      }
      models = [...unique.values()]
    }
    return { models, defaultMaxTokens: options.defaultMaxTokens }
  } catch (error) {
    signal.throwIfAborted()
    if (deadline.aborted) throw new ModelDiscoveryError('discovery-timeout')
    if (error instanceof ModelDiscoveryError) throw error
    throw new ModelDiscoveryError('discovery-unavailable')
  }
}
