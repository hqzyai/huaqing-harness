import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { expect, it } from 'vitest'

const DIST_ROOT = fileURLToPath(new URL('../dist', import.meta.url))

it('ships install metadata with the built web application', async () => {
  const index = await readFile(join(DIST_ROOT, 'index.html'), 'utf8')
  expect(index).toContain('<link rel="manifest" href="./manifest.webmanifest" />')

  const manifest: unknown = JSON.parse(await readFile(join(DIST_ROOT, 'manifest.webmanifest'), 'utf8'))
  // No `id`: a browser resolves an explicit `id` against the start URL's origin,
  // so only an absent `id`, which defaults to the resolved `start_url`, gives
  // each mount its own identity. `public-mount.e2e.ts` reads the resolved form.
  expect(manifest).toEqual({
    name: 'DeepSeek Harness',
    short_name: 'DSH',
    start_url: './',
    scope: './',
    display: 'fullscreen',
    icons: [{
      src: 'favicon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    }],
  })
})

it('ships the same HQZY favicon for both themes', async () => {
  const index = await readFile(join(DIST_ROOT, 'index.html'), 'utf8')
  expect(index).toContain('<link rel="icon" type="image/svg+xml" href="./hqzyai-logomark.svg" />')
  const icon = await readFile(join(DIST_ROOT, 'hqzyai-logomark.svg'), 'utf8')
  expect(icon).toContain('viewBox="0 0 793 568"')
  expect(icon).not.toContain('<image')
})

it('ships every WOFF2 referenced by the built stylesheets', async () => {
  const assets = join(DIST_ROOT, 'assets')
  const sheets = (await readdir(assets)).filter(name => name.endsWith('.css'))
  expect(sheets.length).toBeGreaterThan(0)
  let fonts = 0
  for (const name of sheets) {
    const stylesheet = join(assets, name)
    const css = await readFile(stylesheet, 'utf8')
    for (const match of css.matchAll(/url\(["']?([^"')]+\.woff2)["']?\)/g)) {
      const font = await readFile(join(dirname(stylesheet), match[1]!))
      expect(font.readUInt32BE(0)).toBe(0x774f4632)
      fonts++
    }
  }
  expect(fonts).toBeGreaterThan(100)
})
