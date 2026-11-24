/** Docker ownership for private, non-root, per-user Harness runtimes. */
import { execFile } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { promisify } from 'node:util'
import type { TeamUserId } from '@deepseek-ai/dsh-team-auth'

const execute = promisify(execFile)

/** Docker deployment settings; worker resources are operator-configured. */
export interface TeamContainerOptions {
  image: string
  prefix: string
  gatewayURL: string
  gatewayContainer: string
  tokenSecret: string
  memory: string
  cpus: number
  pids: number
  startupTimeoutMs: number
}
/** One private upstream, never serialized to a browser. */
export interface TeamRuntime {
  origin: string
  cookie: string
}

/** Owns single-flight startup and stable user-to-container assignment. */
export class TeamContainers {
  private readonly pending = new Map<TeamUserId, Promise<TeamRuntime>>()
  private readonly runtimes = new Map<TeamUserId, TeamRuntime>()
  private readonly closing = new AbortController()

  /** Validate deployment choices before any Docker operation.
   * @param options - explicit image, network, token and resource limits.
   */
  constructor(private readonly options: TeamContainerOptions,
    private readonly openGateway: (id: TeamUserId, bindHost: string) => Promise<void>) {
    if (!/^[a-z][a-z0-9-]{0,30}$/.test(options.prefix)
      || !/^[a-zA-Z0-9][a-zA-Z0-9./:@_-]+$/.test(options.image)
      || !/^[1-9][0-9]*[mg]$/i.test(options.memory)
      || !Number.isFinite(options.cpus) || options.cpus <= 0
      || !Number.isSafeInteger(options.pids) || options.pids < 32
      || Buffer.from(options.tokenSecret, 'base64url').length !== 32) throw new Error('team-containers: invalid deployment settings')
    const url = new URL(options.gatewayURL)
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.username || url.password || url.search || url.hash) {
      throw new Error('team-containers: gatewayURL must be an HTTP(S) origin')
    }
  }

  /** Reconstruct a user-scoped model capability without storing provider credentials in a worker.
   * @param id - assigned team user.
   * @returns opaque bearer capability restricted to catalog/inference endpoints.
   */
  workerToken(id: TeamUserId): string {
    return createHmac('sha256', Buffer.from(this.options.tokenSecret, 'base64url')).update(`worker:${id}`).digest('base64url')
  }

  private async docker(...args: string[]): Promise<string> {
    const result = await execute('docker', args, { timeout: this.options.startupTimeoutMs, maxBuffer: 1024 * 1024, signal: this.closing.signal })
    return result.stdout.trim()
  }

  private name(id: TeamUserId): string {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('team-containers: invalid user id')
    return `${this.options.prefix}-${id}`
  }

  /** Ensure Docker is reachable and the immutable worker image exists before serving accounts. */
  async preflight(): Promise<void> {
    await this.docker('info', '--format', '{{.ServerVersion}}')
    await this.docker('image', 'inspect', this.options.image, '--format', '{{.Id}}')
  }

  /** Restore private listeners for running users after a gateway restart.
   * @param users - active team identities admitted by the identity store.
   */
  async recover(users: readonly TeamUserId[]): Promise<void> {
    const running = await this.docker('container', 'ls', '--filter', `label=hqzy.team=${this.options.prefix}`,
      '--format', '{{.Label "hqzy.user"}}')
    const admitted = new Set(users)
    for (const value of running.split('\n').filter(Boolean)) {
      const id = value as TeamUserId
      if (admitted.has(id)) await this.ensure(id)
      else await this.stop(id)
    }
  }

  /** Start or recover only the authenticated user's runtime.
   * @param id - identity derived from the server-side session.
   * @returns ready upstream and its private browser credential.
   */
  async ensure(id: TeamUserId): Promise<TeamRuntime> {
    const existing = this.runtimes.get(id)
    if (existing) return existing
    const pending = this.pending.get(id)
    if (pending) return pending
    const operation = this.start(id)
    this.pending.set(id, operation)
    try {
      const runtime = await operation
      this.runtimes.set(id, runtime)
      return runtime
    } finally { this.pending.delete(id) }
  }

  private async start(id: TeamUserId): Promise<TeamRuntime> {
    const name = this.name(id)
    const network = `${name}-net`
    const names = (await this.docker('container', 'ls', '-a', '--filter', `name=^/${name}$`, '--format', '{{.Names}}')).split('\n')
    if (!names.includes(name)) {
      const networks = (await this.docker('network', 'ls', '--filter', `name=^${network}$`, '--format', '{{.Name}}')).split('\n')
      if (!networks.includes(network)) await this.docker('network', 'create', '--label', `hqzy.team=${this.options.prefix}`, network)
    }
    // Only the trusted gateway joins each private network. Workers never share a bridge.
    if (this.options.gatewayContainer) {
      const attached = await this.docker('container', 'inspect', this.options.gatewayContainer,
        '--format', `{{if index .NetworkSettings.Networks "${network}"}}yes{{end}}`)
      if (attached !== 'yes') await this.docker('network', 'connect', '--alias', 'hqzy-control', network, this.options.gatewayContainer)
      const gatewayIP = await this.docker('container', 'inspect', this.options.gatewayContainer,
        '--format', `{{(index .NetworkSettings.Networks "${network}").IPAddress}}`)
      if (isIP(gatewayIP) !== 4) throw new Error('team-containers: gateway needs a concrete IPv4 listener per worker network')
      await this.openGateway(id, gatewayIP)
    }
    if (!names.includes(name)) {
      await this.docker('run', '--detach', '--name', name, '--label', `hqzy.team=${this.options.prefix}`, '--label', `hqzy.user=${id}`,
        '--restart', 'unless-stopped', '--network', network,
        '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
        '--user', '1000:1000', '--pids-limit', String(this.options.pids), '--memory', this.options.memory, '--memory-swap', this.options.memory,
        '--cpus', String(this.options.cpus), '--tmpfs', '/tmp:rw,nosuid,nodev,size=536870912,mode=1777',
        '--mount', `type=volume,source=${name}-home,target=/home/node/.dsh`,
        '--mount', `type=volume,source=${name}-workspace,target=/workspace`,
        ...this.options.gatewayContainer ? [] : ['--publish', '127.0.0.1::3080', '--add-host', 'host.docker.internal:host-gateway'],
        '--env', `DSH_TEAM_GATEWAY=${this.options.gatewayURL}`, '--env', `DSH_TEAM_TOKEN=${this.workerToken(id)}`,
        '--env', 'DSH_HOME=/home/node/.dsh', '--env', 'HOME=/home/node',
        '--env', 'NARB_DISABLE_NATIVE_CACHE=1',
        '--workdir', '/workspace', this.options.image)
    } else {
      const label = await this.docker('container', 'inspect', name, '--format', '{{index .Config.Labels "hqzy.user"}}')
      if (label !== id) throw new Error('team-containers: existing container has a different owner')
      await this.docker('container', 'start', name)
    }
    const origin = this.options.gatewayContainer
      ? await this.containerOrigin(name)
      : await this.hostOrigin(name)
    const deadline = Date.now() + this.options.startupTimeoutMs
    while (Date.now() < deadline) {
      this.closing.signal.throwIfAborted()
      try {
        const token = await this.docker('exec', name, 'cat', '/home/node/.dsh/.team-runtime-token')
        if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('team-containers: malformed runtime readiness token')
        const response = await fetch(`${origin}/?token=${encodeURIComponent(token)}`, { redirect: 'manual', signal: AbortSignal.timeout(3000) })
        const cookies = response.headers.getSetCookie()
        const cookie = cookies.map(value => value.split(';')[0]).join('; ')
        await response.body?.cancel()
        if (response.status === 303 && cookie) return { origin, cookie }
      } catch (error) {
        if (this.closing.signal.aborted) throw error
        // A starting worker has not published readiness yet; retry within the startup budget.
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 500)
        this.closing.signal.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true, signal: AbortSignal.timeout(500) })
      })
    }
    throw new Error('team-containers: runtime startup timed out; inspect the assigned container logs')
  }

  private async containerOrigin(name: string): Promise<string> {
    const ip = await this.docker('container', 'inspect', name, '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
    if (isIP(ip) !== 4) throw new Error('team-containers: runtime must have one IPv4 network')
    return `http://${ip}:3080`
  }

  private async hostOrigin(name: string): Promise<string> {
    const port = await this.docker('container', 'port', name, '3080/tcp')
    if (!/^127\.0\.0\.1:[0-9]+$/.test(port)) throw new Error('team-containers: runtime port is not bound exclusively to loopback')
    return `http://${port}`
  }

  /** Drop a failed proxy's cached upstream; a retry rechecks the runtime.
   * @param id - authenticated user whose upstream failed.
   */
  invalidate(id: TeamUserId): void { this.runtimes.delete(id) }

  /** Stop a disabled user's execution; keep private volumes and logs for recovery.
   * @param id - administrator-disabled identity.
   */
  async stop(id: TeamUserId): Promise<void> {
    this.runtimes.delete(id)
    await this.pending.get(id)?.catch((_startupError: unknown) => { /* Disabling still checks the container after a failed startup. */ })
    const name = this.name(id)
    const running = await this.docker('container', 'ls', '--filter', `name=^/${name}$`, '--format', '{{.Names}}')
    if (running === name) await this.docker('container', 'stop', '--time', '10', name)
  }

  /** Cancel control-plane work without deleting or stopping durable user runtimes. */
  async close(): Promise<void> {
    this.closing.abort(new Error('team-containers: gateway stopping'))
    await Promise.allSettled(this.pending.values())
    this.runtimes.clear()
  }
}
