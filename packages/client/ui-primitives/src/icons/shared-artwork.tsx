import { SquarePen, MessageSquare, Globe, Code, PanelsTopLeft, FolderClosed } from 'lucide-react'
import type { IconProps } from './props.ts'

interface WeightedArtworkProps extends IconProps { strokeWidth: number }

/**
 * Render the SquarePen icon for existing composite consumers.
 * @param props - Existing icon presentation.
 * @returns Decorative Lucide SVG.
 */
export const NewChatOutlineArtwork = ({ size = 16, className, strokeWidth }: WeightedArtworkProps) => (
  <SquarePen size={size} className={className} strokeWidth={strokeWidth} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the MessageSquare icon for existing composite consumers.
 * @param props - Existing icon presentation.
 * @returns Decorative Lucide SVG.
 */
export const ChatLinesOutlineArtwork = ({ size = 16, className, strokeWidth }: WeightedArtworkProps) => (
  <MessageSquare size={size} className={className} strokeWidth={strokeWidth} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Globe icon for existing composite consumers.
 * @param props - Existing icon presentation.
 * @returns Decorative Lucide SVG.
 */
export const GlobeOutlineArtwork = ({ size = 16, className, strokeWidth }: WeightedArtworkProps) => (
  <Globe size={size} className={className} strokeWidth={strokeWidth} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Code icon for existing composite consumers.
 * @param props - Existing icon presentation.
 * @returns Decorative Lucide SVG.
 */
export const CodeBracketsArtwork = ({ size = 16, className, strokeWidth }: WeightedArtworkProps) => (
  <Code size={size} className={className} strokeWidth={strokeWidth} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the PanelsTopLeft icon for existing composite consumers.
 * @param props - Existing icon presentation.
 * @returns Decorative Lucide SVG.
 */
export const BrowseOutlineArtwork = ({ size = 16, className, strokeWidth }: WeightedArtworkProps) => (
  <PanelsTopLeft size={size} className={className} strokeWidth={strokeWidth} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderClosed icon for existing composite consumers.
 * @param props - Existing icon presentation.
 * @returns Decorative Lucide SVG.
 */
export const FolderCloseArtwork = ({ size = 16, className, strokeWidth }: WeightedArtworkProps) => (
  <FolderClosed size={size} className={className} strokeWidth={strokeWidth} nonScalingStroke aria-hidden="true" focusable="false" />
)
