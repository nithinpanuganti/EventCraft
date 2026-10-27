export type EventType = "WEDDING" | "BIRTHDAY" | "COMMUNITY";

export type EventStatus = "DRAFT" | "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type TaskPhase = "PLANNING" | "BOOKING" | "PREPARATION" | "EVENT_DAY" | "POST_EVENT";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";

export type VendorStatus = "RESEARCHING" | "CONTACTED" | "QUOTED" | "BOOKED" | "DECLINED";

export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE";

export interface LocalProfile {
  id: string;
  name: string;
  email: string;
  passcodeHash?: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

export interface LocalEventPreferences {
  themePreferences?: string;
  culturalPreferences?: string;
  dietaryRestrictions?: string;
  accessibilityRequirements?: string;
  specialInstructions?: string;
  colorPalette?: string[];
  styleDirection?: string;
}

export interface LocalDayOfScheduleItem {
  id?: string;
  timeSlot?: string;
  time?: string;
  activity: string;
  leadCoordinator?: string;
  lead?: string;
  logisticalNotes?: string;
  notes?: string;
}

export interface LocalEventPlan {
  id: string;
  eventId: string;
  conceptTitle: string;
  conceptNarrative: string;
  version: number;
  source: "LOCAL_RULE_ENGINE";
  planningAssumptions: string[];
  keyRecommendations: string[];
  themeName: string;
  colorPalette: string[];
  styleDirection: string;
  decorationIdeas: string[];
  personalizedActivities: string[];
  culturalConsiderations: string[];
  milestones?: unknown[];
  riskMitigations?: unknown[];
  dayOfSchedule: LocalDayOfScheduleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalBudgetCategory {
  id: string;
  eventId: string;
  name: string;
  allocatedCents: number;
  allocatedPercentage: number;
  rationale?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalExpense {
  id: string;
  eventId: string;
  categoryId: string;
  title: string;
  amountCents: number;
  paymentStatus: PaymentStatus;
  dueDate?: string | null;
  paidDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalTask {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  phase: TaskPhase;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null;
  completedAt?: string | null;
  order: number;
  assignedTo?: string | null;
  prerequisiteIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalVendorQuote {
  id: string;
  vendorId: string;
  eventId: string;
  description?: string | null;
  quoteReference?: string;
  quotedAmount?: number;
  amountCents: number;
  currency: string;
  validUntil?: string | null;
  isSelected: boolean;
  quoteDocumentUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface LocalVendor {
  id: string;
  eventId: string;
  categoryName: string;
  companyName: string;
  name?: string;
  category?: string;
  status: VendorStatus;
  contactPerson?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  website?: string | null;
  notes?: string | null;
  quotes: LocalVendorQuote[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalPlanRevision {
  id: string;
  eventId: string;
  version: number;
  userPrompt: string;
  intent: string;
  classification: "ADVISORY" | "LOW_RISK_EDIT" | "CONSEQUENTIAL";
  changeSummary: string;
  advisoryResponse: string;
  requiresConfirmation: boolean;
  proposedOperations: Array<{
    type: string;
    description: string;
    targetId: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }>;
  status: "PROPOSED" | "APPLIED" | "DISCARDED";
  createdAt: string;
}

export interface LocalEvent {
  id: string;
  profileId: string;
  title: string;
  type: EventType;
  eventDate?: string | null;
  location?: string | null;
  guestCount: number;
  totalBudget: number; // in standard currency units (e.g. 50000)
  totalBudgetCents: number; // in integer cents
  currency: string;
  status: EventStatus;
  preferences?: LocalEventPreferences;
  plan?: LocalEventPlan | null;
  budgetCategories?: LocalBudgetCategory[];
  expenses?: LocalExpense[];
  tasks?: LocalTask[];
  vendors?: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalDatabaseBackup {
  schemaVersion: number;
  exportedAt: string;
  appName?: string;
  appVersion: string;
  profiles: LocalProfile[];
  events: LocalEvent[];
  eventPlans: LocalEventPlan[];
  budgetCategories: LocalBudgetCategory[];
  expenses: LocalExpense[];
  tasks: LocalTask[];
  vendors: LocalVendor[];
  vendorQuotes: LocalVendorQuote[];
  planRevisions: LocalPlanRevision[];
}
