/** The brand font remains self-contained in the packaged Web application. */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('offline brand font', () => {
  it('ships a local WOFF2 with its redistribution license', () => {
    const css = readFileSync(new URL('../src/styles/brand-font.css', import.meta.url), 'utf8')
    const fontPath = /url\(\.\/([^)]*\.woff2)\)/.exec(css)?.[1]
    expect(fontPath).toBeDefined()
    const font = readFileSync(new URL(`../src/styles/${fontPath!}`, import.meta.url))
    expect(font.readUInt32BE(0)).toBe(0x774f4632)
    expect(css).toContain("font-family: 'Geist'")
    expect(css).toContain("font-family: 'Geist Mono'")
    expect(css).toContain("font-family: 'Noto Sans SC'")
    expect(css).toContain('font-weight: 100 900')
    expect(css).toContain('unicode-range:')
    expect(css).not.toMatch(/url\(https?:/)
    for (const family of ['geist', 'geist-mono', 'noto-sans-sc']) {
      const license = readFileSync(new URL(`../src/styles/fonts/${family}-OFL.txt`, import.meta.url), 'utf8')
      expect(license).toContain('SIL OPEN FONT LICENSE')
    }
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      files: string[]
      exports: Record<string, unknown>
    }
    expect(manifest.files).toContain('lib/styles')
    expect(manifest.exports['./brand-font.css']).toBe('./lib/styles/brand-font.css')
  })
})
