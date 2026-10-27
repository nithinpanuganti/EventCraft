# User Workflows & Journey Specification
## Project: EventCraft AI

---

### 1. Primary User Journey

```mermaid
flowchart TD
    A[Landing Page] --> B{Authenticated?}
    B -- No --> C[Sign In / Sign Up]
    B -- Yes --> D[User Dashboard]
    C --> D
    
    D --> E[Click 'Create New Event']
    E --> F[Event Setup Wizard]
    
    subgraph Wizard [Event Setup Wizard]
        F --> F1[1. Event Type & Basics\nName, Type, Date, Location]
        F1 --> F2[2. Capacity & Budget\nGuest Count, Target Budget, Currency]
        F2 --> F3[3. Preferences & Style\nTheme keywords, Dietary, Accessibility]
    end
    
    F3 --> G[Click 'Generate AI Event Plan']
    G --> H{AI Generation Call}
    
    H -- Success --> I[Review Generated Plan View]
    H -- Error / Timeout --> J[Fallback Template Offer\nor Retry Prompt]
    J --> I
    
    I --> K[Interactive Plan Customization]
    
    subgraph PlanCustomization [Interactive Customization]
        K --> K1[Adjust Budget Allocations & Add Real Expenses]
        K --> K2[Reorder/Complete Timeline Tasks & Milestones]
        K --> K3[Log Vendors & Compare Quotes]
        K --> K4[Refine via Conversational Revisions]
    end
    
    K1 --> L[Save / Auto-Save Event to Database]
    K2 --> L
    K3 --> L
    K4 --> L
    L --> M[Saved Event Hub / Dashboard]
```

---

### 2. Detailed Step-by-Step Flow

#### Step 1: Landing Page & Onboarding
- **Action:** User lands on the application, views value propositions (AI-assisted themes, deterministic budgets, milestone calendars), and clicks **Get Started**.
- **Alternative:** Existing user clicks **Sign In** and is redirected to their Dashboard.

#### Step 2: Event Initialization (Create Event Wizard)
- **Step 2A: Core Info:**
  - Event Type (`WEDDING`, `BIRTHDAY`, `COMMUNITY`).
  - Event Name (e.g. "Maya & Liam's Sunset Wedding").
  - Target Date (with relative timeline awareness).
  - Location/Venue format (e.g. "Outdoor garden in Austin, TX").
- **Step 2B: Scope & Economics:**
  - Estimated Guest Count (e.g. 150).
  - Total Target Budget and Currency (e.g. $35,000 USD).
- **Step 2C: Style & Constraints:**
  - Theme/Atmosphere tags (e.g., "Boho Rustic, Minimalist, Warm Lighting").
  - Dietary requirements (e.g., "Vegan options, Nut-free").
  - Accessibility requirements (e.g., "Wheelchair accessible ramps required").
- **Tolerance for Incomplete Input:**
  - If date is unconfirmed, system defaults to a relative 6-month planning horizon.
  - If budget is unconfirmed, system recommends a median range based on event type and guest count, or flags budget as "Unallocated".

#### Step 3: Plan Generation & Review
- **Execution:** User submits wizard. Server invokes structured GenAI prompt with strict Zod schema validation.
- **Review Screen:**
  - Executive Overview: Cohesive Theme Concept, Color Palette, and Key Highlights.
  - Budget Breakdown: Visual chart of categories (Venue, Catering, Photography, etc.) with allocated amounts and percentage breakdowns.
  - Milestone Roadmap: Phased timeline (e.g., 6 Months Out &rarr; 3 Months Out &rarr; 1 Month Out &rarr; Week Of).
  - Run-of-Show: Preliminary day-of schedule.
  - Recommended Vendor Checklists.

#### Step 4: Plan Editing & Customization
- **Budget Adjustments:** User can override any category limit; system rebalances the unallocated balance in real time.
- **Task Management:** User checks off tasks, adds personal tasks, changes due dates, or flags priorities.
- **Vendor Tracking:** User logs specific vendor candidates, records quotes, and toggles status to "Booked".

#### Step 5: Save & Revisit
- Events are saved to PostgreSQL with full relational integrity.
- From the Dashboard, users can view all their events, overall progress meters (% tasks completed, % budget allocated), and open any plan.

---

### 3. Alternative & Error Paths

```mermaid
flowchart TD
    A[User Enters Wizard] --> B{Incomplete Critical Fields?}
    B -- Yes: No Event Type or Name --> C[Show Inline Validation Errors\nHighlight Missing Fields]
    B -- Yes: Unconfirmed Date/Budget --> D[Provide Intelligent Defaults\nAllow 'Draft Without Budget']
    B -- No --> E[Submit for AI Generation]
    
    E --> F{AI Service Status}
    F -- Network / Rate-limit Failure --> G[Show Graceful Error Modal]
    G --> G1[Option A: Retry AI Generation]
    G --> G2[Option B: Load Industry Standard Curated Template]
    
    F -- Schema Validation Failure --> H[Automated Server-Side Repair Prompt]
    H -- Still Fails --> G2
    
    F -- Success --> I[Display Interactive Plan]
    
    I --> J{User Requests Destructive Change\ne.g., 'Reset Plan to New Theme'}
    J --> K[Prompt Confirmation Dialog\nWarn about manual expenses preservation]
    K -- Confirmed --> L[Regenerate Concepts & Re-align Tasks]
    K -- Cancelled --> I
```

#### A. Incomplete User Inputs
- Missing non-essential fields (e.g., theme keywords) &rarr; AI fills in best practices according to event type.
- Missing budget &rarr; System creates plan with percentage allocation templates and marks monetary values as $0 until specified.

#### B. AI Generation Failures / Latency
- AI requests timeout at 15s.
- On failure, user is never stranded: the system presents a **Curated Best-Practice Template** matched to the event type (e.g., Standard Wedding 12-Month Checklist & Standard 50/50 Budget Allocation) with the option to retry AI generation at any time.

#### C. Conversational Revision Safeguards
- Conversational changes that affect budget or existing custom tasks require clear differential confirmation:
  - *"Applying this revision will reallocate your Decor budget from $4,000 to $2,500. Your 3 booked vendor entries will be preserved. Proceed? [Confirm / Cancel]"*
