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
  Folder,
  Fullscreen,
  Film,
  Grid,
  Key,
  Layers,
  Link45deg,
  Mic,
  MusicNoteBeamed,
  Pause,
  Play,
  Plus,
  QrCodeScan,
  Sliders,
  Scissors,
  Stars,
  ThreeDots,
  Trash3,
  Upload,
  VolumeUp,
  ShieldCheck,
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
  | "maximize"
  | "chevron"
  | "chevron-left"
  | "chevron-right"
  | "download"
  | "music"
  | "captions"
  | "video"
  | "timeline"
  | "mic"
  | "link"
  | "more"
  | "refresh"
  | "bell"
  | "trash"
  | "alert"
  | "scissors"
  | "copy"
  | "shield";

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
  maximize: Fullscreen,
  chevron: ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  download: Download,
  alert: ExclamationTriangle,
  music: MusicNoteBeamed,
  captions: BadgeCc,
  video: CameraVideo,
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
} as const;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const Component = ICONS[name] || ICONS.grid;
  return <Component size={size} aria-hidden="true" focusable="false" />;
}
