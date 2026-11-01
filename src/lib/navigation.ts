import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  PieChart,
  CheckSquare,
  Settings,
  Users,
  Armchair,
  Mail,
  Radio,
  Compass,
  ShieldAlert,
  BarChart3,
  FileText,
  HeartHandshake,
  PhoneCall,
  QrCode,
  Briefcase,
  CalendarClock,
  ClipboardList,
  DollarSign,
  LucideIcon,
} from "lucide-react";
import type { UserRole } from "./storage/types";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
}

/**
 * Baseline navigation items preserved for backward compatibility and test verification.
 */
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

/**
 * Comprehensive Navigation for Event Organizers
 */
export const ORGANIZER_NAVIGATION_ITEMS: NavItem[] = [
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
    name: "Guest List & RSVP",
    href: "/guests",
    icon: Users,
  },
  {
    name: "Seating Planner",
    href: "/seating",
    icon: Armchair,
  },
  {
    name: "Invitations & QR",
    href: "/invitations",
    icon: Mail,
  },
  {
    name: "Control Center",
    href: "/control-center",
    icon: Radio,
    badge: "Live",
  },
  {
    name: "Budget Ledger",
    href: "/budget",
    icon: PieChart,
  },
  {
    name: "Vendor Management",
    href: "/vendors",
    icon: Briefcase,
  },
  {
    name: "Timeline & Runsheet",
    href: "/timeline",
    icon: CheckSquare,
  },
  {
    name: "Venue Layout",
    href: "/venue-layout",
    icon: Compass,
  },
  {
    name: "Risk Management",
    href: "/risks",
    icon: ShieldAlert,
  },
  {
    name: "Volunteers",
    href: "/volunteers",
    icon: HeartHandshake,
  },
  {
    name: "Documents Vault",
    href: "/documents",
    icon: FileText,
  },
  {
    name: "Analytics & Reports",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    name: "Settings & Backup",
    href: "/settings",
    icon: Settings,
  },
];

/**
 * Targeted Navigation for Event Coordinators
 */
export const COORDINATOR_NAVIGATION_ITEMS: NavItem[] = [
  {
    name: "Assigned Events",
    href: "/events",
    icon: CalendarDays,
  },
  {
    name: "Control Center",
    href: "/control-center",
    icon: Radio,
    badge: "Live",
  },
  {
    name: "My Tasks & Runsheet",
    href: "/timeline",
    icon: CheckSquare,
  },
  {
    name: "Guest Check-in",
    href: "/check-in",
    icon: QrCode,
  },
  {
    name: "Vendor Contacts",
    href: "/vendors",
    icon: Briefcase,
  },
  {
    name: "Emergency Contacts",
    href: "/emergency-contacts",
    icon: PhoneCall,
    badge: "Sos",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

/**
 * Dedicated Navigation for Vendors
 */
export const VENDOR_NAVIGATION_ITEMS: NavItem[] = [
  {
    name: "Vendor Profile",
    href: "/vendors?tab=profile",
    icon: Briefcase,
  },
  {
    name: "My Bookings & Quotes",
    href: "/vendors?tab=quotes",
    icon: ClipboardList,
  },
  {
    name: "Contracts & Payments",
    href: "/vendors?tab=contracts",
    icon: DollarSign,
  },
  {
    name: "Event Runsheet",
    href: "/timeline",
    icon: CalendarClock,
  },
  {
    name: "Live Control Center",
    href: "/control-center",
    icon: Radio,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

/**
 * Guest Portal Navigation
 */
export const GUEST_NAVIGATION_ITEMS: NavItem[] = [
  {
    name: "My Invitation & RSVP",
    href: "/invitations?view=guest",
    icon: Mail,
    badge: "RSVP",
  },
  {
    name: "Digital QR Pass",
    href: "/check-in?view=pass",
    icon: QrCode,
  },
  {
    name: "My Seating Table",
    href: "/seating?view=guest",
    icon: Armchair,
  },
  {
    name: "Event Details",
    href: "/events",
    icon: CalendarDays,
  },
  {
    name: "Guest Profile",
    href: "/settings",
    icon: Settings,
  },
];

export function getNavigationItemsForRole(role: UserRole = "ORGANIZER"): NavItem[] {
  switch (role) {
    case "COORDINATOR":
      return COORDINATOR_NAVIGATION_ITEMS;
    case "VENDOR":
      return VENDOR_NAVIGATION_ITEMS;
    case "GUEST":
      return GUEST_NAVIGATION_ITEMS;
    case "ORGANIZER":
    default:
      return ORGANIZER_NAVIGATION_ITEMS;
  }
}
