# Product Requirements Document (PRD)
## Project: GenAI-Powered Event Planning Assistant (EventCraft AI)

---

### 1. Document Overview
- **Product Name:** EventCraft AI (Event Planning Assistant)
- **Document Version:** 1.0.0 (Phase 1 Foundation)
- **Target Audience:** Engineering, Product, Design, QA
- **Status:** Approved for Foundation Architecture

---

### 2. Problem Statement
Organizing events—specifically **Weddings**, **Birthdays**, and **Community Events**—is inherently fragmented, stressful, and error-prone. Organizers must balance tight budgets, complex timelines, dozens of vendor categories, guest preferences, and dietary restrictions across ad-hoc spreadsheets, chat apps, and sticky notes.

Existing generic AI chatbots offer unstructured, conversational text responses that cannot directly compute deterministic balance ledgers, track task completion states, prevent budget overruns, or provide reproducible milestone schedules.

**The Solution:** A GenAI-powered event planning assistant that blends **structured creative AI planning** (thematic concepts, custom schedules, personalized recommendations) with **deterministic business logic** (strict budget arithmetic, date calculations, relational task tracking, and vendor quote comparisons).

---

### 3. Target Users & User Personas

| Persona | Role & Event Profile | Key Pain Points | Core Goals |
| :--- | :--- | :--- | :--- |
| **P1: Maya & Liam** | **Couples Planning a Wedding**<br>Guest count: 120–250<br>Budget: $25k–$75k | Complex vendor coordination, hidden costs, overwhelming task lists, emotional stress. | Cohesive theme recommendation, precise category budget breakdowns, event-day run sheet. |
| **P2: Alex Chen** | **Parent Planning a Milestone Birthday**<br>Guest count: 30–60<br>Budget: $1.5k–$5k | Limited free time, coordinating activities for kids and adults, dietary variety. | Creative theme ideas, affordable vendor checklist, automated timeline leading up to the party. |
| **P3: Priya Patel** | **Community Association Lead**<br>Guest count: 150–500+<br>Budget: $3k–$15k | Strict budget governance, multi-stakeholder approval, permits, accessibility guidelines. | Milestone-based accountability, clear expense vs budget tracking, community checklist. |

---

### 4. Main Use Cases

1. **UC-01: Create & Initialize Event Plan**
   - User inputs core parameters: Event Type (Wedding/Birthday/Community), Name, Date, Location, Guest Count, Budget, Preferences/Theme, and Special Requirements (dietary, accessibility).
   - System accepts incomplete inputs gracefully, providing safe defaults or prompting for critical missing fields.
2. **UC-02: Structured AI Plan Generation**
   - System sends sanitized event parameters to the AI Planning Service with a strict schema constraint.
   - AI generates: cohesive theme narrative, personalized recommendations, recommended budget allocation percentage per category, structured preparation milestones, vendor checklists, and an event-day schedule.
3. **UC-03: Deterministic Budget Tracking & Overrun Protection**
   - User reviews estimated allocations, records real quotes or expenses, updates actual costs.
   - System recalculates totals, balances, and highlights budget-overrun warnings strictly via deterministic TypeScript calculations (no LLM arithmetic).
4. **UC-04: Timeline & Task Execution**
   - Tasks are organized into chronological milestones (e.g., 6 months before, 1 month before, week of, day-of).
   - User marks tasks as pending, in-progress, or completed; assigns roles and due dates.
5. **UC-05: Vendor Management & Quote Comparison**
   - User manages vendor entries by category (Catering, Venue, Photography, Music, Decor, etc.).
   - Quotes and contact info are saved; status moves from Inquiry &rarr; Quoted &rarr; Booked.
   - **Safety:** No simulated or fabricated vendor pricing presented as verified fact.
6. **UC-06: Conversational Context-Preserving Revisions**
   - User requests modifications (e.g., "Cut budget by 15%", "Increase guests to 180", "Make theme rustic minimalist").
   - System applies targeted changes while maintaining user-confirmed overrides and requires confirmation before consequential overwrites.

---

### 5. Detailed Requirements

#### 5.1 Functional Requirements (FR)

- **FR-1 [Event Setup & Wizard]:**
  - Support event types: `WEDDING`, `BIRTHDAY`, `COMMUNITY`.
  - Capture event details: Title, description, date, location/venue type, guest count, total budget, currency code (e.g. USD, EUR, GBP, INR), theme preferences, and dietary/accessibility constraints.
  - Multi-step validation using Zod schemas with fallback defaults for optional attributes.
- **FR-2 [AI Planning Engine]:**
  - Generate structured JSON event plan validated via Zod.
  - Plan components: Theme/Concept, Category Allocations (%), Key Milestones, Vendor Category Recommendations, Day-Of Schedule, and Actionable Checklists.
  - Deterministic post-processor maps percentage allocations to exact monetary amounts based on user's target budget.
- **FR-3 [Budget Engine]:**
  - Track `EstimatedAmount`, `ActualAmount`, `AllocatedAmount`, and `PaidAmount`.
  - Automatic computation: `TotalSpent = Sum(ActualAmount)`, `RemainingBalance = TotalBudget - TotalSpent`.
  - Overrun flags triggered when `TotalSpent > TotalBudget` or category `ActualAmount > EstimatedAmount`.
- **FR-4 [Task & Timeline Engine]:**
  - Task entities with status (`TODO`, `IN_PROGRESS`, `COMPLETED`), priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), target due date, and phase (`PLANNING`, `BOOKING`, `PREPARATION`, `EVENT_DAY`, `POST_EVENT`).
  - Day-of itinerary with time blocks (start time, end time, activity, lead coordinator).
- **FR-5 [Vendor Tracking]:**
  - Track vendor category, name, contact (email, phone, website), status (`RESEARCHING`, `CONTACTED`, `QUOTED`, `BOOKED`, `DECLINED`), and notes.
  - Manage multiple quotes per category for side-by-side comparison.
- **FR-6 [Persistence & Multi-Event Management]:**
  - Store and retrieve user events, preferences, plans, tasks, budget items, and vendor lists in PostgreSQL via Prisma ORM.
  - Support drafting, saving, updating, and archiving events.
- **FR-7 [Conversational Plan Refinement]:**
  - Support revision prompts that yield localized plan adjustments without wiping user-entered manual expenses or custom tasks.

#### 5.2 Non-Functional Requirements (NFR)

- **NFR-1 [Security & Auth]:**
  - Secure session handling.
  - Authorization check on every single event query and mutation (enforce tenancy: `where: { id: eventId, userId: session.user.id }`).
  - Zero external service keys required; all planning logic runs locally in the browser.
- **NFR-2 [Accuracy & Determinism]:**
  - Financial math performed strictly with fixed-precision integers/cents or Decimal types in code, never by the LLM.
  - Date offsets (milestones relative to event date) calculated via standard date utilities.
- **NFR-3 [Reliability & Resilience]:**
  - AI timeouts handled with graceful fallback (e.g., standard template-based starter plan when AI provider is unreachable).
  - Validation failures on AI output trigger one automatic schema repair retry before reporting a descriptive error to the user.
- **NFR-4 [Performance]:**
  - Page load under 1.5 seconds for dashboard and event view.
  - Structured AI plan generation streamed or completed within < 12 seconds with clear interactive progress states.
- **NFR-5 [Accessibility & UX]:**
  - WCAG 2.1 AA compliant colors, keyboard navigability, mobile-responsive layout.

---

### 6. Scope Boundaries (MVP vs Future Enhancements)

| Capability | Phase 1 Foundation / MVP Scope | Future Phases / Post-MVP |
| :--- | :--- | :--- |
| **Event Types** | Wedding, Birthday, Community Event | Corporate Retreats, Concerts, Conferences |
| **AI Generation** | Structured theme, budget %, milestones, day-of schedule | Multimodal vision analysis for mood boards, live speech input |
| **Budget** | Deterministic category allocation, expense tracker, overrun alerts | Multi-currency live FX conversion, receipt OCR parsing |
| **Vendors** | User-managed vendor directory, quote logger, status workflow | Marketplace integration, automated RFP email dispatch, direct contract signing |
| **Guests** | Conceptual model & basic headcount/dietary requirement tally | Full RSVP management portal, seat mapping, automated SMS invites |
| **Collaboration**| Single authenticated user per event | Multi-user real-time co-planning, role-based permissions (Co-host, Planner, Viewer)|

---

### 7. Acceptance Criteria

1. **AC-01:** System allows specifying all required event parameters (Type, Name, Date, Location, Guest Count, Budget, Currency, Preferences).
2. **AC-02:** AI generation produces structured, schema-compliant JSON comprising concepts, budget allocations, milestones, and vendor checklists.
3. **AC-03:** All monetary balances, category totals, and budget variances are computed deterministically without reliance on LLM arithmetic.
4. **AC-04:** AI generation failures, malformed JSON, and timeouts are caught safely, offering fallback template generation and actionable user feedback.
5. **AC-05:** Every resource access is guarded by user authentication and tenancy boundaries.
6. **AC-06:** No synthetic vendor data, reviews, or unverified prices are presented as true market facts.
