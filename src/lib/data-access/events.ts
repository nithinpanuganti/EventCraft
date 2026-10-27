import { prisma } from "@/lib/prisma";
import { CreateEventInput, UpdateEventInput } from "@/lib/validations";
import { Prisma } from "@prisma/client";

/**
 * Lists all events owned by the authenticated user.
 * Cross-user events are excluded via tenancy isolation: `where: { userId }`.
 */
export async function listUserEvents(userId: string) {
  return prisma.event.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      preferences: true,
      plan: {
        select: { id: true, conceptTitle: true, version: true },
      },
      _count: {
        select: {
          budgetCategories: true,
          tasks: true,
          vendors: true,
          guests: true,
        },
      },
    },
  });
}

/**
 * Retrieves a single event by ID, strictly scoped by the owner's userId.
 * Returns null if the event does not exist OR belongs to another tenant.
 */
export async function getEventById(eventId: string, userId: string) {
  return prisma.event.findFirst({
    where: {
      id: eventId,
      userId,
    },
    include: {
      preferences: true,
      plan: true,
      budgetCategories: {
        include: {
          expenses: true,
        },
      },
      tasks: {
        orderBy: { dueDate: "asc" },
      },
      vendors: {
        include: {
          quotes: true,
        },
      },
      guests: true,
    },
  });
}

/**
 * Creates a new event for the authenticated user along with initial preferences.
 * Uses a Prisma transaction for atomic insertion.
 */
export async function createEvent(input: CreateEventInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        userId,
        title: input.title,
        type: input.type,
        eventDate: input.eventDate ? new Date(input.eventDate) : null,
        location: input.location,
        guestCount: input.guestCount,
        totalBudget: new Prisma.Decimal(input.totalBudget),
        currency: input.currency,
        status: "DRAFT",
      },
    });

    if (
      input.themePreferences ||
      input.culturalPreferences ||
      input.dietaryRestrictions ||
      input.accessibilityRequirements ||
      input.specialInstructions
    ) {
      const notesObj: Record<string, string> = {};
      if (input.culturalPreferences) notesObj.cultural = input.culturalPreferences;
      if (input.specialInstructions) notesObj.notes = input.specialInstructions;

      await tx.eventPreferences.create({
        data: {
          eventId: event.id,
          themeDescription: input.themePreferences,
          dietaryRestrictions: input.dietaryRestrictions,
          accessibilityRequirements: input.accessibilityRequirements,
          additionalNotes: Object.keys(notesObj).length > 0 ? notesObj : Prisma.JsonNull,
        },
      });
    }

    return event;
  });
}

/**
 * Updates an existing event, guaranteeing tenancy with `where: { id, userId }`.
 * Rejects or fails if the event is owned by another user.
 */
export async function updateEvent(eventId: string, userId: string, input: UpdateEventInput) {
  // First verify existence and tenancy
  const existing = await prisma.event.findFirst({
    where: { id: eventId, userId },
  });

  if (!existing) {
    return null; // Not found or not owned
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id: eventId },
      data: {
        title: input.title,
        type: input.type,
        eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
        location: input.location,
        guestCount: input.guestCount,
        totalBudget: input.totalBudget !== undefined ? new Prisma.Decimal(input.totalBudget) : undefined,
        currency: input.currency,
        status: input.status,
      },
    });

    if (
      input.themePreferences !== undefined ||
      input.culturalPreferences !== undefined ||
      input.dietaryRestrictions !== undefined ||
      input.accessibilityRequirements !== undefined ||
      input.specialInstructions !== undefined
    ) {
      const notesObj: Record<string, string> = {};
      if (input.culturalPreferences) notesObj.cultural = input.culturalPreferences;
      if (input.specialInstructions) notesObj.notes = input.specialInstructions;

      await tx.eventPreferences.upsert({
        where: { eventId },
        create: {
          eventId,
          themeDescription: input.themePreferences,
          dietaryRestrictions: input.dietaryRestrictions,
          accessibilityRequirements: input.accessibilityRequirements,
          additionalNotes: Object.keys(notesObj).length > 0 ? notesObj : Prisma.JsonNull,
        },
        update: {
          themeDescription: input.themePreferences,
          dietaryRestrictions: input.dietaryRestrictions,
          accessibilityRequirements: input.accessibilityRequirements,
          additionalNotes: Object.keys(notesObj).length > 0 ? notesObj : undefined,
        },
      });
    }

    return updated;
  });
}

/**
 * Deletes an event, cascading to all preferences, plans, budgets, tasks, vendors, and guests.
 * Guarantees tenancy with `where: { id: eventId, userId }`.
 */
export async function deleteEvent(eventId: string, userId: string): Promise<boolean> {
  const existing = await prisma.event.findFirst({
    where: { id: eventId, userId },
  });

  if (!existing) {
    return false;
  }

  await prisma.event.delete({
    where: { id: eventId },
  });

  return true;
}

/**
 * Aggregates dashboard statistics for the authenticated user.
 */
export async function getUserDashboardMetrics(userId: string) {
  const [totalEvents, upcomingEvents, totalBudgetAgg] = await Promise.all([
    prisma.event.count({ where: { userId } }),
    prisma.event.count({
      where: {
        userId,
        eventDate: {
          gte: new Date(),
        },
      },
    }),
    prisma.event.aggregate({
      where: { userId },
      _sum: {
        totalBudget: true,
      },
    }),
  ]);

  const totalBudget = totalBudgetAgg._sum.totalBudget
    ? Number(totalBudgetAgg._sum.totalBudget)
    : 0;

  return {
    totalEvents,
    upcomingEvents,
    totalBudget,
  };
}

/**
 * Persists an AI-generated or fallback plan into PostgreSQL.
 * Atomically updates EventPlan, BudgetCategories, and Tasks inside a Prisma transaction,
 * updating Event.status to 'PLANNING'.
 */
export async function saveEventPlan(
  eventId: string,
  userId: string,
  plan: import("@/lib/planning/schema").GeneratedEventPlan
) {
  // Tenancy check: Ensure event belongs to authenticated user
  const existing = await prisma.event.findFirst({
    where: { id: eventId, userId },
    include: { plan: true },
  });

  if (!existing) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    // 1. Upsert the EventPlan record
    const nextVersion = existing.plan ? existing.plan.version + 1 : 1;

    const eventPlan = await tx.eventPlan.upsert({
      where: { eventId },
      create: {
        eventId,
        conceptTitle: plan.summary.conceptTitle,
        conceptNarrative: plan.summary.conceptNarrative,
        dayOfSchedule: plan.dayOfSchedule as unknown as Prisma.InputJsonValue,
        aiRecommendations: {
          summary: plan.summary,
          theme: plan.theme,
          budget: plan.budget,
          milestones: plan.milestones,
          tasks: plan.tasks,
          vendors: plan.vendors,
          risksAndAlternatives: plan.risksAndAlternatives,
          metadata: plan.metadata,
        } as unknown as Prisma.InputJsonValue,
        version: nextVersion,
      },
      update: {
        conceptTitle: plan.summary.conceptTitle,
        conceptNarrative: plan.summary.conceptNarrative,
        dayOfSchedule: plan.dayOfSchedule as unknown as Prisma.InputJsonValue,
        aiRecommendations: {
          summary: plan.summary,
          theme: plan.theme,
          budget: plan.budget,
          milestones: plan.milestones,
          tasks: plan.tasks,
          vendors: plan.vendors,
          risksAndAlternatives: plan.risksAndAlternatives,
          metadata: plan.metadata,
        } as unknown as Prisma.InputJsonValue,
        version: nextVersion,
      },
    });

    // 2. Synchronize initial budget categories
    // Clear previously generated categories with 0 actual expenses to prevent duplicates on regeneration
    await tx.budgetCategory.deleteMany({
      where: {
        eventId,
        expenses: { none: {} },
      },
    });

    for (const cat of plan.budget.categories) {
      await tx.budgetCategory.create({
        data: {
          eventId,
          name: cat.categoryName,
          allocatedPercentage: new Prisma.Decimal(cat.allocatedPercentage),
          allocatedAmount: new Prisma.Decimal(cat.allocatedAmount),
          estimatedAmount: new Prisma.Decimal(cat.estimatedAmount),
        },
      });
    }

    // 3. Synchronize actionable tasks
    await tx.task.deleteMany({
      where: {
        eventId,
        status: "TODO",
      },
    });

    for (const t of plan.tasks) {
      await tx.task.create({
        data: {
          eventId,
          title: t.title,
          description: t.description,
          phase: t.phase,
          priority: t.priority,
          status: "TODO",
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          assignedTo: t.category,
        },
      });
    }

    // 4. Advance event status from DRAFT to PLANNING
    await tx.event.update({
      where: { id: eventId },
      data: {
        status: "PLANNING",
      },
    });

    return eventPlan;
  });
}

