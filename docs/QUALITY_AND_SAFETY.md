# Quality, Safety & Governance Requirements
## Project: EventCraft AI

---

### 1. Mandatory Quality & Safety Principles

These quality and safety directives are binding across all development and maintenance phases.

---

### 2. Detailed Principles

#### 1. Input Validation
- **Requirement:** Every input received by application handlers must be validated against a strict Zod schema before processing.
- **Rule:** Never trust raw user inputs. Sanitize strings, strip unexpected fields, enforce range limits (e.g., guest count $> 0$, budget $\ge 0$).

#### 2. Secrets & Credential Management
- **Requirement:** Zero external credentials or service keys are required or stored.
- **Rule:** Never commit secrets to version control. The repository maintains `.env.example` with standard defaults.

#### 3. Workspace Separation
- **Requirement:** Every data query and mutation (read, update, delete) must enforce workspace scoping based on the active local profile.
- **Rule:** Scoped by `profileId`. Under no circumstances should an operation mutate another profile's records.

#### 4. Deterministic Schema Integrity
- **Requirement:** All generated plan structures must adhere strictly to predefined Zod schemas.
- **Rule:** Outputs must be parsed through strict Zod schemas (`SafeParse`).
- **Zero-Code Execution:** Never execute scripts or arbitrary code strings (`eval()`, dynamic scripts, etc.).

#### 5. Prohibition of Fabricated Vendor & Pricing Claims
- **Requirement:** The planning assistant and application must never fabricate unverified commercial rates presented as verified truth.
- **Rule:** The assistant provides *estimated industry-standard benchmark ranges* and *checklist categories* (e.g., "Typical wedding catering benchmark: $60–$120/head"). It must clearly label estimates as estimates. Real vendor data is only created when entered by the user or fetched through verified directories.

#### 6. Distinction Between Estimates and Actual Ledger
- **Requirement:** Clear visual and semantic distinction in the UI between:
  - **Estimated/Allocated Budget** (planned target based on benchmarks or recommendations)
  - **Actual Expenses** (confirmed receipts, logged contracts, paid amounts)
- **Rule:** Overrun alerts must trigger when actual expenses surpass allocated thresholds.

#### 7. Explicit User Consent for Consequential Actions
- **Requirement:** Destructive operations (deleting events, resetting local database, deleting profiles) require explicit confirmation dialogs.
- **Rule:** No action that irreversibly mutates user plans should occur without confirmation.

#### 8. Graceful Degradation & Resilience
- **Requirement:** The system must function entirely offline and client-side.
- **Rule:** Users maintain immediate access to pre-built, expert-curated starter plans for Weddings, Birthdays, and Community events.

#### 9. Privacy & Minimization of Guest/Personal Data
- **Requirement:** Only collect guest data strictly necessary for event coordination (name, RSVP status, dietary requirement, accessibility need).
- **Rule:** Do not store sensitive personal information on the guest roster.
