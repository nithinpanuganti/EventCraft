# Technology Decisions & Rationale
## Project: EventCraft AI

---

### 1. Workspace Inspection Findings
- **Initial Workspace State:** Completely empty (`d:\New folder (2)`).
- **Environment Assessment:**
  - Node.js runtime: `v26.7.0`
  - npm package manager: `11.19.0` (accessible via `cmd /c npm` under Windows PowerShell execution policy).
  - Operating System: Windows 10/11 x64.
- **Decision:** Establish a clean, modern, production-grade foundation aligned with the recommended stack.

---

### 2. Technology Stack Selection Matrix

| Layer | Chosen Technology | Version / Tool | Rationale & Trade-offs |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js (App Router)** | `15.x` with React 19 & TypeScript | Industry standard for full-stack React apps. App Router provides native Server Components, streaming SSR, optimized layouts, and collocated API route handlers. Eliminates need for separate frontend/backend repositories. |
| **Styling & Design System** | **Tailwind CSS + Lucide Icons** | Tailwind `v3.4+` | Rapid design system styling, zero runtime overhead, responsive utility classes, consistent spacing and theme tokens. Lucide provides accessible, clean icons. |
| **Backend API** | **Next.js Server-Side Route Handlers** | Next.js API Routes / Server Actions | Keeps architecture monolithic-modular without premature microservices. Type-sharing between client and server eliminates API schema drift. |
| **Database & ORM** | **PostgreSQL + Prisma ORM** | PostgreSQL 16+ / Prisma 5.x | Relational integrity is mandatory for financial ledger (categories, expenses, quotes) and user tenancy. Prisma gives end-to-end type safety, auto-generated migrations, and robust query composition. |
| **Data Validation** | **Zod** | Zod `v3.x` | Universal schema validation used across client form validation, server endpoint payload validation, and LLM structured output parsing. |
| **AI Integration** | **Provider-Agnostic LLM Adapter** | Gemini API (Google GenAI SDK) / OpenAI API compatible | Supports structured JSON outputs via schema definition (`response_schema` or tool calling). Encapsulated behind an interface adapter to prevent vendor lock-in. |
| **Testing Framework** | **Vitest / Jest + React Testing Library** | Vitest | Extremely fast Vite-based test runner for unit tests (deterministic budget engine, date offsets, schema parsers) and component unit tests. |

---

### 3. Key Architectural Decisions (ADRs)

#### ADR-01: Single Monorepo/Integrated Next.js Application
- **Context:** The application needs a rich responsive UI and high-integrity backend API endpoints.
- **Decision:** Build as an integrated Next.js TypeScript application rather than splitting into separate backend (NestJS/Express) and frontend (Vite/CRA) repos.
- **Justification:** Avoids cross-origin CORS overhead, duplicates zero TypeScript interfaces, simplifies deployment, and accelerates Phase 2 through Phase 9 development.

#### ADR-02: Deterministic Financial Computation Engine
- **Context:** Budget allocation percentages and expense line items must calculate exact sums and balances without rounding errors or LLM hallucinations.
- **Decision:** All budget arithmetic is implemented in TypeScript utility functions using integer cents or fixed 2-decimal arithmetic.
- **Justification:** LLMs are prone to arithmetic drift and hallucination. Financial accuracy requires 100% deterministic code.

#### ADR-03: Provider-Agnostic AI Adapter with Fallback Template Engine
- **Context:** AI generation may suffer latency, network drops, rate limits, or schema mismatches.
- **Decision:** The backend interacts with an `AIEngineService` interface that handles prompt injection prevention, validates responses with Zod, and falls back to pre-authored expert curated templates if the AI service fails.
- **Justification:** Guarantees that users are never blocked from completing an event plan, even during upstream AI service interruptions.

#### ADR-04: Strict Authorization & Tenancy Isolation
- **Context:** Event data (guest lists, budgets, personal dates) is sensitive user data.
- **Decision:** Every API endpoint verifies user session identity, and all Prisma queries explicitly require `where: { userId: session.user.id }`.
- **Justification:** Prevents unauthorized cross-tenant data access (IDOR vulnerabilities).
