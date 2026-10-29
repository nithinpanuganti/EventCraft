# Technology Decisions & Rationale
## Project: EventCraft AI

---

### 1. Architectural Foundation & Overview
- **Application Core:** 100% Browser-Local Event Planning Platform.
- **Environment Assessment:**
  - Node.js runtime: `v22+` / `v26+`
  - npm package manager: `10+` / `11+`
  - Operating System: Windows / macOS / Linux.
- **Architectural Directive:** Pure local-first client execution with zero external network dependencies, no backend servers, and native browser IndexedDB storage.

---

### 2. Technology Stack Selection Matrix

| Layer | Chosen Technology | Version / Tool | Rationale & Trade-offs |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js (App Router)** | `15.x` with React 19 & TypeScript | Industry standard React application framework. Static page optimization, client components, and layout composition. |
| **Styling & Design System** | **Tailwind CSS + Lucide Icons** | Tailwind `v3.4+` | Fast design system styling, zero runtime CSS overhead, custom Liquid Glass design tokens with specular highlights, and Lucide icons. |
| **Local Persistence** | **Browser IndexedDB** | `eventcraft_local_db` (9 Object Stores) | Zero external database configuration required. Provides high capacity, structured indexing, atomic transactions, and persistence across sessions with an in-memory fallback for testing. |
| **Data Validation** | **Zod** | Zod `v3.x` | Schema validation across forms, internal repository mutations, and JSON backup export/import files. |
| **Planning & Intelligence** | **Deterministic Rule Engine** | TypeScript Domain Rules | Zero cloud subscriptions, instant blueprint generation for Weddings, Birthdays, and Community events with exact budget balancing. |
| **Command Processing** | **Deterministic Command Interpreter** | Natural-Language Pattern Interpreter | Interprets conversational planning commands (`adjust budget`, `add task`, `update date`, `complete task`) with structured proposal diffs. |
| **Testing Framework** | **Vitest** | Vitest 5.x | High-speed ESM test runner for unit tests (deterministic budget engine, state machines, storage persistence, zero-network verification). |

---

### 3. Key Architectural Decisions (ADRs)

#### ADR-01: Browser-Local Execution Model
- **Context:** Event planning tools often force cloud subscriptions, require continuous internet connectivity, and share sensitive planning data with remote servers.
- **Decision:** Build EventCraft AI as a 100% browser-local application using IndexedDB for persistence and deterministic TypeScript engines for planning.
- **Justification:** Guarantees absolute data privacy, eliminates server hosting costs and database configuration, and provides instantaneous response times.

#### ADR-02: Deterministic Financial Computation Engine
- **Context:** Budget allocation percentages and expense line items must calculate exact sums and balances without floating-point errors.
- **Decision:** All budget arithmetic is implemented in TypeScript utility functions using integer cents minor units.
- **Justification:** Eliminates IEEE-754 floating-point drift (e.g. 19.99 * 100 = 1998.9999999999998) and guarantees 100% category balance reconciliation.

#### ADR-03: Rule-Based Planning & Conversational Interpreter
- **Context:** Users need structured planning guidance without relying on cloud service availability, rate limits, or latency.
- **Decision:** Implement domain rule engines for Weddings, Birthdays, and Community events paired with a deterministic natural-language command interpreter.
- **Justification:** Delivers instant, predictable event blueprints and conversational adjustments with 0ms network latency and zero recurring service costs.

#### ADR-04: Workspace Separation via Local Profiles
- **Context:** Multiple planners or events may share the same device and browser.
- **Decision:** Provide local profiles stored directly in IndexedDB acting as workspace scopes for events, budgets, tasks, and vendors.
- **Justification:** Enables multi-project organization while keeping all data contained within the browser storage boundary.
