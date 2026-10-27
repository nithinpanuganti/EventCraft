# EventCraft AI — GenAI-Powered Event Planning Assistant

> A full-stack event planning web application and reference architecture designed for **Weddings**, **Birthdays**, and **Community Events**, combining structured GenAI event planning, deterministic integer-cents budgeting, a phased task state machine, vendor quotation tracking, conversational plan revisions, and a modern **Liquid Glass** design system.

[![Tests](https://img.shields.io/badge/tests-96%20passed%20(13%20suites)-success?style=flat-square)](docs/TESTING_GUIDE.md)
[![TypeScript](https://img.shields.io/badge/typescript-5.7.3-blue?style=flat-square)](tsconfig.json)
[![Next.js](https://img.shields.io/badge/next.js-15.2.1%20(App%20Router)-black?style=flat-square)](next.config.js)
[![React](https://img.shields.io/badge/react-19.0.0-61dafb?style=flat-square)](package.json)
[![Prisma](https://img.shields.io/badge/prisma-6.4.1%20(12%20models)-informational?style=flat-square)](prisma/schema.prisma)
[![Tailwind CSS](https://img.shields.io/badge/tailwind-3.4.17-38bdf8?style=flat-square)](tailwind.config.js)

---

## 🌟 Core Capabilities

- **🎯 Tailored Event Archetypes:** Dedicated planning workflows for **Weddings**, **Birthdays**, and **Community Events**, capturing guest headcounts, event dates, budgets, themes, cultural traditions, dietary restrictions, and accessibility requirements.
- **🎨 Liquid Glass Design System:** Premium translucent aesthetic built on warm cream/canvas neutrals (`#faf9f6`), refined violet primary (`#7c3aed`), and indigo accents. Features specular top sheen highlights, dynamic hover elevations, responsive glass modals, and glossy interactive buttons.
- **🤖 Structured GenAI Planning Service:** Generates structured event concepts, budget allocations, phase-based milestones, vendor checklists, and run-of-show day-of itineraries in strict JSON via Google Gemini (`gemini-1.5-pro`) or OpenAI (`gpt-4o`), with domain-curated fallbacks when AI keys are absent.
- **🛡️ Deterministic Budget Engine:** All budget arithmetic, category allocations, variances, and overrun calculations are computed in TypeScript using integer minor units (cents) to avoid floating-point drift—financial math is never delegated to LLM arithmetic.
- **📅 Phased Task Roadmap & Day-Of Run Sheet:** 5-phase operational checklists (`Planning` &rarr; `Booking` &rarr; `Preparation` &rarr; `Event Day` &rarr; `Post Event`) governed by a finite state machine with depth-first search (DFS) circular dependency detection.
- **📋 Vendor Directory & Quotation Comparison:** Vendor pipeline across 11 industry categories (`Researching` &rarr; `Contacted` &rarr; `Quoted` &rarr; `Booked` &rarr; `Declined`) with side-by-side quote comparison and atomic quotation selection.
- **💬 Conversational Plan Revisions:** Natural-language modification workflow that parses user intent, classifies changes (additive vs. consequential), generates a diff proposal, and requires explicit user confirmation before mutating saved event state.
- **⚡ Client-Side State & Navigation:** Session state and event summaries are cached via React Context (`AuthContext`) after initial load to eliminate redundant `/api/auth/me` calls across route changes, complemented by Next.js link prefetching and lightweight page transitions.
- **🔒 Tenancy & Security Controls:** Application-level user isolation on all Prisma queries (`where: { userId }`), salted password hashing (`bcryptjs`), signed HTTP-only JWT cookies (`jose`), Zod input validation schemas, and standard HTTP security headers.
- **♿ Built-in Accessibility & Graceful Degradation:** Automatic `@supports not (backdrop-filter)` fallback to clean solid surfaces for unsupported browsers, `@media (prefers-reduced-motion: reduce)` compliance, and high-visibility `:focus-visible` ring indicators.

---

## 🏗️ Technology Stack

| Layer | Package / Technology | Version | Purpose in Codebase |
| :--- | :--- | :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router) | `15.2.1` | Server components, API route handlers, and static layout generation |
| **UI Library** | [React](https://react.dev/) | `19.0.0` | Declarative client components, hooks, and context |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `5.7.3` | Strict type definitions, schemas, and build validation |
| **Database & ORM** | [Prisma ORM](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/) | `6.4.1` | Relational schema with **12 models** and 3 version-controlled SQL migrations |
| **Authentication** | `bcryptjs` + `jose` | `3.0.2` / `6.0.8` | Salted password hashing (10 rounds) and signed HS256 JWT cookies |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + PostCSS | `3.4.17` / `8.4.38` | Utility-first CSS, custom translucent liquid glass tokens, and responsive layouts |
| **Icons & Typography** | [Lucide React](https://lucide.dev/) / Google Inter | `1.16.0` | Semantic interface icons and clean typography |
| **Date Utilities** | [date-fns](https://date-fns.org/) | `4.1.0` | Date manipulation and display formatting across tasks and itineraries |
| **AI Integration** | `@google/generative-ai` / `openai` | `0.24.1` / `7.44.0` | Provider adapters for Gemini & OpenAI with curated fallback templates |
| **Validation** | [Zod](https://zod.dev/) | `3.24.2` | Runtime request body validation and form schemas |
| **Testing** | [Vitest](https://vitest.dev/) | `5.0.5` | Automated test runner with native ESM configuration (`vitest.config.mts`) |
| **Linter** | ESLint 9 | `9.21.0` | Modern flat config (`eslint.config.mjs`) with `eslint-config-next` |

---

## 🎨 Liquid Glass Design System & UI Architecture

EventCraft AI features a custom-built **Liquid Glass** design system that balances high visual aesthetics with strict accessibility standards and functional readability.

### Design Tokens & Color Palette

- **Canvas & Surfaces (`surface-*`):** Warm neutral cream tones (`#faf9f6` canvas background through `#171613` high-contrast typography) replacing generic sterile grays.
- **Brand Violet (`primary-*`):** Refined deep violet (`#7c3aed` primary, `#8b5cf6` vibrant highlight) with translucent glass glow accents.
- **Indigo Accent (`accent-*`):** Subtle indigo (`#6366f1` / `#4f46e5`) for complementary callouts and secondary highlights.
- **Semantic Feedback:** Tailored `success` (`#16a34a`), `warning` (`#d97706`), `danger` (`#dc2626`), and `info` (`#0284c7`) tokens with soft glass tints.

### Core Glass Utility Classes

| Class Name | Visual Characteristics | Typical Usage |
| :--- | :--- | :--- |
| `.glass-surface` | `backdrop-blur(16px)`, `rgba(255,255,255,0.72)`, soft boundary border | Page containers, panels, and tab bodies |
| `.glass-surface-elevated`| `backdrop-blur(24px)`, `rgba(255,255,255,0.88)`, deep glass drop shadow | Modal dialogs, dropdowns, floating action sheets |
| `.glass-card` | Subtle gradient fill, translucent border, soft inner top highlight | Static metric cards, summaries, and information tiles |
| `.glass-card-interactive`| Top specular sheen line, translateY(-1.5px) hover elevation, refined glow | Clickable event cards, vendor tiles, task cards |
| `.glass-button-primary` | Glossy violet gradient, top specular edge highlight, active micro-compression | Primary calls-to-action (Create Event, Generate Plan) |
| `.glass-input` | Translucent input background, violet glow focus ring (`0 0 0 3px`), crisp contrast | Form fields, select dropdowns, search inputs, textareas |
| `.glass-sidebar` / `.glass-header` | Pinned backdrop blur (`20px`), subtle border delineations | Persistent application shell layout navigation |
| `.glass-nav-item-active` | Violet tint, crisp border, illuminated indicator bar | Active navigation links and workspace indicators |

### 14 Reusable UI Primitives (`src/components/ui`)

All primitives are exported cleanly via [`src/components/ui/index.ts`](src/components/ui/index.ts) with full TypeScript types and forwardRefs:

1. **`Button`**: Supports `primary` (liquid glass glossy gradient), `secondary`, `outline`, `ghost`, and `destructive` variants with spinning loading states.
2. **`Card`**: Flexible container with `glass`, `interactive`, and `elevated` style variants.
3. **`Input`**: Accessible text input with label, helper text, error messages, and liquid glass focus state.
4. **`Select`**: Custom glass dropdown selector supporting label, error state, and chevron indicators.
5. **`Textarea`**: Auto-resizing glass textarea for notes, instructions, and revision prompts.
6. **`Modal`**: Accessible modal dialog with elevated glass surface, animated backdrop, title, and close handlers.
7. **`Badge`**: Translucent pill tags for status (`success`, `warning`, `danger`, `info`, `primary`, `neutral`).
8. **`Tabs`**: Tab navigation bar with active indicators and pill-styled triggers.
9. **`StatCard`**: High-impact metric card displaying label, value, trend badge, and icon.
10. **`ProgressMeter`**: Accessible progress bar with percentage labels and color-coded status tracks.
11. **`ToastNotification`**: Animated feedback alerts for user actions and background status updates.
12. **`EmptyState`**: Curated illustration, friendly explanation, and action button for zero-data states.
13. **`PageHeader`**: Unified breadcrumb, title, description, and workspace action button bar.
14. **`Skeleton`**: Shimmering placeholder components for smooth loading transitions.

---

## 📁 Repository Structure

```text
.
├── docs/                          # Architecture, specifications & operational guides
│   ├── ARCHITECTURE.md            # System architecture, boundaries & data flow
│   ├── DATA_MODEL.md              # Relational schema documentation
│   ├── DEPLOYMENT_GUIDE.md        # Deployment runbook (Docker, Vercel & Neon)
│   ├── IMPLEMENTATION_PLAN.md     # Phase-by-phase development roadmap
│   ├── OPERATIONS_RUNBOOK.md      # Incident handling & key management
│   ├── PRD.md                     # Product requirements document
│   ├── QUALITY_AND_SAFETY.md      # Safety boundaries & sanitization rules
│   ├── RELEASE_CHECKLIST.md       # Pre-deployment verification gates
│   ├── SECURITY_AUDIT.md          # Security findings & mitigation strategies
│   ├── TECH_DECISIONS.md          # Architectural decision records (ADRs)
│   ├── TESTING_GUIDE.md           # Test suite catalogue & execution guide
│   └── USER_FLOWS.md              # User journeys & state transition diagrams
├── prisma/
│   ├── schema.prisma              # Domain data model (12 models)
│   └── migrations/                # 3 version-controlled SQL migrations
├── src/
│   ├── app/                       # Next.js App Router pages & API routes
│   │   ├── api/
│   │   │   ├── auth/              # /login, /logout, /me, /register
│   │   │   └── events/            # Events CRUD, /plan, /budget, /tasks, /vendors, /revisions
│   │   ├── layout.tsx             # Root layout wrapping AppShell & AuthProvider
│   │   ├── loading.tsx            # Global loading fallback skeleton
│   │   ├── page.tsx               # Modern liquid glass landing & product overview
│   │   ├── globals.css            # Tailwind directives, liquid glass tokens & animations
│   │   ├── dashboard/page.tsx     # High-level event metrics & quick actions
│   │   ├── register/page.tsx      # Elevated glass account registration page
│   │   ├── login/page.tsx         # Elevated glass account sign-in page
│   │   ├── events/                # Event listing & 5-step Creation Wizard (/events/new)
│   │   ├── planner/page.tsx       # AI Plan Viewer & Conversational Revision interface
│   │   ├── budget/page.tsx        # Financial ledger, allocation sliders & expense modal
│   │   ├── timeline/page.tsx      # Phased task checklist & Day-Of Run-of-Show
│   │   ├── vendors/page.tsx       # Vendor directory & quote comparison view
│   │   └── settings/page.tsx      # Account details & security status directives
│   ├── components/
│   │   ├── index.ts               # Master component barrel export
│   │   ├── ui/                    # 14 reusable UI primitives (+ index.ts)
│   │   ├── layout/                # AppShell, Header, Sidebar & AuthContext (+ index.ts)
│   │   ├── events/                # EventWizard & PlanViewer (+ index.ts)
│   │   ├── planner/               # ConversationalRevisionPanel (+ index.ts)
│   │   ├── budget/                # Donut charts, allocation editors & expense tables (+ index.ts)
│   │   ├── timeline/              # Task modals, phase checklists & RunSheetViewer (+ index.ts)
│   │   └── vendors/               # Vendor cards, quote tables & modal dialogs (+ index.ts)
│   ├── lib/
│   │   ├── index.ts               # Master library barrel export
│   │   ├── auth.ts                # Session management & password hashing
│   │   ├── auth.test.ts           # Authentication unit tests
│   │   ├── prisma.ts              # Singleton Prisma client instance
│   │   ├── navigation.ts          # Navigation route metadata & helpers
│   │   ├── utils.ts               # Class merger utility (clsx + tailwind-merge)
│   │   ├── data-access/           # Tenant-isolated event persistence (+ index.ts, tests)
│   │   ├── planning/              # AI providers, prompt builders & fallbacks (+ index.ts, tests)
│   │   ├── budget/                # Cents arithmetic financial engine & service (+ index.ts, tests)
│   │   ├── timeline/              # Task state machine & DAG cycle detection (+ index.ts, tests)
│   │   ├── vendors/               # Vendor and quotation services (+ index.ts, tests)
│   │   ├── revisions/             # Conversational revision proposal engine (+ index.ts, tests)
│   │   ├── validations/           # Zod validation schemas (+ index.ts, tests)
│   │   └── e2e-journey.test.ts    # Multi-service lifecycle integration journey test
│   └── types/                     # Shared domain contracts & TypeScript interfaces
├── start.bat                      # Windows launcher (checks Prisma client & .env)
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules (includes .env, *.tsbuildinfo, .turbo, .next)
├── eslint.config.mjs              # Modern flat Next.js/ESLint configuration
├── vitest.config.mts              # Vitest native ESM configuration
├── next.config.js                 # HTTP security headers & Next.js settings
├── tailwind.config.js             # Tailwind design tokens & liquid glass shadows
├── tsconfig.json                  # TypeScript config (tsBuildInfoFile inside .next/cache)
└── package.json                   # Dependencies, scripts & project metadata
```

---

## ⚡ Quickstart & Setup Guide

### 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x` recommended (verified running on Node `v22+` / `v26+`).
- **Package Manager**: `npm` (`v10+`).
- **PostgreSQL Database**: A local instance (Docker / Native PostgreSQL) or a cloud-hosted provider ([Neon](https://neon.tech), [Supabase](https://supabase.com)).

---

### 2. Configure Environment (`.env`)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your PostgreSQL connection string in `.env`:

```env
# Example local PostgreSQL URL:
DATABASE_URL="postgresql://postgres:password@localhost:5432/eventcraft_dev?schema=public"

# Example Neon / Cloud pooled connection string:
# DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# 32+ character random string for signing JWT session cookies
AUTH_SECRET="eventcraft-ai-super-secret-key-32-chars-minimum-token-protection"
NEXTAUTH_URL="http://localhost:3000"
APP_ENV="development"
APP_URL="http://localhost:3000"

# Optional AI credentials (defaults seamlessly to domain fallbacks if left blank)
AI_PROVIDER="gemini"
AI_TIMEOUT_MS="15000"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-1.5-pro"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o"
```

---

### 3. Database Initialization & Migrations

EventCraft AI manages its PostgreSQL schema with Prisma ORM across **12 domain models**:
`User`, `Event`, `EventPreferences`, `EventPlan`, `PlanRevision`, `BudgetCategory`, `Expense`, `Task`, `TaskDependency`, `Vendor`, `VendorQuote`, and `Guest`.

```bash
# Generate the Prisma Client
npm run prisma:generate

# Apply committed SQL migrations to your database
npx prisma migrate deploy
```

> [!TIP]
> If modifying `prisma/schema.prisma` in local development, run `npx prisma migrate dev --name <migration_name>` to generate new SQL migrations.

---

### 4. Running the Development Server

#### Option A: Windows Launcher (`start.bat`)
Double-click [`start.bat`](start.bat) (or execute `./start.bat` in a terminal).
- Generates the Prisma client if missing.
- Copies `.env.example` to `.env` if not present.
- Starts the development server at `http://localhost:3000`.

#### Option B: Standard Terminal Commands
```bash
npm run dev
```

> [!NOTE]
> On Windows PowerShell, if you encounter `npm : File ... cannot be loaded because running scripts is disabled on this system`, either invoke `npm.cmd run dev` or run PowerShell with `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

Visit [http://localhost:3000](http://localhost:3000). Create an account via `/register` to begin creating and managing events.

---

## 🔑 Environment Variables Reference

| Variable | Required | Description | Default / Example |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection URL | `postgresql://postgres:password@localhost:5432/eventcraft_dev?schema=public` |
| `AUTH_SECRET` | **Yes** | 32+ character secret for HS256 JWT cookies | Custom random 32+ character string |
| `NEXTAUTH_URL` | No | Base application URL | `http://localhost:3000` |
| `APP_ENV` | No | Environment mode (`development` / `production`) | `development` |
| `APP_URL` | No | Client application URL | `http://localhost:3000` |
| `AI_PROVIDER` | No | Active LLM adapter (`gemini` or `openai`) | `gemini` |
| `AI_TIMEOUT_MS` | No | Timeout for AI provider HTTP requests | `15000` (15 seconds) |
| `GEMINI_API_KEY`| No | Google Gemini API key (server-side only) | Server-side only |
| `GEMINI_MODEL` | No | Gemini model identifier | `gemini-1.5-pro` |
| `OPENAI_API_KEY`| No | OpenAI API key (server-side only) | Server-side only |
| `OPENAI_MODEL` | No | OpenAI model identifier | `gpt-4o` |

> [!NOTE]
> **Zero-Dependency Fallback:** If `GEMINI_API_KEY` and `OPENAI_API_KEY` are not set, the planning engine automatically routes requests to domain-curated templates in [`src/lib/planning/fallback-service.ts`](src/lib/planning/fallback-service.ts). The app operates reliably without failing or displaying error alerts.

---

## 🧪 Testing & Quality Assurance

EventCraft AI uses **Vitest** for automated unit and service-level integration testing. All 13 test suites execute in a Node environment with mocked database (`@/lib/prisma`) and mocked AI providers.

```bash
# Run the complete test suite once
npm test

# Run tests in watch mode
npx vitest

# Run strict TypeScript type check
npm run type-check

# Run Next.js linter
npm run lint

# Validate production build bundle
npm run build
```

*(On Windows systems with PowerShell script restrictions, replace `npm` with `npm.cmd`)*

### Verified Test Suite Breakdown (96 Tests across 13 Suites)

| Category | Test File | Tests | Focus Area |
| :--- | :--- | :---: | :--- |
| **Unit Tests** | `src/lib/budget/financial.test.ts` | 12 | Cents-precision arithmetic, variance, zero-budget division safety, overrun detection |
| **Unit Tests** | `src/lib/timeline/task-state-machine.test.ts` | 16 | Transition state machine, cyclic dependency detection (DFS), prerequisite chains |
| **Unit Tests** | `src/lib/validations/wizard.test.ts` | 15 | 5-step event wizard schema boundaries, budget limits, future date constraints |
| **Unit Tests** | `src/lib/validations/validations.test.ts` | 6 | Authentication input schemas and event partial update schemas |
| **Unit Tests** | `src/lib/auth.test.ts` | 3 | Password hashing, bcrypt verification, signed JWT token generation & verification |
| **Service Integration** | `src/lib/budget/budget-service.test.ts` | 5 | Category allocation rules, expense creation, user tenant isolation |
| **Service Integration** | `src/lib/timeline/timeline-service.test.ts` | 5 | Task CRUD, status updates, run-of-show schedule management, tenant isolation |
| **Service Integration** | `src/lib/vendors/vendor-service.test.ts` | 6 | Vendor directory CRUD, atomic quote selection, cross-event rejection |
| **Service Integration** | `src/lib/revisions/revision-service.test.ts` | 6 | Intent classification, proposal generation, consequential confirmation checks |
| **Service Integration** | `src/lib/data-access/events.test.ts` | 5 | Tenant isolation queries (`where: { userId }`), update/delete guardrails |
| **Provider Adapters** | `src/lib/planning/providers.test.ts` | 5 | Gemini & OpenAI provider adapters, timeout handling, mocked error propagation |
| **Service Integration** | `src/lib/planning/planning.test.ts` | 11 | Planning orchestration, JSON schema adherence, curated fallback activation |
| **Lifecycle Journey** | `src/lib/e2e-journey.test.ts` | 1 | Multi-service simulation: Draft &rarr; Plan &rarr; Expense &rarr; Task &rarr; Quote &rarr; Revision |
| **Total** | **13 Test Files** | **96** | **All 96 tests passing (100%)** |

> [!IMPORTANT]
> **Testing Scope Distinction:**
> - `e2e-journey.test.ts` is an **in-memory service lifecycle simulation** testing cross-module interactions with mocked database transactions and AI responses.
> - The codebase does **not** currently include browser-driven end-to-end test runners (e.g., Playwright, Cypress) or live deployment smoke tests.

---

## 🏛️ System Architecture

```mermaid
graph TD
    User([User Browser]) -->|HTTP / React 19| AppRouter[Next.js App Router]
    AppRouter --> Layout[AppShell & AuthContext]
    Layout --> Pages[Workspaces: Dashboard, Events, Planner, Budget, Timeline, Vendors, Settings]
    Pages --> API[Next.js Route Handlers /api/*]
    
    API --> Auth[Auth Layer: bcryptjs + jose JWT]
    API --> Zod[Zod Validation Schemas]
    
    API --> PlanningEngine[GenAI Planning Engine]
    PlanningEngine -->|Structured Output| GeminiAdapter[Gemini / OpenAI Provider]
    PlanningEngine -->|Graceful Fallback| FallbackEngine[Curated Domain Templates]
    
    API --> BudgetEngine[Deterministic Budget Engine]
    BudgetEngine -->|Integer Cents| FinancialMath[Variance, Allocations & Overruns]
    
    API --> TimelineEngine[Timeline & Task State Machine]
    TimelineEngine -->|DFS Cycle Detection| Dependencies[Prerequisite Chains & Run-of-Show]
    
    API --> VendorEngine[Vendor & Quote Directory]
    VendorEngine -->|Atomic Selection| Quotes[Quotation Comparison & Status Pipeline]
    
    API --> RevisionEngine[Conversational Revision Engine]
    RevisionEngine -->|Differential Proposal| PlanUpdate[Transaction Plan & Metric Mutations]
    
    API --> DataAccess[Tenant-Isolated Data Access Layer]
    DataAccess -->|where: userId| Prisma[Prisma ORM Client]
    Prisma --> Postgres[(PostgreSQL Database)]
```

---

## 📋 Development Roadmap & Milestone History

- **Phase 1: Requirements, Architecture & Specifications** — Defined the PRD, 12-model relational schema, user flows, and architectural decision records in [`docs/`](docs/).
- **Phase 2: Next.js Foundation & Design System** — Built the App Router scaffold, responsive `AppShell`, sidebar navigation, and 14 accessible UI primitives in `src/components/ui`.
- **Phase 3: PostgreSQL, Authentication & Tenancy** — Configured Prisma ORM with 12 domain models, salted bcrypt password hashing, signed HTTP-only JWT cookies, and tenant-scoped queries.
- **Phase 4: Multi-Step Event Creation Wizard** — Built a 5-step wizard (`/events/new`) supporting Weddings, Birthdays, and Community Events with debounced client-side draft persistence.
- **Phase 5: Structured GenAI Planning Engine** — Implemented provider adapters for Gemini and OpenAI with strict JSON output parsing, prompt XML encapsulation, and curated fallback templates.
- **Phase 6: Deterministic Budget Engine & Expense Tracking** — Developed cents-precision financial math, SVG donut and comparison charts, dynamic category allocation sliders, and expense tracking.
- **Phase 7: Timeline, Tasks & Day-Of Run-of-Show** — Built a 5-phase operational roadmap, a finite state machine for task transitions, DFS cycle detection, and a day-of coordinator run sheet.
- **Phase 8: Vendor Directory & Conversational Plan Revisions** — Implemented an 11-category vendor directory, side-by-side quote comparison with atomic selection, and a natural-language revision proposal engine.
- **Phase 9: Hardening, Security Controls & Documentation** — Added standard HTTP security headers, end-to-end journey tests, and operational guides ([`SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md), [`DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md), [`OPERATIONS_RUNBOOK.md`](docs/OPERATIONS_RUNBOOK.md)).
- **Phase 10: Clean Architecture, Modular Barrels & Repository Optimization** — Removed unused legacy files (`EventForm.tsx`, `.eslintrc.json`), relocated TypeScript incremental cache out of root (`.next/cache`), upgraded to `vitest.config.mts`, established modular barrel exports (`index.ts`) across all component and library domains, and verified clean builds.
- **Phase 11: Liquid Glass Design System, Micro-Interactions & UI Modernization** — Overhauled application aesthetics with a refined "Liquid Glass" design system:
  - Engineered custom glassmorphic design tokens in `tailwind.config.js` and `src/app/globals.css`.
  - Built specular top sheen utility effects, dynamic 3D hover elevations, and luminous violet active indicators.
  - Refactored all 14 reusable UI primitives (`Button`, `Card`, `Modal`, `Input`, `Select`, `Badge`, `Tabs`, etc.) with glass styling, active micro-interactions, and accessible focus outlines.
  - Modernized all 7 user workspaces (`/`, `/login`, `/register`, `/events/new`, `/planner`, `/budget`, `/timeline`, `/vendors`) with responsive glass surfaces.
  - Added non-backdrop browser fallback protections and reduced-motion accessibility accommodations.

---

## 🛡️ Security Architecture & Controls

1. **Multi-Tenant Data Isolation:** Every database operation in `src/lib/data-access/` scopes queries with `where: { userId }`. Attempting to access or mutate resources owned by another user yields `404 Not Found` without disclosing record existence.
2. **Server-Side Secret Confinement:** AI provider API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) and authentication secrets (`AUTH_SECRET`) are accessed exclusively in server-side route handlers.
3. **Prompt Injection Mitigation:** User-provided event titles, themes, and special instructions are encapsulated in structured XML delimiters within planning prompts.
4. **Deterministic Math Logic:** Budget totals, category percentages, variances, and timeline cycle checks are handled strictly in TypeScript; LLMs are never permitted to compute financial or chronological state.
5. **Cookie Security:** Authentication JWTs are set as `HttpOnly`, `SameSite=Lax`, with `Secure` enabled in production environments.
6. **HTTP Security Headers:** Configured in `next.config.js`:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## ⚠️ Operational Considerations & Limitations

- **Expense Tracking:** The application tracks budget expenses manually. It does not integrate with banking APIs, credit card processors, or Stripe.
- **Communications:** Vendor contacts and quotes are recorded for tracking and comparison. The system does not dispatch external emails or SMS notifications.
- **AI Latency & Timeouts:** Live AI generation via Gemini or OpenAI is bound by network latency. If provider requests exceed `AI_TIMEOUT_MS` (default 15s) or fail, the system falls back to curated domain templates.
- **Authentication Scope:** Implements single-factor email/password credentials with signed JWT cookies. Multi-factor authentication (MFA/2FA) and OAuth SSO (e.g., Google, GitHub) are not currently implemented.
- **Browser Automation:** Tests verify server and service logic in Node.js. Browser-driven UI testing (e.g., Playwright) is recommended before public multi-user deployment.

---

## 📄 License & Attribution

This repository is marked as `"private": true` in `package.json`. No open-source or commercial license has been formally declared. All rights are reserved by default until an explicit license is selected and committed by the project maintainers.