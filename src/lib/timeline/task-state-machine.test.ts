import { describe, it, expect } from "vitest";
import {
  validateTaskTransition,
  checkDependencyBlocking,
  detectDependencyCycle,
} from "./task-state-machine";

describe("Task Lifecycle State Machine", () => {
  describe("State Transitions", () => {
    it("allows valid forward transition from TODO to IN_PROGRESS", () => {
      const result = validateTaskTransition("TODO", "IN_PROGRESS");
      expect(result.isValid).toBe(true);
      expect(result.newStatus).toBe("IN_PROGRESS");
      expect(result.completedAt).toBeNull();
    });

    it("allows completing an IN_PROGRESS task and sets completedAt", () => {
      const result = validateTaskTransition("IN_PROGRESS", "COMPLETED");
      expect(result.isValid).toBe(true);
      expect(result.newStatus).toBe("COMPLETED");
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it("rejects directly completing a TODO task without entering IN_PROGRESS first", () => {
      const result = validateTaskTransition("TODO", "COMPLETED");
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("Invalid state transition");
    });

    it("allows marking an IN_PROGRESS task as BLOCKED", () => {
      const result = validateTaskTransition("IN_PROGRESS", "BLOCKED");
      expect(result.isValid).toBe(true);
      expect(result.newStatus).toBe("BLOCKED");
    });

    it("allows resuming a BLOCKED task to IN_PROGRESS", () => {
      const result = validateTaskTransition("BLOCKED", "IN_PROGRESS");
      expect(result.isValid).toBe(true);
      expect(result.newStatus).toBe("IN_PROGRESS");
    });

    it("allows reopening a COMPLETED task back to IN_PROGRESS and clears completedAt", () => {
      const result = validateTaskTransition("COMPLETED", "IN_PROGRESS");
      expect(result.isValid).toBe(true);
      expect(result.newStatus).toBe("IN_PROGRESS");
      expect(result.completedAt).toBeNull();
    });

    it("allows restoring a CANCELLED task back to TODO", () => {
      const result = validateTaskTransition("CANCELLED", "TODO");
      expect(result.isValid).toBe(true);
      expect(result.newStatus).toBe("TODO");
    });

    it("rejects invalid transition from COMPLETED directly to BLOCKED", () => {
      const result = validateTaskTransition("COMPLETED", "BLOCKED");
      expect(result.isValid).toBe(false);
    });

    it("handles idempotent transition to the same status", () => {
      const result = validateTaskTransition("IN_PROGRESS", "IN_PROGRESS");
      expect(result.isValid).toBe(true);
    });
  });

  describe("Dependency Blocking Evaluation", () => {
    it("reports not blocked when all prerequisites are completed", () => {
      const prereqs = [
        { id: "p1", title: "Book Venue", status: "COMPLETED" },
        { id: "p2", title: "Select Caterer", status: "COMPLETED" },
      ];
      const check = checkDependencyBlocking(prereqs);
      expect(check.isBlocked).toBe(false);
      expect(check.uncompletedPrerequisites).toHaveLength(0);
    });

    it("reports blocked when any prerequisite is still in TODO or IN_PROGRESS", () => {
      const prereqs = [
        { id: "p1", title: "Book Venue", status: "COMPLETED" },
        { id: "p2", title: "Select Caterer", status: "IN_PROGRESS" },
      ];
      const check = checkDependencyBlocking(prereqs);
      expect(check.isBlocked).toBe(true);
      expect(check.uncompletedPrerequisites).toHaveLength(1);
      expect(check.blockingReason).toContain("Select Caterer");
    });

    it("reports not blocked when task has zero prerequisites", () => {
      const check = checkDependencyBlocking([]);
      expect(check.isBlocked).toBe(false);
    });
  });

  describe("Dependency Cycle Detection", () => {
    it("rejects direct self-dependency", () => {
      const result = detectDependencyCycle([], "task-1", "task-1");
      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toEqual(["task-1", "task-1"]);
    });

    it("allows valid linear dependency chain (A -> B -> C)", () => {
      // Existing: B depends on C
      const existing = [{ taskId: "B", prerequisiteId: "C" }];
      // Propose: A depends on B
      const result = detectDependencyCycle(existing, "A", "B");
      expect(result.hasCycle).toBe(false);
    });

    it("detects 2-node circular dependency (A -> B and B -> A)", () => {
      // Existing: A depends on B
      const existing = [{ taskId: "A", prerequisiteId: "B" }];
      // Propose: B depends on A
      const result = detectDependencyCycle(existing, "B", "A");
      expect(result.hasCycle).toBe(true);
    });

    it("detects multi-node transitive circular dependency (A -> B -> C -> A)", () => {
      const existing = [
        { taskId: "A", prerequisiteId: "B" },
        { taskId: "B", prerequisiteId: "C" },
      ];
      // Propose: C depends on A
      const result = detectDependencyCycle(existing, "C", "A");
      expect(result.hasCycle).toBe(true);
    });
  });
});
