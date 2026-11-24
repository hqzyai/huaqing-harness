import { ShieldCheck, FolderPen, ShieldAlert, ShieldQuestion } from 'lucide-react'
import type { ReactNode } from 'react'
import { ICON_MEDIUM_STROKE, ICON_REGULAR_STROKE } from './icons/index.tsx'
import type { IconProps } from './icons/props.ts'

interface PermissionIconArtworkProps extends IconProps {
  strokeWidth: number
}

function ReadOnlyArtwork({ size = 16, className, strokeWidth }: PermissionIconArtworkProps): ReactNode {
  return <ShieldCheck size={size} className={className} strokeWidth={strokeWidth} nonScalingStroke aria-hidden="true" focusable="false" />
}

function WorkspaceWriteArtwork({ size = 16, className, strokeWidth }: PermissionIconArtworkProps): ReactNode {
  return <FolderPen size={size} className={className} strokeWidth={strokeWidth} nonScalingStroke aria-hidden="true" focusable="false" />
}

function FullAccessArtwork({ size = 16, className, strokeWidth }: PermissionIconArtworkProps): ReactNode {
  return <ShieldAlert size={size} className={className} strokeWidth={strokeWidth} nonScalingStroke aria-hidden="true" focusable="false" />
}

function AutoReviewArtwork({ size = 16, className, strokeWidth }: PermissionIconArtworkProps): ReactNode {
  return <ShieldQuestion size={size} className={className} strokeWidth={strokeWidth} nonScalingStroke aria-hidden="true" focusable="false" />
}

/**
 * Render the read-only permission icon with a 1.75px stroke.
 * @param props - Size and optional class.
 * @returns The regular decorative permission glyph.
 */
export function PermissionIconReadOnlyRegular(props: IconProps): ReactNode {
  return <ReadOnlyArtwork {...props} strokeWidth={ICON_REGULAR_STROKE} />
}

/**
 * Render the read-only permission icon with a 1.75px stroke.
 * @param props - Size and optional class.
 * @returns The medium decorative permission glyph.
 */
export function PermissionIconReadOnlyMedium(props: IconProps): ReactNode {
  return <ReadOnlyArtwork {...props} strokeWidth={ICON_MEDIUM_STROKE} />
}

/**
 * Render the workspace-write permission icon with a 1.75px stroke.
 * @param props - Size and optional class.
 * @returns The regular decorative permission glyph.
 */
export function PermissionIconWorkspaceWriteRegular(props: IconProps): ReactNode {
  return <WorkspaceWriteArtwork {...props} strokeWidth={ICON_REGULAR_STROKE} />
}

/**
 * Render the workspace-write permission icon with a 1.75px stroke.
 * @param props - Size and optional class.
 * @returns The medium decorative permission glyph.
 */
export function PermissionIconWorkspaceWriteMedium(props: IconProps): ReactNode {
  return <WorkspaceWriteArtwork {...props} strokeWidth={ICON_MEDIUM_STROKE} />
}

/**
 * Render the full-access permission icon with a 1.75px stroke.
 * @param props - Size and optional class.
 * @returns The regular decorative permission glyph.
 */
export function PermissionIconFullAccessRegular(props: IconProps): ReactNode {
  return <FullAccessArtwork {...props} strokeWidth={ICON_REGULAR_STROKE} />
}

/**
 * Render the full-access permission icon with a 1.75px stroke.
 * @param props - Size and optional class.
 * @returns The medium decorative permission glyph.
 */
export function PermissionIconFullAccessMedium(props: IconProps): ReactNode {
  return <FullAccessArtwork {...props} strokeWidth={ICON_MEDIUM_STROKE} />
}

/**
 * Render the auto-review permission icon with a 1.75px stroke.
 * @param props - Size and optional class.
 * @returns The regular decorative permission glyph.
 */
export function PermissionIconAutoReviewRegular(props: IconProps): ReactNode {
  return <AutoReviewArtwork {...props} strokeWidth={ICON_REGULAR_STROKE} />
}

/**
 * Render the auto-review permission icon with a 1.75px stroke.
 * @param props - Size and optional class.
 * @returns The medium decorative permission glyph.
 */
export function PermissionIconAutoReviewMedium(props: IconProps): ReactNode {
  return <AutoReviewArtwork {...props} strokeWidth={ICON_MEDIUM_STROKE} />
}
