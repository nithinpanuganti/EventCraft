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
} from "./types";

const DB_NAME = "eventcraft_local_db";
const DB_VERSION = 1;

export type StoreName =
  | "profiles"
  | "events"
  | "event_plans"
  | "budget_categories"
  | "expenses"
  | "tasks"
  | "vendors"
  | "vendor_quotes"
  | "plan_revisions";

const STORE_NAMES: StoreName[] = [
  "profiles",
  "events",
  "event_plans",
  "budget_categories",
  "expenses",
  "tasks",
  "vendors",
  "vendor_quotes",
  "plan_revisions",
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
 * Exports all local data to a portable, versioned JSON backup object.
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
  ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appName: "EventCraft AI",
    appVersion: "0.2.0-local",
    profiles,
    events,
    eventPlans,
    budgetCategories,
    expenses,
    tasks,
    vendors,
    vendorQuotes,
    planRevisions,
  };
}

/**
 * Validates and imports a JSON backup into IndexedDB.
 */
export async function importDatabaseBackup(
  backup: LocalDatabaseBackup
): Promise<{ success: boolean; message: string; recordCounts: Record<string, number> }> {
  if (!backup || typeof backup !== "object" || typeof backup.schemaVersion !== "number") {
    throw new Error("Invalid backup format. Missing valid schemaVersion.");
  }

  if (backup.schemaVersion > 1) {
    throw new Error(`Unsupported schema version ${backup.schemaVersion}. This app supports version 1.`);
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
