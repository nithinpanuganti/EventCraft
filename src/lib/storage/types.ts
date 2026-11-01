export type UserRole = "ORGANIZER" | "COORDINATOR" | "VENDOR" | "GUEST";

export type EventType = "WEDDING" | "BIRTHDAY" | "COMMUNITY";

export type EventStatus = "DRAFT" | "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type TaskPhase = "PLANNING" | "BOOKING" | "PREPARATION" | "EVENT_DAY" | "POST_EVENT";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";

export type VendorStatus = "RESEARCHING" | "CONTACTED" | "QUOTED" | "BOOKED" | "DECLINED";

export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "SCHEDULED" | "CANCELLED";

export type GuestCategory = "VIP" | "FAMILY" | "FRIENDS" | "COLLEAGUES" | "OTHER";

export type InvitationStatus = "NOT_SENT" | "SENT" | "DELIVERED" | "BOUNCED";

export type RsvpStatus = "PENDING" | "CONFIRMED" | "DECLINED";

export type TableShape = "ROUND" | "RECTANGULAR" | "CUSTOM";

export type ContractStatus = "DRAFT" | "PENDING_SIGNATURE" | "SIGNED" | "COMPLETED" | "TERMINATED";

export type VendorPaymentType = "ADVANCE" | "MILESTONE" | "FINAL" | "REFUND";

export type VendorPaymentMethod = "BANK_TRANSFER" | "CREDIT_CARD" | "CHECK" | "CASH" | "OTHER";

export type RiskCategory = "WEATHER" | "VENDOR" | "EQUIPMENT" | "SCHEDULE" | "BUDGET" | "HEALTH_SAFETY" | "LOGISTICS" | "OTHER";

export type RiskPriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskStatus = "IDENTIFIED" | "MONITORING" | "MITIGATED" | "OCCURRED" | "CLOSED";

export type IssueSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type IssueStatus = "OPEN" | "INVESTIGATING" | "RESOLVED";

export type VolunteerStatus = "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "NO_SHOW";

export type EmergencyContactCategory = "SECURITY" | "MEDICAL" | "VENUE" | "POLICE" | "FIRE" | "KEY_ORGANIZER";

export type DocumentCategory = "CONTRACT" | "INVOICE" | "RECEIPT" | "PERMIT" | "FLOOR_PLAN" | "RUNSHEET" | "OTHER";

export interface LocalProfile {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  passcodeHash?: string;
  phone?: string;
  organization?: string;
  assignedEventIds?: string[];
  vendorId?: string;
  guestId?: string;
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
  status?: "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
  assignedCoordinatorId?: string;
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
  vendorId?: string | null;
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
  assignedCoordinatorId?: string | null;
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
  address?: string | null;
  contractDetails?: string | null;
  notes?: string | null;
  quotes: LocalVendorQuote[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalVendorContract {
  id: string;
  eventId: string;
  vendorId: string;
  title: string;
  contractNumber: string;
  status: ContractStatus;
  totalAmount: number;
  advanceAmount: number;
  signedDate?: string | null;
  effectiveDate: string;
  completionDate: string;
  termsAndConditions?: string;
  documentName?: string | null;
  documentData?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalVendorPayment {
  id: string;
  eventId: string;
  vendorId: string;
  contractId?: string | null;
  title: string;
  amount: number;
  amountCents: number;
  paymentType: VendorPaymentType;
  paymentMethod: VendorPaymentMethod;
  status: PaymentStatus;
  dueDate: string;
  paidDate?: string | null;
  receiptNumber?: string | null;
  receiptData?: string | null;
  notes?: string | null;
  linkedExpenseId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalGuest {
  id: string;
  eventId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  category: GuestCategory;
  invitationStatus: InvitationStatus;
  rsvpStatus: RsvpStatus;
  plusOneAllowed: boolean;
  plusOneCount: number;
  plusOneNames: string[];
  dietaryPreferences: string[];
  accessibilityRequirements?: string | null;
  groupName?: string | null;
  tableId?: string | null;
  seatNumber?: number | null;
  checkInStatus: boolean;
  checkedInAt?: string | null;
  qrToken?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalTable {
  id: string;
  eventId: string;
  name: string;
  shape: TableShape;
  capacity: number;
  zone?: string | null;
  posX: number;
  posY: number;
  isVip: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalInvitation {
  id: string;
  eventId: string;
  title: string;
  templateId: "classic_wedding" | "milestone_birthday" | "corporate_gala" | "community_gathering" | "modern_minimalist";
  hostName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  location: string;
  description: string;
  dressCode?: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  backgroundImageUrl?: string | null;
  rsvpDeadline: string;
  qrPayload: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalVenueLayoutElement {
  id: string;
  type:
    | "STAGE"
    | "TABLE_ROUND"
    | "TABLE_RECT"
    | "CHAIR"
    | "FOOD_COUNTER"
    | "BAR"
    | "ENTRANCE"
    | "EXIT"
    | "DANCE_FLOOR"
    | "DECOR_ZONE"
    | "EMERGENCY_EXIT"
    | "RESTROOM"
    | "AUDIO_BOOTH";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color?: string;
  capacity?: number;
}

export interface LocalVenueLayout {
  id: string;
  eventId: string;
  name: string;
  version: number;
  dimensions: { width: number; height: number; unit: "METERS" | "FEET" };
  elements: LocalVenueLayoutElement[];
  isDefault: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalRisk {
  id: string;
  eventId: string;
  title: string;
  category: RiskCategory;
  likelihood: number; // 1-5
  severity: number; // 1-5
  priorityScore: number; // likelihood * severity
  priorityLevel: RiskPriorityLevel;
  owner: string;
  mitigationStrategy: string;
  contingencyPlan: string;
  status: RiskStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalEventIssue {
  id: string;
  eventId: string;
  title: string;
  reportedBy: string;
  assignedTo?: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  description: string;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalVolunteer {
  id: string;
  eventId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  shiftStart: string;
  shiftEnd: string;
  location: string;
  status: VolunteerStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalEmergencyContact {
  id: string;
  eventId: string;
  name: string;
  role: string;
  organization: string;
  phone: string;
  alternatePhone?: string | null;
  category: EmergencyContactCategory;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalDocument {
  id: string;
  eventId: string;
  title: string;
  category: DocumentCategory;
  fileType: string;
  fileSize: number;
  fileData?: string | null;
  uploadedBy: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalActivityLog {
  id: string;
  eventId: string;
  entityType: "EVENT" | "BUDGET" | "EXPENSE" | "TASK" | "GUEST" | "VENDOR" | "SEATING" | "RISK" | "CONTROL_CENTER";
  action: string;
  details: string;
  performedBy: string;
  timestamp: string;
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
  coordinatorIds?: string[];
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
  guests?: LocalGuest[];
  tables?: LocalTable[];
  invitations?: LocalInvitation[];
  vendorContracts?: LocalVendorContract[];
  vendorPayments?: LocalVendorPayment[];
  venueLayouts?: LocalVenueLayout[];
  risks?: LocalRisk[];
  issues?: LocalEventIssue[];
  volunteers?: LocalVolunteer[];
  emergencyContacts?: LocalEmergencyContact[];
  documents?: LocalDocument[];
  activityLogs?: LocalActivityLog[];
}

export interface TaskWithDependencies {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  phase: TaskPhase;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | string | null;
  completedAt: Date | string | null;
  order: number;
  assignedTo?: string | null;
  assignedCoordinatorId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  prerequisites: {
    id: string;
    title: string;
    status: TaskStatus;
  }[];
  dependents?: {
    id: string;
    title: string;
    status: TaskStatus;
  }[];
  isBlockedByPrerequisites?: boolean;
  blockingReason?: string | null;
}

export interface VendorWithQuotes {
  id: string;
  eventId: string;
  categoryName: string;
  companyName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  address?: string | null;
  status: VendorStatus;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  quotes: {
    id: string;
    vendorId: string;
    description: string | null;
    quotedAmount: number;
    currency: string;
    validUntil: Date | string | null;
    isSelected: boolean;
    quoteDocumentUrl: string | null;
    createdAt: Date | string;
  }[];
}
