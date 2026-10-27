import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  PieChart,
  CheckSquare,
  Settings,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Events",
    href: "/events",
    icon: CalendarDays,
  },
  {
    name: "Event Planner",
    href: "/planner",
    icon: Sparkles,
    badge: "AI",
  },
  {
    name: "Budget Overview",
    href: "/budget",
    icon: PieChart,
  },
  {
    name: "Timeline & Tasks",
    href: "/timeline",
    icon: CheckSquare,
  },
  {
    name: "Vendor Directory",
    href: "/vendors",
    icon: CheckSquare,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
