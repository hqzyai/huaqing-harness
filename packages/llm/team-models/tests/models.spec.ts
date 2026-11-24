/** Credential isolation and inference-time catalog authorization. */
import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { TeamModels, parseModelConnection, parseModelService } from '../src/index.ts'

const stores: TeamModels[] = []
afterEach(() => { for (const store of stores.splice(0)) store.close() })
function store(): TeamModels {
  const models = new TeamModels(':memory:', randomBytes(32).toString('base64url'))
  stores.push(models)
  return models
}
function service() {
  return parseModelService({ id: 'deepseek', provider: 'deepseek', name: 'Team DeepSeek', baseURL: 'https://api.deepseek.com/v1', enabled: true,
    models: [{ id: 'configured-model', name: 'Configured model', contextWindow: 65536, maxTokens: 8192, vision: false }], apiKey: 'private-provider-key' })
}
describe('centrally configured team models', () => {
  it.each([
    ['volcengine', 'https://ark.cn-beijing.volces.com/api/v3'],
    ['qwen', 'https://dashscope.aliyuncs.com/compatible-mode/v1'],
    ['bailian', 'https://dashscope.aliyuncs.com/compatible-mode/v1'],
    ['deepseek', 'https://api.deepseek.com/v1'],
    ['zhipu', 'https://open.bigmodel.cn/api/paas/v4'],
  ])('admits an explicit %s model catalog through its supported endpoint', (provider, baseURL) => {
    const models = store()
    const input = parseModelService({ ...service(), provider, baseURL })
    models.save(input)
    expect(models.list(true)).toMatchObject([{ provider, baseURL }])
    expect(models.route(input.id, 'configured-model')?.model.maxTokens).toBe(8192)
  })

  it.each(['qwen', 'bailian'])('admits %s workspace endpoints in each supported region', (provider) => {
    const models = store()
    for (const region of ['cn-beijing', 'ap-southeast-1', 'eu-central-1', 'ap-northeast-1', 'cn-hongkong', 'us-east-1']) {
      for (const workspace of ['ws-fixture123', 'llm-fixture123']) {
        const baseURL = `https://${workspace}.${region}.maas.aliyuncs.com/compatible-mode/v1`
        const input = parseModelService({ ...service(), provider, baseURL: `${baseURL}/` })
        models.save(input)
        expect(models.list(true)).toMatchObject([{ provider, baseURL }])
        expect(models.route(input.id, 'configured-model')?.service.baseURL).toBe(baseURL)
      }
    }
  })

  it.each(['qwen', 'bailian'])('rejects malformed and untrusted %s workspace URLs', (provider) => {
    const host = 'ws-fixture123.cn-beijing.maas.aliyuncs.com'
    for (const baseURL of [
      `http://${host}/compatible-mode/v1`,
      `https://${host}:443/compatible-mode/v1`,
      `https://${host}:8443/compatible-mode/v1`,
      `https://user:password@${host}/compatible-mode/v1`,
      `https://${host}/compatible-mode/v1?key=value`,
      `https://${host}/compatible-mode/v1#fragment`,
      `https://${host}/compatible-mode/v1\n`,
      `https://${host}/api/v1`,
      `https://${host}/compatible-mode/v1/../v1`,
      `https://${host}/compatible-mode/v1//`,
      `https://${host}.evil.test/compatible-mode/v1`,
      `https://${host}./compatible-mode/v1`,
      'https://nested.ws-fixture123.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
      'https://ws-fixture123.cn-shanghai.maas.aliyuncs.com/compatible-mode/v1',
      'https://trial.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
      'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
      'https://ws-.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
      'https://ws-fixture-.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
      `https://ws-${'a'.repeat(61)}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`,
    ]) expect(() => parseModelService({ ...service(), provider, baseURL })).toThrow('invalid-model-service')
    for (const otherProvider of ['volcengine', 'deepseek', 'zhipu']) {
      expect(() => parseModelService({ ...service(), provider: otherProvider,
        baseURL: `https://${host}/compatible-mode/v1` })).toThrow('invalid-model-service')
    }
  })

  it('preserves a stored credential when moving to a workspace endpoint', () => {
    const models = store()
    models.save(parseModelService({ ...service(), provider: 'bailian',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' }))
    const config = models.list(false)[0]
    expect(config).toBeDefined()
    const baseURL = 'https://ws-fixture123.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'
    models.save(parseModelService({ ...config, baseURL }))
    expect(models.route('deepseek', 'configured-model')).toMatchObject({ service: { baseURL }, apiKey: 'private-provider-key' })
  })

  it('parses connection fields before a model list or capability values exist', () => {
    expect(parseModelConnection({ provider: 'bailian', baseURL: 'https://ws-fixture.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/',
      apiKey: ' new-fixture-key ' })).toEqual({ provider: 'bailian',
      baseURL: 'https://ws-fixture.cn-beijing.maas.aliyuncs.com/compatible-mode/v1', apiKey: 'new-fixture-key' })
    for (const invalid of [null, [], {}, { provider: 'other' }, { provider: 'deepseek', baseURL: 'http://127.0.0.1' },
      { provider: 'deepseek', baseURL: 'https://api.deepseek.com', id: 'INVALID' },
      { provider: 'deepseek', baseURL: 'https://api.deepseek.com', apiKey: '' },
      { provider: 'deepseek', baseURL: 'https://api.deepseek.com', apiKey: 'key\nheader' }]) {
      expect(() => parseModelConnection(invalid)).toThrow('invalid-model-service')
    }
  })

  it('resolves a discovery credential without persisting connection edits', () => {
    const models = store()
    models.save(service())
    expect(models.resolveConnection(parseModelConnection({ id: 'deepseek', provider: 'deepseek', baseURL: 'https://api.deepseek.com' })))
      .toEqual({ provider: 'deepseek', baseURL: 'https://api.deepseek.com', apiKey: 'private-provider-key' })
    expect(models.resolveConnection(parseModelConnection({ provider: 'deepseek', baseURL: 'https://api.deepseek.com', apiKey: 'probe-only-key' })))
      .toEqual({ provider: 'deepseek', baseURL: 'https://api.deepseek.com', apiKey: 'probe-only-key' })
    expect(models.list(false)[0]?.baseURL).toBe('https://api.deepseek.com/v1')
    expect(models.route('deepseek', 'configured-model')?.apiKey).toBe('private-provider-key')
    for (const input of [
      { provider: 'deepseek', baseURL: 'https://api.deepseek.com' },
      { id: 'missing', provider: 'deepseek', baseURL: 'https://api.deepseek.com' },
      { id: 'deepseek', provider: 'bailian', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    ]) expect(() => models.resolveConnection(parseModelConnection(input))).toThrow('missing-api-key')
  })

  it('requires a replacement credential before changing the saved provider', () => {
    const models = store()
    models.save(service())
    const { apiKey: _key, ...config } = service()
    const replacement = parseModelService({ ...config, provider: 'bailian', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' })
    expect(() => { models.save(replacement) }).toThrow('missing-api-key')
    expect(models.route('deepseek', 'configured-model')?.apiKey).toBe('private-provider-key')
    expect(models.list(false)[0]?.provider).toBe('deepseek')
    models.save({ ...replacement, apiKey: 'new-provider-fixture-key' })
    expect(models.route('deepseek', 'configured-model')?.apiKey).toBe('new-provider-fixture-key')
    expect(models.list(false)[0]?.provider).toBe('bailian')
  })

  it('lists enabled, explicitly configured models without ever returning API keys', () => {
    const models = store()
    models.save(service())
    expect(JSON.stringify(models.list(true))).not.toContain('private-provider-key')
    expect(models.list(true)[0]?.models.map(model => model.id)).toEqual(['configured-model'])
    expect(models.route('deepseek', 'configured-model')?.apiKey).toBe('private-provider-key')
    expect(models.route('deepseek', 'unconfigured-model')).toBeUndefined()
    expect(models.route('other-user-route', 'configured-model')).toBeUndefined()
  })

  it('preserves a blank-edit secret and rejects disabled services at execution time', () => {
    const models = store()
    models.save(service())
    const { apiKey: _key, ...config } = service()
    models.save({ ...config, name: 'Renamed service' })
    expect(models.route('deepseek', 'configured-model')?.apiKey).toBe('private-provider-key')
    models.save({ ...config, enabled: false })
    expect(models.list(true)).toEqual([])
    expect(models.route('deepseek', 'configured-model')).toBeUndefined()
    expect(models.list(false)).toHaveLength(1)
  })

  it('refuses missing credentials, duplicate models, invalid limits, and untrusted destinations', () => {
    const models = store()
    const { apiKey: _key, ...config } = service()
    expect(() =>{  models.save(config) }).toThrow('missing-api-key')
    for (const baseURL of ['http://api.deepseek.com/v1', 'https://api.deepseek.com.evil.test/v1', 'http://169.254.169.254', 'https://api.deepseek.com/v1/../../']) {
      expect(() => parseModelService({ ...service(), baseURL })).toThrow('invalid-model-service')
    }
    expect(() => parseModelService({ ...service(), models: [service().models[0], service().models[0]] })).toThrow('invalid-model-service')
    expect(() => parseModelService({ ...service(), models: [{ ...service().models[0], maxTokens: 999999 }] })).toThrow('invalid-model-service')
  })
})
