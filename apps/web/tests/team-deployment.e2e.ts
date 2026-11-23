/** Opt-in, real Docker and shipped-profile acceptance with only the external cloud API mocked. */
import { spawn, execFile, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createServer, request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { writeComposerDraft } from './support.ts'

const execute = promisify(execFile)
const root = fileURLToPath(new URL('../../..', import.meta.url))
const password = 'Team fixture private password 42'
const prefix = `hqzy-e2e-${randomBytes(4).toString('hex')}`
const evidence = join(root, '.artifacts', prefix)

describe.skipIf(process.env.DSH_TEAM_DOCKER_E2E !== '1')('team deployment: accounts, Docker isolation and configured model selection', () => {
  let child: ChildProcess | undefined
  let browser: Browser | undefined
  let admin: BrowserContext
  let first: BrowserContext
  let second: BrowserContext
  let page: Page | undefined
  let origin: string
  let target = ''
  let ingress: Server | undefined
  const containerGateway = process.env.DSH_TEAM_GATEWAY_E2E === '1'
  const gatewayName = `${prefix}-gateway`
  const edgeName = `${prefix}-edge`
  const edgeImage = 'huaqing-team-edge:0.2.1-rc.2'
  const controlNetwork = `${prefix}-control`
  let logs = ''
  const members: string[] = []

  const api = async (context: BrowserContext, path: string, body?: object, expected = 200): Promise<Record<string, unknown>> => {
    const me = await context.request.get(`${origin}/team/api/me`)
    const identity: unknown = await me.json()
    const csrf = typeof identity === 'object' && identity !== null && 'csrf' in identity && typeof identity.csrf === 'string' ? identity.csrf : ''
    const response = body === undefined ? await context.request.get(`${origin}/team/api/${path}`)
      : await context.request.post(`${origin}/team/api/${path}`, { data: body,
        headers: { origin, 'x-hqzy-request': '1', 'x-hqzy-csrf': csrf } })
    expect(response.status(), await response.text()).toBe(expected)
    const result: unknown = await response.json()
    if (typeof result !== 'object' || result === null || Array.isArray(result)) throw new Error('Expected an API object')
    return result as Record<string, unknown>
  }

  beforeAll(async () => {
    await mkdir(evidence, { mode: 0o700 })
    for (const name of ['encryption', 'worker-secret', 'bootstrap']) await writeFile(join(evidence, name), randomBytes(32).toString('base64url'), { mode: 0o600 })
    ingress = createServer((req, res) => {
      const upstream = request(new URL(req.url ?? '/', target), { method: req.method, headers: req.headers }, (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers)
        response.pipe(res)
      })
      upstream.once('error', () => { res.destroy() })
      res.once('close', () => { upstream.destroy() })
      req.pipe(upstream)
    })
    ingress.on('upgrade', (req, socket, head) => {
      const upstream = request(new URL(req.url ?? '/', target), { headers: req.headers })
      upstream.once('error', () => { socket.destroy() })
      upstream.once('response', (response) => { response.destroy(); socket.destroy() })
      upstream.once('upgrade', (response, peer, upstreamHead) => {
        const headers = Object.entries(response.headers).flatMap(([key, value]) => value === undefined ? [] : [`${key}: ${String(value)}`])
        socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headers.join('\r\n')}\r\n\r\n`)
        if (head.length) peer.write(head)
        if (upstreamHead.length) socket.write(upstreamHead)
        socket.once('close', () => { peer.destroy() })
        peer.once('close', () => { socket.destroy() })
        peer.on('error', () => { socket.destroy() })
        socket.on('error', () => { peer.destroy() })
        socket.pipe(peer).pipe(socket)
      })
      socket.once('close', () => { upstream.destroy() })
      upstream.end()
    })
    await new Promise<void>((resolve) => { ingress?.listen(0, '0.0.0.0', resolve) })
    // Docker Desktop workers reach this fixture through host.docker.internal.
    const port = (ingress.address() as AddressInfo).port
    origin = `http://127.0.0.1:${port}`
    const overlay = join(evidence, 'readiness.yml')
    await writeFile(overlay, JSON.stringify([{ insert: [{ id: 'team-test-readiness', name: new URL('./fixtures/team-model-api.mjs', import.meta.url).href }] }]))
    await execute('docker', ['image', 'inspect', 'huaqing-team-worker:0.2.1-rc.2'])
    if (containerGateway) {
      await execute('docker', ['network', 'create', controlNetwork])
      await writeFile(join(evidence, 'cloud.mjs'), await readFile(new URL('./fixtures/team-model-api.mjs', import.meta.url)))
      const environment = {
        DSH_HOME: '/team-fixture/profile', TEAM_PORT: '18410', TEAM_PUBLIC_ORIGIN: origin,
        TEAM_DATA_DIR: '/team-fixture/data', TEAM_ENCRYPTION_KEY_FILE: '/team-fixture/encryption',
        TEAM_WORKER_SECRET_FILE: '/team-fixture/worker-secret', TEAM_BOOTSTRAP_EMAIL: 'admin@example.com',
        TEAM_BOOTSTRAP_TOKEN_FILE: '/team-fixture/bootstrap', TEAM_WORKER_IMAGE: 'huaqing-team-worker:0.2.1-rc.2',
        TEAM_WORKER_GATEWAY_URL: 'http://hqzy-control:18411', TEAM_WORKER_PREFIX: prefix,
        TEAM_GATEWAY_CONTAINER: gatewayName, TEAM_CONTROL_NETWORK: controlNetwork, TEAM_LOCAL_DEVELOPMENT: '1',
        TEAM_TEST_REQUESTS: '/team-fixture/model-requests.jsonl', NODE_OPTIONS: '--import /team-fixture/cloud.mjs',
      }
      await execute('docker', ['run', '--detach', '--name', gatewayName, '--network', `name=${controlNetwork},gw-priority=1`, '--read-only', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges:true', '--tmpfs', '/tmp:rw,nosuid,nodev,size=268435456',
        '--volume', '/var/run/docker.sock:/var/run/docker.sock',
        '--mount', `type=bind,source=${evidence},target=/team-fixture`,
        ...Object.entries(environment).flatMap(([key, value]) => ['--env', `${key}=${value}`]), 'huaqing-team-gateway:0.2.1-rc.2'])
      expect((await execute('docker', ['port', gatewayName])).stdout.trim()).toBe('')
      await execute('docker', ['run', '--detach', '--name', edgeName, '--network', controlNetwork,
        '--read-only', '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
        '--tmpfs', '/tmp:rw,nosuid,nodev,size=16777216', '--publish', '127.0.0.1::18410',
        '--mount', `type=bind,source=${join(root, 'deployments/team/edge.caddyfile')},target=/etc/caddy/Caddyfile,readonly`,
        '--env', `TEAM_GATEWAY_UPSTREAM=${gatewayName}:18410`, edgeImage])
      const address = (await execute('docker', ['port', edgeName, '18410/tcp'])).stdout.trim()
      if (!/^127\.0\.0\.1:[0-9]+$/.test(address)) throw new Error('Fixture edge must publish only on loopback')
      target = `http://${address}`
    } else {
      child = spawn(process.execPath, ['--import', 'tsx/esm', '--import', fileURLToPath(new URL('./fixtures/team-model-api.mjs', import.meta.url)),
        'apps/cli/src/bin.ts', '--profile', 'team', '--patch', overlay], { cwd: root, env: {
        ...process.env, DSH_HOME: join(evidence, 'profile'), TEAM_PORT: '0', TEAM_PUBLIC_ORIGIN: origin,
        TEAM_DATA_DIR: join(evidence, 'data'), TEAM_ENCRYPTION_KEY_FILE: join(evidence, 'encryption'),
        TEAM_WORKER_SECRET_FILE: join(evidence, 'worker-secret'), TEAM_BOOTSTRAP_EMAIL: 'admin@example.com',
        TEAM_BOOTSTRAP_TOKEN_FILE: join(evidence, 'bootstrap'), TEAM_WORKER_IMAGE: 'huaqing-team-worker:0.2.1-rc.2',
        TEAM_WORKER_GATEWAY_URL: `http://host.docker.internal:${port}`, TEAM_WORKER_PREFIX: prefix,
        TEAM_TEST_REQUESTS: join(evidence, 'model-requests.jsonl'),
        TEAM_TEST_READY: join(evidence, 'ready'),
      }, stdio: ['ignore', 'pipe', 'pipe'] })
      child.stdout?.on('data', (data: Buffer) => { logs += data.toString() })
      child.stderr?.on('data', (data: Buffer) => { logs += data.toString() })
    }
    await vi.waitFor(async () => {
      if (child && child.exitCode !== null) throw new Error(logs)
      if (!containerGateway) target = await readFile(join(evidence, 'ready'), 'utf8')
      expect((await fetch(`${origin}/team/health`)).status).toBe(200)
    }, { timeout: 30000 })
    browser = await chromium.launch()
    admin = await browser.newContext({ locale: 'zh-CN' })
    first = await browser.newContext({ locale: 'zh-CN' })
    second = await browser.newContext({ locale: 'zh-CN' })
    const token = await readFile(join(evidence, 'bootstrap'), 'utf8')
    const onboarding = await admin.newPage()
    await onboarding.goto(`${origin}/team/accept#${token}`)
    await onboarding.getByLabel('设置密码（15–128 个字符）').fill(password)
    expect(new URL(onboarding.url()).hash).toBe('')
    await onboarding.getByRole('button', { name: '设置密码并激活账号', exact: true }).click()
    await onboarding.waitForURL(`${origin}/team/login?activated=1`)
    await onboarding.close()
    await api(admin, 'login', { email: 'admin@example.com', password })
    for (const [index, context] of [first, second].entries()) {
      const email = `member${index + 1}@example.com`
      const invite = await api(admin, 'invite', { email, role: 'member' }, 201)
      if (typeof invite.url !== 'string') throw new Error('Invitation response omitted its URL')
      await api(context, 'accept', { token: invite.url.split('#')[1], password })
      const login = await api(context, 'login', { email, password })
      if (typeof login.user !== 'object' || login.user === null || !('id' in login.user) || typeof login.user.id !== 'string') throw new Error('Missing member identity')
      members.push(login.user.id)
    }
    await api(admin, 'services', { id: 'fixture', provider: 'deepseek', name: '团队模型服务', baseURL: 'https://api.deepseek.com/v1',
      enabled: true, apiKey: 'fixture-provider-key', models: [
        { id: 'fixture-one', name: 'Model One', contextWindow: 65536, maxTokens: 4096, vision: false },
        { id: 'fixture-two', name: 'Model Two', contextWindow: 65536, maxTokens: 8192, vision: false },
      ] })
  }, 60000)

  afterAll(async () => {
    if (page) await page.screenshot({ path: join(evidence, 'last-page.png'), fullPage: true }).catch((_closedPage: unknown) => {
      // A closed browser must not mask the scenario's original failure.
    })
    await browser?.close()
    if (containerGateway) {
      const owned = (await execute('docker', ['container', 'ls', '-a', '--filter', `name=^/${prefix}-(edge|gateway)$`, '--format', '{{.Names}}']))
        .stdout.trim().split('\n')
      for (const name of [edgeName, gatewayName]) {
        if (!owned.includes(name)) continue
        const output = await execute('docker', ['logs', name])
        if (name === edgeName) await writeFile(join(evidence, 'edge.log'), output.stdout + output.stderr)
        else logs = output.stdout + output.stderr
        await execute('docker', ['container', 'rm', '--force', '--volumes', name])
      }
      const networks = (await execute('docker', ['network', 'ls', '--filter', `name=^${controlNetwork}$`, '--format', '{{.Name}}'])).stdout.trim().split('\n')
      if (networks.includes(controlNetwork)) await execute('docker', ['network', 'rm', controlNetwork])
    }
    child?.kill('SIGTERM')
    if (child && child.exitCode === null && child.signalCode === null) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => { child?.kill('SIGKILL') }, 5000)
        child?.once('exit', () => { clearTimeout(timer); resolve() })
      })
    }
    if (ingress) {
      ingress.closeAllConnections()
      await new Promise<void>((resolve) => { ingress?.close(() => { resolve() }) })
    }
    await writeFile(join(evidence, 'gateway.log'), logs)
    const names = (await execute('docker', ['container', 'ls', '-a', '--filter', `label=hqzy.team=${prefix}`, '--format', '{{.Names}}'])).stdout.trim().split('\n').filter(Boolean)
    for (const name of names) {
      if (!name.startsWith(`${prefix}-`)) throw new Error('Refusing to clean up a container outside this fixture')
      const output = await execute('docker', ['logs', name])
      await writeFile(join(evidence, `${name}.log`), output.stdout + output.stderr)
      await execute('docker', ['container', 'rm', '--force', name])
      await execute('docker', ['volume', 'rm', `${name}-home`, `${name}-workspace`])
      await execute('docker', ['network', 'rm', `${name}-net`])
    }
  }, 60000)

  it('enforces administrator writes and contains provider keys', async () => {
    await api(first, 'services', {}, 403)
    const directory = await api(first, 'catalog')
    expect(JSON.stringify(directory)).not.toContain('fixture-provider-key')
    page = await admin.newPage()
    await page.goto(`${origin}/team/admin`)
    await page.getByRole('heading', { name: '团队成员' }).waitFor()
    await page.getByLabel('邮箱', { exact: true }).fill('invited-via-browser@example.com')
    await page.getByRole('button', { name: '邀请成员', exact: true }).click()
    await expect.poll(() => page?.getByRole('textbox', { name: '一次性链接（仅显示本次，请复制后自行发送）' }).inputValue())
      .toContain('/team/accept#')
    await page.getByRole('button', { name: '编辑', exact: true }).click()
    expect(await page.getByLabel('API Key', { exact: true }).inputValue()).toBe('')
    await page.screenshot({ path: join(evidence, 'administration.png'), fullPage: true })
  })

  it('chooses an enabled model in the actual composer and persists the selected request route', async () => {
    page = await first.newPage()
    await page.goto(origin, { timeout: 150000 })
    await page.locator('[data-composer-input]').first().waitFor({ timeout: 30000 })
    const chooseWorkspace = page.getByRole('textbox', { name: '选择工作区', exact: true })
    if (await chooseWorkspace.isVisible()) {
      await chooseWorkspace.click()
      const dialog = page.getByRole('dialog', { name: '选择工作区目录' })
      await dialog.waitFor()
      await dialog.getByRole('button', { name: '编辑路径' }).click()
      await dialog.getByRole('textbox', { name: '编辑路径' }).fill('/workspace')
      await dialog.getByRole('textbox', { name: '编辑路径' }).press('Enter')
      await dialog.getByRole('button', { name: '打开', exact: true }).click()
    }
    const trigger = page.getByRole('button', { name: /选择模型/ })
    await trigger.click()
    const drill = page.getByRole('menuitem', { name: /^模型/ })
    if (await drill.isVisible()) await drill.click()
    await page.getByRole('menuitemradio', { name: 'Model Two', exact: true }).click()
    await expect.poll(() => trigger.getAttribute('aria-label')).toContain('Model Two')
    await writeComposerDraft(page, page.locator('[data-composer-input][contenteditable="true"]'), 'Reply with the selected model name.')
    await page.keyboard.press('Enter')
    await page.getByRole('paragraph').filter({ hasText: /^Reply from fixture-two$/ }).waitFor({ timeout: 60000 })
    await page.reload()
    await expect.poll(() => page?.getByRole('button', { name: /选择模型/ }).getAttribute('aria-label')).toContain('Model Two')
    const records = await readFile(join(evidence, 'model-requests.jsonl'), 'utf8')
    expect(records).toContain('"model":"fixture-two"')
    const persisted = await execute('docker', ['exec', `${prefix}-${members[0]}`, 'node', '-e', `
      const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), root = '/home/node/.dsh/sessions';
      const files = fs.readdirSync(root, {recursive:true}), summaries = [];
      let found = false;
      for (const file of files.filter(file => file.endsWith('.jsonl') || file.endsWith('.jsonl.zstd'))) {
        const bytes = fs.readFileSync(path.join(root,file));
        const frames = [];
        if (file.endsWith('.zstd')) {
          let offset = 0;
          while (offset < bytes.length) {
            const frame = zlib.zstdDecompressSync(bytes.subarray(offset), {info:true});
            if (!frame.engine.bytesWritten) throw new Error('Zstandard decoder did not consume its frame');
            frames.push(frame.buffer);
            offset += frame.engine.bytesWritten;
          }
        } else frames.push(bytes);
        const text = Buffer.concat(frames).toString('utf8');
        const events = text.trim().split('\\n').map(line => JSON.parse(line));
        summaries.push({file, types:events.map(event => event.type)});
        const selection = events.findLast(event => event.type === 'model/selection' && event.data.model === 'fixture-two');
        if (!selection) continue;
        const request = events.findLast(event => event.type === 'request/header');
        console.log(JSON.stringify({selection:{provider:selection.data.provider,model:selection.data.model},
          request:{provider:request?.data.header.config.provider,model:request?.data.header.config.model}}));
        found = true;
        break;
      }
      if (!found) throw new Error(JSON.stringify({files, summaries}));
    `])
    const expected: unknown = JSON.parse(await readFile(new URL('./expected/team-deployment/model-selection.expected.json', import.meta.url), 'utf8'))
    expect(JSON.parse(persisted.stdout)).toEqual(expected)
    await page.screenshot({ path: join(evidence, 'conversation-model.png'), fullPage: true })
  }, 180000)

  it.runIf(containerGateway)('recovers private worker routing and conversation selection after a gateway restart', async () => {
    const id = (await execute('docker', ['inspect', `${prefix}-${members[0]}`, '--format', '{{.Id}}'])).stdout
    const edgeId = (await execute('docker', ['inspect', edgeName, '--format', '{{.Id}}'])).stdout
    expect((await execute('docker', ['port', gatewayName])).stdout.trim()).toBe('')
    for (let round = 1; round <= 3; round++) {
      await execute('docker', ['restart', gatewayName])
      await writeFile(join(evidence, `gateway-restarted-${round}.json`), (await execute('docker', ['inspect', gatewayName])).stdout)
      await vi.waitFor(async () => {
        await execute('docker', ['exec', gatewayName, '/usr/local/bin/hqzy-gateway', 'healthcheck'])
        expect((await fetch(`${origin}/team/health`)).status).toBe(200)
      }, { timeout: 30000 })
      expect((await execute('docker', ['inspect', edgeName, '--format', '{{.Id}}'])).stdout).toBe(edgeId)
      expect((await execute('docker', ['port', gatewayName])).stdout.trim()).toBe('')
      if (!page) throw new Error('Missing conversation page')
      await page.reload()
      await expect.poll(() => page?.getByRole('button', { name: /选择模型/ }).getAttribute('aria-label')).toContain('Model Two')
      expect((await execute('docker', ['inspect', `${prefix}-${members[0]}`, '--format', '{{.Id}}'])).stdout).toBe(id)
    }
  })

  it('isolates filesystem, network and process access between two real user containers', async () => {
    const response = await second.request.get(origin, { timeout: 150000 })
    expect(response.ok(), await response.text()).toBe(true)
    const firstName = `${prefix}-${members[0]}`
    const secondName = `${prefix}-${members[1]}`
    await execute('docker', ['exec', firstName, 'sh', '-c', 'printf private-first-user > /workspace/private-first-user'])
    expect((await execute('docker', ['exec', firstName, 'id', '-u'])).stdout.trim()).toBe('1000')
    await execute('docker', ['exec', secondName, 'sh', '-c', 'test ! -e /workspace/private-first-user && test ! -S /var/run/docker.sock'])
    const firstNetwork = (await execute('docker', ['inspect', firstName, '--format', '{{json .NetworkSettings.Networks}}'])).stdout
    const secondNetwork = (await execute('docker', ['inspect', secondName, '--format', '{{json .NetworkSettings.Networks}}'])).stdout
    expect(firstNetwork).not.toBe(secondNetwork)
    const firstIP = (await execute('docker', ['inspect', firstName, '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'])).stdout.trim()
    if (containerGateway) {
      await execute('docker', ['exec', secondName, 'node', '-e',
        `fetch('http://${firstIP}:3080/',{signal:AbortSignal.timeout(1000)}).then(()=>process.exit(2),()=>process.exit(0))`])
    }
    const settings = (await execute('docker', ['inspect', firstName, '--format', '{{.HostConfig.ReadonlyRootfs}} {{.Config.User}} {{.HostConfig.PidsLimit}}'])).stdout.trim()
    expect(settings).toBe('true 1000:1000 256')
    const disabled = await api(admin, 'disable', { id: members[0], disabled: true })
    expect(disabled.ok).toBe(true)
    expect((await first.request.get(`${origin}/team/api/me`)).status()).toBe(401)
    if (page) await page.waitForURL(`${origin}/team/login`)
    expect((await execute('docker', ['inspect', firstName, '--format', '{{.State.Running}}'])).stdout.trim()).toBe('false')
  }, 180000)
})
