/** Circular controls preserve explicit full-round geometry for circles and switches. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { packageStylesheets, parseRules } from './stylesheet-scan.ts'

/** The smoothing token corner-shape.css owns. */
const TOKEN = '--dsw-corner-shape'

const sheetPath = fileURLToPath(new URL('../src/styles/corner-shape.css', import.meta.url))
const sheetCss = readFileSync(sheetPath, 'utf8')

/**
 * Whether a border-radius value makes the element full-round: an uncapped
 * fraction of the box (50%/100%) or a pill radius far above any box size.
 * Component-local radius indirections stay below the pill threshold, so the
 * check is lexical over literal components.
 * @param value - a border-radius declaration value.
 * @returns true when some component is full-round.
 */
function isFullRound(value: string): boolean {
  return value.split(/\s+/).some(part =>
    part === '50%' || part === '100%' || (part.endsWith('px') && Number.parseFloat(part) >= 99))
}

describe('corner-shape.css', () => {
  it('uses ordinary circular corners without changing user-content geometry', () => {
    const rules = parseRules(sheetCss)
    expect(rules.find(rule => rule.selectors.includes(':root'))?.declarations)
      .toContainEqual([TOKEN, 'round'])
    expect(rules.some(rule => rule.selectors.includes('*'))).toBe(false)
  })
})

/**
 * Full-round rules missing the `corner-shape: round` pairing.
 * @param css - stylesheet text.
 * @returns the offending selectors, in source order.
 */
function unpairedFullRound(css: string): string[] {
  return parseRules(css)
    .filter(rule => rule.declarations
      .some(([property, value]) => property === 'border-radius' && isFullRound(value)))
    .filter(rule => !rule.declarations
      .some(([property, value]) => property === 'corner-shape' && value === 'round'))
    .map(rule => rule.selectors.join(', '))
}

describe('full-round radii keep circular corners', () => {
  it('rejects a full-round radius without the pairing', () => {
    expect(unpairedFullRound('.a { border-radius: 50%; }')).toEqual(['.a'])
    expect(unpairedFullRound('.a { border-radius: 999px; }')).toEqual(['.a'])
    expect(unpairedFullRound('.a { border-radius: 50%; corner-shape: round; }')).toEqual([])
  })

  it('pairs corner-shape: round with every full-round border-radius under packages/', () => {
    // The universal superellipse reaches every element, so each circle and
    // pill states its own arc back; a new one without the pairing regresses
    // silently on supporting engines only, which no jsdom test renders.
    const unpaired = packageStylesheets().flatMap(file =>
      unpairedFullRound(readFileSync(file, 'utf8')).map(selectors => `${file} ${selectors}`))
    expect(unpaired).toEqual([])
  })
})
