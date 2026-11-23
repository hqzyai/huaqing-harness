/** Keep the service browser title stable across panels and conversations. */
import { useEffect } from 'react'

/** Props for the browser title projection. */
export type DocumentTitleProps = {
  /** Stable product title supplied by the application frame. */
  productTitle: string
}

/**
 * Keep the product title stable when changing conversations and panels.
 * @param props - Product title projection.
 * @returns No rendered content.
 */
export function DocumentTitle({ productTitle }: DocumentTitleProps): null {
  useEffect(() => {
    document.title = productTitle
  }, [productTitle])
  return null
}
