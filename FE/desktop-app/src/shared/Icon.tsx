import {
  ArrowClockwise,
  ArrowCounterclockwise,
  ArrowRight,
  ArrowRepeat,
  BadgeCc,
  Bell,
  BoxArrowUpRight,
  CameraVideo,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock,
  Download,
  ExclamationTriangle,
  FileEarmarkText,
  Folder,
  Fullscreen,
  Film,
  Grid,
  Key,
  Layers,
  Link45deg,
  Lock,
  Mic,
  MusicNoteBeamed,
  Pause,
  Play,
  Plus,
  QrCodeScan,
  Search,
  Sliders,
  Scissors,
  Stars,
  ThreeDots,
  Trash3,
  Unlock,
  Upload,
  VolumeMute,
  VolumeUp,
  ShieldCheck,
  LightningCharge,
  XLg,
  ZoomIn,
  ZoomOut,
  ChatQuote,
} from "react-bootstrap-icons";

export type IconName =
  | "grid"
  | "layers"
  | "scan"
  | "play"
  | "pause"
  | "key"
  | "sliders"
  | "plus"
  | "upload"
  | "arrow"
  | "check"
  | "clock"
  | "spark"
  | "folder"
  | "external"
  | "undo"
  | "redo"
  | "volume"
  | "volume-mute"
  | "maximize"
  | "chevron"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "download"
  | "music"
  | "captions"
  | "video"
  | "film"
  | "timeline"
  | "mic"
  | "link"
  | "more"
  | "refresh"
  | "bell"
  | "trash"
  | "scissors"
  | "copy"
  | "shield"
  | "zap"
  | "lock"
  | "unlock"
  | "zoom-in"
  | "zoom-out"
  | "chat"
  | "search"
  | "file-text"
  | "alert"
  | "x";

const ICONS = {
  grid: Grid,
  layers: Layers,
  scan: QrCodeScan,
  play: Play,
  pause: Pause,
  key: Key,
  sliders: Sliders,
  plus: Plus,
  upload: Upload,
  arrow: ArrowRight,
  check: Check,
  clock: Clock,
  spark: Stars,
  folder: Folder,
  external: BoxArrowUpRight,
  undo: ArrowCounterclockwise,
  redo: ArrowClockwise,
  volume: VolumeUp,
  "volume-mute": VolumeMute,
  maximize: Fullscreen,
  chevron: ChevronDown,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  download: Download,
  alert: ExclamationTriangle,
  music: MusicNoteBeamed,
  captions: BadgeCc,
  video: CameraVideo,
  film: Film,
  timeline: Film,
  mic: Mic,
  link: Link45deg,
  more: ThreeDots,
  refresh: ArrowRepeat,
  bell: Bell,
  trash: Trash3,
  scissors: Scissors,
  copy: Clipboard,
  shield: ShieldCheck,
  zap: LightningCharge,
  lock: Lock,
  unlock: Unlock,
  "zoom-in": ZoomIn,
  "zoom-out": ZoomOut,
  chat: ChatQuote,
  search: Search,
  "file-text": FileEarmarkText,
  x: XLg,
} as const;

export function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const Component = ICONS[name] || ICONS.grid;
  return <Component size={size} className={className} aria-hidden="true" focusable="false" />;
}
