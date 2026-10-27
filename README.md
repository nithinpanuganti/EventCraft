# EventCraft AI — Zero-API Local-First Event Planning Application

> A fully client-contained, browser-local event planning web application designed for **Weddings**, **Birthdays**, and **Community Events**. Built with Next.js App Router, React 19, Tailwind CSS with a Liquid Glass design system, an **IndexedDB** local persistence layer (`eventcraft_local_db`), deterministic integer-cents budgeting, a phased task state machine, vendor quotation tracking, local rule-based planning, and zero external runtime API or database dependencies.

[![Tests](https://img.shields.io/badge/tests-122%20passed%20(18%20suites)-success?style=flat-square)](src/lib/storage/indexed-db.test.ts)
[![TypeScript](https://img.shields.io/badge/typescript-5.7.3-blue?style=flat-square)](tsconfig.json)
[![Next.js](https://img.shields.io/badge/next.js-15.2.1%20(App%20Router)-black?style=flat-square)](next.config.js)
[![React](https://img.shields.io/badge/react-19.0.0-61dafb?style=flat-square)](package.json)
[![Architecture](https://img.shields.io/badge/architecture-Zero--API%20%2F%20Local--First-emerald?style=flat-square)](src/lib/storage/indexed-db.ts)
[![Storage](https://img.shields.io/badge/storage-IndexedDB%20v1%20(8%20Stores)-violet?style=flat-square)](src/lib/storage/indexed-db.ts)
[![Tailwind CSS](https://img.shields.io/badge/tailwind-3.4.17-38bdf8?style=flat-square)](tailwind.config.js)

---

## 🌟 Core Architecture & Capabilities

### 📴 Zero-API Local-Only Architecture
EventCraft AI executes **100% inside your browser**. At application runtime:
- **No external network requests:** Zero `fetch()`, `axios`, or `XMLHttpRequest` calls are made to external servers or cloud providers.
- **No runtime database required:** No PostgreSQL server, Docker container, Neon, Supabase, or Prisma runtime connection is needed.
- **No cloud AI API required:** Event concept generation, task roadmaps, and natural-language planning commands run on local deterministic rule engines without Google Gemini or OpenAI dependencies.
- **Self-contained Next.js client pages:** Pages render directly from client-side state and IndexedDB with memory-backed fallbacks during Next.js SSR / static export.

### 💾 Browser Persistence Layer (`eventcraft_local_db`)
All domain data is stored locally in client IndexedDB (version 1) across **8 dedicated object stores**:
1. `profiles`: Local user profiles, display names, email handles, and salt-hashed passcodes.
2. `events`: Events with titles, dates, archetypes, headcounts, currency, and total budgets in integer cents.
3. `plans`: Generated event concepts, themes, schedules, and decor recommendations.
4. `budget_categories`: Cents-allocated budget categories with percentage tracking.
5. `expenses`: Expense records with payment statuses, due dates, and paid dates.
6. `tasks`: Phased task items with priority, due dates, completion statuses, and dependency links.
7. `vendors`: Vendor records across 11 industry categories with contact info and status pipeline.
8. `revisions`: Audit history of plan modifications, applied commands, and differential logs.

### 🔄 Backup, Portability & Data Reset
- **Portable JSON Backup Export:** In `/settings`, export your complete database (all 8 stores) into an atomic, timestamped `.json` file (`eventcraft-backup-YYYY-MM-DD.json`).
- **Schema-Validated Backup Restore:** Import backups with runtime structural validation, automatically restoring profiles, events, budgets, tasks, and vendors.
- **Local Data Reset:** One-click option to completely purge IndexedDB and restart with fresh demo seed data.

### 🤖 Local Deterministic Rule Planning Engine
- **Archetype-Tailored Blueprints:** Instantly generates complete event blueprints for Weddings, Birthdays, and Community events.
- **Exact-Cent Balanced Budget Allocation:** Distributes the total budget across archetype categories using percentage rules, with remainder cents applied to the primary category to guarantee a 100.00% balance with 0 floating-point rounding errors.
- **Phase-Organized Task Checklists:** Automatically seeds chronological tasks across 5 phases (`PLANNING` &rarr; `BOOKING` &rarr; `PREPARATION` &rarr; `EVENT_DAY` &rarr; `POST_EVENT`).
- **Hour-by-Hour Run of Show:** Generates realistic day-of itineraries with times, descriptions, and responsible roles.

### 💬 Local Command Interpreter
A client-side natural-language command interpreter parses and executes modifications without remote LLM inference:
- `add task [title]` &rarr; Creates a local task in the relevant phase.
- `complete task [title / id]` &rarr; Checks dependencies and transitions task status.
- `change date to [YYYY-MM-DD]` &rarr; Updates event date across all schedules.
- `adjust budget to [amount]` &rarr; Rebalances category allocations and recalculates variances.
- `add expense [amount] for [title]` &rarr; Logs expense against matching category.
- `show remaining budget` &rarr; Outputs instant financial reconciliation.
- `regenerate plan` &rarr; Creates a new plan revision using archetype rules.

### 🎨 Liquid Glass Design System
- Built on warm canvas neutrals (`#faf9f6`), refined violet primary (`#7c3aed`), and indigo accents.
- Specular top sheen highlights, dynamic hover elevations, responsive glass modals, and glossy interactive buttons.
- Fully accessible with `@supports not (backdrop-filter)` solid fallbacks and reduced-motion accommodations.

---

## 🏗️ Technology Stack

| Layer | Package / Technology | Version | Purpose in Codebase |
| :--- | :--- | :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router) | `15.2.1` | Static client rendering, App Router page layouts, and asset bundling |
| **UI Library** | [React](https://react.dev/) | `19.0.0` | Declarative client components, hooks, and context |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `5.7.3` | Strict type definitions, contracts, and build validation |
| **Persistence** | Native [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | `v1` | 8 browser object stores with SSR in-memory fallback |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + PostCSS | `3.4.17` / `8.4.38` | Utility-first CSS, custom translucent liquid glass tokens, and responsive layouts |
| **Icons & Typography** | [Lucide React](https://lucide.dev/) / Google Inter | `1.16.0` | Semantic interface icons and clean typography |
| **Date Utilities** | Native `Intl.DateTimeFormat` / `Date` | Built-in | Deterministic date manipulation and localized display formatting across tasks and itineraries |
| **Testing** | [Vitest](https://vitest.dev/) | `5.0.5` | Automated test runner with native ESM configuration (`vitest.config.mts`) |
| **Linter** | ESLint 9 | `9.21.0` | Modern flat config (`eslint.config.mjs`) with `eslint-config-next` |
| **Historical Schema** | [Prisma ORM](https://www.prisma.io/) | `6.4.1` | Retained as data contract documentation (inactive at runtime) |

---

## 📁 Repository Structure

```text
.
├── docs/                                  # Architectural specifications & guides
│   ├── ARCHITECTURE.md                    # System architecture & domain boundaries
│   ├── DATA_MODEL.md                      # Relational schema reference
│   ├── DEPLOYMENT_GUIDE.md                # Historical server deployment runbook
│   ├── TESTING_GUIDE.md                   # Test suite catalogue & execution guide
│   └── USER_FLOWS.md                      # User journeys & state transition diagrams
├── prisma/                                # Historical schema & migrations (inactive at runtime)
│   ├── schema.prisma                      # Domain data model documentation
│   └── migrations/                        # Version-controlled SQL migration history
├── src/
│   ├── app/                               # Next.js App Router client pages & route boundaries
│   │   ├── layout.tsx                     # Root layout wrapping AppShell & AuthProvider
│   │   ├── loading.tsx                    # Global loading skeleton
│   │   ├── page.tsx                       # Liquid glass landing & product overview
│   │   ├── globals.css                    # Tailwind directives & liquid glass tokens
│   │   ├── dashboard/page.tsx             # Local metrics & quick event actions
│   │   ├── register/page.tsx              # Create Local Profile page
│   │   ├── login/page.tsx                 # Select Local Profile switcher
│   │   ├── events/                        # Event listing & Local Creation Wizard (/events/new)
│   │   ├── planner/page.tsx               # Local Rule Plan Viewer & Command Revision panel
│   │   ├── budget/page.tsx                # Financial ledger, allocation sliders & expense modal
│   │   ├── timeline/page.tsx              # Phased task checklist & Day-Of Run-of-Show
│   │   ├── vendors/page.tsx               # Vendor directory & quote comparison view
│   │   └── settings/page.tsx              # Profile details, JSON backup export/restore, reset
│   ├── components/
│   │   ├── ui/                            # 14 reusable glass UI primitives (Button, Card, Modal, etc.)
│   │   ├── layout/                        # AppShell, Header, Sidebar & local AuthContext
│   │   ├── events/                        # EventWizard & PlanViewer
│   │   ├── planner/                       # ConversationalRevisionPanel (Local Command Interpreter)
│   │   ├── budget/                        # Financial charts, category sliders & expense modals
│   │   ├── timeline/                      # Task modals, phase checklists & RunSheetViewer
│   │   └── vendors/                       # Vendor cards, quote tables & modal dialogs
│   ├── lib/
│   │   ├── storage/                       # 100% Local Storage Layer
│   │   │   ├── types.ts                   # Domain entity contracts & enums
│   │   │   ├── indexed-db.ts              # Promise-based IndexedDB engine & JSON backup/restore
│   │   │   ├── local-repository.ts        # Domain CRUD (profiles, events, tasks, budgets, vendors)
│   │   │   ├── indexed-db.test.ts         # IndexedDB unit & backup tests
│   │   │   └── local-repository.test.ts   # Domain repository unit tests
│   │   ├── local-planning/                # Local Planning & Command Engine
│   │   │   ├── rule-engine.ts             # Deterministic event planning rule engine
│   │   │   ├── command-interpreter.ts     # Natural language command parser & executor
│   │   │   ├── rule-engine.test.ts        # Rule engine test suite
│   │   │   └── command-interpreter.test.ts# Command interpreter test suite
│   │   ├── budget/                        # Integer cents financial arithmetic & tests
│   │   ├── timeline/                      # Task state machine & DFS cycle detection & tests
│   │   ├── vendors/                       # Vendor quotation comparison logic & tests
│   │   ├── validations/                   # Zod schemas for forms and backups & tests
│   │   └── utils.ts                       # Class merger utility (clsx + tailwind-merge)
│   └── types/                             # Shared TypeScript types
├── start.bat                              # Windows launcher
├── vitest.config.mts                      # Vitest native ESM configuration
├── next.config.js                         # Next.js configuration & HTTP security headers
├── tailwind.config.js                     # Tailwind tokens & liquid glass styles
├── tsconfig.json                          # TypeScript configuration
└── package.json                           # Dependencies, scripts & metadata
```

---

## ⚡ Quickstart Guide (Local Only)

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x+` (verified on Node `v22+` / `v26+`).
- **Package Manager**: `npm` (`v10+`).
- **No Database Needed:** You do NOT need to install, start, or configure PostgreSQL, Docker, or any database.
- **No API Keys Needed:** You do NOT need Google Gemini or OpenAI API keys.

---

### 2. Start the Application

Open a terminal in the project directory:

```bash
# On Windows PowerShell or Command Prompt:
npm.cmd run dev

# On macOS / Linux:
npm run dev
```

> [!NOTE]
> If you encounter `npm : File ... cannot be loaded because running scripts is disabled on this system` on Windows PowerShell, run `npm.cmd run dev` or run PowerShell with `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

Visit **[http://localhost:3000](http://localhost:3000)** in any modern web browser (Chrome, Edge, Firefox, Brave, Safari).

---

### 3. Using EventCraft AI Locally

1. **Create a Local Profile:** Navigate to `/register` or `/login`. Enter your name, email, and an optional 4-digit passcode. Your profile is saved in browser IndexedDB.
2. **Create an Event:** Go to `/events/new`. Select an archetype (**Wedding**, **Birthday**, or **Community Event**), input your date, guest count, and total budget.
3. **Generate a Plan:** The local rule engine immediately constructs an exact-cent balanced budget, phased milestones, and an hour-by-hour day-of schedule.
4. **Interact via Natural Commands:** In `/planner`, type commands like `add task Book Photographer`, `change date to 2026-12-15`, or `adjust budget to 12000`.
5. **Manage Finances:** In `/budget`, track expenses, compare categories, and inspect real-time variance without rounding errors.
6. **Track Timeline & Day-Of Runsheet:** In `/timeline`, complete tasks adhering to prerequisite dependencies and view your event-day coordinator schedule.
7. **Manage Vendors:** In `/vendors`, record quotes and select accepted vendors.
8. **Export / Restore Backups:** In `/settings`, click **Export Backup (.json)** to download your entire workspace as a portable JSON file.

---

## 🧪 Testing & Verification

EventCraft AI features a comprehensive automated test suite running on **Vitest**. All tests execute locally without needing live network connections or database daemons.

```bash
# Run the complete test suite (122 tests across 18 test files)
npm.cmd test -- --run

# Run strict TypeScript type check
npm.cmd run type-check

# Run Next.js linter
npm.cmd run lint

# Validate full production build bundle
npm.cmd run build
```

### Verified Test Suite Breakdown (122 Tests across 18 Suites)

| Category | Test File | Tests | Focus Area |
| :--- | :--- | :---: | :--- |
| **Local Persistence** | `src/lib/storage/indexed-db.test.ts` | 4 | IndexedDB CRUD, memory fallback, JSON backup export, schema-validated import |
| **Local Repository** | `src/lib/storage/local-repository.test.ts` | 4 | Profile passcode hashing, event creation, task dependencies, vendor quotes, budget CRUD |
| **Local Planning** | `src/lib/local-planning/rule-engine.test.ts` | 2 | Wedding & Birthday deterministic planning, exact-cent balanced budget allocation |
| **Local Planning** | `src/lib/local-planning/command-interpreter.test.ts` | 5 | Natural commands (`add task`, `change date`, `adjust budget`), fallback explanations |
| **Financial Engine** | `src/lib/budget/financial.test.ts` | 12 | Integer cents arithmetic, variances, zero-budget division safety, overrun detection |
| **Timeline Engine** | `src/lib/timeline/task-state-machine.test.ts` | 16 | Transition state machine, cyclic dependency detection (DFS), prerequisite chains |
| **Validation Schemas** | `src/lib/validations/wizard.test.ts` | 15 | 5-step event wizard schema boundaries, budget limits, future date constraints |
| **Validation Schemas** | `src/lib/validations/validations.test.ts` | 6 | Input schemas and partial update guardrails |
| **Auth Fallback** | `src/lib/auth-api.test.ts` | 11 | Graceful 503 handling when database is absent, safe offline responses |
| **Authentication** | `src/lib/auth.test.ts` | 3 | Password hashing and signed JWT verification |
| **Service Integration**| `src/lib/budget/budget-service.test.ts` | 5 | Category allocation rules and expense creation |
| **Service Integration**| `src/lib/timeline/timeline-service.test.ts` | 5 | Task status transitions and schedule management |
| **Service Integration**| `src/lib/vendors/vendor-service.test.ts` | 6 | Vendor directory CRUD and atomic quotation selection |
| **Service Integration**| `src/lib/revisions/revision-service.test.ts` | 6 | Intent classification and differential proposals |
| **Service Integration**| `src/lib/data-access/events.test.ts` | 5 | Tenant-isolated query structures |
| **Provider Adapters** | `src/lib/planning/providers.test.ts` | 5 | Mocked provider adapter timeouts and error handling |
| **Planning Service** | `src/lib/planning/planning.test.ts` | 11 | Planning orchestration and curated template fallbacks |
| **Lifecycle Journey** | `src/lib/e2e-journey.test.ts` | 1 | Multi-service simulation journey test |
| **Total** | **18 Test Files** | **122** | **All 122 tests passing (100% success)** |

---

## 🔒 Security & Local Data Boundaries

1. **Local Browser Isolation:** All application data resides inside your browser's IndexedDB storage. No user data, passwords, or event plans are transmitted across the internet.
2. **Local Profile Scope:** Profiles and passcodes provide convenient workspace separation on a single shared device. They are not intended as cryptographic barriers against local machine users who have access to browser developer tools.
3. **Backup File Safety:** JSON backup files exported from `/settings` contain plain JSON representations of your events and tasks. Store downloaded backup files securely on your local storage.
4. **Deterministic Math Safety:** All financial calculations use integer minor units (cents) in pure TypeScript; budget values are never parsed or computed via floating-point rounding.

---

## ⚠️ Operational Notes

- **Browser Storage Persistence:** Clearing browser data, cache, or cookies for `localhost` may wipe IndexedDB. Use the **Export Backup (.json)** feature in `/settings` to keep regular file backups of your event plans.
- **Historical Prisma Files:** Files in `prisma/` and `src/app/api/` are preserved for documentation and historical reference. At application runtime, the browser interface communicates exclusively with client IndexedDB.
- **Single-Device Operation:** Because data is stored in the browser, data created in one browser (e.g., Chrome) is not automatically shared with another browser (e.g., Firefox) or another device unless transferred via a JSON backup file.

---

## 📄 License & Attribution

This repository is marked as `"private": true` in `package.json`. All rights reserved.
