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
  EventType,
  TaskPhase,
  TaskPriority,
  TaskStatus,
  VendorStatus,
  PaymentStatus,
  TaskWithDependencies,
  VendorWithQuotes,
} from "./types";
import { generateLocalPlan } from "../local-planning/rule-engine";
import {
  validateTaskTransition,
  checkDependencyBlocking,
  CanonicalTaskStatus,
} from "../timeline/task-state-machine";


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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: true,
    };
    await dbPut("profiles", defaultProfile);
    return [defaultProfile];
  }
  return profiles;
}

export async function getActiveLocalProfile(): Promise<LocalProfile> {
  const profiles = await getLocalProfiles();
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
  nameOrParams: string | { name: string; email: string; passcode?: string },
  maybeEmail?: string,
  maybePasscode?: string
): Promise<LocalProfile> {
  const name = typeof nameOrParams === "object" ? nameOrParams.name : nameOrParams;
  const email =
    typeof nameOrParams === "object"
      ? nameOrParams.email
      : maybeEmail || `${name.toLowerCase().replace(/\s+/g, ".")}@browser.local`;
  const passcode = typeof nameOrParams === "object" ? nameOrParams.passcode : maybePasscode;
  const passcodeHash = await hashLocalPasscode(passcode);

  const newProfile: LocalProfile = {
    id: generateId("prof"),
    name: name.trim(),
    email: email.trim().toLowerCase(),
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
