/** Apply a reviewed product-text update to a pinned image without replacing its integrations. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, resolve, extname } from 'node:path'

const root = '/opt/dsh'
const updateRoot = '/tmp/huaqing-brand-update'
const manifest = JSON.parse(await readFile(join(updateRoot, 'payload.json'), 'utf8'))
const digest = data => createHash('sha256').update(data).digest('hex')
for (const entry of manifest.modules) {
  const target = resolve(root, entry.path)
  assert.ok(target.startsWith(`${root}/node_modules/`) && !entry.path.includes('..'))
  const previous = await readFile(target)
  assert.equal(digest(previous), entry.beforeSHA256, `Unexpected installed module: ${entry.path}`)
  const content = await readFile(join(updateRoot, entry.payload))
  assert.equal(digest(content), entry.afterSHA256)
  await writeFile(target, content, { mode: (await stat(target)).mode })
}

const preserved = new Set([
  '@deepseek-ai/dsh-experimental-skill-badge',
  '@deepseek-ai/dsh-skill-badge',
])
const extensions = new Set(['.js', '.mjs', '.json', '.md', '.yml', '.html', '.webmanifest'])
let changed = 0
async function visit(directory, owner) {
  const entries = await readdir(directory, { withFileTypes: true })
  if (entries.some(entry => entry.isFile() && entry.name === 'package.json')) {
    const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
    owner = pkg.name === '@deepseek-ai/dsh' || pkg.name?.startsWith('@deepseek-ai/dsh-') ? pkg.name : undefined
  }
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await visit(path, entry.name === 'node_modules' ? undefined : owner)
    else if (entry.isFile() && owner && !preserved.has(owner) && extensions.has(extname(path))
      && !(owner === '@deepseek-ai/dsh-harness-dev-context' && extname(path) === '.js')
      && entry.name !== 'code-file-icon-artwork.manifest.json') {
      const previous = await readFile(path, 'utf8')
      let next = previous.replaceAll('DeepSeek Harness', 'Huaqing Harness')
      if (owner === '@deepseek-ai/dsh-web-frontend' || owner === '@deepseek-ai/dsh-client-ui-brand-official') {
        next = next.replaceAll('DSH Local Build', 'Huaqing Harness')
      }
      if (owner === '@deepseek-ai/dsh-host-team-server') {
        next = next.replaceAll('华清 AI 工作台', 'Huaqing Harness').replaceAll('Huaqing AI Workspace', 'Huaqing Harness')
      }
      if (owner === '@deepseek-ai/dsh-web-frontend' && entry.name === 'manifest.webmanifest') {
        const pwa = JSON.parse(next)
        pwa.short_name = 'Huaqing'
        pwa.icons = [{ src: 'hqzyai-logomark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
        assert.ok((await stat(join(directory, 'hqzyai-logomark.svg'))).isFile())
        next = JSON.stringify(pwa, null, 2) + '\n'
      }
      if (next !== previous) { await writeFile(path, next); changed++ }
    }
  }
}
await visit(root, undefined)
assert.ok(changed > 0)
console.log(JSON.stringify({ product: 'Huaqing Harness', updatedPublicFiles: changed, replacedModules: manifest.modules.length }))
