import {
  Armchair,
  Bot,
  BookOpen,
  Brain,
  Briefcase,
  Cat,
  ChartNoAxesCombined,
  CircleDot,
  Clapperboard,
  ClipboardList,
  Coins,
  Crown,
  Feather,
  Flag,
  Gem,
  Globe,
  HandFist,
  Handshake,
  HeartCrack,
  KeyRound,
  Laugh,
  Lightbulb,
  Meh,
  Mic,
  Newspaper,
  NotepadText,
  Pizza,
  Rocket,
  ScanEye,
  SearchAlert,
  ShieldAlert,
  Skull,
  Smartphone,
  Smile,
  Sparkles,
  Speech,
  Star,
  Swords,
  Target,
  TrendingDown,
  Triangle,
  User,
  Users,
  Video,
  Zap,
  type LucideProps,
} from 'lucide-react';

import type { ComponentType } from 'react';

/**
 * Maps avatar identifier strings (used in preset JSON) to Lucide icon components.
 * Each key is the value of the `avatar` field in a preset agent definition.
 */
const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  mic: Mic,
  skull: Skull,
  bot: Bot,
  sparkles: Sparkles,
  swords: Swords,
  target: Target,
  'shield-alert': ShieldAlert,
  meh: Meh,
  smile: Smile,
  laugh: Laugh,
  globe: Globe,
  'scan-eye': ScanEye,
  'search-alert': SearchAlert,
  armchair: Armchair,
  'notepad-text': NotepadText,
  pizza: Pizza,
  users: Users,
  'key-round': KeyRound,
  brain: Brain,
  zap: Zap,
  coins: Coins,
  star: Star,
  video: Video,
  smartphone: Smartphone,
  'clipboard-list': ClipboardList,
  'heart-crack': HeartCrack,
  'circle-dot': CircleDot,
  'trending-down': TrendingDown,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  rocket: Rocket,
  user: User,
  cat: Cat,
  triangle: Triangle,
  'book-open': BookOpen,
  clapperboard: Clapperboard,
  feather: Feather,
  crown: Crown,
  flag: Flag,
  gem: Gem,
  fist: HandFist,
  speech: Speech,
  newspaper: Newspaper,
  handshake: Handshake,
  'chart-no-axes': ChartNoAxesCombined,
};

/**
 * Renders a Lucide icon for an agent avatar.
 * Falls back to a generic CircleDot when no avatar is set or the identifier is unrecognised.
 */
export function AgentIcon({
  avatar,
  size = 14,
  className,
  ...props
}: {
  avatar?: string;
  size?: number;
  className?: string;
} & Omit<LucideProps, 'size'>) {
  const Icon = avatar ? ICON_MAP[avatar] ?? CircleDot : CircleDot;
  return <Icon size={size} className={className} {...props} />;
}
