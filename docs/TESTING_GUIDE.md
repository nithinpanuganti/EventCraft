# Testing & Quality Assurance Guide — EventCraft AI

## 1. Overview

EventCraft AI employs a multi-tiered automated testing strategy using **Vitest** for fast unit and integration tests, strict TypeScript checks (`tsc --noEmit`), and Next.js ESLint linting.

Current Suite Statistics:
- **Test Files:** 13 passed (13)
- **Total Tests:** 96 passed (96)
- **Code Coverage:** Authentication, Wizard Validations, Planning Engine, Fallback Templates, Financial Engine, Budget Service, Task State Machine, Timeline Service, Vendor Directory, Quotations, Conversational Revisions, and End-to-End Critical Journey.

---

## 2. Test Execution Commands

```bash
# Run entire test suite once
npm test

# Run tests in watch mode
npx vitest

# Run a specific test suite
npx vitest run src/lib/e2e-journey.test.ts
npx vitest run src/lib/budget/financial.test.ts
npx vitest run src/lib/timeline/task-state-machine.test.ts

# Run static type checks
npm run type-check

# Run linter
npm run lint

# Run production build validation
npm run build
```

---

## 3. Test Suites Structure

| Test File | Category | Focus Areas |
| :--- | :--- | :--- |
| `src/lib/auth.test.ts` | Security & Auth | Password hashing, bcrypt verification, signed JWT token generation, tampered token rejection |
| `src/lib/validations/wizard.test.ts` | Form Validation | Wizard 5-step validation schemas, date constraints, guest counts, budget limits |
| `src/lib/validations/validations.test.ts` | API Validation | User login/register schemas, event update schemas |
| `src/lib/data-access/events.test.ts` | Tenancy & DB | Multi-tenant event queries, cross-user read/update/delete rejection, draft persistence |
| `src/lib/planning/providers.test.ts` | AI Integration | Gemini and OpenAI provider adapters, timeout handling, error propagation |
| `src/lib/planning/planning.test.ts` | AI Orchestration | PlanningService execution, JSON schema adherence, curated fallback activation |
| `src/lib/budget/financial.test.ts` | Financial Engine | Cents arithmetic, planned vs actual variance, zero-budget division safety, overrun thresholds |
| `src/lib/budget/budget-service.test.ts` | Budget Service | Category creation ceilings, bulk allocation adjustments, expense scoping, cross-event prevention |
| `src/lib/timeline/task-state-machine.test.ts` | State Machine | Allowed status transitions, invalid transition rejection, cycle detection in DAG, blocking resolution |
| `src/lib/timeline/timeline-service.test.ts` | Timeline Service | Task CRUD, dependency verification, run-of-show schedule management, tenant isolation |
| `src/lib/vendors/vendor-service.test.ts` | Vendor & Quotes | Directory CRUD, category filtering, quote creation, atomic quote selection, cross-event quote denial |
| `src/lib/revisions/revision-service.test.ts` | Revisions | Intent classification, proposal generation, consequential confirmation checks, atomic application |
| `src/lib/e2e-journey.test.ts` | End-to-End | Complete lifecycle: Draft -> Plan -> Expense -> Task -> Quote -> Consequential Revision |

---

## 4. Mocking Guidelines

- **External AI Providers:** Always mocked in routine CI runs using Vitest `vi.mock`. Live API calls should only be executed in dedicated staging environments with valid `GEMINI_API_KEY` or `OPENAI_API_KEY`.
- **Database Access:** Unit and integration tests mock `@/lib/prisma` to verify exact query parameters and tenant scopes (`where: { userId }`).
- **No Floating-Point Arithmetic:** Financial tests assert exact integer minor units (cents) to ensure zero precision drift across platforms.
