/** Provider discovery uses bounded real Response streams and only validated cloud destinations. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseModelConnection, type ResolvedTeamModelConnection } from '@deepseek-ai/dsh-team-models'
import { discoverModels, type ModelDiscoveryOptions } from '../src/model-discovery.ts'

const options: ModelDiscoveryOptions = { timeoutMs: 10000, maxResponseBytes: 1024 * 1024, maxModels: 1000, defaultMaxTokens: 8192 }
const active = new Set<AbortController>()
afterEach(() => { for (const controller of active) controller.abort(); active.clear() })
function signal(): AbortSignal {
  const controller = new AbortController()
  active.add(controller)
  return controller.signal
}
function connection(): ResolvedTeamModelConnection {
  return { provider: 'bailian', baseURL: 'https://ws-fixture.cn-beijing.maas.aliyuncs.com/compatible-mode/v1', apiKey: 'fixture-private-key' }
}
function workspacePage(page: number, total: number, models: object[], pageSize = 2): object {
  return { success: true, output: { total, page_no: page, page_size: pageSize, models } }
}

describe('administrator model discovery', () => {
  it('reads all workspace pages with actual capacity and modality metadata', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(workspacePage(1, 3, [
        { model: 'text-model', name: 'Text model', capabilities: ['TG'], model_info: { context_window: 131072, max_output_tokens: 16384 },
          inference_metadata: { request_modality: ['Text'], response_modality: ['Text'] } },
        { model: 'vision-model', name: 'Vision model', capabilities: ['VU'], model_info: { context_window: 262144, max_output_tokens: 32768 },
          inference_metadata: { request_modality: ['Text', 'Image'], response_modality: ['Text'] } },
      ])))
      .mockResolvedValueOnce(Response.json(workspacePage(2, 3, [{ model: 'unknown-model', model_info: { context_window: null } }])))
    const result = await discoverModels(connection(), options, signal(), fetcher)
    expect(result).toEqual({ defaultMaxTokens: 8192, models: [
      { id: 'text-model', name: 'Text model', contextWindow: 131072, maxOutputTokens: 16384, vision: false },
      { id: 'vision-model', name: 'Vision model', contextWindow: 262144, maxOutputTokens: 32768, vision: true },
      { id: 'unknown-model', name: 'unknown-model' },
    ] })
    expect(fetcher).toHaveBeenCalledTimes(2)
    for (const [index, [input, init]] of fetcher.mock.calls.entries()) {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      expect(url.origin).toBe('https://ws-fixture.cn-beijing.maas.aliyuncs.com')
      expect(url.pathname).toBe('/api/v1/models')
      expect(url.searchParams.get('page_no')).toBe(String(index + 1))
      expect(url.searchParams.get('page_size')).toBe('100')
      expect(url.searchParams.getAll('capabilities')).toEqual(['TG', 'Reasoning', 'VU'])
      expect(init).toMatchObject({ method: 'GET', redirect: 'manual', headers: { authorization: 'Bearer fixture-private-key' } })
      expect(init?.body).toBeUndefined()
    }
    expect(JSON.stringify(result)).not.toContain('fixture-private-key')
  })

  it('omits unavailable metadata and filters models that cannot produce chat text', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(workspacePage(1, 4, [
      { model: 'text-only', model_info: null },
      { model: 'image-only', inference_metadata: { request_modality: ['Text'], response_modality: ['Image'] } },
      { model: 'embedding', capabilities: ['TR'], inference_metadata: { response_modality: ['Text'] } },
      { model: 'empty-capability', inference_metadata: { request_modality: [], response_modality: [] } },
    ], 4)))
    expect((await discoverModels(connection(), options, signal(), fetcher)).models).toEqual([
      { id: 'text-only', name: 'text-only' }, { id: 'empty-capability', name: 'empty-capability' },
    ])
  })

  it('reads only provider-reported DeepSeek capabilities and keeps older id-only models selectable', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: [
      { id: 'model-known', name: 'Reported model', context_window: 65536, max_output_tokens: 4096,
        input_modalities: ['text', 'image'], output_modalities: ['text'], credential: 'do-not-project-provider-fields' },
      { id: 'model-legacy' },
    ] }))
    const result = await discoverModels({ provider: 'deepseek', baseURL: 'https://api.deepseek.com/v1', apiKey: 'fixture-private-key' },
      options, signal(), fetcher)
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.deepseek.com/v1/models')
    expect(result.models).toEqual([
      { id: 'model-known', name: 'Reported model', contextWindow: 65536, maxOutputTokens: 4096, vision: true },
      { id: 'model-legacy', name: 'model-legacy' },
    ])
    expect(JSON.stringify(result)).not.toContain('do-not-project-provider-fields')
  })

  it('uses the compatible catalog for a legacy DashScope connection', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: [{ id: 'configured-model' }] }))
    const result = await discoverModels({ ...connection(), provider: 'qwen', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
      options, signal(), fetcher)
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1/models')
    expect(result.models).toEqual([{ id: 'configured-model', name: 'configured-model' }])
  })

  it.each([
    ['volcengine', 'https://ark.cn-beijing.volces.com/api/v3'],
    ['zhipu', 'https://open.bigmodel.cn/api/paas/v4'],
  ] as const)('does not send an inference key to an undocumented %s catalog', async (provider, baseURL) => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(discoverModels({ ...connection(), provider, baseURL }, options, signal(), fetcher))
      .rejects.toMatchObject({ code: 'discovery-unsupported' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('retains destination validation at the network operation', async () => {
    const fetcher = vi.fn<typeof fetch>()
    for (const baseURL of ['http://169.254.169.254', 'https://ws-fixture.cn-beijing.maas.aliyuncs.com.evil.test/compatible-mode/v1',
      'https://user:password@ws-fixture.cn-beijing.maas.aliyuncs.com/compatible-mode/v1']) {
      await expect(discoverModels({ ...connection(), baseURL }, options, signal(), fetcher)).rejects.toMatchObject({ code: 'invalid-model-service' })
      expect(() => parseModelConnection({ ...connection(), baseURL })).toThrow('invalid-model-service')
    }
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each([
    [401, 'discovery-unauthorized'], [403, 'discovery-forbidden'], [429, 'discovery-rate-limit'],
    [404, 'discovery-unsupported'], [405, 'discovery-unsupported'], [302, 'discovery-unavailable'], [500, 'discovery-unavailable'],
  ])('contains provider error details for HTTP %s', async (status, code) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('provider body contains fixture-private-key', {
      status, headers: { location: 'http://127.0.0.1/private' },
    }))
    const error = await discoverModels(connection(), options, signal(), fetcher).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ code, message: code })
    expect(JSON.stringify(error)).not.toContain('fixture-private-key')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0]?.[1]?.redirect).toBe('manual')
  })

  it.each([
    { success: true, output: { total: 1, page_no: 2, page_size: 1, models: [{ model: 'x' }] } },
    { success: true, output: { total: 1, page_no: 1, page_size: 1, models: [] } },
    { success: true, output: { total: 0, page_no: 1, page_size: 1, models: [{ model: 'x' }] } },
    { success: true, output: { total: 1, page_no: 1, page_size: 101, models: [{ model: 'x' }] } },
    { success: false, output: { total: 1, page_no: 1, page_size: 1, models: [{ model: 'x' }] } },
    { success: true, output: { total: 1, page_no: 1, page_size: 1, models: [{ model: 'bad id' }] } },
    { success: true, output: { total: 1, page_no: 1, page_size: 1, models: [{ model: 'x', model_info: { context_window: '65536' } }] } },
    { success: true, output: { total: 1, page_no: 1, page_size: 1, models: [{ model: 'x', inference_metadata: { request_modality: [1] } }] } },
  ])('rejects invalid workspace responses without partial results %#', async (payload) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload))
    await expect(discoverModels(connection(), options, signal(), fetcher)).rejects.toMatchObject({ code: 'discovery-invalid-response' })
  })

  it('enforces the complete model count before accepting a partial catalog', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(workspacePage(1, 3, [{ model: 'first' }], 1)))
    await expect(discoverModels(connection(), { ...options, maxModels: 2 }, signal(), fetcher))
      .rejects.toMatchObject({ code: 'discovery-invalid-response' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('bounds cumulative bytes across pages, not only each individual response', async () => {
    const first = workspacePage(1, 2, [{ model: 'first' }], 1)
    const second = workspacePage(2, 2, [{ model: 'second' }], 1)
    const limit = Math.max(Buffer.byteLength(JSON.stringify(first)), Buffer.byteLength(JSON.stringify(second))) + 5
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(first)).mockResolvedValueOnce(Response.json(second))
    await expect(discoverModels(connection(), { ...options, maxResponseBytes: limit }, signal(), fetcher))
      .rejects.toMatchObject({ code: 'discovery-invalid-response' })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it.each([
    new Response('not-json', { headers: { 'content-type': 'application/json' } }),
    new Response('{}', { headers: { 'content-type': 'text/html' } }),
    new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '99999999' } }),
    Response.json([]),
  ])('rejects invalid or oversized response encodings %#', async (response) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response)
    await expect(discoverModels(connection(), options, signal(), fetcher)).rejects.toMatchObject({ code: 'discovery-invalid-response' })
  })

  it('counts UTF-8 response bytes and cancels the oversized stream', async () => {
    let cancelled = false
    const first = Buffer.from('{"data":[{"id":"x","name":"中文')
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(first) },
      cancel() { cancelled = true },
    })
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { headers: { 'content-type': 'application/json' } }))
    await expect(discoverModels({ provider: 'deepseek', baseURL: 'https://api.deepseek.com', apiKey: 'fixture-key' },
      { ...options, maxResponseBytes: first.byteLength - 1 }, signal(), fetcher)).rejects.toMatchObject({ code: 'discovery-invalid-response' })
    expect(cancelled).toBe(true)
  })

  it('maps network failures to a secret-free error', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('unsafe provider request fixture-private-key'))
    await expect(discoverModels(connection(), options, signal(), fetcher)).rejects.toMatchObject({ message: 'discovery-unavailable' })
  })

  it('bounds a stalled provider request with the operation deadline', async () => {
    const fetcher = vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => {
      const current = init?.signal
      if (!current) throw new Error('Fixture requires an abort signal')
      current.addEventListener('abort', () => {
        const reason: unknown = current.reason
        reject(reason instanceof Error ? reason : new Error('Fixture aborted'))
      }, { once: true })
    }))
    await expect(discoverModels(connection(), { ...options, timeoutMs: 10 }, signal(), fetcher))
      .rejects.toMatchObject({ code: 'discovery-timeout' })
  })

  it('waits for response cancellation before a caller-aborted discovery settles', async () => {
    const controller = new AbortController()
    active.add(controller)
    let readStarted: (() => void) | undefined
    let cancelStarted: (() => void) | undefined
    let finishCancel: (() => void) | undefined
    const reading = new Promise<void>((resolve) => { readStarted = resolve })
    const cancelling = new Promise<void>((resolve) => { cancelStarted = resolve })
    const release = new Promise<void>((resolve) => { finishCancel = resolve })
    const body = new ReadableStream<Uint8Array>({
      start(stream) { stream.enqueue(Buffer.from('{')) },
      pull() { readStarted?.() },
      cancel() { cancelStarted?.(); return release },
    })
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { headers: { 'content-type': 'application/json' } }))
    let settled = false
    const pending = discoverModels(connection(), options, controller.signal, fetcher).then(
      (value) => { settled = true; return value },
      (error: unknown) => { settled = true; return error },
    )
    const reason = new Error('fixture caller cancelled')
    try {
      await reading
      controller.abort(reason)
      await cancelling
      expect(settled).toBe(false)
      finishCancel?.()
      expect(await pending).toBe(reason)
    } finally {
      controller.abort()
      finishCancel?.()
      await pending
    }
  })

  it('does not start a request after caller cancellation', async () => {
    const controller = new AbortController()
    const reason = new Error('fixture already cancelled')
    controller.abort(reason)
    const fetcher = vi.fn<typeof fetch>()
    await expect(discoverModels(connection(), options, controller.signal, fetcher)).rejects.toBe(reason)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
