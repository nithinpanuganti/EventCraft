import {
  dbGet,
  dbGetAll,
  dbPut,
  dbDelete,
} from "./indexed-db";
import {
  LocalProfile,
  LocalEvent,
  LocalEventPlan,
  LocalBudgetCategory,
  LocalExpense,
  LocalTask,
  LocalVendor,
  LocalVendorQuote,
  LocalPlanRevision,
  LocalDayOfScheduleItem,
  LocalGuest,
  LocalTable,
  LocalInvitation,
  LocalVendorContract,
  LocalVendorPayment,
  LocalVenueLayout,
  LocalRisk,
  LocalEventIssue,
  LocalVolunteer,
  LocalEmergencyContact,
  LocalDocument,
  LocalActivityLog,
  UserRole,
  EventType,
  TaskPhase,
  TaskPriority,
  TaskStatus,
  VendorStatus,
  PaymentStatus,
  TaskWithDependencies,
  VendorWithQuotes,
} from "./types";
import type { CanonicalTaskStatus } from "../timeline/task-state-machine";

const ACTIVE_PROFILE_KEY = "eventcraft_active_profile_id";
const ACTIVE_EVENT_KEY = "eventcraft_active_event_id";
let memoryActiveProfileId: string | null = null;

export function resetMemorySession(): void {
  memoryActiveProfileId = null;
}

// Unique ID generators
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

/* ==========================================================================
   Profiles Management
   ========================================================================== */

export async function getLocalProfiles(): Promise<LocalProfile[]> {
  const profiles = await dbGetAll<LocalProfile>("profiles");
  if (profiles.length === 0) {
    const defaultProfile: LocalProfile = {
      id: "prof_default",
      name: "Local Event Planner",
      email: "planner@local.device",
      role: "ORGANIZER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: true,
    };
    await dbPut("profiles", defaultProfile);
    return [defaultProfile];
  }
  return profiles.map((p) => ({
    ...p,
    role: p.role || "ORGANIZER",
  }));
}

export async function getActiveLocalProfile(cachedProfiles?: LocalProfile[]): Promise<LocalProfile> {
  const profiles = cachedProfiles && cachedProfiles.length > 0 ? cachedProfiles : await getLocalProfiles();
  let activeId: string | null = memoryActiveProfileId;

  if (typeof window !== "undefined" && window.localStorage) {
    activeId = window.localStorage.getItem(ACTIVE_PROFILE_KEY) || memoryActiveProfileId;
  }

  const found = profiles.find((p) => p.id === activeId);
  if (found) return found;

  const defaultProfile = profiles[0];
  memoryActiveProfileId = defaultProfile.id;
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, defaultProfile.id);
  }
  return defaultProfile;
}

export async function setActiveLocalProfile(profileId: string): Promise<LocalProfile> {
  const profile = await dbGet<LocalProfile>("profiles", profileId);
  if (!profile) throw new Error("Profile not found");

  memoryActiveProfileId = profile.id;
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
  }
  return profile;
}

export async function hashLocalPasscode(passcode?: string): Promise<string | undefined> {
  if (!passcode) return undefined;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(passcode + ":eventcraft_salt");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < passcode.length; i++) {
    hash = (hash << 5) - hash + passcode.charCodeAt(i);
    hash |= 0;
  }
  return `local_hash_${Math.abs(hash)}`;
}

export async function createLocalProfile(
  nameOrParams:
    | string
    | {
        name: string;
        email: string;
        passcode?: string;
        role?: UserRole;
        phone?: string;
        organization?: string;
        assignedEventIds?: string[];
        vendorId?: string;
        guestId?: string;
      },
  maybeEmail?: string,
  maybePasscode?: string,
  maybeRole?: UserRole
): Promise<LocalProfile> {
  const name = typeof nameOrParams === "object" ? nameOrParams.name : nameOrParams;
  const email =
    typeof nameOrParams === "object"
      ? nameOrParams.email
      : maybeEmail || `${name.toLowerCase().replace(/\s+/g, ".")}@browser.local`;
  const passcode = typeof nameOrParams === "object" ? nameOrParams.passcode : maybePasscode;
  const role: UserRole =
    typeof nameOrParams === "object" && nameOrParams.role
      ? nameOrParams.role
      : maybeRole || "ORGANIZER";
  const passcodeHash = await hashLocalPasscode(passcode);

  const newProfile: LocalProfile = {
    id: generateId("prof"),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    phone: typeof nameOrParams === "object" ? nameOrParams.phone : undefined,
    organization: typeof nameOrParams === "object" ? nameOrParams.organization : undefined,
    assignedEventIds: typeof nameOrParams === "object" ? nameOrParams.assignedEventIds : undefined,
    vendorId: typeof nameOrParams === "object" ? nameOrParams.vendorId : undefined,
    guestId: typeof nameOrParams === "object" ? nameOrParams.guestId : undefined,
    passcodeHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbPut("profiles", newProfile);
  await setActiveLocalProfile(newProfile.id);
  return newProfile;
}

export async function verifyLocalProfilePasscode(profileId: string, passcode: string): Promise<boolean> {
  const profile = await dbGet<LocalProfile>("profiles", profileId);
  if (!profile || !profile.passcodeHash) return true;
  const computed = await hashLocalPasscode(passcode);
  return profile.passcodeHash === computed;
}

export async function deleteLocalProfile(profileId: string): Promise<boolean> {
  const profiles = await getLocalProfiles();
  if (profiles.length <= 1) {
    throw new Error("Cannot delete the only existing local profile.");
  }

  // Delete all events owned by this profile
  const events = await listLocalEvents(profileId);
  for (const evt of events) {
    await deleteLocalEvent(evt.id);
  }

  await dbDelete("profiles", profileId);

  // Switch to another profile
  const remaining = profiles.filter((p) => p.id !== profileId);
  await setActiveLocalProfile(remaining[0].id);
  return true;
}

/* ==========================================================================
   Events Management
   ========================================================================== */

export async function listLocalEvents(profileId?: string): Promise<LocalEvent[]> {
  const allEvents = await dbGetAll<LocalEvent>("events");
  const filtered = profileId ? allEvents.filter((e) => e.profileId === profileId) : allEvents;
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const getLocalEvents = listLocalEvents;

export async function getLocalEvent(eventId: string): Promise<LocalEvent | null> {
  const event = await dbGet<LocalEvent>("events", eventId);
  if (!event) return null;

  // Hydrate child relationships
  const [plan, categories, expenses, tasks, vendors] = await Promise.all([
    dbGet<LocalEventPlan>("event_plans", eventId),
    getLocalBudgetCategories(eventId),
    getLocalExpenses(eventId),
    getLocalTasks(eventId),
    getLocalVendors(eventId),
  ]);

  return {
    ...event,
    plan,
    budgetCategories: categories,
    expenses,
    tasks,
    vendors,
  };
}

export interface CreateEventParams {
  title: string;
  type: EventType;
  eventDate?: string | null;
  location?: string | null;
  guestCount?: number;
  totalBudget?: number;
  currency?: string;
  themePreferences?: string;
  culturalPreferences?: string;
  dietaryRestrictions?: string;
  accessibilityRequirements?: string;
  specialInstructions?: string;
}

export async function createLocalEvent(
  first: CreateEventParams | string,
  second: string | CreateEventParams
): Promise<LocalEvent> {
  const params = typeof first === "object" ? first : (second as CreateEventParams);
  const profileId = typeof first === "string" ? first : (second as string);
  const eventId = generateId("evt");
  const budget = params.totalBudget || 0;
  const budgetCents = Math.round(budget * 100);

  const event: LocalEvent = {
    id: eventId,
    profileId,
    title: params.title.trim(),
    type: params.type,
    eventDate: params.eventDate || null,
    location: params.location?.trim() || null,
    guestCount: params.guestCount && params.guestCount > 0 ? params.guestCount : 1,
    totalBudget: budget,
    totalBudgetCents: budgetCents,
    currency: params.currency || "USD",
    status: "DRAFT",
    preferences: {
      themePreferences: params.themePreferences?.trim(),
      culturalPreferences: params.culturalPreferences?.trim(),
      dietaryRestrictions: params.dietaryRestrictions?.trim(),
      accessibilityRequirements: params.accessibilityRequirements?.trim(),
      specialInstructions: params.specialInstructions?.trim(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbPut("events", event);

  // Set as active event in localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(ACTIVE_EVENT_KEY, event.id);
  }

  return event;
}

export async function updateLocalEvent(
  eventId: string,
  updates: Partial<LocalEvent>
): Promise<LocalEvent> {
  const existing = await dbGet<LocalEvent>("events", eventId);
  if (!existing) throw new Error("Event not found");

  const totalBudget = updates.totalBudget !== undefined ? updates.totalBudget : existing.totalBudget;
  const totalBudgetCents = Math.round(totalBudget * 100);

  const updated: LocalEvent = {
    ...existing,
    ...updates,
    totalBudget,
    totalBudgetCents,
    updatedAt: new Date().toISOString(),
  };

  await dbPut("events", updated);
  return updated;
}

export async function deleteLocalEvent(eventId: string): Promise<boolean> {
  await Promise.all([
    dbDelete("events", eventId),
    dbDelete("event_plans", eventId),
  ]);

  // Clean up all related child stores for this event
  const [categories, expenses, tasks, vendors, revisions] = await Promise.all([
    getLocalBudgetCategories(eventId),
    getLocalExpenses(eventId),
    getLocalTasks(eventId),
    getLocalVendors(eventId),
    getLocalPlanRevisions(eventId),
  ]);

  await Promise.all([
    ...categories.map((c) => dbDelete("budget_categories", c.id)),
    ...expenses.map((e) => dbDelete("expenses", e.id)),
    ...tasks.map((t) => dbDelete("tasks", t.id)),
    ...vendors.map((v) => {
      const quoteDeletes = v.quotes.map((q) => dbDelete("vendor_quotes", q.id));
      return Promise.all([...quoteDeletes, dbDelete("vendors", v.id)]);
    }),
    ...revisions.map((r) => dbDelete("plan_revisions", r.id)),
  ]);

  if (typeof window !== "undefined" && window.localStorage) {
    if (window.localStorage.getItem(ACTIVE_EVENT_KEY) === eventId) {
      window.localStorage.removeItem(ACTIVE_EVENT_KEY);
    }
  }

  return true;
}

/* ==========================================================================
   Plan Generation & Storage (Deterministic Rule Engine)
   ========================================================================== */

export async function generateAndSaveLocalPlan(eventId: string): Promise<LocalEventPlan> {
  const event = await dbGet<LocalEvent>("events", eventId);
  if (!event) throw new Error("Event not found");

  // Generate deterministic plan via local rule engine
  const { generateLocalPlan } = await import("../local-planning/rule-engine");
  const generated = generateLocalPlan({
    eventId: event.id,
    title: event.title,
    type: event.type,
    eventDate: event.eventDate || undefined,
    guestCount: event.guestCount,
    totalBudget: event.totalBudget,
    currency: event.currency,
    themePreferences: event.preferences?.themePreferences,
    culturalPreferences: event.preferences?.culturalPreferences,
    dietaryRestrictions: event.preferences?.dietaryRestrictions,
    accessibilityRequirements: event.preferences?.accessibilityRequirements,
    specialInstructions: event.preferences?.specialInstructions,
  });

  const plan: LocalEventPlan = {
    id: event.id,
    eventId: event.id,
    conceptTitle: generated.summary.conceptTitle,
    conceptNarrative: generated.summary.conceptNarrative,
    version: 1,
    source: "LOCAL_RULE_ENGINE",
    planningAssumptions: generated.summary.planningAssumptions,
    keyRecommendations: generated.summary.keyRecommendations,
    themeName: generated.theme.themeName,
    colorPalette: generated.theme.colorPalette,
    styleDirection: generated.theme.styleDirection,
    decorationIdeas: generated.theme.decorationIdeas,
    personalizedActivities: generated.theme.personalizedActivities,
    culturalConsiderations: generated.theme.culturalConsiderations,
    dayOfSchedule: generated.dayOfSchedule.map((item, idx) => ({
      id: `sched_${idx + 1}`,
      timeSlot: item.timeSlot,
      activity: item.activity,
      leadCoordinator: item.leadCoordinator,
      logisticalNotes: item.logisticalNotes,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbPut("event_plans", plan);

  // Initialize Budget Categories
  const existingCategories = await getLocalBudgetCategories(eventId);
  if (existingCategories.length === 0) {
    for (const cat of generated.budget.categories) {
      await dbPut<LocalBudgetCategory>("budget_categories", {
        id: generateId("cat"),
        eventId,
        name: cat.categoryName,
        allocatedCents: Math.round(cat.allocatedAmount * 100),
        allocatedPercentage: cat.allocatedPercentage,
        rationale: cat.rationale,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Initialize Tasks
  const existingTasks = await getLocalTasks(eventId);
  if (existingTasks.length === 0) {
    let order = 0;
    for (const task of generated.tasks) {
      await dbPut<LocalTask>("tasks", {
        id: generateId("task"),
        eventId,
        title: task.title,
        description: task.description,
        phase: task.phase as TaskPhase,
        priority: task.priority as TaskPriority,
        status: "TODO",
        dueDate: task.dueDate || null,
        order: order++,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Update Event Status to PLANNING
  await updateLocalEvent(eventId, { status: "PLANNING" });

  return plan;
}

export async function getLocalPlan(eventId: string): Promise<LocalEventPlan | null> {
  return dbGet<LocalEventPlan>("event_plans", eventId);
}

/* ==========================================================================
   Budget & Expense Management
   ========================================================================== */

export async function getLocalBudgetCategories(eventId: string): Promise<LocalBudgetCategory[]> {
  const all = await dbGetAll<LocalBudgetCategory>("budget_categories");
  return all.filter((c) => c.eventId === eventId);
}

export async function getLocalExpenses(eventId: string): Promise<LocalExpense[]> {
  const all = await dbGetAll<LocalExpense>("expenses");
  return all
    .filter((e) => e.eventId === eventId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createLocalBudgetCategory(
  eventId: string,
  name: string,
  allocatedAmount: number
): Promise<LocalBudgetCategory> {
  const cat: LocalBudgetCategory = {
    id: generateId("cat"),
    eventId,
    name: name.trim(),
    allocatedCents: Math.round(allocatedAmount * 100),
    allocatedPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbPut("budget_categories", cat);
  return cat;
}

export async function setLocalBulkAllocations(
  eventId: string,
  allocations: Array<{ categoryId: string; allocatedAmount: number; allocatedPercentage: number }>
): Promise<LocalBudgetCategory[]> {
  const existing = await getLocalBudgetCategories(eventId);
  const updated: LocalBudgetCategory[] = [];

  for (const alloc of allocations) {
    const found = existing.find((c) => c.id === alloc.categoryId);
    if (found) {
      const modified: LocalBudgetCategory = {
        ...found,
        allocatedCents: Math.round(alloc.allocatedAmount * 100),
        allocatedPercentage: alloc.allocatedPercentage,
        updatedAt: new Date().toISOString(),
      };
      await dbPut("budget_categories", modified);
      updated.push(modified);
    }
  }

  return updated;
}

export async function deleteLocalBudgetCategory(categoryId: string): Promise<boolean> {
  await dbDelete("budget_categories", categoryId);
  return true;
}

export async function createLocalExpense(params: {
  eventId: string;
  categoryId: string;
  title: string;
  amount: number;
  paymentStatus?: PaymentStatus;
  dueDate?: string | null;
  paidDate?: string | null;
  notes?: string | null;
}): Promise<LocalExpense> {
  const exp: LocalExpense = {
    id: generateId("exp"),
    eventId: params.eventId,
    categoryId: params.categoryId,
    title: params.title.trim(),
    amountCents: Math.round(params.amount * 100),
    paymentStatus: params.paymentStatus || "PENDING",
    dueDate: params.dueDate || null,
    paidDate: params.paidDate || null,
    notes: params.notes?.trim() || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbPut("expenses", exp);
  return exp;
}

export async function updateLocalExpense(
  expenseId: string,
  updates: Partial<LocalExpense> & { amount?: number }
): Promise<LocalExpense> {
  const existing = await dbGet<LocalExpense>("expenses", expenseId);
  if (!existing) throw new Error("Expense not found");

  const amountCents = updates.amount !== undefined ? Math.round(updates.amount * 100) : existing.amountCents;

  const modified: LocalExpense = {
    ...existing,
    ...updates,
    amountCents,
    updatedAt: new Date().toISOString(),
  };

  await dbPut("expenses", modified);
  return modified;
}

export async function deleteLocalExpense(expenseId: string): Promise<boolean> {
  await dbDelete("expenses", expenseId);
  return true;
}

/* ==========================================================================
   Tasks & Timeline Management
   ========================================================================== */

export async function getLocalTasks(eventId: string): Promise<LocalTask[]> {
  const all = await dbGetAll<LocalTask>("tasks");
  return all
    .filter((t) => t.eventId === eventId)
    .sort((a, b) => a.order - b.order);
}

export async function createLocalTask(params: {
  eventId: string;
  title: string;
  description?: string;
  phase: TaskPhase;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignedTo?: string | null;
  prerequisiteIds?: string[];
}): Promise<LocalTask> {
  const existing = await getLocalTasks(params.eventId);
  const task: LocalTask = {
    id: generateId("task"),
    eventId: params.eventId,
    title: params.title.trim(),
    description: params.description?.trim(),
    phase: params.phase,
    priority: params.priority || "MEDIUM",
    status: "TODO",
    dueDate: params.dueDate || null,
    order: existing.length,
    assignedTo: params.assignedTo || null,
    prerequisiteIds: params.prerequisiteIds || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbPut("tasks", task);
  return task;
}

export async function updateLocalTask(
  taskId: string,
  updates: Partial<LocalTask>
): Promise<LocalTask> {
  const existing = await dbGet<LocalTask>("tasks", taskId);
  if (!existing) throw new Error("Task not found");

  const modified: LocalTask = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.status === "COMPLETED" && !existing.completedAt) {
    modified.completedAt = new Date().toISOString();
  } else if (updates.status && updates.status !== "COMPLETED") {
    modified.completedAt = null;
  }

  await dbPut("tasks", modified);
  return modified;
}

export async function deleteLocalTask(taskId: string): Promise<boolean> {
  await dbDelete("tasks", taskId);
  return true;
}

export async function getLocalTasksWithDependencies(eventId: string): Promise<{
  tasks: TaskWithDependencies[];
  phaseCounts: Record<TaskPhase, number>;
  statusCounts: Record<TaskStatus, number>;
}> {
  const tasks = await getLocalTasks(eventId);
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const phaseCounts: Record<TaskPhase, number> = {
    PLANNING: 0,
    BOOKING: 0,
    PREPARATION: 0,
    EVENT_DAY: 0,
    POST_EVENT: 0,
  };

  const statusCounts: Record<TaskStatus, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    BLOCKED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  const { checkDependencyBlocking } = await import("../timeline/task-state-machine");

  const tasksWithDeps: TaskWithDependencies[] = tasks.map((t) => {
    phaseCounts[t.phase] = (phaseCounts[t.phase] || 0) + 1;
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;

    const prerequisites = (t.prerequisiteIds || [])
      .map((pid) => {
        const prereq = taskMap.get(pid);
        return prereq ? { id: prereq.id, title: prereq.title, status: prereq.status } : null;
      })
      .filter((p): p is { id: string; title: string; status: TaskStatus } => p !== null);

    const blocking = checkDependencyBlocking(prerequisites);

    return {
      id: t.id,
      eventId: t.eventId,
      title: t.title,
      description: t.description || null,
      phase: t.phase,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      completedAt: t.completedAt ? new Date(t.completedAt) : null,
      order: t.order,
      assignedTo: t.assignedTo || null,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      prerequisites,
      isBlockedByPrerequisites: blocking.isBlocked,
      blockingReason: blocking.blockingReason,
    };
  });

  return { tasks: tasksWithDeps, phaseCounts, statusCounts };
}

export async function updateLocalTaskStatus(
  taskId: string,
  targetStatus: CanonicalTaskStatus
): Promise<LocalTask> {
  const existing = await dbGet<LocalTask>("tasks", taskId);
  if (!existing) throw new Error("Task not found");

  const { validateTaskTransition } = await import("../timeline/task-state-machine");
  const validation = validateTaskTransition(existing.status as CanonicalTaskStatus, targetStatus);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage || "Invalid status transition");
  }

  const modified: LocalTask = {
    ...existing,
    status: validation.newStatus,
    completedAt: validation.completedAt ? validation.completedAt.toISOString() : null,
    updatedAt: new Date().toISOString(),
  };

  await dbPut("tasks", modified);
  return modified;
}

export async function getLocalRunSheet(eventId: string): Promise<Array<{ time: string; activity: string; lead: string; notes?: string }>> {
  const plan = await getLocalPlan(eventId);
  return (plan?.dayOfSchedule || []).map((s) => ({
    time: s.time || s.timeSlot || "09:00",
    activity: s.activity || "Scheduled Activity",
    lead: s.lead || s.leadCoordinator || "Coordinator",
    notes: s.notes || s.logisticalNotes || undefined,
  }));
}

export async function saveLocalRunSheet(
  eventId: string,
  schedule: Array<{ time: string; activity: string; lead?: string; notes?: string }>
): Promise<Array<{ time: string; activity: string; lead?: string; notes?: string }>> {
  const plan = await getLocalPlan(eventId);
  const items: LocalDayOfScheduleItem[] = schedule.map((s, idx) => ({
    id: `item_${idx}`,
    timeSlot: s.time,
    time: s.time,
    activity: s.activity,
    leadCoordinator: s.lead || "Coordinator",
    lead: s.lead,
    logisticalNotes: s.notes,
    notes: s.notes,
  }));

  if (plan) {
    const updated = {
      ...plan,
      dayOfSchedule: items,
      updatedAt: new Date().toISOString(),
    };
    await dbPut("event_plans", updated);
  } else {
    const newPlan: LocalEventPlan = {
      id: generateId("plan"),
      eventId,
      conceptTitle: "Local Event Plan",
      conceptNarrative: "Deterministic locally generated event plan.",
      version: 1,
      source: "LOCAL_RULE_ENGINE",
      planningAssumptions: [],
      keyRecommendations: [],
      themeName: "Classic",
      colorPalette: [],
      styleDirection: "",
      decorationIdeas: [],
      personalizedActivities: [],
      culturalConsiderations: [],
      milestones: [],
      dayOfSchedule: items,
      riskMitigations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await dbPut("event_plans", newPlan);
  }
  return schedule;
}

/* ==========================================================================
   Vendor Management
   ========================================================================== */

export async function getLocalVendors(eventId: string): Promise<VendorWithQuotes[]> {
  const [vendors, quotes] = await Promise.all([
    dbGetAll<LocalVendor>("vendors"),
    dbGetAll<LocalVendorQuote>("vendor_quotes"),
  ]);

  const eventVendors = vendors.filter((v) => v.eventId === eventId);
  return eventVendors.map((v) => {
    const vQuotes = quotes
      .filter((q) => q.vendorId === v.id)
      .sort((a, b) => (b.isSelected ? 1 : 0) - (a.isSelected ? 1 : 0))
      .map((q) => ({
        id: q.id,
        vendorId: q.vendorId,
        description: q.description || q.notes || null,
        quotedAmount: q.quotedAmount !== undefined ? q.quotedAmount : (q.amountCents || 0) / 100,
        currency: q.currency || "USD",
        validUntil: q.validUntil ? new Date(q.validUntil) : null,
        isSelected: !!q.isSelected,
        quoteDocumentUrl: q.quoteDocumentUrl || null,
        createdAt: new Date(q.createdAt),
      }));

    return {
      id: v.id,
      eventId: v.eventId,
      categoryName: v.categoryName || v.category || "General",
      companyName: v.companyName || v.name || "Vendor",
      contactPerson: v.contactPerson || v.contactName || null,
      email: v.email || null,
      phone: v.phone || null,
      websiteUrl: v.websiteUrl || v.website || null,
      status: v.status,
      notes: v.notes || null,
      createdAt: new Date(v.createdAt),
      updatedAt: new Date(v.updatedAt),
      quotes: vQuotes,
    };
  });
}

export async function getLocalVendorsAndCategories(eventId: string): Promise<{
  vendors: VendorWithQuotes[];
  categories: string[];
}> {
  const vendors = await getLocalVendors(eventId);
  const categories = Array.from(new Set(vendors.map((v) => v.categoryName))).filter(Boolean);
  return { vendors, categories };
}

export async function createLocalVendor(params: {
  eventId: string;
  categoryName: string;
  companyName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  status?: VendorStatus;
  notes?: string | null;
}): Promise<LocalVendor> {
  const vendor: LocalVendor = {
    id: generateId("vnd"),
    eventId: params.eventId,
    categoryName: params.categoryName.trim(),
    companyName: params.companyName.trim(),
    category: params.categoryName.trim(),
    name: params.companyName.trim(),
    status: params.status || "RESEARCHING",
    contactPerson: params.contactPerson?.trim() || null,
    contactName: params.contactPerson?.trim() || null,
    email: params.email?.trim() || null,
    phone: params.phone?.trim() || null,
    websiteUrl: params.websiteUrl?.trim() || null,
    website: params.websiteUrl?.trim() || null,
    notes: params.notes?.trim() || null,
    quotes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbPut("vendors", vendor);
  return vendor;
}

export async function updateLocalVendor(
  vendorId: string,
  updates: Partial<LocalVendor>
): Promise<LocalVendor> {
  const existing = await dbGet<LocalVendor>("vendors", vendorId);
  if (!existing) throw new Error("Vendor not found");

  const modified: LocalVendor = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await dbPut("vendors", modified);
  return modified;
}

export async function deleteLocalVendor(vendorId: string): Promise<boolean> {
  const quotes = await dbGetAll<LocalVendorQuote>("vendor_quotes");
  const vendorQuotes = quotes.filter((q) => q.vendorId === vendorId);
  await Promise.all(vendorQuotes.map((q) => dbDelete("vendor_quotes", q.id)));
  await dbDelete("vendors", vendorId);
  return true;
}

export async function addLocalVendorQuote(params: {
  vendorId: string;
  eventId: string;
  description: string;
  quotedAmount: number;
  currency?: string;
  validUntil?: string | null;
  isSelected?: boolean;
  quoteDocumentUrl?: string | null;
  notes?: string | null;
}): Promise<LocalVendorQuote> {
  const quote: LocalVendorQuote = {
    id: generateId("qte"),
    vendorId: params.vendorId,
    eventId: params.eventId,
    description: params.description?.trim() || null,
    quotedAmount: params.quotedAmount,
    amountCents: Math.round(params.quotedAmount * 100),
    currency: params.currency || "USD",
    validUntil: params.validUntil || null,
    isSelected: !!params.isSelected,
    quoteDocumentUrl: params.quoteDocumentUrl || null,
    notes: params.notes?.trim() || null,
    createdAt: new Date().toISOString(),
  };

  await dbPut("vendor_quotes", quote);

  // If marked selected, de-select other quotes for this vendor and set vendor to BOOKED
  if (params.isSelected) {
    const quotes = await dbGetAll<LocalVendorQuote>("vendor_quotes");
    const otherQuotes = quotes.filter((q) => q.vendorId === params.vendorId && q.id !== quote.id);
    for (const o of otherQuotes) {
      if (o.isSelected) {
        await dbPut("vendor_quotes", { ...o, isSelected: false });
      }
    }
    await updateLocalVendor(params.vendorId, { status: "BOOKED" });
  } else {
    // If vendor status is still RESEARCHING or CONTACTED, update to QUOTED
    const vendor = await dbGet<LocalVendor>("vendors", params.vendorId);
    if (vendor && (vendor.status === "RESEARCHING" || vendor.status === "CONTACTED")) {
      await updateLocalVendor(vendor.id, { status: "QUOTED" });
    }
  }

  return quote;
}

export async function selectLocalVendorQuote(
  eventId: string,
  quoteId: string
): Promise<LocalVendorQuote> {
  const quotes = await dbGetAll<LocalVendorQuote>("vendor_quotes");
  const target = quotes.find((q) => q.id === quoteId);
  if (!target) throw new Error("Quote not found");

  // De-select all other quotes for this vendor
  const vendorQuotes = quotes.filter((q) => q.vendorId === target.vendorId);
  for (const q of vendorQuotes) {
    await dbPut("vendor_quotes", { ...q, isSelected: q.id === quoteId });
  }

  // Update vendor status to BOOKED
  await updateLocalVendor(target.vendorId, { status: "BOOKED" });

  return { ...target, isSelected: true };
}

/* ==========================================================================
   Plan Revisions Management
   ========================================================================== */

export async function getLocalPlanRevisions(eventId: string): Promise<LocalPlanRevision[]> {
  const all = await dbGetAll<LocalPlanRevision>("plan_revisions");
  return all
    .filter((r) => r.eventId === eventId)
    .sort((a, b) => b.version - a.version);
}

export async function saveLocalPlanRevision(revision: LocalPlanRevision): Promise<LocalPlanRevision> {
  await dbPut("plan_revisions", revision);
  return revision;
}

/* ==========================================================================
   Activity Logging
   ========================================================================== */

export async function logActivity(
  eventId: string,
  entityType: LocalActivityLog["entityType"],
  action: string,
  details: string,
  performedBy = "Organizer"
): Promise<LocalActivityLog> {
  const log: LocalActivityLog = {
    id: generateId("act"),
    eventId,
    entityType,
    action,
    details,
    performedBy,
    timestamp: new Date().toISOString(),
  };
  await dbPut("activity_logs", log);
  return log;
}

export async function getLocalActivityLogs(eventId: string): Promise<LocalActivityLog[]> {
  const all = await dbGetAll<LocalActivityLog>("activity_logs");
  return all
    .filter((l) => l.eventId === eventId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/* ==========================================================================
   Guests Management & RSVP Tracker
   ========================================================================== */

export async function getLocalGuests(eventId: string): Promise<LocalGuest[]> {
  const all = await dbGetAll<LocalGuest>("guests");
  return all
    .filter((g) => g.eventId === eventId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocalGuest(guestId: string): Promise<LocalGuest | null> {
  return dbGet<LocalGuest>("guests", guestId);
}

export async function createLocalGuest(
  params: Omit<LocalGuest, "id" | "createdAt" | "updatedAt">
): Promise<LocalGuest> {
  const now = new Date().toISOString();
  const guest: LocalGuest = {
    ...params,
    id: generateId("gst"),
    qrToken: `EC-GUEST-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
  };
  await dbPut("guests", guest);
  await logActivity(params.eventId, "GUEST", "Guest Created", `Added guest ${guest.name}`, "Organizer");
  return guest;
}

export async function updateLocalGuest(
  guestId: string,
  updates: Partial<LocalGuest>
): Promise<LocalGuest> {
  const existing = await dbGet<LocalGuest>("guests", guestId);
  if (!existing) throw new Error("Guest not found");

  const updated: LocalGuest = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await dbPut("guests", updated);
  await logActivity(existing.eventId, "GUEST", "Guest Updated", `Updated details for ${updated.name}`, "Organizer");
  return updated;
}

export async function deleteLocalGuest(guestId: string): Promise<boolean> {
  const existing = await dbGet<LocalGuest>("guests", guestId);
  if (!existing) return false;
  await dbDelete("guests", guestId);
  await logActivity(existing.eventId, "GUEST", "Guest Removed", `Removed guest ${existing.name}`, "Organizer");
  return true;
}

export async function checkInGuest(
  guestIdOrToken: string,
  performedBy = "Coordinator"
): Promise<{ success: boolean; guest: LocalGuest; message: string; alreadyCheckedIn?: boolean }> {
  const all = await dbGetAll<LocalGuest>("guests");
  const guest = all.find((g) => g.id === guestIdOrToken || g.qrToken === guestIdOrToken);
  if (!guest) {
    throw new Error("No guest found matching the provided pass or identification.");
  }

  if (guest.checkInStatus) {
    return {
      success: true,
      guest,
      alreadyCheckedIn: true,
      message: `${guest.name} was already checked in at ${new Date(guest.checkedInAt || "").toLocaleTimeString()}`,
    };
  }

  const updated = await updateLocalGuest(guest.id, {
    checkInStatus: true,
    checkedInAt: new Date().toISOString(),
  });

  await logActivity(guest.eventId, "GUEST", "Guest Checked In", `Checked in ${guest.name}`, performedBy);
  return {
    success: true,
    guest: updated,
    alreadyCheckedIn: false,
    message: `Successfully checked in ${guest.name}!`,
  };
}

/**
 * Sanitizes a CSV cell to prevent CSV Formula Injection (CWE-1236).
 * If the value starts with formula characters (=, +, -, @, tab, cr),
 * it is prefixed with a single quote to force spreadsheet programs to treat it as raw text.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  // Check for CSV formula injection triggers
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Robust RFC 4180 compliant CSV line parser.
 * Handles quoted cells with embedded commas, quotes escaped as `""`, and trimmed values.
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }
  fields.push(current.trim());

  // Strip formula sanitization quote if present
  return fields.map((f) => {
    if (f.startsWith("'") && /^[=+\-@]/.test(f.slice(1))) {
      return f.slice(1);
    }
    return f;
  });
}

export function exportLocalGuestsToCsv(guests: LocalGuest[]): string {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Category",
    "RSVP Status",
    "Plus One Allowed",
    "Plus One Count",
    "Plus One Names",
    "Dietary Preferences",
    "Accessibility Requirements",
    "Group Name",
    "Checked In",
    "Notes",
  ];

  const rows = guests.map((g) => [
    sanitizeCsvCell(g.name || ""),
    sanitizeCsvCell(g.email || ""),
    sanitizeCsvCell(g.phone || ""),
    sanitizeCsvCell(g.category),
    sanitizeCsvCell(g.rsvpStatus),
    sanitizeCsvCell(g.plusOneAllowed ? "Yes" : "No"),
    g.plusOneCount,
    sanitizeCsvCell((g.plusOneNames || []).join("; ")),
    sanitizeCsvCell((g.dietaryPreferences || []).join("; ")),
    sanitizeCsvCell(g.accessibilityRequirements || ""),
    sanitizeCsvCell(g.groupName || ""),
    sanitizeCsvCell(g.checkInStatus ? "Yes" : "No"),
    sanitizeCsvCell(g.notes || ""),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export async function importLocalGuestsFromCsv(
  eventId: string,
  csvText: string
): Promise<{ created: number; errors: string[] }> {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    throw new Error("CSV file must contain at least a header row and one guest row.");
  }

  const errors: string[] = [];
  let created = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCsvLine(line);
    const name = parts[0];
    if (!name) {
      errors.push(`Row ${i + 1}: Name is required.`);
      continue;
    }

    const email = parts[1] || null;
    const phone = parts[2] || null;
    const categoryUpper = (parts[3] || "").toUpperCase();
    const category = (["VIP", "FAMILY", "FRIENDS", "COLLEAGUES", "OTHER"].includes(categoryUpper)
      ? categoryUpper
      : "OTHER") as LocalGuest["category"];

    const rsvpUpper = (parts[4] || "").toUpperCase();
    const rsvpStatus = (["PENDING", "CONFIRMED", "DECLINED"].includes(rsvpUpper)
      ? rsvpUpper
      : "PENDING") as LocalGuest["rsvpStatus"];

    const plusOneAllowed = parts[5]?.toLowerCase() === "yes" || parts[5] === "true";
    const plusOneCount = parseInt(parts[6] || "0", 10) || 0;
    const plusOneNames = parts[7] ? parts[7].split(";").map((s) => s.trim()).filter(Boolean) : [];
    const dietaryPreferences = parts[8] ? parts[8].split(";").map((s) => s.trim()).filter(Boolean) : [];
    const accessibilityRequirements = parts[9] || null;
    const groupName = parts[10] || null;
    const notes = parts[12] || null;

    await createLocalGuest({
      eventId,
      name,
      email,
      phone,
      category,
      invitationStatus: "NOT_SENT",
      rsvpStatus,
      plusOneAllowed,
      plusOneCount,
      plusOneNames,
      dietaryPreferences,
      accessibilityRequirements,
      groupName,
      tableId: null,
      seatNumber: null,
      checkInStatus: false,
      notes,
    });
    created++;
  }

  return { created, errors };
}

/* ==========================================================================
   Tables & Seating Arrangement Planner
   ========================================================================== */

export async function getLocalTables(eventId: string): Promise<LocalTable[]> {
  const all = await dbGetAll<LocalTable>("tables");
  return all
    .filter((t) => t.eventId === eventId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createLocalTable(
  params: Omit<LocalTable, "id" | "createdAt" | "updatedAt">
): Promise<LocalTable> {
  const now = new Date().toISOString();
  const table: LocalTable = {
    ...params,
    id: generateId("tbl"),
    createdAt: now,
    updatedAt: now,
  };
  await dbPut("tables", table);
  await logActivity(params.eventId, "SEATING", "Table Created", `Created table ${table.name} (${table.capacity} seats)`, "Organizer");
  return table;
}

export async function updateLocalTable(
  tableId: string,
  updates: Partial<LocalTable>
): Promise<LocalTable> {
  const existing = await dbGet<LocalTable>("tables", tableId);
  if (!existing) throw new Error("Table not found");

  const updated: LocalTable = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await dbPut("tables", updated);
  return updated;
}

export async function deleteLocalTable(tableId: string): Promise<boolean> {
  const existing = await dbGet<LocalTable>("tables", tableId);
  if (!existing) return false;

  // Unseat any seated guests
  const guests = await dbGetAll<LocalGuest>("guests");
  const seatedGuests = guests.filter((g) => g.tableId === tableId);
  for (const g of seatedGuests) {
    await dbPut("guests", { ...g, tableId: null, seatNumber: null });
  }

  await dbDelete("tables", tableId);
  await logActivity(existing.eventId, "SEATING", "Table Deleted", `Deleted table ${existing.name}`, "Organizer");
  return true;
}

export async function assignGuestToTable(
  guestId: string,
  tableId: string | null,
  seatNumber?: number | null
): Promise<LocalGuest> {
  const guest = await dbGet<LocalGuest>("guests", guestId);
  if (!guest) throw new Error("Guest not found");

  if (tableId) {
    const table = await dbGet<LocalTable>("tables", tableId);
    if (!table) throw new Error("Table not found");

    const allGuests = await dbGetAll<LocalGuest>("guests");
    const currentlySeated = allGuests.filter((g) => g.tableId === tableId && g.id !== guestId);
    const neededSeats = 1 + (guest.plusOneCount || 0);

    if (currentlySeated.length + neededSeats > table.capacity) {
      throw new Error(`Table ${table.name} has only ${table.capacity - currentlySeated.length} open seat(s), but guest party requires ${neededSeats}.`);
    }
  }

  const updated = await updateLocalGuest(guestId, {
    tableId,
    seatNumber: seatNumber ?? null,
  });

  return updated;
}

export async function autoAssignFamilyGroups(eventId: string): Promise<{ assigned: number; message: string }> {
  const [guests, tables] = await Promise.all([
    getLocalGuests(eventId),
    getLocalTables(eventId),
  ]);

  let assignedCount = 0;
  const unassigned = guests.filter((g) => !g.tableId);

  // Group by groupName or category
  const groups = new Map<string, LocalGuest[]>();
  unassigned.forEach((g) => {
    const key = g.groupName || g.category;
    const current = groups.get(key) || [];
    current.push(g);
    groups.set(key, current);
  });

  for (const [, groupGuests] of groups) {
    // Find a table with enough capacity
    const allGuests = await dbGetAll<LocalGuest>("guests");
    for (const table of tables) {
      const seated = allGuests.filter((g) => g.tableId === table.id);
      const remainingCapacity = table.capacity - seated.length;

      const guestsToFit = groupGuests.filter((g) => !g.tableId);
      if (guestsToFit.length === 0) break;

      const fitCount = Math.min(remainingCapacity, guestsToFit.length);
      for (let i = 0; i < fitCount; i++) {
        await assignGuestToTable(guestsToFit[i].id, table.id);
        guestsToFit[i].tableId = table.id;
        assignedCount++;
      }
    }
  }

  return {
    assigned: assignedCount,
    message: `Automatically assigned ${assignedCount} guest(s) to tables based on family and category groups.`,
  };
}

/* ==========================================================================
   Invitations & RSVP Page Builder
   ========================================================================== */

export async function getLocalInvitation(eventId: string): Promise<LocalInvitation | null> {
  const all = await dbGetAll<LocalInvitation>("invitations");
  return all.find((inv) => inv.eventId === eventId) || null;
}

export async function saveLocalInvitation(
  params: Omit<LocalInvitation, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<LocalInvitation> {
  const existing = params.id ? await dbGet<LocalInvitation>("invitations", params.id) : await getLocalInvitation(params.eventId);
  const now = new Date().toISOString();

  const invitation: LocalInvitation = {
    ...params,
    id: existing?.id || generateId("inv"),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await dbPut("invitations", invitation);
  await logActivity(params.eventId, "EVENT", "Invitation Saved", `Saved template "${invitation.templateId}" for ${invitation.eventTitle}`, "Organizer");
  return invitation;
}

/* ==========================================================================
   Vendor Contracts & Payments
   ========================================================================== */

export async function getLocalVendorContracts(
  eventId: string,
  vendorId?: string
): Promise<LocalVendorContract[]> {
  const all = await dbGetAll<LocalVendorContract>("vendor_contracts");
  return all
    .filter((c) => c.eventId === eventId && (!vendorId || c.vendorId === vendorId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createLocalVendorContract(
  params: Omit<LocalVendorContract, "id" | "createdAt" | "updatedAt">
): Promise<LocalVendorContract> {
  const now = new Date().toISOString();
  const contract: LocalVendorContract = {
    ...params,
    id: generateId("vcon"),
    createdAt: now,
    updatedAt: now,
  };
  await dbPut("vendor_contracts", contract);
  await logActivity(params.eventId, "VENDOR", "Contract Created", `Logged contract #${contract.contractNumber}`, "Organizer");
  return contract;
}

export async function updateLocalVendorContract(
  contractId: string,
  updates: Partial<LocalVendorContract>
): Promise<LocalVendorContract> {
  const existing = await dbGet<LocalVendorContract>("vendor_contracts", contractId);
  if (!existing) throw new Error("Contract not found");

  const updated: LocalVendorContract = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await dbPut("vendor_contracts", updated);
  return updated;
}

export async function deleteLocalVendorContract(contractId: string): Promise<boolean> {
  const existing = await dbGet<LocalVendorContract>("vendor_contracts", contractId);
  if (!existing) return false;
  await dbDelete("vendor_contracts", contractId);
  return true;
}

export async function getLocalVendorPayments(
  eventId: string,
  vendorId?: string
): Promise<LocalVendorPayment[]> {
  const all = await dbGetAll<LocalVendorPayment>("vendor_payments");
  return all
    .filter((p) => p.eventId === eventId && (!vendorId || p.vendorId === vendorId))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export async function createLocalVendorPayment(
  params: Omit<LocalVendorPayment, "id" | "createdAt" | "updatedAt">
): Promise<LocalVendorPayment> {
  const now = new Date().toISOString();
  const payment: LocalVendorPayment = {
    ...params,
    id: generateId("vpay"),
    createdAt: now,
    updatedAt: now,
  };
  await dbPut("vendor_payments", payment);

  // If this payment is PAID, also log it as an expense to budget if not linked
  if (payment.status === "PAID" && !payment.linkedExpenseId) {
    const categories = await getLocalBudgetCategories(params.eventId);
    const cat = categories[0];
    if (cat) {
      const exp = await createLocalExpense({
        eventId: params.eventId,
        categoryId: cat.id,
        title: `Vendor Payment: ${payment.title}`,
        amount: payment.amount,
        paymentStatus: "PAID",
        notes: `Auto-linked from Vendor Payment receipt ${payment.receiptNumber || ""}`,
      });
      payment.linkedExpenseId = exp.id;
      await dbPut("vendor_payments", payment);
    }
  }

  await logActivity(params.eventId, "BUDGET", "Payment Logged", `Logged payment of ${payment.amount} for ${payment.title}`, "Organizer");
  return payment;
}

export async function updateLocalVendorPayment(
  paymentId: string,
  updates: Partial<LocalVendorPayment>
): Promise<LocalVendorPayment> {
  const existing = await dbGet<LocalVendorPayment>("vendor_payments", paymentId);
  if (!existing) throw new Error("Payment record not found");

  const updated: LocalVendorPayment = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await dbPut("vendor_payments", updated);
  return updated;
}

export async function deleteLocalVendorPayment(paymentId: string): Promise<boolean> {
  const existing = await dbGet<LocalVendorPayment>("vendor_payments", paymentId);
  if (!existing) return false;
  if (existing.linkedExpenseId) {
    await deleteLocalExpense(existing.linkedExpenseId);
  }
  await dbDelete("vendor_payments", paymentId);
  return true;
}

/* ==========================================================================
   Venue Layouts
   ========================================================================== */

export async function getLocalVenueLayouts(eventId: string): Promise<LocalVenueLayout[]> {
  const all = await dbGetAll<LocalVenueLayout>("venue_layouts");
  return all
    .filter((l) => l.eventId === eventId)
    .sort((a, b) => b.version - a.version);
}

export async function saveLocalVenueLayout(
  params: Omit<LocalVenueLayout, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<LocalVenueLayout> {
  const existing = params.id ? await dbGet<LocalVenueLayout>("venue_layouts", params.id) : null;
  const now = new Date().toISOString();

  const layout: LocalVenueLayout = {
    ...params,
    id: existing?.id || generateId("vlay"),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await dbPut("venue_layouts", layout);
  await logActivity(params.eventId, "EVENT", "Layout Saved", `Saved venue layout "${layout.name}" with ${layout.elements.length} element(s)`, "Organizer");
  return layout;
}

export async function deleteLocalVenueLayout(layoutId: string): Promise<boolean> {
  return dbDelete("venue_layouts", layoutId);
}

/* ==========================================================================
   Risk & Contingency Manager
   ========================================================================== */

export async function getLocalRisks(eventId: string): Promise<LocalRisk[]> {
  const all = await dbGetAll<LocalRisk>("risks");
  return all
    .filter((r) => r.eventId === eventId)
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Calculates deterministic 5x5 risk matrix priority score and level.
 * Likelihood (1-5) and Severity (1-5) are clamped to the valid matrix boundaries.
 */
export function calculateRiskPriority(
  likelihood: number,
  severity: number
): { score: number; level: LocalRisk["priorityLevel"] } {
  const l = Math.max(1, Math.min(5, Math.round(likelihood)));
  const s = Math.max(1, Math.min(5, Math.round(severity)));
  const score = l * s;

  let level: LocalRisk["priorityLevel"] = "LOW";
  if (score >= 16) level = "CRITICAL";
  else if (score >= 10) level = "HIGH";
  else if (score >= 5) level = "MEDIUM";

  return { score, level };
}

export async function createLocalRisk(
  params: Omit<LocalRisk, "id" | "createdAt" | "updatedAt" | "priorityScore" | "priorityLevel">
): Promise<LocalRisk> {
  const { score, level } = calculateRiskPriority(params.likelihood, params.severity);

  const now = new Date().toISOString();
  const risk: LocalRisk = {
    ...params,
    id: generateId("rsk"),
    priorityScore: score,
    priorityLevel: level,
    createdAt: now,
    updatedAt: now,
  };
  await dbPut("risks", risk);
  await logActivity(params.eventId, "RISK", "Risk Logged", `Logged ${risk.priorityLevel} risk: ${risk.title}`, "Organizer");
  return risk;
}

export async function updateLocalRisk(
  riskId: string,
  updates: Partial<LocalRisk>
): Promise<LocalRisk> {
  const existing = await dbGet<LocalRisk>("risks", riskId);
  if (!existing) throw new Error("Risk not found");

  const likelihood = updates.likelihood ?? existing.likelihood;
  const severity = updates.severity ?? existing.severity;
  const { score, level } = calculateRiskPriority(likelihood, severity);

  const updated: LocalRisk = {
    ...existing,
    ...updates,
    priorityScore: score,
    priorityLevel: level,
    updatedAt: new Date().toISOString(),
  };
  await dbPut("risks", updated);
  return updated;
}

export async function deleteLocalRisk(riskId: string): Promise<boolean> {
  return dbDelete("risks", riskId);
}

/* ==========================================================================
   Control Center Issues
   ========================================================================== */

export async function getLocalEventIssues(eventId: string): Promise<LocalEventIssue[]> {
  const all = await dbGetAll<LocalEventIssue>("event_issues");
  return all
    .filter((i) => i.eventId === eventId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createLocalEventIssue(
  params: Omit<LocalEventIssue, "id" | "createdAt" | "updatedAt">
): Promise<LocalEventIssue> {
  const now = new Date().toISOString();
  const issue: LocalEventIssue = {
    ...params,
    id: generateId("iss"),
    createdAt: now,
    updatedAt: now,
  };
  await dbPut("event_issues", issue);
  await logActivity(params.eventId, "CONTROL_CENTER", "Issue Reported", `Reported [${issue.severity}] issue: ${issue.title}`, params.reportedBy);
  return issue;
}

export async function updateLocalEventIssue(
  issueId: string,
  updates: Partial<LocalEventIssue>
): Promise<LocalEventIssue> {
  const existing = await dbGet<LocalEventIssue>("event_issues", issueId);
  if (!existing) throw new Error("Issue not found");

  const updated: LocalEventIssue = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await dbPut("event_issues", updated);
  return updated;
}

export async function deleteLocalEventIssue(issueId: string): Promise<boolean> {
  return dbDelete("event_issues", issueId);
}

/* ==========================================================================
   Volunteers Management
   ========================================================================== */

export async function getLocalVolunteers(eventId: string): Promise<LocalVolunteer[]> {
  const all = await dbGetAll<LocalVolunteer>("volunteers");
  return all
    .filter((v) => v.eventId === eventId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createLocalVolunteer(
  params: Omit<LocalVolunteer, "id" | "createdAt" | "updatedAt">
): Promise<LocalVolunteer> {
  const now = new Date().toISOString();
  const vol: LocalVolunteer = {
    ...params,
    id: generateId("vol"),
    createdAt: now,
    updatedAt: now,
  };
  await dbPut("volunteers", vol);
  return vol;
}

export async function updateLocalVolunteer(
  volunteerId: string,
  updates: Partial<LocalVolunteer>
): Promise<LocalVolunteer> {
  const existing = await dbGet<LocalVolunteer>("volunteers", volunteerId);
  if (!existing) throw new Error("Volunteer not found");

  const updated: LocalVolunteer = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await dbPut("volunteers", updated);
  return updated;
}

export async function deleteLocalVolunteer(volunteerId: string): Promise<boolean> {
  return dbDelete("volunteers", volunteerId);
}

/* ==========================================================================
   Emergency Contacts
   ========================================================================== */

export async function getLocalEmergencyContacts(eventId: string): Promise<LocalEmergencyContact[]> {
  const all = await dbGetAll<LocalEmergencyContact>("emergency_contacts");
  return all
    .filter((c) => c.eventId === eventId)
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function createLocalEmergencyContact(
  params: Omit<LocalEmergencyContact, "id" | "createdAt" | "updatedAt">
): Promise<LocalEmergencyContact> {
  const now = new Date().toISOString();
  const contact: LocalEmergencyContact = {
    ...params,
    id: generateId("econt"),
    createdAt: now,
    updatedAt: now,
  };
  await dbPut("emergency_contacts", contact);
  return contact;
}

export async function updateLocalEmergencyContact(
  contactId: string,
  updates: Partial<LocalEmergencyContact>
): Promise<LocalEmergencyContact> {
  const existing = await dbGet<LocalEmergencyContact>("emergency_contacts", contactId);
  if (!existing) throw new Error("Emergency contact not found");

  const updated: LocalEmergencyContact = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await dbPut("emergency_contacts", updated);
  return updated;
}

export async function deleteLocalEmergencyContact(contactId: string): Promise<boolean> {
  return dbDelete("emergency_contacts", contactId);
}

/* ==========================================================================
   Documents Vault
   ========================================================================== */

export async function getLocalDocuments(eventId: string): Promise<LocalDocument[]> {
  const all = await dbGetAll<LocalDocument>("documents");
  return all
    .filter((d) => d.eventId === eventId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createLocalDocument(
  params: Omit<LocalDocument, "id" | "createdAt" | "updatedAt">
): Promise<LocalDocument> {
  const now = new Date().toISOString();
  const doc: LocalDocument = {
    ...params,
    id: generateId("doc"),
    createdAt: now,
    updatedAt: now,
  };
  await dbPut("documents", doc);
  await logActivity(params.eventId, "EVENT", "Document Uploaded", `Uploaded document: ${doc.title} (${doc.category})`, params.uploadedBy);
  return doc;
}

export async function deleteLocalDocument(documentId: string): Promise<boolean> {
  return dbDelete("documents", documentId);
}

/* ==========================================================================
   Demo System Seeder for 4 User Roles
   ========================================================================== */

export async function seedDemoAccountsAndEvents(): Promise<{
  message: string;
  organizer: LocalProfile;
  coordinator: LocalProfile;
  vendor: LocalProfile;
  guest: LocalProfile;
  eventId: string;
}> {
  // 1. Create or retrieve the 4 role profiles
  const profiles = await dbGetAll<LocalProfile>("profiles");

  let org = profiles.find((p) => p.email === "elena.organizer@eventcraft.local");
  if (!org) {
    org = await createLocalProfile({
      name: "Elena Rostova",
      email: "elena.organizer@eventcraft.local",
      role: "ORGANIZER",
      organization: "Rostova Premier Events",
      phone: "+1 (555) 019-2831",
    });
  }

  // 2. Create the Flagship Showcase Event
  const events = await listLocalEvents(org.id);
  let event = events.find((e) => e.title === "Grand Imperial Gala & Wedding");
  if (!event) {
    event = await createLocalEvent(org.id, {
      title: "Grand Imperial Gala & Wedding",
      type: "WEDDING",
      eventDate: "2026-12-18",
      location: "Metropolitan Crystal Pavilion, New York",
      guestCount: 180,
      totalBudget: 45000,
      currency: "USD",
    });
  }

  // Generate local plan
  await generateAndSaveLocalPlan(event.id);

  // 3. Create Coordinator Account
  let coord = profiles.find((p) => p.email === "marcus.coord@eventcraft.local");
  if (!coord) {
    coord = await createLocalProfile({
      name: "Marcus Vance",
      email: "marcus.coord@eventcraft.local",
      role: "COORDINATOR",
      organization: "Vance Event Execution Co.",
      phone: "+1 (555) 438-9210",
      assignedEventIds: [event.id],
    });
  }

  // 4. Create Vendor Account & Profile
  const vendors = await getLocalVendors(event.id);
  let vendorId = vendors.find((v) => v.companyName === "Apex Sound & Lighting")?.id;
  if (!vendorId) {
    const createdVendor = await createLocalVendor({
      eventId: event.id,
      companyName: "Apex Sound & Lighting",
      categoryName: "Music / DJ",
      contactPerson: "Julian Cole",
      email: "julian@apexsound.local",
      phone: "+1 (555) 832-1104",
      notes: "Selected as primary sound, acoustic, and luminous staging provider.",
    });
    vendorId = createdVendor.id;
    await addLocalVendorQuote({
      vendorId: createdVendor.id,
      eventId: event.id,
      description: "Full concert-grade sound rig with dynamic ambient lighting trusses and wireless lapels.",
      quotedAmount: 4800,
      currency: "USD",
      isSelected: true,
    });
  }

  let vendorUser = profiles.find((p) => p.email === "julian@apexsound.local");
  if (!vendorUser) {
    vendorUser = await createLocalProfile({
      name: "Julian Cole (Apex Sound)",
      email: "julian@apexsound.local",
      role: "VENDOR",
      vendorId,
      organization: "Apex Sound & Lighting",
      phone: "+1 (555) 832-1104",
      assignedEventIds: [event.id],
    });
  }

  // Vendor contract & payment
  const existingContracts = await getLocalVendorContracts(event.id, vendorId);
  if (existingContracts.length === 0) {
    const contract = await createLocalVendorContract({
      eventId: event.id,
      vendorId,
      title: "Audio, Staging & Lighting Agreement",
      contractNumber: "APX-2026-0048",
      status: "SIGNED",
      totalAmount: 4800,
      advanceAmount: 2000,
      effectiveDate: "2026-10-15",
      completionDate: "2026-12-19",
      signedDate: "2026-10-16",
      termsAndConditions: "Includes 4 hours soundcheck, 6 hours active operational control, and complete breakdown within 2 hours of event conclusion.",
    });

    await createLocalVendorPayment({
      eventId: event.id,
      vendorId,
      contractId: contract.id,
      title: "Deposit & Mobilization Advance",
      amount: 2000,
      amountCents: 200000,
      paymentType: "ADVANCE",
      paymentMethod: "BANK_TRANSFER",
      status: "PAID",
      dueDate: "2026-10-20",
      paidDate: "2026-10-18",
      receiptNumber: "REC-APX-0101",
    });

    await createLocalVendorPayment({
      eventId: event.id,
      vendorId,
      contractId: contract.id,
      title: "Final Completion & Teardown Balance",
      amount: 2800,
      amountCents: 280000,
      paymentType: "FINAL",
      paymentMethod: "BANK_TRANSFER",
      status: "SCHEDULED",
      dueDate: "2026-12-19",
      receiptNumber: null,
    });
  }

  // 5. Create Tables
  const existingTables = await getLocalTables(event.id);
  let headTable = existingTables.find((t) => t.name.includes("Head Table"));
  if (!headTable) {
    headTable = await createLocalTable({
      eventId: event.id,
      name: "Table 1 — Imperial Head Table",
      shape: "RECTANGULAR",
      capacity: 10,
      zone: "Main Stage Front",
      posX: 250,
      posY: 100,
      isVip: true,
      notes: "Front and center table for wedding party and hosts.",
    });

    await createLocalTable({
      eventId: event.id,
      name: "Table 2 — Diamond VIP",
      shape: "ROUND",
      capacity: 8,
      zone: "East Terrace",
      posX: 120,
      posY: 260,
      isVip: true,
      notes: "Reserved for distinguished patrons.",
    });

    await createLocalTable({
      eventId: event.id,
      name: "Table 3 — Garden Circle",
      shape: "ROUND",
      capacity: 8,
      zone: "West Gallery",
      posX: 380,
      posY: 260,
      isVip: false,
      notes: "General banquet seating.",
    });
  }

  // 6. Create Guests
  const existingGuests = await getLocalGuests(event.id);
  let vipGuest = existingGuests.find((g) => g.email === "sophia.lin@guest.local");
  if (!vipGuest) {
    vipGuest = await createLocalGuest({
      eventId: event.id,
      name: "Dr. Sophia Lin",
      email: "sophia.lin@guest.local",
      phone: "+1 (555) 771-3920",
      category: "VIP",
      invitationStatus: "DELIVERED",
      rsvpStatus: "CONFIRMED",
      plusOneAllowed: true,
      plusOneCount: 1,
      plusOneNames: ["Arthur Pendelton"],
      dietaryPreferences: ["Vegetarian", "Gluten-Free"],
      accessibilityRequirements: "Requires step-free entry near entrance",
      groupName: "Distinguished Scholars",
      tableId: headTable.id,
      seatNumber: 1,
      checkInStatus: false,
      notes: "Keynote congratulations speaker at 20:30.",
    });

    await createLocalGuest({
      eventId: event.id,
      name: "Ambassador David Chen",
      email: "david.chen@embassy.local",
      phone: "+1 (555) 902-3341",
      category: "VIP",
      invitationStatus: "DELIVERED",
      rsvpStatus: "CONFIRMED",
      plusOneAllowed: true,
      plusOneCount: 1,
      plusOneNames: ["Mei-Ling Chen"],
      dietaryPreferences: ["None"],
      tableId: headTable.id,
      seatNumber: 2,
      checkInStatus: false,
    });

    await createLocalGuest({
      eventId: event.id,
      name: "Liam O'Connor",
      email: "liam.oconnor@local.dev",
      category: "FAMILY",
      invitationStatus: "SENT",
      rsvpStatus: "CONFIRMED",
      plusOneAllowed: false,
      plusOneCount: 0,
      plusOneNames: [],
      dietaryPreferences: ["Nut Allergy"],
      tableId: null,
      seatNumber: null,
      checkInStatus: false,
    });
  }

  // 7. Create Guest Account
  let guestUser = profiles.find((p) => p.email === "sophia.lin@guest.local");
  if (!guestUser) {
    guestUser = await createLocalProfile({
      name: "Dr. Sophia Lin",
      email: "sophia.lin@guest.local",
      role: "GUEST",
      guestId: vipGuest.id,
      phone: "+1 (555) 771-3920",
      assignedEventIds: [event.id],
    });
  }

  // 8. Create Invitation
  await saveLocalInvitation({
    eventId: event.id,
    title: "Grand Imperial Gala & Wedding Celebration",
    templateId: "classic_wedding",
    hostName: "The Rostova & Sterling Families",
    eventTitle: "Grand Imperial Gala & Wedding",
    eventDate: "2026-12-18",
    eventTime: "17:30 EST",
    location: "Metropolitan Crystal Pavilion, 450 Grand Ave, New York",
    description: "Join us for an evening of celebratory dining, luminous music, and joyful fellowship under the crystal chandeliers.",
    dressCode: "Black Tie / Formal Evening Wear",
    primaryColor: "#7c3aed",
    secondaryColor: "#c084fc",
    fontFamily: "serif",
    rsvpDeadline: "2026-11-25",
    qrPayload: `EVENTCRAFT-EVENT-${event.id}`,
  });

  // 9. Create Risks
  const existingRisks = await getLocalRisks(event.id);
  if (existingRisks.length === 0) {
    await createLocalRisk({
      eventId: event.id,
      title: "Inclement Winter Snowstorm on Arrival",
      category: "WEATHER",
      likelihood: 3,
      severity: 4,
      owner: "Elena Rostova",
      mitigationStrategy: "Arrange heated marquee entrance tunnels and coordinate with city snow plows for the valet court.",
      contingencyPlan: "Offer pre-arranged indoor coat-check staging and shuttle vans from the central hotel garage.",
      status: "MONITORING",
      notes: "Checked 14-day meteorological outlook.",
    });

    await createLocalRisk({
      eventId: event.id,
      title: "Audio Generator Voltage Fluctuations",
      category: "EQUIPMENT",
      likelihood: 2,
      severity: 4,
      owner: "Julian Cole (Apex Sound)",
      mitigationStrategy: "Install dual uninterruptible power supply (UPS) units on main audio racks.",
      contingencyPlan: "Backup 40kVA silent diesel generator staged in exterior loading dock.",
      status: "IDENTIFIED",
    });
  }

  // 10. Emergency Contacts
  const existingEmerg = await getLocalEmergencyContacts(event.id);
  if (existingEmerg.length === 0) {
    await createLocalEmergencyContact({
      eventId: event.id,
      name: "Chief Daniel Thorne",
      role: "Head of Facility Security",
      organization: "Metropolitan Crystal Pavilion",
      phone: "+1 (555) 911-0422",
      category: "SECURITY",
      notes: "On-site 24/7 during event setup and execution.",
    });

    await createLocalEmergencyContact({
      eventId: event.id,
      name: "Dr. Evelyn Ward, EMT-P",
      role: "Lead Medical Responder",
      organization: "FirstCare Event Paramedics",
      phone: "+1 (555) 911-8833",
      category: "MEDICAL",
      notes: "Medical suite located in Room 104 off main foyer.",
    });
  }

  // 11. Initial Control Center Issues & Run-of-Show
  const existingIssues = await getLocalEventIssues(event.id);
  if (existingIssues.length === 0) {
    await createLocalEventIssue({
      eventId: event.id,
      title: "South Entrance Velvet Stanchion Placement",
      severity: "LOW",
      status: "RESOLVED",
      reportedBy: "Marcus Vance",
      assignedTo: "Venue Operations",
      description: "Ensure 4 velvet rope stanchions are spaced 2 meters apart for VIP photo wall queue.",
      resolutionNotes: "Completed by venue staff at 15:45.",
      resolvedAt: new Date().toISOString(),
    });
  }

  // 12. Volunteers
  const existingVols = await getLocalVolunteers(event.id);
  if (existingVols.length === 0) {
    await createLocalVolunteer({
      eventId: event.id,
      name: "Chloe Bennett",
      email: "chloe.b@volunteer.local",
      phone: "+1 (555) 321-9988",
      role: "VIP Greeter & Escort",
      shiftStart: "16:30",
      shiftEnd: "20:30",
      location: "Grand Crystal Foyer",
      status: "CONFIRMED",
      notes: "Assisting guests with coat check and table direction.",
    });

    await createLocalVolunteer({
      eventId: event.id,
      name: "Tyler Zhang",
      email: "tyler.z@volunteer.local",
      phone: "+1 (555) 443-2211",
      role: "Digital QR Check-in Assistant",
      shiftStart: "17:00",
      shiftEnd: "21:00",
      location: "Foyer Registration Desk",
      status: "CONFIRMED",
    });
  }

  return {
    message: "Demo system initialized with Organizer, Coordinator, Vendor, and Guest accounts!",
    organizer: org,
    coordinator: coord,
    vendor: vendorUser,
    guest: guestUser,
    eventId: event.id,
  };
}
