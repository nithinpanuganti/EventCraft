import { prisma } from "@/lib/prisma";
import { Prisma, TaskPhase, TaskPriority, TaskStatus } from "@prisma/client";
import {
  validateTaskTransition,
  detectDependencyCycle,
  checkDependencyBlocking,
  CanonicalTaskStatus,
} from "./task-state-machine";

export interface TaskWithDependencies {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  phase: TaskPhase;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | null;
  completedAt: Date | null;
  order: number;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  prerequisites: { id: string; title: string; status: TaskStatus }[];
  isBlockedByPrerequisites: boolean;
  blockingReason?: string;
}

/**
 * Retrieves all tasks for an event, ordered by phase and order/dueDate.
 * Resolves dependency blocking status and guarantees tenant isolation.
 */
export async function getEventTasks(
  eventId: string,
  userId: string
): Promise<{
  tasks: TaskWithDependencies[];
  phaseCounts: Record<TaskPhase, number>;
  statusCounts: Record<TaskStatus, number>;
} | null> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
    select: { id: true },
  });

  if (!event) return null;

  const rawTasks = await prisma.task.findMany({
    where: { eventId },
    include: {
      dependencies: {
        include: {
          prerequisite: {
            select: { id: true, title: true, status: true },
          },
        },
      },
    },
    orderBy: [{ phase: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  const phaseCounts: Record<TaskPhase, number> = {
    PLANNING: 0,
    BOOKING: 0,
    PREPARATION: 0,
    EVENT_DAY: 0,
    POST_EVENT: 0,
  };

  const statusCounts: Record<TaskStatus, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    BLOCKED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  const tasks: TaskWithDependencies[] = rawTasks.map((t) => {
    phaseCounts[t.phase] = (phaseCounts[t.phase] || 0) + 1;
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;

    const prereqs = t.dependencies.map((d) => d.prerequisite);
    const blockingCheck = checkDependencyBlocking(prereqs);

    return {
      id: t.id,
      eventId: t.eventId,
      title: t.title,
      description: t.description,
      phase: t.phase,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
      order: t.order,
      assignedTo: t.assignedTo,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      prerequisites: prereqs,
      isBlockedByPrerequisites: blockingCheck.isBlocked,
      blockingReason: blockingCheck.blockingReason,
    };
  });

  return {
    tasks,
    phaseCounts,
    statusCounts,
  };
}

/**
 * Creates a new task under an event with optional prerequisites and cyclic dependency verification.
 */
export async function createEventTask(
  eventId: string,
  userId: string,
  data: {
    title: string;
    description?: string | null;
    phase?: TaskPhase;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: Date | null;
    assignedTo?: string | null;
    order?: number;
    prerequisiteTaskIds?: string[];
  }
) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify event ownership
    const event = await tx.event.findFirst({
      where: { id: eventId, userId },
      select: { id: true },
    });

    if (!event) {
      throw new Error("Event not found or access denied.");
    }

    // 2. If prerequisites are supplied, verify they all belong to the same event
    const prereqIds = data.prerequisiteTaskIds || [];
    if (prereqIds.length > 0) {
      const validPrereqs = await tx.task.findMany({
        where: { id: { in: prereqIds }, eventId },
        select: { id: true },
      });

      if (validPrereqs.length !== prereqIds.length) {
        throw new Error("One or more prerequisite tasks do not belong to this event.");
      }
    }

    // 3. Create task record
    const task = await tx.task.create({
      data: {
        eventId,
        title: data.title.trim(),
        description: data.description ? data.description.trim() : null,
        phase: data.phase || "PLANNING",
        priority: data.priority || "MEDIUM",
        status: data.status || "TODO",
        dueDate: data.dueDate || null,
        assignedTo: data.assignedTo ? data.assignedTo.trim() : null,
        order: data.order ?? 0,
        completedAt: data.status === "COMPLETED" ? new Date() : null,
      },
    });

    // 4. Create dependency relations
    if (prereqIds.length > 0) {
      for (const pId of prereqIds) {
        await tx.taskDependency.create({
          data: {
            taskId: task.id,
            prerequisiteId: pId,
          },
        });
      }
    }

    return task;
  });
}

/**
 * Updates task status enforcing the canonical state transition matrix and setting `completedAt`.
 */
export async function updateTaskStatus(
  taskId: string,
  userId: string,
  targetStatus: CanonicalTaskStatus
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        event: { select: { userId: true } },
      },
    });

    if (!task || task.event.userId !== userId) {
      throw new Error("Task not found or access denied.");
    }

    const currentStatus = task.status as CanonicalTaskStatus;
    const transition = validateTaskTransition(currentStatus, targetStatus);

    if (!transition.isValid) {
      throw new Error(transition.errorMessage || "Invalid state transition.");
    }

    return tx.task.update({
      where: { id: taskId },
      data: {
        status: targetStatus,
        completedAt: transition.completedAt,
      },
    });
  });
}

/**
 * Updates full task details, including title, phase, priority, due date, assignee, and prerequisites.
 */
export async function updateEventTask(
  taskId: string,
  userId: string,
  data: {
    title?: string;
    description?: string | null;
    phase?: TaskPhase;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: Date | null;
    assignedTo?: string | null;
    order?: number;
    prerequisiteTaskIds?: string[];
  }
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        event: { select: { userId: true, id: true } },
      },
    });

    if (!task || task.event.userId !== userId) {
      throw new Error("Task not found or access denied.");
    }

    const eventId = task.eventId;

    // Check status transition if provided
    let completedAt = task.completedAt;
    if (data.status && data.status !== task.status) {
      const transition = validateTaskTransition(
        task.status as CanonicalTaskStatus,
        data.status as CanonicalTaskStatus
      );
      if (!transition.isValid) {
        throw new Error(transition.errorMessage || "Invalid state transition.");
      }
      completedAt = transition.completedAt;
    }

    // Handle prerequisites update if provided
    if (data.prerequisiteTaskIds !== undefined) {
      const newPrereqIds = data.prerequisiteTaskIds;

      // Verify all belong to event
      if (newPrereqIds.length > 0) {
        const validPrereqs = await tx.task.findMany({
          where: { id: { in: newPrereqIds }, eventId },
          select: { id: true },
        });

        if (validPrereqs.length !== newPrereqIds.length) {
          throw new Error("One or more prerequisite tasks do not belong to this event.");
        }
      }

      // Check self dependency
      if (newPrereqIds.includes(taskId)) {
        throw new Error("A task cannot depend on itself.");
      }

      // Check cycle detection against existing dependencies in this event
      const allEventDeps = await tx.taskDependency.findMany({
        where: {
          task: { eventId },
          NOT: { taskId }, // exclude current task's old dependencies
        },
        select: { taskId: true, prerequisiteId: true },
      });

      for (const pId of newPrereqIds) {
        const cycleCheck = detectDependencyCycle(allEventDeps, taskId, pId);
        if (cycleCheck.hasCycle) {
          throw new Error("Cannot add prerequisite: this would create a circular dependency loop.");
        }
      }

      // Replace dependency relations
      await tx.taskDependency.deleteMany({
        where: { taskId },
      });

      for (const pId of newPrereqIds) {
        await tx.taskDependency.create({
          data: {
            taskId,
            prerequisiteId: pId,
          },
        });
      }
    }

    return tx.task.update({
      where: { id: taskId },
      data: {
        title: data.title !== undefined ? data.title.trim() : undefined,
        description: data.description !== undefined ? (data.description ? data.description.trim() : null) : undefined,
        phase: data.phase,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate !== undefined ? data.dueDate : undefined,
        completedAt,
        assignedTo: data.assignedTo !== undefined ? (data.assignedTo ? data.assignedTo.trim() : null) : undefined,
        order: data.order !== undefined ? data.order : undefined,
      },
    });
  });
}

/**
 * Deletes a task and cascades dependency removals.
 */
export async function deleteEventTask(taskId: string, userId: string): Promise<boolean> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { event: { select: { userId: true } } },
  });

  if (!task || task.event.userId !== userId) {
    throw new Error("Task not found or access denied.");
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  return true;
}

/**
 * Retrieves the event-day run-of-show schedule from EventPlan.
 */
export async function getEventDaySchedule(eventId: string, userId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
    include: { plan: true },
  });

  if (!event) return null;

  const rawSchedule = event.plan?.dayOfSchedule;
  const schedule = Array.isArray(rawSchedule) ? rawSchedule : [];

  return {
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.eventDate,
    schedule,
  };
}

/**
 * Updates the event-day run-of-show schedule inside the EventPlan record.
 */
export async function updateEventDaySchedule(
  eventId: string,
  userId: string,
  schedule: { time: string; activity: string; lead?: string; notes?: string }[]
) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: { id: eventId, userId },
      include: { plan: true },
    });

    if (!event) {
      throw new Error("Event not found or access denied.");
    }

    if (!event.plan) {
      // Create empty plan if not yet generated
      return tx.eventPlan.create({
        data: {
          eventId,
          conceptTitle: `${event.title} Plan`,
          conceptNarrative: "Organized event schedule.",
          dayOfSchedule: schedule as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return tx.eventPlan.update({
      where: { eventId },
      data: {
        dayOfSchedule: schedule as unknown as Prisma.InputJsonValue,
      },
    });
  });
}
