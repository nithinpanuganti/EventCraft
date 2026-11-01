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
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Events",
    href: "/events",
    icon: CalendarDays,
  },
  {
    name: "Create Event",
    href: "/events/new",
    icon: Sparkles,
    badge: "New",
  },
  {
    name: "Guest Management",
    href: "/guests",
    icon: Users,
  },
  {
    name: "Invitations",
    href: "/invitations",
    icon: Mail,
  },
  {
    name: "Seating Planner",
    href: "/seating",
    icon: Armchair,
  },
  {
    name: "Budget Overview",
    href: "/budget",
    icon: PieChart,
  },
  {
    name: "Vendor Directory",
    href: "/vendors",
    icon: Briefcase,
  },
  {
    name: "Vendor Payments",
    href: "/vendors?tab=payments",
    icon: DollarSign,
  },
  {
    name: "Timeline and Tasks",
    href: "/timeline",
    icon: CheckSquare,
  },
  {
    name: "Event-Day Control Center",
    href: "/control-center",
    icon: Radio,
    badge: "Live",
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
    name: "Volunteer Management",
    href: "/volunteers",
    icon: HeartHandshake,
  },
  {
    name: "Documents",
    href: "/documents",
    icon: FileText,
  },
  {
    name: "Analytics and Reports",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

/**
 * Targeted Navigation for Event Coordinators
 */
export const COORDINATOR_NAVIGATION_ITEMS: NavItem[] = [
  {
    name: "Overview",
    href: "/dashboard/coordinator",
    icon: LayoutDashboard,
  },
  {
    name: "Assigned Events",
    href: "/events",
    icon: CalendarDays,
  },
  {
    name: "My Tasks",
    href: "/timeline",
    icon: CheckSquare,
  },
  {
    name: "Event Schedule",
    href: "/control-center?tab=schedule",
    icon: CalendarClock,
  },
  {
    name: "Event-Day Control Center",
    href: "/control-center",
    icon: Radio,
    badge: "Live",
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
    name: "Volunteer Management",
    href: "/volunteers",
    icon: HeartHandshake,
  },
  {
    name: "Emergency Contacts",
    href: "/emergency-contacts",
    icon: PhoneCall,
    badge: "SOS",
  },
  {
    name: "Issue Reporting",
    href: "/control-center?tab=issues",
    icon: ShieldAlert,
  },
  {
    name: "My Profile",
    href: "/settings",
    icon: Settings,
  },
];

/**
 * Dedicated Navigation for Vendors
 */
export const VENDOR_NAVIGATION_ITEMS: NavItem[] = [
  {
    name: "Overview",
    href: "/dashboard/vendor",
    icon: LayoutDashboard,
  },
  {
    name: "My Profile",
    href: "/vendors?tab=profile",
    icon: Briefcase,
  },
  {
    name: "My Bookings",
    href: "/vendors?tab=quotes",
    icon: ClipboardList,
  },
  {
    name: "Quotations",
    href: "/vendors?tab=quotes",
    icon: FileText,
  },
  {
    name: "Contracts",
    href: "/vendors?tab=contracts",
    icon: FileText,
  },
  {
    name: "Payment Information",
    href: "/vendors?tab=payments",
    icon: DollarSign,
  },
  {
    name: "Service Schedule",
    href: "/timeline",
    icon: CalendarClock,
  },
  {
    name: "Live Control Center",
    href: "/control-center",
    icon: Radio,
  },
  {
    name: "Documents",
    href: "/documents",
    icon: FileText,
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
    name: "Overview",
    href: "/dashboard/guest",
    icon: LayoutDashboard,
  },
  {
    name: "My Invitations",
    href: "/invitations?view=guest",
    icon: Mail,
    badge: "RSVP",
  },
  {
    name: "RSVP",
    href: "/guests?view=rsvp",
    icon: CheckSquare,
  },
  {
    name: "Event Details",
    href: "/events",
    icon: CalendarDays,
  },
  {
    name: "My Seating",
    href: "/seating?view=guest",
    icon: Armchair,
  },
  {
    name: "QR Pass",
    href: "/check-in?view=pass",
    icon: QrCode,
  },
  {
    name: "My Profile",
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
