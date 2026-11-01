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
  LocalDatabaseBackup,
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
} from "./types";

const DB_NAME = "eventcraft_local_db";
const DB_VERSION = 2;

export type StoreName =
  | "profiles"
  | "events"
  | "event_plans"
  | "budget_categories"
  | "expenses"
  | "tasks"
  | "vendors"
  | "vendor_quotes"
  | "plan_revisions"
  | "guests"
  | "tables"
  | "invitations"
  | "vendor_contracts"
  | "vendor_payments"
  | "venue_layouts"
  | "risks"
  | "event_issues"
  | "volunteers"
  | "emergency_contacts"
  | "documents"
  | "activity_logs";

export const STORE_NAMES: StoreName[] = [
  "profiles",
  "events",
  "event_plans",
  "budget_categories",
  "expenses",
  "tasks",
  "vendors",
  "vendor_quotes",
  "plan_revisions",
  "guests",
  "tables",
  "invitations",
  "vendor_contracts",
  "vendor_payments",
  "venue_layouts",
  "risks",
  "event_issues",
  "volunteers",
  "emergency_contacts",
  "documents",
  "activity_logs",
];

// In-memory fallback storage for SSR and Node.js testing environments
const memoryStores: Map<StoreName, Map<string, unknown>> = new Map();
STORE_NAMES.forEach((name) => memoryStores.set(name, new Map()));

// High-performance read-through cache & cache validity tracking
const readCache: Map<StoreName, Map<string, unknown>> = new Map();
const allCached: Set<StoreName> = new Set();
STORE_NAMES.forEach((name) => readCache.set(name, new Map()));

function cloneData<T>(item: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(item);
    } catch {
      // Fallback if structuredClone fails on edge cases
    }
  }
  return JSON.parse(JSON.stringify(item)) as T;
}

function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbOpenPromise) return dbOpenPromise;

  dbOpenPromise = new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      STORE_NAMES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      });
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      reject(error || new Error("Failed to open IndexedDB"));
    };
  });

  return dbOpenPromise;
}

export async function dbGet<T>(storeName: StoreName, key: string): Promise<T | null> {
  // Check read-through cache first for 0ms retrieval
  const cached = readCache.get(storeName)?.get(key);
  if (cached !== undefined) {
    return cloneData(cached as T);
  }

  if (!isIndexedDBAvailable()) {
    const store = memoryStores.get(storeName);
    const item = store?.get(key);
    if (item) {
      readCache.get(storeName)?.set(key, item);
    }
    return item ? cloneData(item as T) : null;
  }

  try {
    const db = await openDB();
    const result = await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => reject(req.error);
    });

    if (result) {
      readCache.get(storeName)?.set(key, cloneData(result));
    }
    return result;
  } catch (error) {
    console.warn(`[LocalDB] Falling back to memory store for get: ${storeName}/${key}`, error);
    const item = memoryStores.get(storeName)?.get(key);
    return item ? cloneData(item as T) : null;
  }
}

export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  // Return immediately if store is fully cached in memory
  if (allCached.has(storeName)) {
    const cachedItems = Array.from(readCache.get(storeName)!.values());
    return cachedItems.map((v) => cloneData(v as T));
  }

  if (!isIndexedDBAvailable()) {
    const store = memoryStores.get(storeName);
    const items = store ? Array.from(store.values()) : [];
    items.forEach((item) => {
      if (item && typeof item === "object" && "id" in item) {
        readCache.get(storeName)?.set((item as { id: string }).id, item);
      }
    });
    allCached.add(storeName);
    return items.map((v) => cloneData(v as T));
  }

  try {
    const db = await openDB();
    const results = await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });

    // Populate in-memory read-through cache
    const storeCache = readCache.get(storeName);
    if (storeCache) {
      results.forEach((item) => {
        if (item && typeof item === "object" && "id" in item) {
          storeCache.set((item as { id: string }).id, cloneData(item));
        }
      });
      allCached.add(storeName);
    }

    return results;
  } catch (error) {
    console.warn(`[LocalDB] Falling back to memory store for getAll: ${storeName}`, error);
    const store = memoryStores.get(storeName);
    return store ? Array.from(store.values()).map((v) => cloneData(v as T)) : [];
  }
}

export async function dbPut<T extends { id: string }>(storeName: StoreName, item: T): Promise<T> {
  const cloned = cloneData(item);

  // Update in-memory stores and read-through cache immediately
  memoryStores.get(storeName)?.set(item.id, cloned);
  readCache.get(storeName)?.set(item.id, cloned);

  if (!isIndexedDBAvailable()) {
    return cloned;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(cloned);
      req.onsuccess = () => resolve(cloned);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn(`[LocalDB] IndexedDB write failed, persisted to memory only: ${storeName}/${item.id}`, error);
    return cloned;
  }
}

export async function dbPutBatch<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return;

  const clonedItems = items.map(cloneData);
  const memStore = memoryStores.get(storeName);
  const cache = readCache.get(storeName);

  clonedItems.forEach((item) => {
    memStore?.set(item.id, item);
    cache?.set(item.id, item);
  });

  if (!isIndexedDBAvailable()) {
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      clonedItems.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn(`[LocalDB] Batch write failed for ${storeName}`, error);
  }
}

export async function dbDelete(storeName: StoreName, key: string): Promise<boolean> {
  memoryStores.get(storeName)?.delete(key);
  readCache.get(storeName)?.delete(key);

  if (!isIndexedDBAvailable()) {
    return true;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn(`[LocalDB] IndexedDB delete failed: ${storeName}/${key}`, error);
    return true;
  }
}

export async function dbClear(storeName: StoreName): Promise<boolean> {
  memoryStores.get(storeName)?.clear();
  readCache.get(storeName)?.clear();
  allCached.delete(storeName);

  if (!isIndexedDBAvailable()) {
    return true;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn(`[LocalDB] IndexedDB clear failed: ${storeName}`, error);
    return true;
  }
}

/**
 * Exports all local data across all 21 object stores to a portable JSON backup.
 */
export async function exportDatabaseBackup(): Promise<LocalDatabaseBackup> {
  const [
    profiles,
    events,
    eventPlans,
    budgetCategories,
    expenses,
    tasks,
    vendors,
    vendorQuotes,
    planRevisions,
    guests,
    tables,
    invitations,
    vendorContracts,
    vendorPayments,
    venueLayouts,
    risks,
    issues,
    volunteers,
    emergencyContacts,
    documents,
    activityLogs,
  ] = await Promise.all([
    dbGetAll<LocalProfile>("profiles"),
    dbGetAll<LocalEvent>("events"),
    dbGetAll<LocalEventPlan>("event_plans"),
    dbGetAll<LocalBudgetCategory>("budget_categories"),
    dbGetAll<LocalExpense>("expenses"),
    dbGetAll<LocalTask>("tasks"),
    dbGetAll<LocalVendor>("vendors"),
    dbGetAll<LocalVendorQuote>("vendor_quotes"),
    dbGetAll<LocalPlanRevision>("plan_revisions"),
    dbGetAll<LocalGuest>("guests"),
    dbGetAll<LocalTable>("tables"),
    dbGetAll<LocalInvitation>("invitations"),
    dbGetAll<LocalVendorContract>("vendor_contracts"),
    dbGetAll<LocalVendorPayment>("vendor_payments"),
    dbGetAll<LocalVenueLayout>("venue_layouts"),
    dbGetAll<LocalRisk>("risks"),
    dbGetAll<LocalEventIssue>("event_issues"),
    dbGetAll<LocalVolunteer>("volunteers"),
    dbGetAll<LocalEmergencyContact>("emergency_contacts"),
    dbGetAll<LocalDocument>("documents"),
    dbGetAll<LocalActivityLog>("activity_logs"),
  ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appName: "EventCraft AI",
    appVersion: "0.3.0-local",
    profiles,
    events,
    eventPlans,
    budgetCategories,
    expenses,
    tasks,
    vendors,
    vendorQuotes,
    planRevisions,
    guests,
    tables,
    invitations,
    vendorContracts,
    vendorPayments,
    venueLayouts,
    risks,
    issues,
    volunteers,
    emergencyContacts,
    documents,
    activityLogs,
  };
}

/**
 * Validates and imports a JSON backup into IndexedDB across all 21 object stores.
 */
export async function importDatabaseBackup(
  backup: LocalDatabaseBackup
): Promise<{ success: boolean; message: string; recordCounts: Record<string, number> }> {
  if (!backup || typeof backup !== "object" || typeof backup.schemaVersion !== "number") {
    throw new Error("Invalid backup format. Missing valid schemaVersion.");
  }

  if (backup.schemaVersion > 2) {
    throw new Error(`Unsupported schema version ${backup.schemaVersion}. This app supports versions 1 and 2.`);
  }

  const counts: Record<string, number> = {
    profiles: 0,
    events: 0,
    eventPlans: 0,
    budgetCategories: 0,
    expenses: 0,
    tasks: 0,
    vendors: 0,
    vendorQuotes: 0,
    planRevisions: 0,
    guests: 0,
    tables: 0,
    invitations: 0,
    vendorContracts: 0,
    vendorPayments: 0,
    venueLayouts: 0,
    risks: 0,
    issues: 0,
    volunteers: 0,
    emergencyContacts: 0,
    documents: 0,
    activityLogs: 0,
  };

  // Import each entity via high-performance batch writes
  if (Array.isArray(backup.profiles) && backup.profiles.length > 0) {
    const valid = backup.profiles.filter((p) => p.id && p.name);
    await dbPutBatch("profiles", valid);
    counts.profiles = valid.length;
  }

  if (Array.isArray(backup.events) && backup.events.length > 0) {
    const valid = backup.events.filter((e) => e.id && e.title);
    await dbPutBatch("events", valid);
    counts.events = valid.length;
  }

  if (Array.isArray(backup.eventPlans) && backup.eventPlans.length > 0) {
    const valid = backup.eventPlans.filter((plan) => plan.id && plan.eventId);
    await dbPutBatch("event_plans", valid);
    counts.eventPlans = valid.length;
  }

  if (Array.isArray(backup.budgetCategories) && backup.budgetCategories.length > 0) {
    const valid = backup.budgetCategories.filter((cat) => cat.id && cat.eventId);
    await dbPutBatch("budget_categories", valid);
    counts.budgetCategories = valid.length;
  }

  if (Array.isArray(backup.expenses) && backup.expenses.length > 0) {
    const valid = backup.expenses.filter((exp) => exp.id && exp.eventId);
    await dbPutBatch("expenses", valid);
    counts.expenses = valid.length;
  }

  if (Array.isArray(backup.tasks) && backup.tasks.length > 0) {
    const valid = backup.tasks.filter((t) => t.id && t.eventId);
    await dbPutBatch("tasks", valid);
    counts.tasks = valid.length;
  }

  if (Array.isArray(backup.vendors) && backup.vendors.length > 0) {
    const valid = backup.vendors.filter((v) => v.id && v.eventId);
    await dbPutBatch("vendors", valid);
    counts.vendors = valid.length;
  }

  if (Array.isArray(backup.vendorQuotes) && backup.vendorQuotes.length > 0) {
    const valid = backup.vendorQuotes.filter((q) => q.id && q.vendorId);
    await dbPutBatch("vendor_quotes", valid);
    counts.vendorQuotes = valid.length;
  }

  if (Array.isArray(backup.planRevisions) && backup.planRevisions.length > 0) {
    const valid = backup.planRevisions.filter((rev) => rev.id && rev.eventId);
    await dbPutBatch("plan_revisions", valid);
    counts.planRevisions = valid.length;
  }

  if (Array.isArray(backup.guests) && backup.guests.length > 0) {
    const valid = backup.guests.filter((g) => g.id && g.eventId);
    await dbPutBatch("guests", valid);
    counts.guests = valid.length;
  }

  if (Array.isArray(backup.tables) && backup.tables.length > 0) {
    const valid = backup.tables.filter((tb) => tb.id && tb.eventId);
    await dbPutBatch("tables", valid);
    counts.tables = valid.length;
  }

  if (Array.isArray(backup.invitations) && backup.invitations.length > 0) {
    const valid = backup.invitations.filter((inv) => inv.id && inv.eventId);
    await dbPutBatch("invitations", valid);
    counts.invitations = valid.length;
  }

  if (Array.isArray(backup.vendorContracts) && backup.vendorContracts.length > 0) {
    const valid = backup.vendorContracts.filter((c) => c.id && c.eventId);
    await dbPutBatch("vendor_contracts", valid);
    counts.vendorContracts = valid.length;
  }

  if (Array.isArray(backup.vendorPayments) && backup.vendorPayments.length > 0) {
    const valid = backup.vendorPayments.filter((p) => p.id && p.eventId);
    await dbPutBatch("vendor_payments", valid);
    counts.vendorPayments = valid.length;
  }

  if (Array.isArray(backup.venueLayouts) && backup.venueLayouts.length > 0) {
    const valid = backup.venueLayouts.filter((l) => l.id && l.eventId);
    await dbPutBatch("venue_layouts", valid);
    counts.venueLayouts = valid.length;
  }

  if (Array.isArray(backup.risks) && backup.risks.length > 0) {
    const valid = backup.risks.filter((r) => r.id && r.eventId);
    await dbPutBatch("risks", valid);
    counts.risks = valid.length;
  }

  if (Array.isArray(backup.issues) && backup.issues.length > 0) {
    const valid = backup.issues.filter((iss) => iss.id && iss.eventId);
    await dbPutBatch("event_issues", valid);
    counts.issues = valid.length;
  }

  if (Array.isArray(backup.volunteers) && backup.volunteers.length > 0) {
    const valid = backup.volunteers.filter((vol) => vol.id && vol.eventId);
    await dbPutBatch("volunteers", valid);
    counts.volunteers = valid.length;
  }

  if (Array.isArray(backup.emergencyContacts) && backup.emergencyContacts.length > 0) {
    const valid = backup.emergencyContacts.filter((ec) => ec.id && ec.eventId);
    await dbPutBatch("emergency_contacts", valid);
    counts.emergencyContacts = valid.length;
  }

  if (Array.isArray(backup.documents) && backup.documents.length > 0) {
    const valid = backup.documents.filter((doc) => doc.id && doc.eventId);
    await dbPutBatch("documents", valid);
    counts.documents = valid.length;
  }

  if (Array.isArray(backup.activityLogs) && backup.activityLogs.length > 0) {
    const valid = backup.activityLogs.filter((log) => log.id && log.eventId);
    await dbPutBatch("activity_logs", valid);
    counts.activityLogs = valid.length;
  }

  return {
    success: true,
    message: "Data backup restored successfully into browser IndexedDB.",
    recordCounts: counts,
  };
}

/**
 * Resets all browser storage back to clean state.
 */
export async function resetAllLocalData(): Promise<void> {
  await Promise.all(STORE_NAMES.map((store) => dbClear(store)));
}
