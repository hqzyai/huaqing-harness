// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { DocumentTitle } from '../src/client/DocumentTitle.tsx'

let originalTitle: string
beforeEach(() => { originalTitle = document.title })
afterEach(() => {
  cleanup()
  document.title = originalTitle
})

it('sets the browser title to the supplied product title', () => {
  document.title = 'Previous title'
  const { rerender } = render(<DocumentTitle productTitle="华清智言 · Huaqing Harness" />)
  expect(document.title).toBe('华清智言 · Huaqing Harness')
  rerender(<DocumentTitle productTitle="Updated product title" />)
  expect(document.title).toBe('Updated product title')
})
