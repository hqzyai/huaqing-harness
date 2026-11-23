/** Administrator-owned model catalog and encrypted provider credentials. */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

/** Supported OpenAI-compatible inference services. */
export type TeamProvider = 'volcengine' | 'qwen' | 'bailian' | 'deepseek' | 'zhipu'
/** One explicit, administrator-verified inference capability. */
export interface TeamModel {
  id: string
  name: string
  contextWindow: number
  maxTokens: number
  vision: boolean
}
/** Public model connection configuration, excluding its encrypted credential. */
export interface TeamModelService {
  id: string
  provider: TeamProvider
  name: string
  baseURL: string
  enabled: boolean
  models: TeamModel[]
}
/** Administrator write; omitting apiKey preserves the stored secret. */
export interface TeamModelWrite extends TeamModelService { apiKey?: string }
/** Administrator connection probe; an existing id may reuse a credential for the same provider. */
export interface TeamModelConnection {
  id?: string
  provider: TeamProvider
  baseURL: string
  apiKey?: string
}
/** A validated provider connection with an in-memory credential, never returned to a browser. */
export interface ResolvedTeamModelConnection {
  provider: TeamProvider
  baseURL: string
  apiKey: string
}

/** Expected administrator configuration failure, localized by the control plane. */
export class TeamModelError extends Error {
  constructor(readonly code: 'invalid-model-service' | 'missing-api-key') { super(code) }
}

const SCHEMA_VERSION = 1

const ENDPOINTS: Record<TeamProvider, readonly string[]> = {
  volcengine: ['https://ark.cn-beijing.volces.com/api/v3', 'https://ark.cn-shanghai.volces.com/api/v3'],
  qwen: ['https://dashscope.aliyuncs.com/compatible-mode/v1', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'],
  bailian: ['https://dashscope.aliyuncs.com/compatible-mode/v1', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'],
  deepseek: ['https://api.deepseek.com', 'https://api.deepseek.com/v1'],
  zhipu: ['https://open.bigmodel.cn/api/paas/v4'],
}
const WORKSPACE_REGIONS = ['cn-beijing', 'ap-southeast-1', 'eu-central-1', 'ap-northeast-1', 'cn-hongkong', 'us-east-1']

function isSupportedEndpoint(provider: TeamProvider, value: string): boolean {
  const endpoint = value.replace(/\/$/, '')
  if (ENDPOINTS[provider].includes(endpoint)) return true
  if (provider !== 'qwen' && provider !== 'bailian') return false
  const workspace = /^https:\/\/((?:ws|llm)-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\.([a-z0-9-]+)\.maas\.aliyuncs\.com\/compatible-mode\/v1$/
    .exec(endpoint)
  return workspace !== null && workspace[0] === endpoint && workspace[1] !== undefined && workspace[1].length <= 63
    && workspace[2] !== undefined && WORKSPACE_REGIONS.includes(workspace[2])
}

function isProvider(value: unknown): value is TeamProvider {
  return value === 'volcengine' || value === 'qwen' || value === 'bailian' || value === 'deepseek' || value === 'zhipu'
}

/** Parse administrator connection fields without requiring model capabilities.
 * @param input - untrusted administrator JSON.
 * @returns a detached connection restricted to supported provider endpoints.
 */
export function parseModelConnection(input: unknown): TeamModelConnection {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new TeamModelError('invalid-model-service')
  const { id, provider, baseURL, apiKey } = input as Record<string, unknown>
  if ((id !== undefined && (typeof id !== 'string' || !/^[a-z][a-z0-9-]{0,47}$/.test(id)))
    || !isProvider(provider) || typeof baseURL !== 'string' || !isSupportedEndpoint(provider, baseURL)
    || (apiKey !== undefined && (typeof apiKey !== 'string' || apiKey.trim().length === 0
      || apiKey.length > 4096 || /[\r\n]/.test(apiKey)))) throw new TeamModelError('invalid-model-service')
  return { provider, baseURL: baseURL.replace(/\/$/, ''),
    ...typeof id === 'string' ? { id } : {}, ...typeof apiKey === 'string' ? { apiKey: apiKey.trim() } : {} }
}

/** Reject malformed catalog writes and endpoints outside the supported cloud services.
 * @param input - parsed JSON from the administrator API.
 * @returns validated, detached service configuration.
 */
export function parseModelService(input: unknown): TeamModelWrite {
  const { provider, baseURL, apiKey } = parseModelConnection(input)
  const value = input as Record<string, unknown>
  const { id, name, enabled, models } = value
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]{0,47}$/.test(id)
    || typeof name !== 'string' || name.trim().length === 0 || name.length > 100
    || typeof enabled !== 'boolean' || !Array.isArray(models) || models.length === 0 || models.length > 100) {
    throw new TeamModelError('invalid-model-service')
  }
  const seen = new Set<string>()
  const parsedModels = models.map((raw: unknown): TeamModel => {
    if (typeof raw !== 'object' || raw === null) throw new TeamModelError('invalid-model-service')
    const model = raw as Record<string, unknown>
    if (typeof model.id !== 'string' || !/^[A-Za-z0-9_.:/-]{1,200}$/.test(model.id) || seen.has(model.id)
      || typeof model.name !== 'string' || model.name.trim().length === 0 || model.name.length > 100
      || typeof model.contextWindow !== 'number' || !Number.isSafeInteger(model.contextWindow) || model.contextWindow < 1024
      || typeof model.maxTokens !== 'number' || !Number.isSafeInteger(model.maxTokens) || model.maxTokens <= 0 || model.maxTokens > model.contextWindow
      || typeof model.vision !== 'boolean') throw new TeamModelError('invalid-model-service')
    seen.add(model.id)
    return { id: model.id, name: model.name.trim(), contextWindow: model.contextWindow, maxTokens: model.maxTokens, vision: model.vision }
  })
  return { id, provider, name: name.trim(), baseURL, enabled, models: parsedModels,
    ...apiKey !== undefined ? { apiKey } : {} }
}

/** Private catalog owner. Encryption keys belong in an external deployment secret. */
export class TeamModels {
  private readonly db: DatabaseSync
  private readonly key: Buffer

  /** Open the catalog store and verify its encryption key.
   * @param filename - private SQLite file.
   * @param encryptionKey - 32 random bytes encoded in base64url.
   */
  constructor(filename: string, encryptionKey: string) {
    this.key = Buffer.from(encryptionKey, 'base64url')
    if (this.key.length !== 32) throw new Error('team-models: encryption key must contain 32 bytes')
    this.db = new DatabaseSync(filename)
    const version = this.db.prepare('PRAGMA user_version').get()?.user_version
    if (version !== 0 && version !== SCHEMA_VERSION) { this.db.close(); throw new Error('team-models: unsupported database version') }
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS services(id TEXT PRIMARY KEY, config TEXT NOT NULL, secret TEXT NOT NULL);
      PRAGMA user_version=${SCHEMA_VERSION};`)
    // Detect a lost/wrong deployment key before accepting requests.
    for (const row of this.db.prepare('SELECT id,secret FROM services').all()) {
      if (typeof row.id !== 'string' || typeof row.secret !== 'string') throw new Error('team-models: invalid persisted secret')
      this.decrypt(row.id, row.secret)
    }
  }

  /** Release the database handle. */
  close(): void { this.db.close() }

  private encrypt(id: string, value: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    cipher.setAAD(Buffer.from(id))
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    return [iv, cipher.getAuthTag(), encrypted].map(item => item.toString('base64url')).join('.')
  }

  private decrypt(id: string, value: string): string {
    const parts = value.split('.')
    if (parts.length !== 3) throw new Error('team-models: invalid encrypted secret')
    const [iv, tag, payload] = parts.map(part => Buffer.from(part, 'base64url'))
    if (!iv || iv.length !== 12 || !tag || tag.length !== 16 || !payload) throw new Error('team-models: invalid encrypted secret')
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
    decipher.setAAD(Buffer.from(id))
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8')
  }

  /** List credential-free configurations.
   * @param enabledOnly - whether to omit disabled services from user discovery.
   * @returns detached configurations.
   */
  list(enabledOnly: boolean): TeamModelService[] {
    return this.db.prepare('SELECT config FROM services ORDER BY id').all().map((row) => {
      if (typeof row.config !== 'string') throw new Error('team-models: invalid persisted configuration')
      return parseModelService(JSON.parse(row.config))
    }).filter(service => !enabledOnly || service.enabled)
  }

  /** Resolve a parsed connection using a new key or the same provider's stored credential.
   * @param input - validated administrator connection fields.
   * @returns a transient credential-bearing connection; this does not persist any edits.
   */
  resolveConnection(input: TeamModelConnection): ResolvedTeamModelConnection {
    const { provider, baseURL } = input
    if (input.apiKey !== undefined) return { provider, baseURL, apiKey: input.apiKey }
    if (input.id === undefined) throw new TeamModelError('missing-api-key')
    const previous = this.db.prepare('SELECT config,secret FROM services WHERE id=?').get(input.id)
    if (!previous || typeof previous.config !== 'string' || typeof previous.secret !== 'string'
      || parseModelService(JSON.parse(previous.config)).provider !== provider) throw new TeamModelError('missing-api-key')
    return { provider, baseURL, apiKey: this.decrypt(input.id, previous.secret) }
  }

  /** Persist a complete service definition; a provider change requires a new credential.
   * @param input - validated administrator write.
   */
  save(input: TeamModelWrite): void {
    const { apiKey, ...config } = input
    const previous = this.db.prepare('SELECT config,secret FROM services WHERE id=?').get(config.id)
    if (apiKey === undefined && previous && (typeof previous.config !== 'string'
      || parseModelService(JSON.parse(previous.config)).provider !== config.provider)) throw new TeamModelError('missing-api-key')
    const secret = apiKey === undefined ? previous?.secret : this.encrypt(config.id, apiKey)
    if (typeof secret !== 'string') throw new TeamModelError('missing-api-key')
    this.db.prepare('INSERT INTO services VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET config=excluded.config,secret=excluded.secret')
      .run(config.id, JSON.stringify(config), secret)
  }

  /** Resolve one enabled model at inference time; selection UIs are advisory.
   * @param serviceId - centrally configured service.
   * @param modelId - exact allowed model id.
   * @returns credential-bearing route, usable only inside the inference proxy.
   */
  route(serviceId: string, modelId: string): { service: TeamModelService; model: TeamModel; apiKey: string } | undefined {
    const service = this.list(true).find(item => item.id === serviceId)
    const model = service?.models.find(model => model.id === modelId)
    if (!service || !model) return undefined
    const secret = this.db.prepare('SELECT secret FROM services WHERE id=?').get(serviceId)?.secret
    if (typeof secret !== 'string') throw new Error('team-models: missing persisted secret')
    return { service, model, apiKey: this.decrypt(serviceId, secret) }
  }
}
