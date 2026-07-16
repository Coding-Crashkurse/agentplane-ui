import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  Database,
  Globe,
  KeyRound,
  LayoutGrid,
  MessageSquare,
  Settings,
  ShieldCheck,
  User,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  book: BookOpen,
  bot: Bot,
  boxes: Boxes,
  chart: BarChart3,
  database: Database,
  globe: Globe,
  key: KeyRound,
  message: MessageSquare,
  settings: Settings,
  shield: ShieldCheck,
  user: User,
  users: Users,
  workflow: Workflow,
};

export function tileIcon(name: string): LucideIcon {
  return ICONS[name] ?? LayoutGrid;
}
