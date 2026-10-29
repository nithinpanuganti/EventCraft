# Operations Runbook — EventCraft AI

## 1. System Architecture Summary

EventCraft AI is a local-first Next.js application that runs entirely in the user's web browser. All event records, tasks, budgets, and vendor entries persist natively in browser IndexedDB (`eventcraft_local_db`). Planning logic and conversational commands operate via deterministic rule engines without external server or cloud dependencies.

---

## 2. Common Operational Tasks

### 2.1 Database Backup & Disaster Recovery
1. Navigate to `/settings`.
2. Under **IndexedDB Backup & Restore**, click **Export Backup (.json)**.
3. Save the timestamped JSON backup file (`eventcraft-backup-YYYY-MM-DD.json`) to a secure location.
4. To restore data on another machine or browser, use **Choose Backup File** to import the JSON file. The system validates the schema and hydrates all 9 object stores.

### 2.2 Resetting Local Browser Data
1. Navigate to `/settings`.
2. Under **Clear Local Database**, click **Reset All Data**.
3. Confirm the browser dialog prompt. All IndexedDB object stores will be purged, and the browser will redirect to `/register`.

### 2.3 Managing Local Profiles
- Users can maintain distinct planning workspaces using browser profiles.
- Switch between profiles on `/login` or create new profiles on `/register`.
- Profiles are stored locally inside the browser's IndexedDB.

---

## 3. Incident Response & Troubleshooting

### Scenario A: Browser Storage Cleared Unexpectedly
- **Root Cause:** User cleared browser cache or site data for `localhost`.
- **Resolution:** Restore data using the most recent exported JSON backup file on `/settings`.

### Scenario B: Private/Incognito Browsing Mode
- **Behavior:** IndexedDB operates with an in-memory fallback or temporary session storage depending on browser privacy policies.
- **Resolution:** Advise users to export their backup before closing private browsing windows.

### Scenario C: Deterministic Planning Rule Questions
- **Behavior:** Plans generate instantly using structured domain templates for Weddings, Birthdays, and Community events.
- **Resolution:** Customize plans directly using the interactive budget allocations editor, task timeline checklist, or natural language command terminal.

---

## 4. Monitoring Recommendations

1. **Client-Side Health:** Monitor browser console for unhandled JavaScript exceptions.
2. **Build Verification:** Regularly run `npm run test` and `npm run type-check` before distributing updates.
3. **Uptime Monitoring:** Configure standard HTTP pings to `/` or `/login` for static hosting verification.
