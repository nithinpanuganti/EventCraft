# Conceptual Data Model & Schema Plan
## Project: EventCraft AI

---

### 1. Conceptual Entity-Relationship Model

```mermaid
erDiagram
    User ||--o{ Event : "owns / creates"
    Event ||--|| EventPreferences : "configures"
    Event ||--o| EventPlan : "generates / stores"
    Event ||--o{ BudgetCategory : "allocates"
    BudgetCategory ||--o{ Expense : "contains"
    Event ||--o{ Task : "tracks"
    Event ||--o{ Vendor : "associates"
    Vendor ||--o{ VendorQuote : "provides"
    Event ||--o{ Guest : "invites"

    User {
        string id PK
        string email UK
        string name
        string passwordHash
        datetime createdAt
        datetime updatedAt
    }

    Event {
        string id PK
        string userId FK
        string title
        enum type "WEDDING | BIRTHDAY | COMMUNITY"
        datetime eventDate
        string location
        int guestCount
        decimal totalBudget
        string currency
        enum status "DRAFT | PLANNING | ACTIVE | COMPLETED | ARCHIVED"
        datetime createdAt
        datetime updatedAt
    }

    EventPreferences {
        string id PK
        string eventId FK,UK
        string themeDescription
        string colorPalette
        string dietaryRestrictions
        string accessibilityRequirements
        json additionalNotes
    }

    EventPlan {
        string id PK
        string eventId FK,UK
        string conceptTitle
        string conceptNarrative
        json dayOfSchedule
        json aiRecommendations
        int version
        datetime generatedAt
    }

    BudgetCategory {
        string id PK
        string eventId FK
        string name
        decimal allocatedPercentage
        decimal allocatedAmount
        decimal estimatedAmount
        datetime createdAt
    }

    Expense {
        string id PK
        string budgetCategoryId FK
        string name
        decimal amount
        datetime dateIncurred
        enum paymentStatus "PENDING | PAID | OVERDUE"
        string notes
    }

    Task {
        string id PK
        string eventId FK
        string title
        string description
        enum phase "PLANNING | BOOKING | PREPARATION | EVENT_DAY | POST_EVENT"
        enum priority "LOW | MEDIUM | HIGH | CRITICAL"
        enum status "TODO | IN_PROGRESS | COMPLETED"
        datetime dueDate
        string assignedTo
    }

    Vendor {
        string id PK
        string eventId FK
        string categoryName
        string companyName
        string contactPerson
        string email
        string phone
        string websiteUrl
        enum status "RESEARCHING | CONTACTED | QUOTED | BOOKED | DECLINED"
        string notes
    }

    VendorQuote {
        string id PK
        string vendorId FK
        string description
        decimal quotedAmount
        string currency
        datetime validUntil
        boolean isSelected
        string quoteDocumentUrl
    }

    Guest {
        string id PK
        string eventId FK
        string fullName
        string email
        enum rsvpStatus "INVITED | CONFIRMED | DECLINED | TENTATIVE"
        string dietaryPreference
        boolean requiresAccessibility
    }
```

---

### 2. Entity Descriptions, Validation Rules & Ownership

#### A. `User`
- **Purpose:** Primary tenant and owner of all event assets.
- **Ownership:** Top-level root entity.
- **Key Validation:**
  - `email`: Valid RFC 5322 format, lowercase, unique.
  - Password hash: Salted bcrypt/argon2 hash (minimum 8 characters plaintext before hashing).

#### B. `Event`
- **Purpose:** Central entity representing an individual wedding, birthday, or community project.
- **Ownership:** Strictly owned by `User` (`userId` foreign key).
- **Key Validation:**
  - `title`: String, 3–120 characters, trimmed.
  - `type`: Enum (`WEDDING`, `BIRTHDAY`, `COMMUNITY`).
  - `eventDate`: Optional in draft, but must be in the future when set.
  - `guestCount`: Integer, $\ge 1$, $\le 50,000$.
  - `totalBudget`: Decimal $\ge 0.00$, stored as 2 decimal places (or integer cents in pennies).
  - `currency`: ISO 4217 code (3 chars, default: `USD`).

#### C. `EventPreferences`
- **Purpose:** Captures qualitative user choices, aesthetic direction, dietary constraints, and accessibility requirements.
- **Ownership:** $1:1$ with `Event`. Cascades on event deletion.
- **Key Validation:**
  - `dietaryRestrictions`: Sanitized string / comma-separated tags (e.g. `Vegetarian, Halal, Nut Allergy`).
  - `accessibilityRequirements`: Sanitized string (e.g. `Wheelchair ramp, ASL interpreter`).

#### D. `EventPlan`
- **Purpose:** Persists the AI-generated structured plan and revision versions.
- **Ownership:** $1:1$ with `Event`.
- **Key Validation:**
  - `dayOfSchedule`: Validated JSON array of `{ time: string, activity: string, lead: string, notes?: string }`.
  - `version`: Integer starting at 1, incremented upon conversational plan revisions.

#### E. `BudgetCategory` & `Expense`
- **Purpose:** Relational ledger for financial management.
- **Ownership:** `BudgetCategory` belongs to `Event`; `Expense` belongs to `BudgetCategory`.
- **Integrity Rules:**
  - Sum of `allocatedPercentage` across categories should ideally equal $100\%$ ($1.000$).
  - `allocatedAmount = (allocatedPercentage / 100) * Event.totalBudget`.
  - Category `SpentAmount = SUM(Expense.amount)`.
  - `Overrun = SpentAmount > allocatedAmount`.

#### F. `Task`
- **Purpose:** Actionable checklist item mapped to chronological event phases.
- **Ownership:** Belongs to `Event`.
- **Key Validation:**
  - `title`: String, 2–150 characters.
  - `phase`: Enum (`PLANNING`, `BOOKING`, `PREPARATION`, `EVENT_DAY`, `POST_EVENT`).
  - `status`: Enum (`TODO`, `IN_PROGRESS`, `COMPLETED`).
  - `priority`: Enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

#### G. `Vendor` & `VendorQuote`
- **Purpose:** Vendor directory and quotation comparison engine.
- **Ownership:** `Vendor` belongs to `Event`; `VendorQuote` belongs to `Vendor`.
- **Integrity Rules:**
  - `isSelected` quote must be unique or maximum 1 active selection per vendor.
  - No synthetic data: vendor records only created via user explicit input or saved search.

#### H. `Guest`
- **Purpose:** Headcount and dietary/accessibility requirement tally.
- **Ownership:** Belongs to `Event`.
- **Key Validation:**
  - `fullName`: String, 1–100 characters.
  - `rsvpStatus`: Enum (`INVITED`, `CONFIRMED`, `DECLINED`, `TENTATIVE`).

---

### 3. Planned Prisma Schema Implementation Blueprint
*(To be scaffolded and migrated in Phase 2/3 with direct PostgreSQL connection)*

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum EventType {
  WEDDING
  BIRTHDAY
  COMMUNITY
}

enum EventStatus {
  DRAFT
  PLANNING
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum TaskPhase {
  PLANNING
  BOOKING
  PREPARATION
  EVENT_DAY
  POST_EVENT
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETED
}

enum VendorStatus {
  RESEARCHING
  CONTACTED
  QUOTED
  BOOKED
  DECLINED
}

enum PaymentStatus {
  PENDING
  PAID
  OVERDUE
}
```
