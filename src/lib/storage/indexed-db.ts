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
  if (!isIndexedDBAvailable()) {
    const store = memoryStores.get(storeName);
    const item = store?.get(key);
    return item ? (JSON.parse(JSON.stringify(item)) as T) : null;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn(`[LocalDB] Falling back to memory store for get: ${storeName}/${key}`, error);
    const item = memoryStores.get(storeName)?.get(key);
    return item ? (JSON.parse(JSON.stringify(item)) as T) : null;
  }
}

export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  if (!isIndexedDBAvailable()) {
    const store = memoryStores.get(storeName);
    return store ? Array.from(store.values()).map((v) => JSON.parse(JSON.stringify(v)) as T) : [];
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn(`[LocalDB] Falling back to memory store for getAll: ${storeName}`, error);
    const store = memoryStores.get(storeName);
    return store ? Array.from(store.values()).map((v) => JSON.parse(JSON.stringify(v)) as T) : [];
  }
}

export async function dbPut<T extends { id: string }>(storeName: StoreName, item: T): Promise<T> {
  const cloned = JSON.parse(JSON.stringify(item)) as T;

  // Always keep memory fallback in sync
  memoryStores.get(storeName)?.set(item.id, cloned);

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

export async function dbDelete(storeName: StoreName, key: string): Promise<boolean> {
  memoryStores.get(storeName)?.delete(key);

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

  // Import each entity
  if (Array.isArray(backup.profiles)) {
    for (const p of backup.profiles) {
      if (p.id && p.name) {
        await dbPut("profiles", p);
        counts.profiles++;
      }
    }
  }

  if (Array.isArray(backup.events)) {
    for (const e of backup.events) {
      if (e.id && e.title) {
        await dbPut("events", e);
        counts.events++;
      }
    }
  }

  if (Array.isArray(backup.eventPlans)) {
    for (const plan of backup.eventPlans) {
      if (plan.id && plan.eventId) {
        await dbPut("event_plans", plan);
        counts.eventPlans++;
      }
    }
  }

  if (Array.isArray(backup.budgetCategories)) {
    for (const cat of backup.budgetCategories) {
      if (cat.id && cat.eventId) {
        await dbPut("budget_categories", cat);
        counts.budgetCategories++;
      }
    }
  }

  if (Array.isArray(backup.expenses)) {
    for (const exp of backup.expenses) {
      if (exp.id && exp.eventId) {
        await dbPut("expenses", exp);
        counts.expenses++;
      }
    }
  }

  if (Array.isArray(backup.tasks)) {
    for (const t of backup.tasks) {
      if (t.id && t.eventId) {
        await dbPut("tasks", t);
        counts.tasks++;
      }
    }
  }

  if (Array.isArray(backup.vendors)) {
    for (const v of backup.vendors) {
      if (v.id && v.eventId) {
        await dbPut("vendors", v);
        counts.vendors++;
      }
    }
  }

  if (Array.isArray(backup.vendorQuotes)) {
    for (const q of backup.vendorQuotes) {
      if (q.id && q.vendorId) {
        await dbPut("vendor_quotes", q);
        counts.vendorQuotes++;
      }
    }
  }

  if (Array.isArray(backup.planRevisions)) {
    for (const rev of backup.planRevisions) {
      if (rev.id && rev.eventId) {
        await dbPut("plan_revisions", rev);
        counts.planRevisions++;
      }
    }
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
