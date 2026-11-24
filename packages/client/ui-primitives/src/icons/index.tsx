/** Lucide outline icons behind the existing product icon API. */
import {
  AlarmClock, Archive, PackageCheck, ArchiveRestore, ArchiveX, ArrowUpRight, Blocks, BookOpen, Bot, Brain,
  ChartColumn, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, CircleAlert, CircleCheck,
  CircleHelp, CircleX, ClipboardList, Clock, Code, Columns2, Copy, CornerDownRight, Database, Download, Ellipsis,
  FileText, FolderClosed, FolderOpen, FolderPlus, FolderTree, Gauge, GitBranch, Globe, Info, KeyRound, Link, List,
  ListChecks, ListOrdered, ListTodo, LoaderCircle, Maximize, MessageSquarePlus, Mic, Minimize2, Monitor, Moon,
  MoveRight, PanelLeft, PanelsTopLeft, Paperclip, Pause, Pencil, Pin, Play, Plus, Puzzle, RefreshCw, ScanSearch,
  Search, Send, Settings, Share2, Shield, SlidersHorizontal, Sparkles, Square, SquarePen, Sun, Target, ThumbsDown,
  ThumbsUp, Trash2, TriangleAlert, User, Users, WandSparkles, WrapText, X,
} from 'lucide-react'
import type { IconProps } from './props.ts'
export type { IconProps } from './props.ts'

/** Compatibility value for existing composite icons. */
export const SHIELD_OUTLINE_PATH = 'M6.80132 2.14853C7.70663 1.80917 8.70422 1.80919 9.60952 2.14859L14.1296 3.84317V7.11961C14.1296 11.6089 10.7615 13.5975 8.20543 14.5779C5.64931 13.5975 2.28052 11.6089 2.28052 7.11961V3.84317L6.80132 2.14853Z'

/** Compatibility value for existing composite icons. */
export const ICON_REGULAR_STROKE = 1.75

/** Compatibility value for existing composite icons. */
export const ICON_MEDIUM_STROKE = 1.75

/**
 * Render the SquarePen icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconNewChatOutlineRegular = ({ size = 16, className }: IconProps) => (
  <SquarePen size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the SquarePen icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconNewChatOutlineMedium = ({ size = 16, className }: IconProps) => (
  <SquarePen size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Search icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSearchOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Search size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Search icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSearchOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Search size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Globe icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconGlobeOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Globe size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Globe icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconGlobeOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Globe size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Settings icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSettingsOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Settings size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Settings icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSettingsOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Settings size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the PanelLeft icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPanelLeftOutlineRegular = ({ size = 16, className }: IconProps) => (
  <PanelLeft size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the PanelLeft icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPanelLeftOutlineMedium = ({ size = 16, className }: IconProps) => (
  <PanelLeft size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Ellipsis icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconEllipsisOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Ellipsis size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Ellipsis icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconEllipsisOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Ellipsis size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Plus icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPlusOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Plus size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Plus icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPlusOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Plus size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Check icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCheckOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Check size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Check icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCheckOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Check size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the GitBranch icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconBranchOutlineRegular = ({ size = 16, className }: IconProps) => (
  <GitBranch size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the GitBranch icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconBranchOutlineMedium = ({ size = 16, className }: IconProps) => (
  <GitBranch size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChevronDown icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChevronDownOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ChevronDown size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChevronDown icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChevronDownOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ChevronDown size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChevronLeft icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChevronLeftOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ChevronLeft size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChevronLeft icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChevronLeftOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ChevronLeft size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChevronRight icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChevronRightOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ChevronRight size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChevronRight icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChevronRightOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ChevronRight size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Play icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconTriangleRightFillRegular = ({ size = 16, className }: IconProps) => (
  <Play size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Play icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconTriangleRightFillMedium = ({ size = 16, className }: IconProps) => (
  <Play size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChevronUp icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChevronUpOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ChevronUp size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChevronUp icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChevronUpOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ChevronUp size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the X icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCloseOutlineRegular = ({ size = 16, className }: IconProps) => (
  <X size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the X icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCloseOutlineMedium = ({ size = 16, className }: IconProps) => (
  <X size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the X icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCloseFillRegular = ({ size = 16, className }: IconProps) => (
  <X size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the X icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCloseFillMedium = ({ size = 16, className }: IconProps) => (
  <X size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CircleX icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCloseCircleFillRegular = ({ size = 16, className }: IconProps) => (
  <CircleX size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CircleX icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCloseCircleFillMedium = ({ size = 16, className }: IconProps) => (
  <CircleX size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Copy icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCopyOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Copy size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Copy icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCopyOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Copy size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the RefreshCw icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconRefreshOutlineRegular = ({ size = 16, className }: IconProps) => (
  <RefreshCw size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the RefreshCw icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconRefreshOutlineMedium = ({ size = 16, className }: IconProps) => (
  <RefreshCw size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ThumbsUp icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconLikeOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ThumbsUp size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ThumbsUp icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconLikeOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ThumbsUp size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ThumbsUp icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconLikeFillRegular = ({ size = 16, className }: IconProps) => (
  <ThumbsUp size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" fill="currentColor" />
)

/**
 * Render the ThumbsUp icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconLikeFillMedium = ({ size = 16, className }: IconProps) => (
  <ThumbsUp size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" fill="currentColor" />
)

/**
 * Render the ThumbsDown icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDislikeOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ThumbsDown size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ThumbsDown icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDislikeOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ThumbsDown size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ThumbsDown icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDislikeFillRegular = ({ size = 16, className }: IconProps) => (
  <ThumbsDown size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" fill="currentColor" />
)

/**
 * Render the ThumbsDown icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDislikeFillMedium = ({ size = 16, className }: IconProps) => (
  <ThumbsDown size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" fill="currentColor" />
)

/**
 * Render the Share2 icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconShareOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Share2 size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Share2 icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconShareOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Share2 size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FileText icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDeliverDocRegular = ({ size = 16, className }: IconProps) => (
  <FileText size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FileText icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDeliverDocMedium = ({ size = 16, className }: IconProps) => (
  <FileText size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Pencil icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconEditOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Pencil size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Pencil icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconEditOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Pencil size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Brain icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconThinkOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Brain size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Brain icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconThinkOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Brain size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Bot icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconAgentPresetOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Bot size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Bot icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconAgentPresetOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Bot size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the PanelsTopLeft icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconBrowseOutlineRegular = ({ size = 16, className }: IconProps) => (
  <PanelsTopLeft size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the PanelsTopLeft icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconBrowseOutlineMedium = ({ size = 16, className }: IconProps) => (
  <PanelsTopLeft size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the MessageSquarePlus icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconContextInjectionOutlineRegular = ({ size = 16, className }: IconProps) => (
  <MessageSquarePlus size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the MessageSquarePlus icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconContextInjectionOutlineMedium = ({ size = 16, className }: IconProps) => (
  <MessageSquarePlus size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Link icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconLinkOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Link size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Link icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconLinkOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Link size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ArrowUpRight icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconRightUpOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ArrowUpRight size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ArrowUpRight icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconRightUpOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ArrowUpRight size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the WandSparkles icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconEnhanceOutlineRegular = ({ size = 16, className }: IconProps) => (
  <WandSparkles size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the WandSparkles icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconEnhanceOutlineMedium = ({ size = 16, className }: IconProps) => (
  <WandSparkles size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Trash2 icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconTrashOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Trash2 size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Trash2 icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconTrashOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Trash2 size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CircleAlert icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconWarningOutlineRegular = ({ size = 16, className }: IconProps) => (
  <CircleAlert size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CircleAlert icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconWarningOutlineMedium = ({ size = 16, className }: IconProps) => (
  <CircleAlert size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CircleCheck icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCheckCircleFillRegular = ({ size = 16, className }: IconProps) => (
  <CircleCheck size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CircleCheck icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCheckCircleFillMedium = ({ size = 16, className }: IconProps) => (
  <CircleCheck size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the TriangleAlert icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconWarningTriangleOutlineRegular = ({ size = 16, className }: IconProps) => (
  <TriangleAlert size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the TriangleAlert icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconWarningTriangleOutlineMedium = ({ size = 16, className }: IconProps) => (
  <TriangleAlert size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the User icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconUserOutlineRegular = ({ size = 16, className }: IconProps) => (
  <User size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the User icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconUserOutlineMedium = ({ size = 16, className }: IconProps) => (
  <User size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Users icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconUsersOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Users size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Users icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconUsersOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Users size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Send icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPaperPlaneOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Send size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Send icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPaperPlaneOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Send size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Square icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconStopFillRegular = ({ size = 16, className }: IconProps) => (
  <Square size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Square icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconStopFillMedium = ({ size = 16, className }: IconProps) => (
  <Square size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Paperclip icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPaperclipOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Paperclip size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Paperclip icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPaperclipOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Paperclip size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the LoaderCircle icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconLoadingOutlineRegular = ({ size = 16, className }: IconProps) => (
  <LoaderCircle size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the LoaderCircle icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconLoadingOutlineMedium = ({ size = 16, className }: IconProps) => (
  <LoaderCircle size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Download icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDownloadOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Download size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Download icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDownloadOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Download size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Play icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPlayOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Play size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Play icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPlayOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Play size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Pause icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPauseOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Pause size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Pause icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPauseOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Pause size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Maximize icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFullscreenOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Maximize size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Maximize icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFullscreenOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Maximize size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Code icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCodeOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Code size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Code icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCodeOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Code size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Puzzle icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCordisPluginOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Puzzle size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Puzzle icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCordisPluginOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Puzzle size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the KeyRound icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconApiOutlineRegular = ({ size = 16, className }: IconProps) => (
  <KeyRound size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the KeyRound icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconApiOutlineMedium = ({ size = 16, className }: IconProps) => (
  <KeyRound size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the SlidersHorizontal icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPersonalizationOutlineRegular = ({ size = 16, className }: IconProps) => (
  <SlidersHorizontal size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the SlidersHorizontal icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPersonalizationOutlineMedium = ({ size = 16, className }: IconProps) => (
  <SlidersHorizontal size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderPlus icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconProjectAddOutlineRegular = ({ size = 16, className }: IconProps) => (
  <FolderPlus size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderPlus icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconProjectAddOutlineMedium = ({ size = 16, className }: IconProps) => (
  <FolderPlus size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderOpen icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFolderOpenOutlineRegular = ({ size = 16, className }: IconProps) => (
  <FolderOpen size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderOpen icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFolderOpenOutlineMedium = ({ size = 16, className }: IconProps) => (
  <FolderOpen size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderOpen icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFolderOpenRegular = ({ size = 16, className }: IconProps) => (
  <FolderOpen size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderOpen icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFolderOpenMedium = ({ size = 16, className }: IconProps) => (
  <FolderOpen size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderClosed icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFolderCloseRegular = ({ size = 16, className }: IconProps) => (
  <FolderClosed size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderClosed icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFolderCloseMedium = ({ size = 16, className }: IconProps) => (
  <FolderClosed size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CornerDownRight icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconTreeCornerRegular = ({ size = 16, className }: IconProps) => (
  <CornerDownRight size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CornerDownRight icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconTreeCornerMedium = ({ size = 16, className }: IconProps) => (
  <CornerDownRight size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Sun icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconLightOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Sun size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Sun icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconLightOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Sun size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Moon icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDarkOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Moon size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Moon icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDarkOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Moon size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Monitor icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFollowsystemOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Monitor size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Monitor icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFollowsystemOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Monitor size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChartColumn icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDataOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ChartColumn size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChartColumn icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDataOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ChartColumn size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Database icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDatabaseOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Database size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Database icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconDatabaseOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Database size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Clock icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconClockOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Clock size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Clock icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconClockOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Clock size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Gauge icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconGaugeOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Gauge size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Gauge icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconGaugeOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Gauge size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Send icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSendOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Send size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Send icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSendOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Send size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ListOrdered icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconQueueOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ListOrdered size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ListOrdered icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconQueueOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ListOrdered size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ListChecks icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChecklistOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ListChecks size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ListChecks icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChecklistOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ListChecks size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ListTodo icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconListPenOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ListTodo size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ListTodo icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconListPenOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ListTodo size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Target icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconGoalOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Target size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Target icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconGoalOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Target size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Sparkles icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSparkleRegular = ({ size = 16, className }: IconProps) => (
  <Sparkles size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Sparkles icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSparkleMedium = ({ size = 16, className }: IconProps) => (
  <Sparkles size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ScanSearch icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconInspectOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ScanSearch size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ScanSearch icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconInspectOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ScanSearch size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the BookOpen icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSkillOutlineRegular = ({ size = 16, className }: IconProps) => (
  <BookOpen size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the BookOpen icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSkillOutlineMedium = ({ size = 16, className }: IconProps) => (
  <BookOpen size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CircleHelp icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconQuestionOutlineRegular = ({ size = 16, className }: IconProps) => (
  <CircleHelp size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CircleHelp icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconQuestionOutlineMedium = ({ size = 16, className }: IconProps) => (
  <CircleHelp size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Info icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconInfoOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Info size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Info icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconInfoOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Info size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Blocks icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPluginPinwheelOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Blocks size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Blocks icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPluginPinwheelOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Blocks size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the AlarmClock icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconAlarmClockOutlineRegular = ({ size = 16, className }: IconProps) => (
  <AlarmClock size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the AlarmClock icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconAlarmClockOutlineMedium = ({ size = 16, className }: IconProps) => (
  <AlarmClock size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Archive icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconArchiveOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Archive size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Archive icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconArchiveOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Archive size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the WrapText icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconWrapLinesOutlineRegular = ({ size = 16, className }: IconProps) => (
  <WrapText size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the WrapText icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconWrapLinesOutlineMedium = ({ size = 16, className }: IconProps) => (
  <WrapText size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the MoveRight icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconNowrapFillRegular = ({ size = 16, className }: IconProps) => (
  <MoveRight size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the MoveRight icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconNowrapFillMedium = ({ size = 16, className }: IconProps) => (
  <MoveRight size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the WrapText icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconWrapFillRegular = ({ size = 16, className }: IconProps) => (
  <WrapText size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the WrapText icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconWrapFillMedium = ({ size = 16, className }: IconProps) => (
  <WrapText size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Columns2 icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCompareSplitOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Columns2 size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Columns2 icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCompareSplitOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Columns2 size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ClipboardList icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPlanOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ClipboardList size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ClipboardList icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPlanOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ClipboardList size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Minimize2 icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCompactOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Minimize2 size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Minimize2 icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCompactOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Minimize2 size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Shield icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconShieldOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Shield size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Shield icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconShieldOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Shield size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CircleCheck icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCheckCircleOutlineRegular = ({ size = 16, className }: IconProps) => (
  <CircleCheck size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the CircleCheck icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconCheckCircleOutlineMedium = ({ size = 16, className }: IconProps) => (
  <CircleCheck size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ArchiveRestore icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconUnarchiveOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ArchiveRestore size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ArchiveRestore icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconUnarchiveOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ArchiveRestore size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Pin icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPinOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Pin size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Pin icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPinOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Pin size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Pin icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPinFillRegular = ({ size = 16, className }: IconProps) => (
  <Pin size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" fill="currentColor" />
)

/**
 * Render the Pin icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconPinFillMedium = ({ size = 16, className }: IconProps) => (
  <Pin size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" fill="currentColor" />
)

/**
 * Render the List icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFlatListOutlineRegular = ({ size = 16, className }: IconProps) => (
  <List size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the List icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconFlatListOutlineMedium = ({ size = 16, className }: IconProps) => (
  <List size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderTree icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconWorkspaceTreeOutlineRegular = ({ size = 16, className }: IconProps) => (
  <FolderTree size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the FolderTree icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconWorkspaceTreeOutlineMedium = ({ size = 16, className }: IconProps) => (
  <FolderTree size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChevronsUpDown icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChevronsUpDownOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ChevronsUpDown size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ChevronsUpDown icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconChevronsUpDownOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ChevronsUpDown size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ArchiveX icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconArchiveOffOutlineRegular = ({ size = 16, className }: IconProps) => (
  <ArchiveX size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ArchiveX icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconArchiveOffOutlineMedium = ({ size = 16, className }: IconProps) => (
  <ArchiveX size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ArchiveCheck icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconArchiveCheckOutlineRegular = ({ size = 16, className }: IconProps) => (
  <PackageCheck size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the ArchiveCheck icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconArchiveCheckOutlineMedium = ({ size = 16, className }: IconProps) => (
  <PackageCheck size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the SlidersHorizontal icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSlidersTwoOutlineRegular = ({ size = 16, className }: IconProps) => (
  <SlidersHorizontal size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the SlidersHorizontal icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconSlidersTwoOutlineMedium = ({ size = 16, className }: IconProps) => (
  <SlidersHorizontal size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Mic icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconMicrophoneOutlineRegular = ({ size = 16, className }: IconProps) => (
  <Mic size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)

/**
 * Render the Mic icon, preserving caller sizing.
 * @param props - Icon size and placement.
 * @returns Decorative Lucide SVG.
 */
export const IconMicrophoneOutlineMedium = ({ size = 16, className }: IconProps) => (
  <Mic size={size} className={className} strokeWidth={1.75} nonScalingStroke aria-hidden="true" focusable="false" />
)
