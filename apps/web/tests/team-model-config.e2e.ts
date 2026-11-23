/** Keyless browser coverage for administrator model setup, metadata and stale requests. */
import { readFile } from 'node:fs/promises'
import { chromium, type Browser, type BrowserContext } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { portalPage } from '../../../packages/host/team-server/src/portal.ts'

interface CatalogModel {
  id: string
  name: string
  contextWindow?: number
  maxOutputTokens?: number
  vision?: boolean
}
interface Service {
  id: string
  provider: string
  name: string
  baseURL: string
  enabled: boolean
  models: { id: string; name: string; contextWindow: number; maxTokens: number; vision: boolean }[]
}
const defaults = { defaultMaxTokens: 8192, minimumContextWindow: 16384 }
const reported = { id: 'workspace-model', name: 'Workspace model', contextWindow: 1_000_000, maxOutputTokens: 393216, vision: false }
const fixtureKey = 'fixture-key-for-keyless-browser-only'
let browser: Browser
const contexts: BrowserContext[] = []
beforeAll(async () => { browser = await chromium.launch() })
afterEach(async () => { await Promise.all(contexts.splice(0).map(context => context.close())) })
afterAll(async () => { await browser?.close() })

async function fixture(options: { service?: Service; locale?: string; mobile?: boolean; dark?: boolean } = {}) {
  const context = await browser.newContext({ locale: options.locale ?? 'en-US', viewport: options.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, colorScheme: options.dark ? 'dark' : 'light' })
  contexts.push(context)
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const calls: { path: string; body: Record<string, unknown> }[] = []
  const services = options.service ? [options.service] : []
  let read: () => Promise<{ models: CatalogModel[]; defaultMaxTokens: number; minimumContextWindow: number; listUnavailable?: boolean }> = async () => ({ models: [reported, { id: 'small', name: 'Too small', contextWindow: 1024, maxOutputTokens: 390, vision: false }, { id: 'unknown', name: 'Unreported capabilities' }], ...defaults })
  let failure: string | undefined
  await context.route('https://team.fixture/**', async (route) => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/team/api/')) {
      if (url.pathname === '/team/logo.svg') { await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }); return }
      if (url.pathname.endsWith('.css')) { await route.fulfill({ contentType: 'text/css', body: '' }); return }
      const document = portalPage(options.locale ?? 'en', defaults)
      await route.fulfill({ contentType: 'text/html', headers: { 'content-security-policy': document.csp }, body: document.html })
      return
    }
    const path = url.pathname.slice('/team/api/'.length)
    const payload: unknown = route.request().postDataJSON()
    const body = typeof payload === 'object' && payload !== null && !Array.isArray(payload) ? payload as Record<string, unknown> : {}
    if (route.request().method() === 'POST') calls.push({ path, body })
    if (path === 'model-discovery') {
      if (failure) { await route.fulfill({ status: 400, json: { error: failure } }); return }
      await route.fulfill({ json: await read() })
      return
    }
    if (path === 'services' && route.request().method() === 'POST') {
      await route.fulfill({ json: { ok: true } })
      return
    }
    await route.fulfill({ json: path === 'me' ? { user: { email: 'admin@example.com', role: 'admin' }, csrf: 'fixture-csrf' } : path === 'users' ? { users: [] } : { services } })
  })
  await page.goto('https://team.fixture/team/admin')
  await page.getByRole('heading', { name: options.locale?.startsWith('zh') ? '\u6a21\u578b\u670d\u52a1' : 'Model services', exact: true }).waitFor()
  return { page, context, calls, errors,
    setRead: (next: typeof read) => { read = next },
    setFailure: (code: string | undefined) => { failure = code },
  }
}

async function editor(f: Awaited<ReturnType<typeof fixture>>) {
  await f.page.getByRole('button', { name: 'New service', exact: true }).click()
  return f.page.locator('.model-editor')
}

async function discover(f: Awaited<ReturnType<typeof fixture>>) {
  await f.page.getByLabel('API key', { exact: true }).fill(fixtureKey)
  await f.page.getByRole('button', { name: 'Verify connection and read models', exact: true }).click()
  await f.page.getByRole('searchbox', { name: 'Search model name or ID' }).waitFor()
}

describe('administrator model setup', () => {
  it('reads provider metadata, selects searchable models and saves a generated internal ID', async () => {
    const f = await fixture()
    const form = await editor(f)
    expect(await form.getByLabel('Service name', { exact: true }).inputValue()).toBe('Alibaba Cloud Model Studio')
    const id = await form.getByLabel('Service ID (lowercase letters, digits, hyphens)', { exact: true }).inputValue()
    expect(id).toMatch(/^bailian-[a-f0-9]{32}$/)
    expect(await form.locator('details').first().isVisible()).toBe(true)
    await discover(f)
    expect(await f.page.getByRole('checkbox', { name: /^Too small/ }).isDisabled()).toBe(true)
    await f.page.getByRole('searchbox').fill('Workspace')
    await f.page.getByRole('checkbox', { name: /^Workspace model/ }).check()
    expect(await form.getByLabel('Total context capacity (tokens)', { exact: true }).inputValue()).toBe('1000000')
    expect(await form.getByLabel('Maximum output per request (tokens)', { exact: true }).inputValue()).toBe('8192')
    expect(await form.getByRole('button', { name: 'Remove', exact: true }).isDisabled()).toBe(true)
    expect(await form.locator('.model-card option[value=true]').getAttribute('disabled')).not.toBeNull()
    await form.getByLabel('Display name', { exact: true }).fill('Team model')
    await form.getByRole('button', { name: 'Save service', exact: true }).click()
    await expect.poll(() => f.calls.some(call => call.path === 'services')).toBe(true)
    const saved = f.calls.find(call => call.path === 'services')?.body
    expect(saved?.id).toBe(id)
    expect(saved?.apiKey).toBe(fixtureKey)
    expect(JSON.stringify(saved?.models, null, 2) + '\n').toBe(await readFile(new URL('./expected/team-model-config/configured-models.expected.json', import.meta.url), 'utf8'))
    await expect.poll(() => form.getByLabel('API key', { exact: true }).inputValue()).toBe('')
    expect(f.errors).toEqual([])
  })

  it('requires explicit unreported capabilities and keeps failed form values for retry', async () => {
    const f = await fixture()
    const form = await editor(f)
    await discover(f)
    await f.page.getByRole('checkbox', { name: /^Unreported capabilities/ }).check()
    const capacity = form.getByLabel('Total context capacity (tokens)', { exact: true })
    expect(await capacity.inputValue()).toBe('')
    expect(await form.locator('.model-parameters').getAttribute('open')).not.toBeNull()
    await capacity.fill('1024')
    await form.getByLabel('Image input capability', { exact: true }).selectOption('false')
    await form.getByRole('checkbox', { name: 'I checked unreported limits and image support against provider documentation.' }).check()
    await form.getByRole('button', { name: 'Save service', exact: true }).click()
    expect(f.calls.filter(call => call.path === 'services')).toHaveLength(0)
    expect(await capacity.inputValue()).toBe('1024')
    await capacity.fill('131072')
    await form.getByRole('checkbox', { name: 'I checked unreported limits and image support against provider documentation.' }).check()
    await form.getByRole('button', { name: 'Save service', exact: true }).click()
    await expect.poll(() => f.calls.some(call => call.path === 'services')).toBe(true)
    f.setFailure('discovery-unauthorized')
    await form.getByRole('button', { name: 'Verify connection and read models' }).click()
    await form.getByRole('alert').filter({ hasText: 'The provider rejected the key.' }).waitFor()
    expect(await capacity.inputValue()).toBe('131072')
    expect(await form.getByLabel('Model / endpoint ID', { exact: true }).inputValue()).toBe('unknown')
    expect(f.errors).toEqual([])
  })

  it('discards stale discovery after connection edits and offers honest manual-only providers', async () => {
    const f = await fixture()
    const form = await editor(f)
    await f.page.addInitScript(() => { AbortController.prototype.abort = () => {} })
    // Keep a request deliverable after editing so the revision guard is exercised too.
    await f.page.evaluate(() => { AbortController.prototype.abort = () => {} })
    let resolve!: (value: { models: CatalogModel[]; defaultMaxTokens: number; minimumContextWindow: number }) => void
    f.setRead(() => new Promise((done) => { resolve = done }))
    await form.getByLabel('API key', { exact: true }).fill(fixtureKey)
    await form.getByRole('button', { name: 'Verify connection and read models' }).click()
    await expect.poll(() => f.calls.filter(call => call.path === 'model-discovery').length).toBe(1)
    await form.getByLabel('API base URL', { exact: true }).fill('https://dashscope-intl.aliyuncs.com/compatible-mode/v1')
    const completed = f.page.waitForResponse(response => response.url().endsWith('/team/api/model-discovery'))
    resolve({ models: [reported], ...defaults })
    await (await completed).finished()
    await form.getByRole('button', { name: 'Verify connection and read models' }).waitFor({ state: 'visible' })
    await expect.poll(() => form.getByRole('searchbox').isVisible()).toBe(false)
    expect(await form.locator('.catalog-option').count()).toBe(0)
    await form.getByLabel('Provider', { exact: true }).selectOption('volcengine')
    expect(await form.getByLabel('API key', { exact: true }).inputValue()).toBe('')
    expect(await form.getByRole('button', { name: 'Verify connection and read models' }).isVisible()).toBe(false)
    await form.getByText(/the key has not been verified/).first().waitFor()
    await form.getByRole('button', { name: 'Add a model manually' }).click()
    expect(await form.getByLabel('Model / endpoint ID', { exact: true }).getAttribute('placeholder')).toBe('ep-xxxxxxxx')
    await form.getByLabel('Provider', { exact: true }).selectOption('bailian')
    await form.getByLabel('API key', { exact: true }).fill(fixtureKey)
    await form.getByRole('button', { name: 'Verify connection and read models' }).click()
    await expect.poll(() => f.calls.filter(call => call.path === 'model-discovery').length).toBe(2)
    const closedResponse = f.page.waitForResponse(response => response.url().endsWith('/team/api/model-discovery'))
    await form.getByRole('button', { name: 'Close editor', exact: true }).click()
    resolve({ models: [reported], ...defaults })
    await (await closedResponse).finished()
    expect(await f.page.locator('.model-editor').count()).toBe(0)
    await editor(f)
    expect(await f.page.locator('.catalog-option').count()).toBe(0)
    expect(f.errors).toEqual([])
  })

  it('keeps a saved credential and capabilities when only the service name changes', async () => {
    const service: Service = { id: 'retained-id', provider: 'bailian', name: 'Saved service', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', enabled: true, models: [{ id: reported.id, name: 'Original name', contextWindow: 1_000_000, maxTokens: 8192, vision: false }] }
    const f = await fixture({ service })
    await f.page.getByRole('button', { name: 'Edit', exact: true }).click()
    const form = f.page.locator('.model-editor')
    await form.getByLabel('Service name', { exact: true }).fill('Renamed service')
    await form.getByRole('button', { name: 'Save service', exact: true }).click()
    await expect.poll(() => f.calls.some(call => call.path === 'services')).toBe(true)
    expect(f.calls.some(call => call.path === 'model-discovery')).toBe(false)
    const saved = f.calls.find(call => call.path === 'services')?.body
    expect(saved?.id).toBe('retained-id')
    expect(saved?.name).toBe('Renamed service')
    expect(saved?.models).toEqual(service.models)
    expect(saved).not.toHaveProperty('apiKey')
    await form.getByRole('button', { name: 'Verify connection and read models' }).click()
    await form.getByRole('searchbox').waitFor()
    expect(await form.getByLabel('Total context capacity (tokens)', { exact: true }).getAttribute('readonly')).not.toBeNull()
    await form.getByLabel('API base URL', { exact: true }).fill('https://dashscope-intl.aliyuncs.com/compatible-mode/v1')
    expect(await form.getByLabel('Total context capacity (tokens)', { exact: true }).inputValue()).toBe('1000000')
    expect(await form.getByLabel('Total context capacity (tokens)', { exact: true }).getAttribute('readonly')).toBeNull()
    expect(await form.getByRole('checkbox', { name: 'I checked unreported limits and image support against provider documentation.' }).isChecked()).toBe(false)
    expect(f.errors).toEqual([])
  })

  it('reuses an existing credential only on its provider and refreshes legacy capacity from metadata', async () => {
    const service: Service = { id: 'retained-id', provider: 'bailian', name: 'Saved service', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', enabled: true, models: [{ id: reported.id, name: 'Original name', contextWindow: 1024, maxTokens: 390, vision: false }] }
    const f = await fixture({ service })
    await f.page.getByRole('button', { name: 'Edit', exact: true }).click()
    const form = f.page.locator('.model-editor')
    await form.getByLabel('Display name', { exact: true }).fill('Custom team name')
    expect(await form.locator('.model-parameters .capacity-error').textContent()).toContain('Below the workspace minimum')
    expect(await form.getByLabel('API key', { exact: true }).inputValue()).toBe('')
    await form.getByRole('button', { name: 'Verify connection and read models' }).click()
    await f.page.getByRole('searchbox').waitFor()
    const discovery = f.calls.find(call => call.path === 'model-discovery')?.body
    expect(discovery?.id).toBe('retained-id')
    expect(discovery).not.toHaveProperty('apiKey')
    expect(await form.getByLabel('Total context capacity (tokens)', { exact: true }).inputValue()).toBe('1000000')
    expect(await form.getByLabel('Display name', { exact: true }).inputValue()).toBe('Custom team name')
    expect(await form.getByLabel('Maximum output per request (tokens)', { exact: true }).inputValue()).toBe('390')
    expect(await form.locator('.model-parameters .capacity-error').textContent()).toBe('')
    expect(await form.getByRole('button', { name: 'Remove', exact: true }).isDisabled()).toBe(true)
    f.setRead(async () => ({ models: [{ ...reported, maxOutputTokens: 256 }], ...defaults }))
    await form.getByRole('button', { name: 'Verify connection and read models' }).click()
    await expect.poll(() => form.getByLabel('Maximum output per request (tokens)', { exact: true }).inputValue()).toBe('256')
    await form.getByText('Output limit adjusted to 256 tokens to fit provider capabilities.', { exact: true }).waitFor()
    await form.getByRole('button', { name: 'Save service', exact: true }).click()
    await expect.poll(() => f.calls.some(call => call.path === 'services')).toBe(true)
    expect(f.calls.find(call => call.path === 'services')?.body).not.toHaveProperty('apiKey')
    f.setRead(async () => ({ models: [{ ...reported, contextWindow: 1024, maxOutputTokens: 390 }], ...defaults }))
    await form.getByRole('button', { name: 'Verify connection and read models' }).click()
    await expect.poll(() => form.getByLabel('Total context capacity (tokens)', { exact: true }).inputValue()).toBe('1024')
    await form.getByRole('button', { name: 'Save service', exact: true }).click()
    await form.getByRole('alert').filter({ hasText: 'The model context is below the workspace minimum.' }).waitFor()
    expect(f.calls.filter(call => call.path === 'services')).toHaveLength(1)
    await form.getByLabel('Provider', { exact: true }).selectOption('deepseek')
    expect(await form.getByLabel('API key', { exact: true }).getAttribute('required')).not.toBeNull()
    expect(await form.getByLabel('Service ID (lowercase letters, digits, hyphens)', { exact: true }).inputValue()).toBe('retained-id')
    expect(f.errors).toEqual([])
  })

  it.each(['en-US', 'zh-CN'])('keeps %s setup usable at 390px in dark mode', async (locale) => {
    const f = await fixture({ locale, mobile: true, dark: true })
    await f.page.locator('section').nth(1).getByRole('button').first().click()
    const form = f.page.locator('.model-editor')
    await form.locator('select').first().selectOption('volcengine')
    await form.locator('button').filter({ hasText: locale === 'zh-CN' ? '\u624b\u52a8\u6dfb\u52a0\u6a21\u578b' : 'Add a model manually' }).click()
    expect(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const control of await form.locator('input,select,button').all()) {
      if (!await control.isVisible()) continue
      const bounds = await control.boundingBox()
      expect(bounds?.x).toBeGreaterThanOrEqual(0)
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390)
    }
    await form.locator('input[type=password]').focus()
    await f.page.keyboard.press('Tab')
    expect(await f.page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')
    expect(f.errors).toEqual([])
  })
})
