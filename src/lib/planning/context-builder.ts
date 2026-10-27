import { EventType } from "@prisma/client";

export interface PlanningContextInput {
  eventId: string;
  userId: string;
  type: EventType;
  title: string;
  description?: string | null;
  eventDate?: Date | string | null;
  location?: string | null;
  guestCount: number;
  totalBudget: number;
  currency: string;
  themePreferences?: string | null;
  culturalPreferences?: string | null;
  dietaryRestrictions?: string | null;
  accessibilityRequirements?: string | null;
  specialInstructions?: string | null;
}

export interface SanitizedPlanningContext {
  eventId: string;
  type: EventType;
  title: string;
  description?: string;
  eventDate?: string; // YYYY-MM-DD
  isDateConfirmed: boolean;
  location?: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  budgetPerGuest: number;
  themePreferences?: string;
  culturalPreferences?: string;
  dietaryRestrictions?: string;
  accessibilityRequirements?: string;
  specialInstructions?: string;
}

/**
 * Sanitizes and strips prompt injection or instructions that could tamper with system rules.
 * User inputs are treated strictly as untrusted parameters.
 */
function sanitizeUntrustedText(text?: string | null, maxLen = 1000): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  // Truncate to maximum permissible character length
  const bounded = trimmed.slice(0, maxLen);
  // Strip control characters, null bytes
  return bounded.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

/**
 * Builds a clean, bounded planning context from database event records.
 * Ensures zero secrets, tokens, or unrelated user fields are leaked.
 */
export function buildPlanningContext(input: PlanningContextInput): SanitizedPlanningContext {
  let eventDateStr: string | undefined;
  let isDateConfirmed = false;

  if (input.eventDate) {
    const d = typeof input.eventDate === "string" ? new Date(input.eventDate) : input.eventDate;
    if (!isNaN(d.getTime())) {
      eventDateStr = d.toISOString().split("T")[0];
      isDateConfirmed = true;
    }
  }

  const budget = Math.max(0, Number(input.totalBudget) || 0);
  const guests = Math.max(1, Math.min(50000, Number(input.guestCount) || 1));
  const budgetPerGuest = guests > 0 ? Number((budget / guests).toFixed(2)) : 0;

  return {
    eventId: input.eventId,
    type: input.type,
    title: sanitizeUntrustedText(input.title, 150) || "Untitled Celebration",
    description: sanitizeUntrustedText(input.description, 1000),
    eventDate: eventDateStr,
    isDateConfirmed,
    location: sanitizeUntrustedText(input.location, 200),
    guestCount: guests,
    totalBudget: budget,
    currency: (input.currency || "INR").toUpperCase().slice(0, 3),
    budgetPerGuest,
    themePreferences: sanitizeUntrustedText(input.themePreferences, 500),
    culturalPreferences: sanitizeUntrustedText(input.culturalPreferences, 500),
    dietaryRestrictions: sanitizeUntrustedText(input.dietaryRestrictions, 500),
    accessibilityRequirements: sanitizeUntrustedText(input.accessibilityRequirements, 500),
    specialInstructions: sanitizeUntrustedText(input.specialInstructions, 1500),
  };
}
