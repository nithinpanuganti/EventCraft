import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getEventTasks,
  createEventTask,
  updateTaskStatus,
  deleteEventTask,
} from "./timeline-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    taskDependency: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    eventPlan: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

describe("Timeline Service Security & Tenant Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const USER_A = "user-111";
  const USER_B = "user-222";
  const EVENT_A = "event-aaa";

  it("denies access when User B attempts to read User A's tasks", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

    const result = await getEventTasks(EVENT_A, USER_B);

    expect(result).toBeNull();
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EVENT_A, userId: USER_B },
      })
    );
  });

  it("prevents User B from creating a task on User A's event", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

    await expect(
      createEventTask(EVENT_A, USER_B, {
        title: "Malicious Task",
      })
    ).rejects.toThrow(/access denied/i);
  });

  it("prevents updating the status of a task belonging to another user's event", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue({
      id: "task-1",
      eventId: EVENT_A,
      title: "Catering",
      description: null,
      phase: "PLANNING",
      priority: "MEDIUM",
      status: "TODO",
      dueDate: null,
      completedAt: null,
      order: 0,
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      event: { userId: USER_A },
    } as unknown as Awaited<ReturnType<typeof prisma.task.findUnique>>);

    await expect(
      updateTaskStatus("task-1", USER_B, "IN_PROGRESS")
    ).rejects.toThrow(/access denied/i);
  });

  it("prevents deleting a task belonging to another user's event", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue({
      id: "task-1",
      eventId: EVENT_A,
      title: "Photography",
      event: { userId: USER_A },
    } as unknown as Awaited<ReturnType<typeof prisma.task.findUnique>>);

    await expect(
      deleteEventTask("task-1", USER_B)
    ).rejects.toThrow(/access denied/i);
  });

  it("rejects invalid status transitions through the state machine", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue({
      id: "task-1",
      eventId: EVENT_A,
      title: "Venue booking",
      description: null,
      phase: "PLANNING",
      priority: "MEDIUM",
      status: "TODO",
      dueDate: null,
      completedAt: null,
      order: 0,
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      event: { userId: USER_A },
    } as unknown as Awaited<ReturnType<typeof prisma.task.findUnique>>);

    // TODO directly to COMPLETED is invalid (must be IN_PROGRESS first)
    await expect(
      updateTaskStatus("task-1", USER_A, "COMPLETED")
    ).rejects.toThrow(/Invalid state transition/i);
  });
});
