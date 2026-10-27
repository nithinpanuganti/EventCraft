/**
 * Task Lifecycle State Machine & Transition Rules for EventCraft AI.
 * 
 * Allowed Transitions Matrix:
 * - TODO -> IN_PROGRESS
 * - TODO -> CANCELLED
 * - IN_PROGRESS -> BLOCKED
 * - IN_PROGRESS -> COMPLETED
 * - IN_PROGRESS -> TODO
 * - BLOCKED -> TODO
 * - BLOCKED -> IN_PROGRESS
 * - BLOCKED -> CANCELLED
 * - COMPLETED -> IN_PROGRESS (Reopening completed task)
 * - CANCELLED -> TODO (Restoring cancelled task)
 */

export type CanonicalTaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";

export const ALLOWED_TRANSITIONS: Record<CanonicalTaskStatus, CanonicalTaskStatus[]> = {
  TODO: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["TODO", "BLOCKED", "COMPLETED"],
  BLOCKED: ["TODO", "IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["IN_PROGRESS"],
  CANCELLED: ["TODO"],
};

export interface StateTransitionResult {
  isValid: boolean;
  newStatus: CanonicalTaskStatus;
  completedAt: Date | null;
  errorMessage?: string;
}

/**
 * Validates a requested task status transition and determines the appropriate `completedAt` timestamp.
 */
export function validateTaskTransition(
  currentStatus: CanonicalTaskStatus,
  targetStatus: CanonicalTaskStatus
): StateTransitionResult {
  if (currentStatus === targetStatus) {
    return {
      isValid: true,
      newStatus: targetStatus,
      completedAt: targetStatus === "COMPLETED" ? new Date() : null,
    };
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      isValid: false,
      newStatus: currentStatus,
      completedAt: null,
      errorMessage: `Invalid state transition from ${currentStatus} to ${targetStatus}. Allowed: ${allowed.join(", ") || "none"}`,
    };
  }

  return {
    isValid: true,
    newStatus: targetStatus,
    completedAt: targetStatus === "COMPLETED" ? new Date() : null,
  };
}

/**
 * Checks if a task has active, uncompleted prerequisites.
 * If so, the task is considered blocked by prerequisites.
 */
export function checkDependencyBlocking(prerequisites: { id: string; title: string; status: string }[]): {
  isBlocked: boolean;
  uncompletedPrerequisites: { id: string; title: string; status: string }[];
  blockingReason?: string;
} {
  const uncompleted = prerequisites.filter((p) => p.status !== "COMPLETED");
  if (uncompleted.length === 0) {
    return {
      isBlocked: false,
      uncompletedPrerequisites: [],
    };
  }

  const titles = uncompleted.map((p) => `"${p.title}" (${p.status})`).join(", ");
  return {
    isBlocked: true,
    uncompletedPrerequisites: uncompleted,
    blockingReason: `Blocked by ${uncompleted.length} incomplete prerequisite task(s): ${titles}`,
  };
}

/**
 * Cycle detection in directed task dependency graph using Depth First Search (DFS).
 * Verifies that adding an edge `taskId -> prerequisiteId` does not create a directed cycle.
 */
export function detectDependencyCycle(
  existingDependencies: { taskId: string; prerequisiteId: string }[],
  proposedTaskId: string,
  proposedPrerequisiteId: string
): { hasCycle: boolean; cyclePath?: string[] } {
  // Self dependency check
  if (proposedTaskId === proposedPrerequisiteId) {
    return {
      hasCycle: true,
      cyclePath: [proposedTaskId, proposedPrerequisiteId],
    };
  }

  // Build adjacency list: node -> prerequisites (nodes it depends on)
  const adj = new Map<string, string[]>();
  for (const dep of existingDependencies) {
    const list = adj.get(dep.taskId) || [];
    list.push(dep.prerequisiteId);
    adj.set(dep.taskId, list);
  }

  // Add proposed edge
  const proposedList = adj.get(proposedTaskId) || [];
  proposedList.push(proposedPrerequisiteId);
  adj.set(proposedTaskId, proposedList);

  // DFS to detect cycle starting from proposedPrerequisiteId looking for a path to proposedTaskId
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(curr: string): boolean {
    visited.add(curr);
    recStack.add(curr);
    path.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        path.push(neighbor);
        return true;
      }
    }

    recStack.delete(curr);
    path.pop();
    return false;
  }

  const hasCycle = dfs(proposedTaskId);
  return {
    hasCycle,
    cyclePath: hasCycle ? [...path] : undefined,
  };
}
