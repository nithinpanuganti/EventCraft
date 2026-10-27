export type EventType = "WEDDING" | "BIRTHDAY" | "COMMUNITY";

export type EventStatus = "DRAFT" | "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type TaskPhase = "PLANNING" | "BOOKING" | "PREPARATION" | "EVENT_DAY" | "POST_EVENT";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";

export type VendorStatus = "RESEARCHING" | "CONTACTED" | "QUOTED" | "BOOKED" | "DECLINED";

export interface EventFormData {
  type: EventType;
  title: string;
  description?: string;
  eventDate?: string;
  location?: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  themePreferences?: string;
  culturalPreferences?: string;
  dietaryRestrictions?: string;
  accessibilityRequirements?: string;
  specialInstructions?: string;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  description: string;
}
