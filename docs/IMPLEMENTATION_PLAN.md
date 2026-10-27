# Multi-Phase Implementation Plan
## Project: EventCraft AI

---

### Roadmap Overview

The development of EventCraft AI is partitioned into progressive phases to ensure high engineering quality, architectural stability, and robust testing at each stage.

```mermaid
gantt
    title EventCraft AI Multi-Phase Development Roadmap
    dateFormat  YYYY-MM-DD
    section Foundation
    Phase 1: Foundation & Architecture     :active, p1, 2026-10-26, 1d
    section Core Infrastructure
    Phase 2: Project Scaffolding & Design System : p2, after p1, 2d
    Phase 3: Database & Auth Infrastructure     : p3, after p2, 2d
    section Core Features
    Phase 4: Event Creation Wizard & State      : p4, after p3, 2d
    Phase 5: GenAI Planning Engine & Fallbacks  : p5, after p4, 3d
    Phase 6: Deterministic Budget Engine        : p6, after p5, 2d
    Phase 7: Timeline, Tasks & Day-of Schedule  : p7, after p6, 2d
    section Polish & Governance
    Phase 8: Vendor Management & Revisions      : p8, after p7, 2d
    Phase 9: End-to-End Testing & Hardening     : p9, after p8, 2d
```

---

### Phase Breakdown

#### Phase 1: Requirements, Architecture & Foundation (Current Phase)
- **Status:** **In Progress / Completing**
- **Deliverables:**
  - Workspace inspection & tech environment verification.
  - Comprehensive PRD, User Flows, Architecture, Data Model, Tech Decisions, Quality/Safety directives.
  - Initial foundation repository structure (`README.md`, `.env.example`, `.gitignore`).

#### Phase 2: Project Scaffolding & Design System
- **Focus:** Application shell, modern UI design system, layout, and component foundation.
- **Deliverables:**
  - Initialize Next.js 15+ App Router TypeScript application.
  - Configure Tailwind CSS design tokens, typography, dark/light theme palette, and Lucide icons.
  - Create reusable core UI library: Navigation bar, Modal dialogs, Stat cards, Badges, Buttons, Form inputs, Progress bars.
  - Build responsive Application Shell (Landing, Dashboard layout, Event Shell).

#### Phase 3: Database Schema & Authentication Infrastructure
- **Focus:** Data persistence layer and user tenancy security.
- **Deliverables:**
  - Prisma ORM setup with complete models (`User`, `Event`, `EventPreferences`, `EventPlan`, `BudgetCategory`, `Expense`, `Task`, `Vendor`, `VendorQuote`, `Guest`).
  - PostgreSQL schema migrations and seeding script.
  - Authentication flow (NextAuth / JWT session handlers) with password hashing.
  - Tenancy isolation middleware and base repository helpers.

#### Phase 4: Event Creation Wizard & Validation
- **Status:** **Completed**
- **Focus:** Multi-step event setup experience.
- **Deliverables:**
  - Multi-step interactive wizard supporting Weddings, Birthdays, Community Events.
  - Zod schemas for client-side and server-side event creation.
  - Intelligent handling of partial inputs and defaults.
  - Draft event creation, debounced autosave, request sequencing, and persistence in PostgreSQL.
  - Draft resume capability and dashboard integration.

#### Phase 5: GenAI Planning Engine & Resilience Service
- **Status:** **Completed**
- **Focus:** Creative AI structured planning with guaranteed fallbacks and deterministic financial/timeline validation.
- **Deliverables:**
  - Provider-agnostic planning architecture (`PlanningService`, `PlanningProvider` interface) supporting official Google Gemini (`@google/generative-ai`) and OpenAI (`openai`) SDKs.
  - Comprehensive Zod validation schemas (`GeneratedEventPlanSchema`) enforcing strict structured output contracts.
  - Deterministic TypeScript validation (`validateAndBalanceBudget`, `validateAndNormalizeDates`): integer cents precision, 100% allocation balance, zero floating-point math leaks.
  - Input context builder with untrusted text sanitization, control-character stripping, and prompt injection mitigation.
  - Domain-curated fallback templates for Weddings, Birthdays, and Community events with deterministic personalization.
  - Transactional persistence in PostgreSQL via Prisma (`EventPlan`, `BudgetCategory`, `Task`, `Event.status = "PLANNING"`).
  - Production UI integration (`PlanViewer.tsx`, `/planner` workspace, wizard review trigger) with AI vs fallback origin badges and retry controls.
  - Vitest test suite verifying provider mocking, timeouts, rate limits, budget balancing, timeline calculation, and schema validation.


#### Phase 6: Deterministic Budget Management Engine
- **Status:** **Completed**
- **Focus:** Financial calculation integrity, real-time variance, category allocation adjustments, and expense ledger.
- **Deliverables:**
  - Deterministic financial calculation engine (`src/lib/budget/financial-engine.ts`): integer minor-units (cents) arithmetic, IEEE-754 drift prevention, unallocated budget tracking, safe percentage calculations without division-by-zero, and configurable threshold overrun warnings.
  - Strict input schemas (`src/lib/budget/schemas.ts`) validating categories, bulk allocation adjustments, and expense entries.
  - Server-side data-access layer (`src/lib/budget/budget-service.ts`) enforcing tenant isolation, category belonging, transactional atomic allocation updates, and expense deletion safeguards.
  - RESTful route handlers:
    - `GET /api/events/[id]/budget` (overview metrics, categories, expenses)
    - `POST /api/events/[id]/budget` (category creation, bulk allocations, expense recording)
    - `PATCH /api/events/[id]/budget/categories/[categoryId]` & `DELETE`
    - `PATCH /api/events/[id]/budget/expenses/[expenseId]` & `DELETE`
  - Interactive UI workspace (`src/app/budget/page.tsx`):
    - Multi-event selector and key financial metric stat cards.
    - Accessible SVG Donut chart (`BudgetDonutChart.tsx`) displaying category and unallocated budget distributions.
    - Planned vs Actual horizontal bar chart (`PlannedVsActualChart.tsx`).
    - Live category allocation editor (`CategoryAllocationEditor.tsx`) preventing over-budget commits.
    - Expense logging modal (`ExpenseModal.tsx`) and ledger table (`ExpenseTable.tsx`) with edit/delete actions and status tags.
    - Overrun banners and approaching-threshold alerts (default 80%).
  - Vitest test suites: 17 dedicated tests covering precision math, overrun thresholds, allocation bounds, and cross-tenant access denial. Overall test suite has 60 green tests.


#### Phase 7: Timeline, Tasks & Day-of Schedule
- **Status:** **Completed**
- **Focus:** Phased execution, canonical task lifecycle, dependency management with cycle detection, and event-day run-of-show.
- **Deliverables:**
  - Extended Task data model (`Task` + `TaskDependency` models) in Prisma with migration `20261026010000_phase7_tasks_and_dependencies` supporting canonical lifecycle (`TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`), `completedAt`, and `order`.
  - Task State Machine (`src/lib/timeline/task-state-machine.ts`): explicit transition validation, automatic `completedAt` timestamp recording and resetting, dependency blocking evaluation, and DFS-based circular dependency prevention.
  - Server-side data-access layer (`src/lib/timeline/timeline-service.ts`): tenant isolation, task CRUD, dependency persistence, and event-day run-sheet synchronization.
  - RESTful route handlers:
    - `GET /api/events/[id]/tasks` (tasks by phase, counts, and run-sheet)
    - `POST /api/events/[id]/tasks` (task creation & run-sheet update)
    - `PATCH /api/events/[id]/tasks/[taskId]?action=status` (state machine status changes)
    - `PATCH` / `DELETE /api/events/[id]/tasks/[taskId]` (task updates & deletion)
  - Interactive UI workspace (`src/app/timeline/page.tsx`):
    - 5 Execution Phases accordion/cards (`PLANNING`, `BOOKING`, `PREPARATION`, `EVENT_DAY`, `POST_EVENT`).
    - Interactive Task Checklist with phase/status filtering, priority flags (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), overdue warnings, and dependency blocking notes.
    - Event-Day Run-of-Show table (`RunSheetViewer.tsx`) with coordinator leads, logistical notes, add/edit/delete actions, and print-ready layout.
    - Task Modal (`TaskModal.tsx`) supporting prerequisite assignments.
  - Vitest test suite: 21 dedicated tests for lifecycle transitions, cycle prevention, blocking reason synthesis, and cross-tenant task security (81 total project tests green).


#### Phase 8: Vendor Management & Conversational Revisions
- **Status:** **Completed**
- **Focus:** Vendor directory, quotation logging, side-by-side comparison, and context-preserving conversational plan revisions.
- **Deliverables:**
  - Extended Prisma schema with `PlanRevision` model and migration `20261026020000_phase8_plan_revisions` tracking versioned revision histories, user prompts, structured diff payloads, and application status.
  - Vendor data-access service (`src/lib/vendors/vendor-service.ts`) enforcing tenant isolation, category grouping, quote logging with currency and expiration dates, and atomic quote selection.
  - Conversational revision engine (`src/lib/revisions/revision-service.ts`):
    - Sanitized context builder assembling event details, approved budgets, tasks, and recent revisions.
    - Intent classification: `ADVISORY`, `LOW_RISK_EDIT`, and `CONSEQUENTIAL`.
    - Deterministic fallback parsing when AI is unconfigured or offline.
    - Transactional commit engine applying validated mutations (`UPDATE_EVENT`, `UPDATE_PREFERENCES`, `ADJUST_BUDGET_CAPS`, `ADD_TASK`, `REMOVE_TASK`) and incrementing plan version.
  - RESTful route handlers:
    - `GET` & `POST /api/events/[id]/vendors`
    - `PATCH` & `DELETE /api/events/[id]/vendors/[vendorId]`
    - `POST` & `DELETE /api/events/[id]/vendors/quotes/[quoteId]`
    - `GET` & `POST /api/events/[id]/revisions`
  - Production UI workspaces:
    - `/vendors`: Vendor directory cards, category and pipeline filtering (`RESEARCHING`, `CONTACTED`, `QUOTED`, `BOOKED`, `DECLINED`), and side-by-side Quote Comparison Table (`QuoteComparisonTable.tsx`) with category benchmarking.
    - `/planner`: Integrated `ConversationalRevisionPanel.tsx` enabling natural language plan adjustments with live preview, confirmation requirement badges, and atomic commits.
  - Vitest test suites: 11 dedicated tests covering vendor tenancy isolation, atomic quote selection, revision intent classification, and transactional plan updating (92 total project tests green).


#### Phase 9: Hardening, E2E Testing, Audits & Production Handoff
- **Focus:** Full system verification, quality audits, and deployment readiness.
- **Deliverables:**
  - Unit test suite for deterministic budget math, schema validators, and date logic.
  - Integration tests for event creation, AI fallback, and tenancy authorization.
  - Security audit: Verify zero secret leaks, IDOR protection, and input sanitization.
  - Production build verification and deployment documentation.
