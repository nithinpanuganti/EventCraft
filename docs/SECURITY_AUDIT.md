# Security Audit Report — EventCraft AI

## 1. Executive Summary

This Security Audit was conducted as part of **Phase 9: Final Hardening, End-to-End Testing, Security Audits, and Production Deployment Preparation**.
The audit analyzed the authentication architecture, multi-tenant isolation barriers, authorization scopes, injection vectors, GenAI boundaries, and HTTP security response configurations across EventCraft AI.

**Overall Security Posture:** **PRODUCTION-READY** (with specified external environment prerequisites).

---

## 2. Methodology & Scope

The audit reviewed:
1. **Authentication & Session Management:** Password hashing, JWT token generation, signed cookie lifecycle, invalidation.
2. **Tenant Isolation & Insecure Direct Object References (IDOR):** Scoping of all resources (Events, EventPreferences, EventPlans, BudgetCategories, Expenses, Tasks, TaskDependencies, Vendors, VendorQuotes, and PlanRevisions) to authenticated `userId`.
3. **Input Validation & Injection Resistance:** Server-side Zod validation schemas, sanitization of untrusted user inputs, Prisma parameterized queries.
4. **AI Application Security:** Prompt injection mitigation, credential confinement, schema-constrained structured output validation, denial of direct code/SQL execution permissions to LLMs.
5. **Transport & HTTP Security:** Security headers, HTTPS cookie flags (`HttpOnly`, `Secure`, `SameSite=lax`), and denial of arbitrary cross-origin requests.

---

## 3. Findings Matrix

| Finding ID | Severity | Category | Description | Status / Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Medium** | Authorization / IDOR | `POST /api/events/[id]/vendors/quotes/[quoteId]` allowed selecting or deleting a quotation across events if both were owned by the same user, without verifying that `quote.vendor.eventId === params.id`. | **Fixed.** Updated `selectVendorQuote` and `deleteVendorQuote` in `vendor-service.ts` to enforce `eventId` matches parent vendor event. Added automated regression test in `vendor-service.test.ts`. |
| **SEC-02** | **Low** | HTTP Headers | Missing security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) on server responses. | **Fixed.** Added comprehensive security headers in `next.config.js`. |
| **SEC-03** | **Low** | Session Security | Test suite lacked negative tests verifying that tampered/forged JWT tokens signed with untrusted keys are rejected. | **Fixed.** Added test cases in `src/lib/auth.test.ts` verifying rejection of forged tokens and expired sessions. |
| **SEC-04** | **Informational** | Data Integrity | Floating-point rounding drift risk in financial calculations. | **Verified / Mitigated.** Financial math uses integer cents minor units via `financial-engine.ts`, verified across 12 unit tests. |
| **SEC-05** | **Informational** | AI Boundaries | Risk of LLM output attempting arbitrary state manipulation. | **Verified / Mitigated.** Model prompts are strictly encapsulated; proposals are validated with Zod; consequential mutations require explicit confirmation; execution runs via deterministic Prisma transactions. |

---

## 4. Detailed Component Audits

### 4.1 Authentication & Credential Storage
- **Password Hashing:** Passwords hashed using `bcryptjs` with cost factor 10. Raw passwords are never persisted or returned in API responses.
- **Session Tokens:** Stateless, signed JWTs issued via `jose` with HS256 algorithm and a minimum 32-character secret key.
- **Cookies:** Transported via `HttpOnly`, `SameSite: "lax"`, `path: "/"`, and `secure: process.env.NODE_ENV === "production"`.
- **Enumeration Defense:** Generic error messages (`Invalid email address or password.`) returned on authentication failures.

### 4.2 Multi-Tenant Data Isolation
Every data-access query enforces ownership:
- `Event`: `where: { id: eventId, userId: session.id }`.
- `BudgetCategory`: Scoped through event ownership check.
- `Expense`: Scoped through `budgetCategory.event.userId === session.id`.
- `Task`: Scoped through `event.userId === session.id`.
- `Vendor`: Scoped through `event.userId === session.id`.
- `VendorQuote`: Scoped through `vendor.event.userId === session.id` and verified against `eventId`.
- `PlanRevision`: Scoped through `event.userId === session.id`.

### 4.3 GenAI Safety & Prompt Injection Defenses
- Untrusted user prompts are stripped of non-printable characters and quarantined within `<untrusted_user_request>` tags.
- System prompt instructs model to propose structured changes only and never generate executable code or raw SQL.
- Model proposals are parsed against `PlanRevisionProposalSchema` (Zod). Unsupported operations or malformed structures are rejected and fallback to deterministic templates.
- Consequential changes (`BUDGET_CHANGE`, `GUEST_COUNT_CHANGE`) require explicit user confirmation before committing to the database.

---

## 5. Deployment Security Requirements

1. **Strong Production Secret:** Set `AUTH_SECRET` to an unguessable 64-character hex/base64 string in production. Never deploy with default or development secrets.
2. **HTTPS Enforcement:** Reverse proxy (Cloudflare, Nginx, or AWS ALB) must enforce HTTPS so that `secure: true` session cookies are transmitted only over TLS.
3. **Database Access Controls:** PostgreSQL credentials should be restricted to the application database user with least privilege on public schema.
