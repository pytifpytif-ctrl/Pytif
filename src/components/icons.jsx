// App icon set, mapped onto Lucide for a clean, consistent look.
// Keep the <Icon name="..." /> API so call sites don't change.
import {
  Mail,
  Lock,
  User,
  UserPlus,
  Smartphone,
  Clock,
  Calendar,
  CalendarPlus,
  CalendarDays,
  CalendarCheck,
  Repeat,
  Copy,
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
  Eye,
  EyeOff,
  Bell,
  BarChart3,
  Receipt,
  CircleUserRound,
  LayoutGrid,
  SlidersHorizontal,
  X,
  Rocket,
  Download,
  Frown,
  ShoppingCart,
  Palmtree,
  Calculator,
} from 'lucide-react'

/** Jiokoe signup — member pass ticket with upward arrow (enter / commit). */
function SignUpMark({ size = 18, className = '', strokeWidth: _sw }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 5.5h12.5c1.1 0 2 .9 2 2v1.2c-.9 0-1.6.7-1.6 1.6s.7 1.6 1.6 1.6V15c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-1.1c.9 0 1.6-.7 1.6-1.6S4.1 8.7 3.2 8.7V7.5c0-1.1.9-2 2-2Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinejoin="round"
      />
      <circle cx="7.2" cy="8.3" r="0.55" fill="currentColor" opacity="0.45" />
      <circle cx="7.2" cy="11.2" r="0.55" fill="currentColor" opacity="0.45" />
      <circle cx="7.2" cy="14.1" r="0.55" fill="currentColor" opacity="0.45" />
      <path
        d="M11.5 15.2V9.8M11.5 9.8l-2.1 2.1M11.5 9.8l2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.8 10.2h2.8M15.8 13.4h2.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}

const ICONS = {
  mail: Mail,
  lock: Lock,
  lockClosed: Lock,
  user: User,
  userPlus: UserPlus,
  phone: Smartphone,
  clock: Clock,
  calendar: Calendar,
  calendarPlus: CalendarPlus,
  calendarDays: CalendarDays,
  calendarCheck: CalendarCheck,
  repeat: Repeat,
  copy: Copy,
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
  eye: Eye,
  eyeOff: EyeOff,
  bell: Bell,
  analytics: BarChart3,
  receipt: Receipt,
  profile: CircleUserRound,
  grid: LayoutGrid,
  filter: SlidersHorizontal,
  close: X,
  rocket: Rocket,
  signUp: SignUpMark,
  download: Download,
  moodSad: Frown,
  shoppingCart: ShoppingCart,
  beach: Palmtree,
  calculator: Calculator,
}

export function Icon({ name, size = 20, className = '', strokeWidth = 2 }) {
  const Cmp = ICONS[name]
  if (!Cmp) return null
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />
}
