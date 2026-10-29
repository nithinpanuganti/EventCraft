# Testing & Quality Assurance Guide — EventCraft AI

## 1. Overview

EventCraft AI employs an automated testing strategy using **Vitest** for unit and integration testing, strict TypeScript checking (`tsc --noEmit`), and Next.js ESLint linting.

Current Suite Statistics:
- **Test Files:** 9 passed (9)
- **Total Tests:** 76 passed (76)
- **Code Coverage:** Local Storage & IndexedDB, Browser-Only Architecture & Zero-Network Verification, Local Repository, Deterministic Rule Engine, Command Interpreter, Financial Engine, Task State Machine, Wizard Validation, and General Schema Validation.

---

## 2. Test Execution Commands

```bash
# Run entire test suite once
npm test

# Run tests in watch mode
npx vitest

# Run a specific test suite
npx vitest run src/lib/budget/financial.test.ts
npx vitest run src/lib/timeline/task-state-machine.test.ts
npx vitest run src/lib/storage/browser-architecture.test.ts

# Run static type checks
npm run type-check

# Run linter
npm run lint

# Run production build validation
npm run build
```

---

## 3. Test Suites Structure

| Test File | Category | Tests | Focus Areas |
| :--- | :--- | :---: | :--- |
| `src/lib/storage/browser-architecture.test.ts` | Architecture Verification | 5 | Zero network calls verification, profile switching/deletion, event cascade cleanup, corrupted backup rejection, navigation route integrity |
| `src/lib/storage/indexed-db.test.ts` | IndexedDB Engine | 4 | IndexedDB CRUD, memory fallback, versioned backup export, and schema-validated restore |
| `src/lib/storage/local-repository.test.ts` | Local Repository | 4 | Passcode hashing, event scoping, task dependencies, vendor quotes, and budget CRUD |
| `src/lib/local-planning/rule-engine.test.ts` | Planning Rule Engine | 5 | Wedding, Birthday, and Community blueprints, exact-cent balanced budget allocation, zero-budget division safety |
| `src/lib/local-planning/command-interpreter.test.ts` | Command Interpreter | 9 | Natural language commands (`add task`, `complete task`, `change date`, `adjust budget`, `add expense`, `regenerate plan`, `update theme`, `show remaining budget`), unsupported command guidance |
| `src/lib/budget/financial.test.ts` | Financial Engine | 12 | Integer-cents arithmetic, category variance, zero-budget division safety, overrun thresholds |
| `src/lib/timeline/task-state-machine.test.ts` | State Machine | 16 | Transition state machine, cyclic dependency detection (DFS), prerequisite chains |
| `src/lib/validations/wizard.test.ts` | Wizard Validation | 15 | 5-step event wizard schema boundaries, budget limits, future date constraints |
| `src/lib/validations/validations.test.ts` | General Validation | 6 | Profile creation schemas, event update schemas, partial update guardrails |
| **Total** | **9 Suites** | **76** | **All 76 tests passing (100% success rate)** |

---

## 4. Verification Guidelines

- **Zero Network Execution:** Tests assert that global fetch and network requests are never invoked during local planning operations.
- **No Floating-Point Arithmetic:** Financial tests assert exact integer minor units (cents) to guarantee zero precision drift.
- **State Machine Integrity:** Tests verify cycle detection using depth-first search (DFS) to prevent task dependency deadlock.
