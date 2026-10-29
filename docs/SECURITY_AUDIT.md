# Security Audit Report — EventCraft AI

## 1. Executive Summary

This Security Audit analyzed data boundaries, workspace scoping, input sanitization, deterministic integrity, and local storage safety across EventCraft AI.

**Overall Security Posture:** **STANDALONE LOCAL-FIRST VERIFIED**.

---

## 2. Methodology & Scope

The audit reviewed:
1. **Local Profile & Workspace Management:** Profile separation, credential handling, and local IndexedDB scoping.
2. **Workspace Isolation:** Scoping of all resources (Events, EventPlans, BudgetCategories, Expenses, Tasks, Vendors, VendorQuotes, and PlanRevisions) to the active local profile.
3. **Input Validation & Data Integrity:** Zod validation schemas, sanitization of user inputs, exact-cent financial math, and schema-validated JSON backup restore.
4. **Command Execution Safety:** Deterministic command interpreter boundaries, denial of arbitrary script execution, and confirmation requirements for consequential mutations.
5. **Zero External Network Leakage:** Verification that no event records, financial data, or credentials are transmitted to remote servers or third-party cloud services.

---

## 3. Findings Matrix

| Finding ID | Severity | Category | Description | Status / Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Low** | HTTP Headers | Missing security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) on server responses. | **Fixed.** Added comprehensive security headers in `next.config.js`. |
| **SEC-02** | **Informational** | Data Integrity | Floating-point rounding drift risk in financial calculations. | **Verified / Mitigated.** Financial math uses integer cents minor units via `financial-engine.ts`, verified across unit test suites. |
| **SEC-03** | **Informational** | Storage Boundary | Shared browser environment inspection risk. | **Documented / Disclosed.** Transparent disclosure in `/settings` that browser developer tools can inspect local IndexedDB storage. |
| **SEC-04** | **Informational** | Backup Verification | Risk of corrupted or manipulated JSON backup files. | **Verified / Mitigated.** Implemented strict Zod schema validation on backup import, rejecting corrupted or unversioned files. |

---

## 4. Detailed Component Audits

### 4.1 Local Credential & Profile Storage
- **Local Isolation:** Profiles are stored in browser IndexedDB with zero remote transmission.
- **Enumeration Defense:** Generic error messages returned on invalid profile creation or switching.

### 4.2 Workspace Data Isolation
Every repository method enforces profile and event scoping:
- `Event`: Scoped by `profileId`.
- `BudgetCategory`: Scoped through `eventId`.
- `Expense`: Scoped through `categoryId` and `eventId`.
- `Task`: Scoped through `eventId`.
- `Vendor`: Scoped through `eventId`.
- `VendorQuote`: Scoped through `vendorId` and `eventId`.
- `PlanRevision`: Scoped through `eventId`.

### 4.3 Deterministic Command Safety
- User prompts in the command terminal are processed through deterministic regex and token parsing (`src/lib/local-planning/command-interpreter.ts`).
- Generates structured revision proposals strictly mapped to approved mutation actions (`ADJUST_BUDGET`, `UPDATE_EVENT_DATE`, `ADD_TASK`, `COMPLETE_TASK`, `ADD_EXPENSE`, `UPDATE_THEME`).
- Consequential changes require explicit user confirmation before applying mutations to IndexedDB.

---

## 5. Deployment Security Guidelines

1. **HTTPS Enforcement:** When deploying to static hosting, enforce HTTPS so that browser IndexedDB operates within a secure context.
2. **Export Encryption Awareness:** Users are advised to store exported backup JSON files in secure local storage or encrypted drives.
