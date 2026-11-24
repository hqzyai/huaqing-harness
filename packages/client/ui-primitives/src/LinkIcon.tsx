/**
 * Leading current-color category glyphs for clickable artifact links. The
 * public component keeps individual artwork private to the link vocabulary.
 */
import { File, FileText, Image } from 'lucide-react'
import type { ReactNode } from 'react'
import { classifyFileType, fileExtension } from './FileTypeIcon.tsx'
import { isCodeFileType, isLinkCodeExtension } from './code-file-types.ts'
import { siteGlyph } from './SiteGlyph.tsx'
import { ICON_MEDIUM_STROKE, ICON_REGULAR_STROKE } from './icons/index.tsx'
import type { IconProps } from './icons/props.ts'
import { CodeBracketsArtwork, FolderCloseArtwork, GlobeOutlineArtwork } from './icons/shared-artwork.tsx'

/** Link categories with distinct leading glyphs. */
export type LinkIconKind = 'url' | 'folder' | 'code' | 'image' | 'document' | 'other'

/** Props for link icons: the category plus the shared icon sizing seat. */
export interface LinkIconProps extends IconProps {
  kind: LinkIconKind
  /** Destination of a URL link; known HTTP(S) hosts render their site mark. */
  href?: string | undefined
}

interface WeightedLinkIconProps extends LinkIconProps {
  strokeWidth: number
}

/**
 * Derive a file path's link-icon category from its extension. Unknown and
 * missing extensions fall to `other` (the plain-paper glyph).
 * @param path - File path as the producing tool spelled it (either separator).
 * @returns The file's glyph category; never `url` or `folder`.
 */
export function classifyLinkPath(path: string): LinkIconKind {
  const type = classifyFileType(path)
  const extension = fileExtension(path)
  if (isCodeFileType(type)) return isLinkCodeExtension(extension) ? 'code' : 'other'
  if (extension === '') return 'other'
  switch (type) {
    case 'code':
    case 'html': return 'code'
    case 'image': return 'image'
    case 'excel':
    case 'pdf':
    case 'ppt':
    case 'word': return 'document'
    case 'markdown':
    case 'other':
    case 'video': return 'other'
    /* v8 ignore next -- classifyFileType returns a closed union exhausted above */
    default: return assertNever(type)
  }
}

/** Local exhaustiveness helper — this package does not depend on `dsh-llm`. */
/* v8 ignore next 3 -- closed-union backstop; only reached if a kind is forged */
function assertNever(value: never): never {
  throw new Error(`unreachable link icon kind: ${String(value)}`)
}

/**
 * Render the leading glyph for one clickable artifact link at one stroke weight.
 * @param props - The link category, optional size (default 14px), and optional CSS class.
 * @returns The category's decorative current-color SVG glyph.
 */
function LinkIconArtwork({ kind, href, size = 16, className, strokeWidth }: WeightedLinkIconProps): ReactNode {
  switch (kind) {
    case 'url': return siteGlyph({ href, size, className }) ?? <GlobeOutlineArtwork size={size} className={className} strokeWidth={strokeWidth} />
    case 'folder': return <FolderCloseArtwork size={size} className={className} strokeWidth={strokeWidth} />
    case 'code': return <CodeBracketsArtwork size={size} className={className} strokeWidth={strokeWidth} />
    case 'image': return <Image nonScalingStroke aria-hidden="true" size={size} className={className} strokeWidth={strokeWidth} />
    case 'document': return <FileText nonScalingStroke aria-hidden="true" size={size} className={className} strokeWidth={strokeWidth} />
    case 'other': return <File nonScalingStroke aria-hidden="true" size={size} className={className} strokeWidth={strokeWidth} />
    /* v8 ignore next -- closed-union backstop; only reached if a kind is forged */
    default: return assertNever(kind)
  }
}

/**
 * Render a regular 1.75px link icon.
 * @param props - Link category, size, and optional class.
 * @returns The regular decorative link glyph.
 */
export function LinkIconRegular(props: LinkIconProps): ReactNode {
  return <LinkIconArtwork {...props} strokeWidth={ICON_REGULAR_STROKE} />
}

/**
 * Render a medium 1.75px link icon.
 * @param props - Link category, size, and optional class.
 * @returns The medium decorative link glyph.
 */
export function LinkIconMedium(props: LinkIconProps): ReactNode {
  return <LinkIconArtwork {...props} strokeWidth={ICON_MEDIUM_STROKE} />
}
