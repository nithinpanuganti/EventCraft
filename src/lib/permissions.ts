import { UserRole } from "./storage/types";

export type PermissionAction =
  | "events:create"
  | "events:delete"
  | "events:manage_all"
  | "events:view_assigned"
  | "budget:manage"
  | "budget:view"
  | "guests:manage_all"
  | "guests:view_roster"
  | "guests:self_rsvp"
  | "seating:manage"
  | "seating:view_assigned"
  | "invitations:manage"
  | "invitations:view_own"
  | "qr_pass:view_own"
  | "control_center:operate"
  | "control_center:view_schedule"
  | "vendors:manage_all"
  | "vendors:view_own_profile"
  | "vendors:submit_quotes"
  | "vendors:view_own_contracts"
  | "vendors:view_own_payments"
  | "volunteers:manage"
  | "risks:manage"
  | "analytics:view_reports"
  | "settings:manage_financial"
  | "settings:manage_profile"
  | "documents:vault";

export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  ORGANIZER: [
    "events:create",
    "events:delete",
    "events:manage_all",
    "events:view_assigned",
    "budget:manage",
    "budget:view",
    "guests:manage_all",
    "guests:view_roster",
    "guests:self_rsvp",
    "seating:manage",
    "seating:view_assigned",
    "invitations:manage",
    "invitations:view_own",
    "qr_pass:view_own",
    "control_center:operate",
    "control_center:view_schedule",
    "vendors:manage_all",
    "vendors:view_own_profile",
    "vendors:submit_quotes",
    "vendors:view_own_contracts",
    "vendors:view_own_payments",
    "volunteers:manage",
    "risks:manage",
    "analytics:view_reports",
    "settings:manage_financial",
    "settings:manage_profile",
    "documents:vault",
  ],
  COORDINATOR: [
    "events:view_assigned",
    "guests:view_roster",
    "control_center:operate",
    "control_center:view_schedule",
    "volunteers:manage",
    "settings:manage_profile",
    "documents:vault",
  ],
  VENDOR: [
    "events:view_assigned",
    "control_center:view_schedule",
    "vendors:view_own_profile",
    "vendors:submit_quotes",
    "vendors:view_own_contracts",
    "vendors:view_own_payments",
    "settings:manage_profile",
    "documents:vault",
  ],
  GUEST: [
    "events:view_assigned",
    "guests:self_rsvp",
    "seating:view_assigned",
    "invitations:view_own",
    "qr_pass:view_own",
    "settings:manage_profile",
  ],
};

/**
 * Universal public routes accessible without role restrictions
 */
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/login/organizer",
  "/login/coordinator",
  "/login/vendor",
  "/login/guest",
  "/register",
];

/**
 * Route access policies per role
 */
export const ROLE_ALLOWED_ROUTES: Record<UserRole, string[]> = {
  ORGANIZER: [
    "/dashboard",
    "/dashboard/organizer",
    "/events",
    "/events/new",
    "/planner",
    "/budget",
    "/timeline",
    "/guests",
    "/seating",
    "/invitations",
    "/control-center",
    "/vendors",
    "/venue-layout",
    "/risks",
    "/volunteers",
    "/documents",
    "/analytics",
    "/emergency-contacts",
    "/check-in",
    "/settings",
  ],
  COORDINATOR: [
    "/dashboard",
    "/dashboard/coordinator",
    "/events",
    "/timeline",
    "/control-center",
    "/check-in",
    "/vendors",
    "/volunteers",
    "/emergency-contacts",
    "/documents",
    "/settings",
  ],
  VENDOR: [
    "/dashboard",
    "/dashboard/vendor",
    "/vendors",
    "/timeline",
    "/control-center",
    "/documents",
    "/settings",
    "/events",
  ],
  GUEST: [
    "/dashboard",
    "/dashboard/guest",
    "/invitations",
    "/guests",
    "/check-in",
    "/seating",
    "/events",
    "/settings",
  ],
};

/**
 * Evaluates whether a role is authorized to visit a given pathname
 */
export function canAccessRoute(role: UserRole = "ORGANIZER", pathname: string): boolean {
  // Normalize pathname by stripping query params and trailing slashes
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  if (PUBLIC_ROUTES.includes(cleanPath)) {
    return true;
  }

  const allowedRoutes = ROLE_ALLOWED_ROUTES[role] || [];
  return allowedRoutes.some((route) => cleanPath === route || cleanPath.startsWith(route + "/"));
}

/**
 * Returns default home dashboard URL for a user role
 */
export function getRoleDefaultDashboard(role: UserRole = "ORGANIZER"): string {
  switch (role) {
    case "COORDINATOR":
      return "/dashboard/coordinator";
    case "VENDOR":
      return "/dashboard/vendor";
    case "GUEST":
      return "/dashboard/guest";
    case "ORGANIZER":
    default:
      return "/dashboard/organizer";
  }
}

/**
 * Check if a role can execute a specific permission action
 */
export function canPerformAction(role: UserRole = "ORGANIZER", action: PermissionAction): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(action);
}

/**
 * Asserts permission, throwing an error if unauthorized (useful in shared data operations)
 */
export function assertPermission(role: UserRole = "ORGANIZER", action: PermissionAction): void {
  if (!canPerformAction(role, action)) {
    throw new Error(`Unauthorized: role ${role} is not permitted to perform action '${action}'`);
  }
}

