/** Persistent, invite-only team identities. Tokens are stored as SHA-256 digests. */
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { chmodSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Branded } from '@deepseek-ai/dsh-brand'

const SCHEMA_VERSION = 1

/** An application user, independent of any model provider's identity. */
export type TeamUserId = Branded<'TeamUserId'>
/** Persisted user privileges. */
export type TeamRole = 'admin' | 'member'
/** Public account fields; password material never leaves the store. */
export interface TeamUser {
  id: TeamUserId
  email: string
  role: TeamRole
  disabled: boolean
  active: boolean
}
/** Authenticated login with its server-owned expiry. */
export interface TeamSession {
  user: TeamUser
  digest: string
  expiresAt: number
}
/** Deployment-specific lifetimes, all in milliseconds. */
export interface TeamAuthOptions {
  sessionTtlMs: number
  sessionIdleMs: number
  inviteTtlMs: number
  resetTtlMs: number
  loginWindowMs: number
  loginAttempts: number
}
/** Expected account failure, localized by the receiving application. */
export class TeamAuthError extends Error {
  constructor(readonly code: 'invalid' | 'forbidden' | 'conflict' | 'rate-limit' | 'expired') {
    super(`team-auth: ${code}`)
  }
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function emailOf(value: string): string {
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new TeamAuthError('invalid')
  return email
}

function passwordOf(value: string): string {
  const length = Array.from(value).length
  if (length < 15 || length > 128 || value.includes('\0')) throw new TeamAuthError('invalid')
  return value
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

function userOf(row: Record<string, import('node:sqlite').SQLOutputValue>): TeamUser {
  if (typeof row.id !== 'string' || typeof row.email !== 'string'
    || (row.role !== 'admin' && row.role !== 'member')
    || typeof row.disabled !== 'number' || typeof row.active !== 'number') {
    throw new Error('team-auth: invalid persisted user')
  }
  return { id: row.id as TeamUserId, email: row.email, role: row.role, disabled: row.disabled === 1, active: row.active === 1 }
}

/** Single-process SQLite owner; use one control-plane replica with durable storage. */
export class TeamAuth {
  private readonly db: DatabaseSync
  private hashing = 0

  /** Open or migrate the identity database; unsupported versions fail closed.
   * @param filename - private database path, or :memory: in tests.
   * @param options - validated deployment lifetimes and login limits.
   */
  constructor(filename: string, private readonly options: TeamAuthOptions) {
    for (const value of [options.sessionTtlMs, options.sessionIdleMs, options.inviteTtlMs, options.resetTtlMs,
      options.loginWindowMs, options.loginAttempts]) {
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error('team-auth: limits must be positive integers')
    }
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 })
    this.db = new DatabaseSync(filename)
    if (filename !== ':memory:') chmodSync(filename, 0o600)
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
    const version = this.db.prepare('PRAGMA user_version').get()?.user_version
    if (version !== 0 && version !== SCHEMA_VERSION) { this.db.close(); throw new Error('team-auth: unsupported database version') }
    this.db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL CHECK(role IN ('admin','member')),
        disabled INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 0,
        salt TEXT, password TEXT, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        digest TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        expires_at INTEGER NOT NULL, last_seen INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
      CREATE TABLE IF NOT EXISTS links (
        digest TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL CHECK(kind IN ('invite','reset')), expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS bootstrap (user_id TEXT PRIMARY KEY REFERENCES users(id), digest TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (
        id INTEGER PRIMARY KEY, at INTEGER NOT NULL, actor TEXT, action TEXT NOT NULL, subject TEXT
      );
      PRAGMA user_version=${SCHEMA_VERSION};
      COMMIT;
    `)
  }

  /** Release the SQLite handle after all HTTP requests settle. */
  close(): void { this.db.close() }

  private transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = operation()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  private audit(actor: TeamUserId | null, action: string, subject: string | null): void {
    this.db.prepare('INSERT INTO audit(at, actor, action, subject) VALUES (?, ?, ?, ?)').run(Date.now(), actor, action, subject)
  }

  private async hash(password: string, salt: string): Promise<Buffer> {
    // Scrypt memory is bounded independently of the HTTP connection limit.
    if (this.hashing >= 4) throw new TeamAuthError('rate-limit')
    this.hashing++
    try { return await derive(password, salt) }
    finally { this.hashing-- }
  }

  /** Create the initial administrator exactly once, returning an activation token.
   * @param email - bootstrap administrator address.
   * @param token - high-entropy operator-supplied bootstrap token; never a password.
   * @returns whether a new administrator was created.
   */
  bootstrap(email: string, token: string): boolean {
    const normalized = emailOf(email)
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(token)) throw new Error('team-auth: bootstrap token needs at least 256 random bits')
    return this.transaction(() => {
      const existing = this.db.prepare('SELECT * FROM users ORDER BY created_at LIMIT 2').all()
      const pending = existing[0]
      if (pending) {
        if (existing.length !== 1 || pending.email !== normalized || pending.role !== 'admin' || pending.active !== 0 || pending.disabled !== 0
          || typeof pending.id !== 'string') return false
        const previous = this.db.prepare('SELECT digest FROM bootstrap WHERE user_id=?').get(pending.id)?.digest
        if (previous === digest(token)) return false
        this.db.prepare('DELETE FROM links WHERE user_id=?').run(pending.id)
        this.db.prepare('INSERT INTO links VALUES (?,?,?,?)').run(digest(token), pending.id, 'invite', Date.now() + this.options.inviteTtlMs)
        this.db.prepare('INSERT INTO bootstrap VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET digest=excluded.digest').run(pending.id, digest(token))
        this.audit(null, 'bootstrap-renew', pending.id)
        return true
      }
      const id = randomUUID() as TeamUserId
      this.db.prepare('INSERT INTO users(id,email,role,created_at) VALUES (?,?,?,?)').run(id, normalized, 'admin', Date.now())
      this.db.prepare('INSERT INTO links VALUES (?,?,?,?)').run(digest(token), id, 'invite', Date.now() + this.options.inviteTtlMs)
      this.db.prepare('INSERT INTO bootstrap VALUES (?,?)').run(id, digest(token))
      this.audit(null, 'bootstrap', id)
      return true
    })
  }

  /** Read current accounts for the administrator directory.
   * @returns accounts in creation order, without credentials.
   */
  users(): TeamUser[] { return this.db.prepare('SELECT * FROM users ORDER BY created_at,id').all().map(userOf) }

  private admin(actor: TeamUserId): void {
    const row = this.db.prepare('SELECT * FROM users WHERE id=? AND active=1 AND disabled=0 AND role=?').get(actor, 'admin')
    if (!row) throw new TeamAuthError('forbidden')
  }

  /** Create an invited account and a single-use activation link.
   * @param actor - authenticated administrator.
   * @param email - new account address.
   * @param role - granted privileges.
   * @returns token shown once to the administrator.
   */
  invite(actor: TeamUserId, email: string, role: TeamRole): string {
    const normalized = emailOf(email)
    return this.transaction(() => {
      this.admin(actor)
      if (this.db.prepare('SELECT id FROM users WHERE email=?').get(normalized)) throw new TeamAuthError('conflict')
      const id = randomUUID() as TeamUserId
      this.db.prepare('INSERT INTO users(id,email,role,created_at) VALUES (?,?,?,?)').run(id, normalized, role, Date.now())
      return this.link(actor, id, 'invite')
    })
  }

  private link(actor: TeamUserId, id: TeamUserId, kind: 'invite' | 'reset'): string {
    const token = randomBytes(32).toString('base64url')
    this.db.prepare('DELETE FROM links WHERE user_id=?').run(id)
    this.db.prepare('INSERT INTO links VALUES (?,?,?,?)').run(digest(token), id, kind,
      Date.now() + (kind === 'invite' ? this.options.inviteTtlMs : this.options.resetTtlMs))
    this.audit(actor, kind, id)
    return token
  }

  /** Replace any outstanding activation/reset link; disabled accounts are refused.
   * @param actor - authenticated administrator.
   * @param id - target user.
   * @returns single-use token shown once.
   */
  resetLink(actor: TeamUserId, id: TeamUserId): string {
    return this.transaction(() => {
      this.admin(actor)
      const row = this.db.prepare('SELECT * FROM users WHERE id=? AND disabled=0').get(id)
      if (!row) throw new TeamAuthError('invalid')
      return this.link(actor, id, userOf(row).active ? 'reset' : 'invite')
    })
  }

  /** Activate or reset a password, atomically consume the token and revoke old sessions.
   * @param token - administrator-issued, expiring bearer token.
   * @param password - new password of 15–128 Unicode characters.
   */
  async acceptLink(token: string, password: string): Promise<void> {
    passwordOf(password)
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(token)) throw new TeamAuthError('expired')
    const key = digest(token)
    const existing = this.db.prepare('SELECT * FROM links WHERE digest=? AND expires_at>?').get(key, Date.now())
    if (!existing) throw new TeamAuthError('expired')
    const salt = randomBytes(32).toString('hex')
    const hash = await this.hash(password, salt)
    this.transaction(() => {
      const link = this.db.prepare('SELECT * FROM links WHERE digest=? AND expires_at>?').get(key, Date.now())
      if (!link || typeof link.user_id !== 'string') throw new TeamAuthError('expired')
      const result = this.db.prepare('UPDATE users SET salt=?,password=?,active=1 WHERE id=? AND disabled=0')
        .run(salt, hash.toString('hex'), link.user_id)
      if (result.changes !== 1) throw new TeamAuthError('expired')
      this.db.prepare('DELETE FROM links WHERE user_id=?').run(link.user_id)
      this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(link.user_id)
      this.audit(null, 'password-set', link.user_id)
    })
  }

  private throttle(key: string): void {
    const now = Date.now()
    this.db.prepare('DELETE FROM login_limits WHERE expires_at<=?').run(now)
    const hashed = digest(key)
    this.db.prepare('INSERT INTO login_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1')
      .run(hashed, now + this.options.loginWindowMs)
    const row = this.db.prepare('SELECT count FROM login_limits WHERE key=?').get(hashed)
    if (typeof row?.count !== 'number' || row.count > this.options.loginAttempts) throw new TeamAuthError('rate-limit')
  }

  /** Verify a password and mint an opaque, revocable session.
   * @param email - account address.
   * @param password - submitted password.
   * @param remoteAddress - transport-verified client address, never an untrusted forwarded header.
   * @returns bearer token and public session fields.
   */
  async login(email: string, password: string, remoteAddress: string): Promise<{ token: string; session: TeamSession }> {
    const normalized = emailOf(email)
    this.throttle(`ip:${remoteAddress}`)
    this.throttle(`email:${normalized}`)
    if (password.length > 512) throw new TeamAuthError('invalid')
    const row = this.db.prepare('SELECT * FROM users WHERE email=?').get(normalized)
    const salt = typeof row?.salt === 'string' ? row.salt : 'team-auth-missing-user-dummy-salt'
    const expected = typeof row?.password === 'string' ? row.password : '00'.repeat(64)
    const actual = await this.hash(password, salt)
    if (!timingSafeEqual(actual, Buffer.from(expected, 'hex')) || !row) throw new TeamAuthError('invalid')
    // Re-read after the KDF: a concurrent disable or reset must win.
    const current = this.db.prepare('SELECT * FROM users WHERE id=? AND password=? AND active=1 AND disabled=0').get(String(row.id), expected)
    if (!current) throw new TeamAuthError('invalid')
    const user = userOf(current)
    const token = randomBytes(32).toString('base64url')
    const session: TeamSession = { user, digest: digest(token), expiresAt: Date.now() + this.options.sessionTtlMs }
    this.db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(session.digest, user.id, session.expiresAt, Date.now())
    this.audit(user.id, 'login', user.id)
    return { token, session }
  }

  /** Validate the current account and both absolute and idle expiry on every request.
   * @param token - opaque browser cookie.
   * @param touch - count a new HTTP request as activity; revocation polling passes false.
   * @returns current identity or undefined; no expired/disabled session is refreshed.
   */
  authenticate(token: string, touch = true): TeamSession | undefined {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined
    const key = digest(token)
    const now = Date.now()
    const row = this.db.prepare(`SELECT users.*, sessions.expires_at FROM sessions JOIN users ON users.id=sessions.user_id
      WHERE digest=? AND expires_at>? AND last_seen>? AND disabled=0 AND active=1`)
      .get(key, now, now - this.options.sessionIdleMs)
    if (!row || typeof row.expires_at !== 'number') return undefined
    if (touch) this.db.prepare('UPDATE sessions SET last_seen=? WHERE digest=?').run(now, key)
    return { user: userOf(row), digest: key, expiresAt: row.expires_at }
  }

  /** Revoke one browser session.
   * @param token - current browser cookie.
   */
  logout(token: string): void { this.db.prepare('DELETE FROM sessions WHERE digest=?').run(digest(token)) }

  /** Disable an account and revoke every session/link; retain its private data.
   * @param actor - authenticated administrator.
   * @param id - target account.
   * @param disabled - desired access state.
   */
  setDisabled(actor: TeamUserId, id: TeamUserId, disabled: boolean): void {
    this.transaction(() => {
      this.admin(actor)
      const row = this.db.prepare('SELECT * FROM users WHERE id=?').get(id)
      if (!row) throw new TeamAuthError('invalid')
      if (disabled && row.role === 'admin' && row.disabled === 0 && row.active === 1) {
        const count = this.db.prepare('SELECT count(*) AS count FROM users WHERE role=? AND disabled=0 AND active=1').get('admin')?.count
        if (typeof count !== 'number' || count <= 1) throw new TeamAuthError('conflict')
      }
      this.db.prepare('UPDATE users SET disabled=? WHERE id=?').run(disabled ? 1 : 0, id)
      if (disabled) {
        this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(id)
        this.db.prepare('DELETE FROM links WHERE user_id=?').run(id)
      }
      this.audit(actor, disabled ? 'disable' : 'enable', id)
    })
  }

  /** Prune expired bearer material; durable account and audit records remain.
   * @param now - maintenance time in epoch milliseconds.
   */
  prune(now: number): void {
    this.db.prepare('DELETE FROM sessions WHERE expires_at<=? OR last_seen<=?').run(now, now - this.options.sessionIdleMs)
    this.db.prepare('DELETE FROM links WHERE expires_at<=?').run(now)
    this.db.prepare('DELETE FROM login_limits WHERE expires_at<=?').run(now)
  }
}
