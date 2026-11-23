/** Account lifecycle, administrator authorization and bearer replay regression coverage. */
import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TeamAuth } from '../src/index.ts'

const options = { sessionTtlMs: 3600000, sessionIdleMs: 600000, inviteTtlMs: 600000, resetTtlMs: 300000,
  loginWindowMs: 60000, loginAttempts: 10 }
const password = 'a strong private password 42'
const stores: TeamAuth[] = []
const directories: string[] = []
function store(): TeamAuth {
  const auth = new TeamAuth(':memory:', options)
  stores.push(auth)
  return auth
}
async function administrator(auth: TeamAuth) {
  const token = randomBytes(32).toString('base64url')
  expect(auth.bootstrap('ADMIN@example.com', token)).toBe(true)
  await auth.acceptLink(token, password)
  return auth.login('admin@example.com', password, '127.0.0.1')
}
afterEach(() => {
  vi.restoreAllMocks()
  for (const auth of stores.splice(0)) auth.close()
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true })
})

describe('invite-only team identities', () => {
  it('renews only an inactive bootstrap account when the operator supplies a fresh token', async () => {
    const auth = store()
    const first = randomBytes(32).toString('base64url')
    const second = randomBytes(32).toString('base64url')
    expect(auth.bootstrap('admin@example.com', first)).toBe(true)
    expect(auth.bootstrap('admin@example.com', first)).toBe(false)
    expect(auth.bootstrap('admin@example.com', second)).toBe(true)
    await expect(auth.acceptLink(first, password)).rejects.toMatchObject({ code: 'expired' })
    await auth.acceptLink(second, password)
    expect(auth.bootstrap('admin@example.com', randomBytes(32).toString('base64url'))).toBe(false)
    expect(auth.users()).toHaveLength(1)
  })

  it('activates once, normalizes email and never creates a second bootstrap administrator', async () => {
    const auth = store()
    const admin = await administrator(auth)
    expect(admin.session.user).toMatchObject({ role: 'admin', email: 'admin@example.com', active: true })
    expect(auth.bootstrap('another@example.com', randomBytes(32).toString('base64url'))).toBe(false)
    const link = auth.invite(admin.session.user.id, ' User@Example.com ', 'member')
    await expect(auth.login('user@example.com', password, '127.0.0.2')).rejects.toMatchObject({ code: 'invalid' })
    await auth.acceptLink(link, password)
    await expect(auth.acceptLink(link, 'another secure password')).rejects.toMatchObject({ code: 'expired' })
    const user = await auth.login('user@example.com', password, '127.0.0.2')
    expect(user.session.user.role).toBe('member')
    expect(() => auth.invite(user.session.user.id, 'other@example.com', 'admin')).toThrow('forbidden')
    expect(() => auth.invite(admin.session.user.id, 'USER@example.com', 'member')).toThrow('conflict')
  })

  it('invalidates previous reset links and all existing sessions after password reset', async () => {
    const auth = store()
    const admin = await administrator(auth)
    const first = auth.resetLink(admin.session.user.id, admin.session.user.id)
    const second = auth.resetLink(admin.session.user.id, admin.session.user.id)
    await expect(auth.acceptLink(first, 'a new strong password')).rejects.toMatchObject({ code: 'expired' })
    await auth.acceptLink(second, 'a new strong password')
    expect(auth.authenticate(admin.token)).toBeUndefined()
    await expect(auth.login('admin@example.com', password, '127.0.0.1')).rejects.toMatchObject({ code: 'invalid' })
    expect((await auth.login('admin@example.com', 'a new strong password', '127.0.0.1')).session.user.active).toBe(true)
  })

  it('refuses concurrent activation replay after password hashing', async () => {
    const auth = store()
    const token = randomBytes(32).toString('base64url')
    auth.bootstrap('admin@example.com', token)
    const results = await Promise.allSettled([auth.acceptLink(token, password), auth.acceptLink(token, 'another strong password')])
    expect(results.filter(item => item.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(item => item.status === 'rejected')).toHaveLength(1)
  })

  it('revokes disabled accounts immediately, preserves records, and protects the final administrator', async () => {
    const auth = store()
    const admin = await administrator(auth)
    const link = auth.invite(admin.session.user.id, 'user@example.com', 'member')
    await auth.acceptLink(link, password)
    const user = await auth.login('user@example.com', password, '127.0.0.2')
    auth.setDisabled(admin.session.user.id, user.session.user.id, true)
    expect(auth.authenticate(user.token)).toBeUndefined()
    expect(auth.users()).toHaveLength(2)
    expect(() => auth.resetLink(admin.session.user.id, user.session.user.id)).toThrow('invalid')
    expect(() =>{  auth.setDisabled(admin.session.user.id, admin.session.user.id, true) }).toThrow('conflict')
    auth.setDisabled(admin.session.user.id, user.session.user.id, false)
    expect(auth.authenticate(user.token)).toBeUndefined()
    expect((await auth.login('user@example.com', password, '127.0.0.2')).session.user.disabled).toBe(false)
  })

  it('enforces idle and absolute expiry, logout, and expiring activation links', async () => {
    const auth = store()
    const admin = await administrator(auth)
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + options.sessionIdleMs + 1)
    expect(auth.authenticate(admin.token)).toBeUndefined()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    auth.logout(admin.token)
    expect(auth.authenticate(admin.token)).toBeUndefined()
    const link = auth.resetLink(admin.session.user.id, admin.session.user.id)
    vi.spyOn(Date, 'now').mockReturnValue(now + options.resetTtlMs + 1)
    await expect(auth.acceptLink(link, password)).rejects.toMatchObject({ code: 'expired' })
    auth.prune(now + options.sessionTtlMs + 1)
  })

  it('does not extend idle or absolute expiry when a long response checks revocation', async () => {
    const now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now)
    try {
      const auth = store()
      const admin = await administrator(auth)
      clock.mockReturnValue(now + options.sessionIdleMs - 1)
      expect(auth.authenticate(admin.token, false)).toBeDefined()
      clock.mockReturnValue(now + options.sessionIdleMs + 1)
      expect(auth.authenticate(admin.token, false)).toBeUndefined()

      const absoluteStart = Date.now()
      const absolute = await auth.login('admin@example.com', password, '127.0.0.1')
      for (let elapsed = options.sessionIdleMs / 2; elapsed < options.sessionTtlMs; elapsed += options.sessionIdleMs / 2) {
        clock.mockReturnValue(absoluteStart + elapsed)
        expect(auth.authenticate(absolute.token)).toBeDefined()
      }
      clock.mockReturnValue(absoluteStart + options.sessionTtlMs - 1)
      expect(auth.authenticate(absolute.token)).toBeDefined()
      clock.mockReturnValue(absoluteStart + options.sessionTtlMs + 1)
      expect(auth.authenticate(absolute.token)).toBeUndefined()
    } finally { clock.mockRestore() }
  })

  it('bounds password attempts and rejects short passwords without consuming valid links', async () => {
    const auth = new TeamAuth(':memory:', { ...options, loginAttempts: 2 })
    stores.push(auth)
    const token = randomBytes(32).toString('base64url')
    auth.bootstrap('admin@example.com', token)
    await expect(auth.acceptLink(token, 'short')).rejects.toMatchObject({ code: 'invalid' })
    await auth.acceptLink(token, password)
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(auth.login('admin@example.com', 'wrong', '127.0.0.1')).rejects.toMatchObject({ code: 'invalid' })
    }
    await expect(auth.login('admin@example.com', password, '127.0.0.1')).rejects.toMatchObject({ code: 'rate-limit' })
  })

  it('persists users and revocable sessions across restarts without plaintext bearer material', async () => {
    const path = mkdtempSync(join(tmpdir(), 'hqzy-team-auth-'))
    directories.push(path)
    const filename = join(path, 'identity.sqlite')
    const first = new TeamAuth(filename, options)
    const admin = await administrator(first)
    first.close()
    const bytes = readFileSync(filename).toString('utf8')
    expect(bytes).not.toContain(password)
    expect(bytes).not.toContain(admin.token)
    const second = new TeamAuth(filename, options)
    stores.push(second)
    expect(second.authenticate(admin.token)?.user.email).toBe('admin@example.com')
  })
})
