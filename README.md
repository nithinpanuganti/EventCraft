# EventCraft AI

> Intelligent, local-first event planning assistant for weddings, birthdays, and community gatherings.

EventCraft AI is a modern web application designed to simplify end-to-end event planning. It combines archetype-driven planning templates, deterministic integer-cents budgeting, a phased task state machine with dependency resolution, vendor quote comparisons, and a conversational natural-language command interpreter.

The application features a **local-first architecture** powered by browser-native IndexedDB for complete privacy and instant responsiveness with zero required backend dependencies, while also maintaining an optional Next.js API and PostgreSQL persistence layer for multi-tier environments.

---

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)
[![Next.js](https://img.shields.io/badge/Next.js-15.2.1-000000?style=flat-square&logo=nextdotjs&logoColor=white)](next.config.js)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat-square&logo=react&logoColor=black)](package.json)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](tailwind.config.js)
[![Vitest](https://img.shields.io/badge/Tests-122%20passed%20(18%20suites)-success?style=flat-square&logo=vitest&logoColor=white)](vitest.config.mts)
[![Persistence](https://img.shields.io/badge/Persistence-IndexedDB%20v1%20(9%20Stores)-8A2BE2?style=flat-square)](src/lib/storage/indexed-db.ts)
[![License](https://img.shields.io/badge/License-Private-lightgrey?style=flat-square)](package.json)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Application Views and Routes](#application-views-and-routes)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts and Testing](#available-scripts-and-testing)
- [Data Storage and Privacy](#data-storage-and-privacy)
- [Current Status and Roadmap](#current-status-and-roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Overview

### The Problem
Traditional event planning often relies on fragmented tools: disconnected spreadsheets, arbitrary budget estimates prone to rounding errors, static checklists lacking dependency tracking, and unstructured vendor notes. Furthermore, many modern cloud planning platforms enforce mandatory subscriptions, account lock-in, and constant data sharing with third-party servers.

### The Solution
EventCraft AI unifies the entire planning lifecycle into a single cohesive, highly responsive interface:
- **Target Users**: Couples organizing weddings, families hosting milestone birthdays, non-profit organizers planning community fundraisers, and independent event coordinators.
- **Local-First Reliability**: Operates directly in the browser using IndexedDB. No mandatory cloud accounts, no external database dependencies to install, and zero network latency.
- **Financial Precision**: All financial calculations are tracked in exact integer cents, completely eliminating floating-point rounding errors and category reconciliation gaps.
- **Structured Execution**: Tasks follow a formal state machine organized into chronological phases, complete with directed graph dependency validation to prevent scheduling conflicts.

---

## Key Features

### 1. Archetype-Driven Event Wizard
- Guided 5-step event creation flow supporting three distinct event archetypes:
  - **Wedding**: Comprehensive vendor requirements, multi-phase ceremony and reception timelines, decor themes, and high-detail guest coordination.
  - **Birthday**: Milestone celebration themes, entertainment schedules, activity coordination, and catering tracking.
  - **Community Event**: Public gathering logistics, permits, safety protocols, volunteer management, and accessible budget breakdowns.
- Collects guest headcounts, target budgets, currency preferences, dates, and stylistic themes.

### 2. Exact-Cent Budget Allocation and Financial Ledger
- **Integer-Cents Math**: Eliminates floating-point imprecision (`0.1 + 0.2 = 0.30000000000000004`) by computing all allocations, expenditures, and variances in integer minor units (cents).
- **Proportional Archetype Splits**: Automatically divides target budgets across archetype-specific categories (e.g., Venue, Catering, Photography, Decor, Entertainment, Contingency) with exact remainder cents allocated to primary categories to guarantee a 100.00% balance.
- **Expense Tracking**: Records individual expenses with payment tracking statuses (`PENDING`, `PAID`, `OVERDUE`), linked vendors, and real-time category variance monitoring.

### 3. Phased Task Management and Day-Of Runsheet
- **5 Planning Phases**: Tasks progress logically through `PLANNING` &rarr; `BOOKING` &rarr; `PREPARATION` &rarr; `EVENT_DAY` &rarr; `POST_EVENT`.
- **Dependency Graph Validation**: Enforces prerequisite constraints using a Depth-First Search (DFS) cycle-detection algorithm to ensure tasks cannot be marked complete out of order or blocked in circular deadlocks.
- **Hour-by-Hour Run of Show**: Generates an event-day itinerary with exact time slots, lead coordinators, logistical notes, and role assignments.

### 4. Vendor Directory and Quotation Comparison
- Directory supporting 11 vendor categories (Catering, Photography, Videography, Florist, Music/DJ, Venue, Hair & Makeup, Officiant, Transportation, Rentals, Planning).
- Multi-quote comparison tracking: records proposals, calculates minimum, average, and maximum bid metrics, and supports single-click quotation acceptance.

### 5. Conversational Command Interpreter
- Client-side natural language command parser allowing users to update their plan via quick text commands without clicking through multiple menus:
  - `add task [title]` &rarr; Adds a new task to the appropriate phase.
  - `complete task [title / id]` &rarr; Checks prerequisites and marks the task as complete.
  - `change date to [YYYY-MM-DD]` &rarr; Updates the event target date and recalculates dependent milestones.
  - `adjust budget to [amount]` &rarr; Reallocates category limits and updates ledger variances.
  - `add expense [amount] for [title]` &rarr; Creates an expense item against the matching budget category.
  - `show remaining budget` &rarr; Returns an instant breakdown of allocated vs. spent funds.

### 6. Local Profile Management and Data Portability
- **Profiles**: Local user profiles with salt-hashed passcodes for convenient multi-user workspace separation on shared devices.
- **JSON Backup Export**: Download the entire application state (all 9 IndexedDB stores) into a timestamped `.json` file.
- **Schema-Validated Restore**: Import backups with runtime structural validation using Zod schemas.
- **Database Reset**: Safe one-click purge to clear local storage and start fresh.

---

## Application Views and Routes

The application features a translucent "Liquid Glass" design system built with custom Tailwind CSS utility tokens, responsive layouts, and accessible fallbacks.

| Route | View | Description |
| :--- | :--- | :--- |
| `/` | **Landing Page** | Product introduction, architectural summary, feature highlights, and quick-start actions. |
| `/dashboard` | **Event Dashboard** | Central overview displaying active event countdowns, budget health meters, and upcoming tasks. |
| `/events` | **Event Selector** | List of all planned events with quick status cards and switcher options. |
| `/events/new` | **Event Wizard** | Step-by-step creation flow for configuring archetype, dates, guests, and initial budget. |
| `/planner` | **Plan and Revisions** | Concept narrative, themes, color palettes, recommendations, and conversational revision command console. |
| `/budget` | **Budget Ledger** | Interactive category allocation sliders, expense logging modal, and variance calculation tables. |
| `/timeline` | **Timeline and Runsheet** | Phased milestone task checklists with dependency badges alongside the hour-by-hour day-of Run of Show. |
| `/vendors` | **Vendor Directory** | Contact tracking, quote comparison matrices, and vendor status progression pipeline. |
| `/settings` | **Settings and Backup** | Profile switcher, passcode configuration, atomic JSON backup export, and backup restore. |
| `/login` | **Profile Login** | Profile selection with optional passcode verification. |
| `/register` | **Profile Registration** | Quick creation of new local profiles stored securely in the browser. |

> [!TIP]
> To view the live interface, start the development server using `start.bat` or `npm run dev` and navigate to `http://localhost:3000`.

---

## System Architecture

EventCraft AI is designed around a dual-mode persistence architecture. By default, it operates as a self-contained client-side application running entirely in the user's browser, while maintaining complete schema compatibility with an optional server-side PostgreSQL backend.

```mermaid
flowchart TD
    subgraph Client ["Client Browser Runtime (React 19 / Next.js)"]
        UI["Liquid Glass UI Primitives<br/>(AppShell, Modals, Sliders, Cards)"]
        AuthCtx["AuthContext & Profile Manager"]
        
        subgraph LocalEngine ["Local Planning & Logic Engine"]
            RuleEngine["Deterministic Rule Engine<br/>(Archetype Blueprints)"]
            CmdParser["Natural Language Command Parser"]
            BudgetMath["Exact-Cent Budget Engine<br/>(Integer Cents Arithmetic)"]
            TaskGraph["Task State Machine<br/>(DFS Cycle Detection)"]
        end

        subgraph LocalStorage ["Browser Native Storage Layer"]
            IDB[("IndexedDB: eventcraft_local_db<br/>• profiles • events • event_plans<br/>• budget_categories • expenses<br/>• tasks • vendors • vendor_quotes<br/>• plan_revisions")]
            BackupUtil["JSON Backup Export / Restore<br/>(Zod Schema Validation)"]
        end
    end

    subgraph Server ["Optional Server Layer (Next.js App Router API)"]
        API["Route Handlers (/api/*)<br/>• /api/auth • /api/events"]
        PrismaORM["Prisma Client ORM"]
        Postgres[("PostgreSQL 16 Database<br/>(Relational Schema)")]
        AIAdapters["External AI Adapters<br/>(Gemini / OpenAI with Fallback)"]
    end

    UI --> AuthCtx
    UI --> LocalEngine
    LocalEngine --> IDB
    IDB <--> BackupUtil
    
    %% Optional Hybrid Path
    UI -.->|"Optional Server Mode"| API
    API --> PrismaORM
    PrismaORM --> Postgres
    API -.-> AIAdapters
```

### Architectural Principles
1. **Zero-Latency Client Operation**: All core features (wizard, budgeting, tasks, runsheet, vendor tracking, and command execution) run synchronously against local IndexedDB with zero network round trips.
2. **Deterministic Fallbacks**: In the absence of an external AI API key or network connection, the local rule engine provides complete, realistic event plans, budgets, and schedules.
3. **Data Isolation**: Profiles and event databases remain on the local device unless the user explicitly exports a JSON backup or configures a backend database.

---

## Technology Stack

### Frontend and Client Runtime
- **Framework**: [Next.js 15.2.1](https://nextjs.org/) (App Router architecture with static page generation)
- **UI Library**: [React 19.0.0](https://react.dev/) (Hooks, Context API, Client Components)
- **Styling**: [Tailwind CSS 3.4.17](https://tailwindcss.com/) with custom Liquid Glass design tokens and [PostCSS 8.4.38](https://postcss.org/)
- **Icons**: [Lucide React 1.16.0](https://lucide.dev/)
- **Class Utilities**: `clsx` and `tailwind-merge`

### Logic, Validation, and Storage
- **Local Persistence**: Native Browser [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (Database: `eventcraft_local_db`, 9 dedicated object stores) with an in-memory fallback for SSR and testing
- **Schema Validation**: [Zod 3.24.2](https://zod.dev/) for form validation, route contract checking, and backup file integrity
- **Planning Engines**: Custom deterministic rule engine and natural-language command interpreter

### Optional Backend and Database Layer
- **ORM**: [Prisma ORM 6.4.1](https://www.prisma.io/) with versioned PostgreSQL migrations
- **Database**: PostgreSQL 16 (local installation or containerized via Docker Compose)
- **Authentication**: [Jose 6.0.8](https://github.com/panva/jose) (JWT sessions) and [Bcryptjs 3.0.2](https://github.com/dcodeIO/bcrypt.js)
- **External AI Providers**: `@google/generative-ai` 0.24.1 (Google Gemini) and `openai` 7.44.0 (OpenAI GPT-4o) with automatic domain template fallbacks

### Quality and Testing
- **Test Framework**: [Vitest 5.0.5](https://vitest.dev/) with native ESM configuration
- **Type Checking**: [TypeScript 5.7.3](https://www.typescriptlang.org/) (Strict mode enabled)
- **Linting**: [ESLint 9.21.0](https://eslint.org/) with `eslint-config-next`

---

## Project Structure

```text
EventCraft AI/
├── docs/                           # Architectural specifications and guides
│   ├── ARCHITECTURE.md             # System architecture & domain boundaries
│   ├── DATA_MODEL.md               # Relational database schema reference
│   ├── DEPLOYMENT_GUIDE.md         # Server deployment runbook
│   ├── TESTING_GUIDE.md            # Test suite catalogue & execution guide
│   └── USER_FLOWS.md               # User journeys & state transition diagrams
├── prisma/                         # Relational database schema & migrations
│   ├── schema.prisma               # Prisma data model definition
│   └── migrations/                 # Version-controlled SQL migrations
├── src/
│   ├── app/                        # Next.js App Router pages and API routes
│   │   ├── layout.tsx              # Root HTML layout and context providers
│   │   ├── page.tsx                # Landing and presentation page
│   │   ├── globals.css             # Tailwind directives & glassmorphic tokens
│   │   ├── dashboard/              # Active event overview and metrics
│   │   ├── events/                 # Event list and creation wizard (/events/new)
│   │   ├── planner/                # Concept viewer & command revision console
│   │   ├── budget/                 # Category sliders and expense ledger
│   │   ├── timeline/               # Phased milestones & day-of runsheet
│   │   ├── vendors/                # Vendor directory & quotation comparisons
│   │   ├── settings/               # Profile management & JSON backup export/import
│   │   ├── login/ & register/      # Profile authentication screens
│   │   └── api/                    # Optional server API endpoints (auth, events)
│   ├── components/                 # React component library
│   │   ├── ui/                     # 14 reusable glass UI primitives (Button, Modal, etc.)
│   │   ├── layout/                 # AppShell, Header, Sidebar, AuthContext
│   │   ├── events/                 # Event creation wizard & plan display
│   │   ├── planner/                # Conversational revision command panel
│   │   ├── budget/                 # Financial cards, allocation sliders, modals
│   │   ├── timeline/               # Task checklists, dependency tags, runsheet
│   │   └── vendors/                # Vendor cards, quote tables, dialogs
│   ├── lib/                        # Core business logic and storage services
│   │   ├── storage/                # IndexedDB engine, local repository, types, tests
│   │   ├── local-planning/         # Rule engine & command interpreter
│   │   ├── budget/                 # Exact-cent financial arithmetic & tests
│   │   ├── timeline/               # Task state machine & DFS cycle detection
│   │   ├── vendors/                # Vendor quote comparison logic
│   │   ├── planning/               # Server AI provider adapters with fallbacks
│   │   ├── data-access/            # Prisma queries for optional server mode
│   │   ├── validations/            # Zod validation schemas & tests
│   │   └── auth.ts                 # JWT signing and verification utilities
│   └── types/                      # Shared TypeScript interface definitions
├── docker-compose.yml              # Local PostgreSQL 16 development container
├── start.bat                       # Automated Windows launcher script
├── vitest.config.mts               # Vitest test runner configuration
├── next.config.js                  # Next.js configuration & HTTP security headers
├── tailwind.config.js              # Tailwind styling configuration
├── tsconfig.json                   # TypeScript compiler configuration
└── package.json                    # Project dependencies, scripts, and metadata
```

---

## Local Development Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` or higher (verified on Node `v22+` and `v26+`).
- **Package Manager**: `npm` (`v10+`).
- **Operating System**: Windows, macOS, or Linux.
- **Database (Optional)**: No database is required to run EventCraft AI in local-first mode. If you wish to enable the optional PostgreSQL backend, Docker or a local PostgreSQL instance is supported.

---

### Step 1: Clone and Navigate to the Repository

```bash
git clone https://github.com/nithinpanuganti/EventCraft.git
cd EventCraft
```

---

### Step 2: Install Dependencies

```bash
# On Windows:
npm.cmd install

# On macOS / Linux:
npm install
```

---

### Step 3: Configure Environment Variables

Copy the example environment configuration:

```bash
# On Windows Command Prompt:
copy .env.example .env

# On Windows PowerShell, macOS, or Linux:
cp .env.example .env
```

> [!NOTE]
> EventCraft AI runs out of the box with the default `.env.example` settings. You do not need to provide external API keys or change database credentials to use the local planning features.

---

### Step 4: Optional PostgreSQL Database (Server Mode)

If you wish to test the optional PostgreSQL backend:

```bash
# Start a local PostgreSQL 16 container via Docker Compose
docker compose up -d

# Generate the Prisma client and apply migrations
npm run prisma:generate
npx prisma migrate dev
```

If you do not run Docker or PostgreSQL, EventCraft AI automatically activates its browser-native IndexedDB engine and operates without errors.

---

### Step 5: Start the Development Server

#### Option A: Automated One-Click Launcher (Windows)
Double-click `start.bat` in the root folder, or execute it in your terminal:

```cmd
start.bat
```

The launcher automatically checks for Node.js, installs dependencies if missing, generates the Prisma client if needed, checks database availability, and opens the server.

#### Option B: Standard npm Command (All Platforms)

```bash
# On Windows (Command Prompt or PowerShell):
npm.cmd run dev

# On macOS / Linux:
npm run dev
```

> [!NOTE]
> If you encounter `File ... npm.ps1 cannot be loaded because running scripts is disabled` on Windows PowerShell, run `npm.cmd run dev` or run PowerShell with `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

Once the dev server compiles, open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## Environment Variables

All configuration settings are managed via environment variables. Refer to [`.env.example`](.env.example) for a complete template:

| Variable | Description | Required? | Default / Example Value |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | PostgreSQL connection string for Prisma. | Optional | `postgresql://postgres:password@localhost:5432/eventcraft_dev?schema=public` |
| `AUTH_SECRET` | Secret key used to sign and verify JWT session cookies. | Optional | `eventcraft-ai-super-secret-key-32-chars-minimum-token-protection` |
| `NEXTAUTH_URL` | Canonical URL of the application. | Optional | `http://localhost:3000` |
| `APP_URL` | Base application URL for CORS and internal redirects. | Optional | `http://localhost:3000` |
| `APP_ENV` | Application environment mode (`development`, `production`). | Optional | `development` |
| `AI_PROVIDER` | External AI provider adapter (`gemini`, `openai`). | Optional | `gemini` (falls back to local rules if keys are empty) |
| `AI_TIMEOUT_MS`| Timeout limit in milliseconds for external AI network calls. | Optional | `15000` |
| `GEMINI_API_KEY`| API key for Google Gemini generative AI services. | Optional | `""` (empty enables curated template fallback) |
| `GEMINI_MODEL` | Target Google Gemini model identifier. | Optional | `gemini-1.5-pro` |
| `OPENAI_API_KEY`| API key for OpenAI GPT models. | Optional | `""` (empty enables curated template fallback) |
| `OPENAI_MODEL` | Target OpenAI model identifier. | Optional | `gpt-4o` |

---

## Available Scripts and Testing

All scripts are configured in [`package.json`](package.json) and can be executed using `npm`:

```bash
# Run the Next.js development server
npm run dev

# Execute the complete automated test suite (Vitest)
npm test

# Run TypeScript compiler type check without emitting output
npm run type-check

# Run Next.js and ESLint code quality checks
npm run lint

# Build the optimized production application bundle
npm run build

# Start the Next.js production server
npm run start

# Generate Prisma Client types from schema.prisma
npm run prisma:generate
```

### Verified Test Suite Breakdown
EventCraft AI includes a test suite covering unit math, dependency resolution algorithms, storage persistence, schema validation, and service orchestration.

**Current Test Results**: **122 passed** across **18 test files** (100% success rate):

| Category | Test Suite File | Count | Verified Behaviors |
| :--- | :--- | :---: | :--- |
| **Local Persistence** | `src/lib/storage/indexed-db.test.ts` | 4 | IndexedDB CRUD, memory fallback, JSON backup export, and schema-validated restore |
| **Local Repository** | `src/lib/storage/local-repository.test.ts` | 4 | Passcode hashing, event scoping, task dependencies, vendor quotes, and budget CRUD |
| **Rule Engine** | `src/lib/local-planning/rule-engine.test.ts` | 2 | Wedding and Birthday deterministic planning, exact-cent balanced budget allocation |
| **Command Parser** | `src/lib/local-planning/command-interpreter.test.ts` | 5 | Natural language commands (`add task`, `change date`, `adjust budget`), fallbacks |
| **Financial Engine** | `src/lib/budget/financial.test.ts` | 12 | Integer-cents arithmetic, category variance, zero-budget division safety, overruns |
| **Timeline Engine** | `src/lib/timeline/task-state-machine.test.ts` | 16 | Transition state machine, cyclic dependency detection (DFS), prerequisite chains |
| **Validation Schemas**| `src/lib/validations/wizard.test.ts` | 15 | 5-step event wizard schema boundaries, budget limits, future date constraints |
| **Validation Schemas**| `src/lib/validations/validations.test.ts` | 6 | Input schemas and partial update guardrails |
| **Auth Fallback** | `src/lib/auth-api.test.ts` | 11 | Graceful 503 handling when database is offline, safe offline response headers |
| **Authentication** | `src/lib/auth.test.ts` | 3 | Password hashing and signed JWT verification |
| **Budget Service** | `src/lib/budget/budget-service.test.ts` | 5 | Category allocation rules and expense creation |
| **Timeline Service** | `src/lib/timeline/timeline-service.test.ts` | 5 | Task status transitions and schedule management |
| **Vendor Service** | `src/lib/vendors/vendor-service.test.ts` | 6 | Vendor directory CRUD and quotation selection |
| **Revision Service** | `src/lib/revisions/revision-service.test.ts` | 6 | Intent classification and differential proposals |
| **Data Access** | `src/lib/data-access/events.test.ts` | 5 | Tenant-isolated query structures |
| **Provider Adapters**| `src/lib/planning/providers.test.ts` | 5 | Provider adapter timeouts and error handling |
| **Planning Service** | `src/lib/planning/planning.test.ts` | 11 | Planning orchestration and curated template fallbacks |
| **Journey Test** | `src/lib/e2e-journey.test.ts` | 1 | Multi-service simulation journey test |
| **Total** | **18 Suites** | **122** | **All 122 tests passing** |

---

## Data Storage and Privacy

EventCraft AI prioritizes user privacy and data ownership through clear storage boundaries:

1. **Client-Contained Storage**:
   When used in local-first mode, all event details, guest counts, budget numbers, vendor quotes, and profile records are stored directly inside your browser's IndexedDB engine (`eventcraft_local_db`). No data is transmitted to external telemetry servers or third-party cloud hosts.
2. **Object Stores**:
   Data is partitioned across 9 distinct IndexedDB object stores:
   - `profiles`: User names, emails, and salt-hashed passcodes.
   - `events`: Event titles, archetypes, dates, guest counts, and total budgets.
   - `event_plans`: Concept narratives, themes, color palettes, and day-of schedules.
   - `budget_categories`: Cents-allocated category limits and percentage weights.
   - `expenses`: Individual expense items, payment statuses, and vendor links.
   - `tasks`: Phased checklist items, priorities, due dates, and dependency arrays.
   - `vendors`: Vendor contact information, categories, and booking status.
   - `vendor_quotes`: Itemized quotes submitted by vendors.
   - `plan_revisions`: Audit history of modifications made via command revisions.
3. **Storage Reset and Browser Clearing**:
   Clearing site data or cache for `localhost` in your browser will erase local IndexedDB stores. To ensure your plans are preserved, use the **Export Backup (.json)** feature in `/settings` to save an atomic copy to your local drive.
4. **External Services**:
   Network requests to Google Gemini or OpenAI are made **only** if the corresponding API keys are explicitly configured in `.env`. If no keys are provided, planning is handled exclusively by the local deterministic rule engine.

---

## Current Status and Roadmap

### Implemented and Verified Capabilities
- [x] Multi-archetype event planning wizard (Weddings, Birthdays, Community Events).
- [x] Complete client-contained persistence with 9 IndexedDB stores and SSR in-memory fallback.
- [x] Exact-cent integer budgeting engine with guaranteed zero-rounding-error balancing.
- [x] Phased task state machine with DFS cyclic dependency prevention.
- [x] Hour-by-hour day-of Run of Show schedule generator.
- [x] Vendor directory with quotation comparison and status pipelines.
- [x] Conversational command interpreter for natural-language plan adjustments.
- [x] Atomic JSON database backup export and schema-validated restore.
- [x] Translucent Liquid Glass design system built with responsive Tailwind CSS.
- [x] Automated Windows launcher script (`start.bat`) with prerequisite verification.
- [x] Automated test suite with 122 passing tests across 18 suites.

### Planned Enhancements
- [ ] Bidirectional sync between local IndexedDB and cloud PostgreSQL instances.
- [ ] Multi-user real-time collaboration with role-based editing permissions.
- [ ] Guest list management with dietary preference tracking and RSVP status.
- [ ] Export of Day-of Run of Show to iCal (`.ics`) and printable PDF formats.
- [ ] Seating chart builder with drag-and-drop table arrangements.

---

## Contributing

Contributions to EventCraft AI are welcome. To contribute:

1. **Fork the Repository**: Create a personal fork on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Adhere to Code Standards**:
   - Write clear, typed TypeScript code.
   - Maintain the Liquid Glass design aesthetic and component hierarchy.
   - Add unit tests in `src/lib/` for any new logic or algorithms.
4. **Run Verification Commands**:
   ```bash
   npm run type-check
   npm run lint
   npm test
   npm run build
   ```
5. **Submit a Pull Request**: Provide a clear description of the problem solved and test results.

---

## License

This repository is currently marked as `"private": true` in [`package.json`](package.json). All rights are reserved. An open-source license has not yet been specified.

---

## Acknowledgments

EventCraft AI is built with modern open-source software and tools:
- [Next.js](https://nextjs.org/) by Vercel for the App Router architecture.
- [React](https://react.dev/) by Meta.
- [Tailwind CSS](https://tailwindcss.com/) by Tailwind Labs.
- [Lucide Icons](https://lucide.dev/) for UI iconography.
- [Vitest](https://vitest.dev/) for unit and integration testing.
- [Prisma ORM](https://www.prisma.io/) for type-safe database schemas.
- [Zod](https://zod.dev/) for TypeScript-first schema declaration and validation.