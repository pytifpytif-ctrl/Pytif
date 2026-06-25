// App icon set, mapped onto Lucide for a clean, consistent look.
// Keep the <Icon name="..." /> API so call sites don't change.
import {
  Mail,
  Lock,
  User,
  Smartphone,
  Clock,
  Calendar,
  CalendarPlus,
  Plus,
  Camera,
  Search,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  House,
  History,
  Recycle,
  Check,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Zap,
  TrendingUp,
  Wallet,
  ChevronDown,
  Settings,
  Shield,
} from 'lucide-react'

const ICONS = {
  mail: Mail,
  lock: Lock,
  lockClosed: Lock,
  user: User,
  phone: Smartphone,
  clock: Clock,
  calendar: Calendar,
  calendarPlus: CalendarPlus,
  plus: Plus,
  camera: Camera,
  search: Search,
  arrowRight: ArrowRight,
  arrowUpRight: ArrowUpRight,
  arrowDownLeft: ArrowDownLeft,
  home: House,
  history: History,
  recycle: Recycle,
  check: Check,
  logout: LogOut,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
  bolt: Zap,
  trend: TrendingUp,
  wallet: Wallet,
  chevronDown: ChevronDown,
  settings: Settings,
  shield: Shield,
}

export function Icon({ name, size = 20, className = '', strokeWidth = 2 }) {
  const Cmp = ICONS[name]
  if (!Cmp) return null
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />
}
