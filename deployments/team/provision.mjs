/** Generate deployment secrets once, without replacing existing identity material. */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

const directory = new URL('./private/', import.meta.url)
await mkdir(directory, { recursive: true, mode: 0o700 })
for (const name of ['encryption-key', 'worker-secret', 'bootstrap-token']) {
  try {
    await writeFile(new URL(name, directory), randomBytes(32).toString('base64url') + '\n', {
      flag: name === 'bootstrap-token' && process.argv.includes('--renew-bootstrap') ? 'w' : 'wx', mode: 0o600,
    })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
  }
}
const origin = process.env.TEAM_PUBLIC_ORIGIN
if (!origin) throw new Error('Set TEAM_PUBLIC_ORIGIN before provisioning')
const token = (await readFile(new URL('bootstrap-token', directory), 'utf8')).trim()
const link = `${new URL(origin).origin}/team/accept#${token}\n`
await writeFile(new URL('administrator-activation-url', directory), link, { mode: 0o600 })
console.log(`Secrets preserved. Initial administrator activation URL: ${join(directory.pathname, 'administrator-activation-url')}`)
