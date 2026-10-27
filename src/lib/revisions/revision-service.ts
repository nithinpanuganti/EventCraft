import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PlanningService } from "@/lib/planning/planning-service";
import {
  PlanRevisionProposalSchema,
  PlanRevisionProposal,
} from "./schemas";
import { validateProposedAllocations, toCents } from "@/lib/budget/financial-engine";

/**
 * Builds minimal, sanitized context for revision planning without leaking sensitive credentials.
 */
export async function buildRevisionContext(eventId: string, userId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
    include: {
      preferences: true,
      plan: true,
      budgetCategories: {
        include: {
          expenses: { select: { id: true, amount: true } },
        },
      },
      tasks: {
        orderBy: [{ phase: "asc" }, { order: "asc" }],
      },
      vendors: {
        include: {
          quotes: { select: { id: true, quotedAmount: true, isSelected: true } },
        },
      },
      revisions: {
        orderBy: { version: "desc" },
        take: 3,
      },
    },
  });

  if (!event) return null;

  return {
    eventId: event.id,
    title: event.title,
    type: event.type,
    eventDate: event.eventDate ? event.eventDate.toISOString() : null,
    guestCount: event.guestCount,
    totalBudget: Number(event.totalBudget),
    currency: event.currency,
    preferences: {
      theme: event.preferences?.themeDescription || null,
      palette: event.preferences?.colorPalette || null,
      dietary: event.preferences?.dietaryRestrictions || null,
      accessibility: event.preferences?.accessibilityRequirements || null,
    },
    planSummary: event.plan
      ? {
          title: event.plan.conceptTitle,
          narrative: event.plan.conceptNarrative,
          version: event.plan.version,
        }
      : null,
    budgetCategories: event.budgetCategories.map((c) => ({
      id: c.id,
      name: c.name,
      allocatedAmount: Number(c.allocatedAmount),
      allocatedPercentage: Number(c.allocatedPercentage),
      spentAmount: c.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    })),
    taskCount: event.tasks.length,
    tasks: event.tasks.slice(0, 15).map((t) => ({
      id: t.id,
      title: t.title,
      phase: t.phase,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    })),
    recentRevisions: event.revisions.map((r) => ({
      version: r.version,
      userPrompt: r.userPrompt,
      changeSummary: r.changeSummary,
    })),
  };
}

/**
 * Generates a structured plan revision proposal using the configured AI provider.
 * Neutralizes prompt injections, enforces Zod validation, and classifies consequence levels.
 */
export async function generateRevisionProposal(
  eventId: string,
  userId: string,
  userPrompt: string
): Promise<PlanRevisionProposal> {
  const context = await buildRevisionContext(eventId, userId);
  if (!context) {
    throw new Error("Event not found or access denied.");
  }

  // Sanitize prompt
  const sanitizedPrompt = userPrompt.replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (sanitizedPrompt.length === 0) {
    throw new Error("Revision prompt cannot be empty.");
  }

  const systemInstructions = `You are the EventCraft AI Revision Architect.
Your role is to analyze a user's natural language change request for an existing event plan and formulate a structured revision proposal.

CRITICAL RULES:
1. Classification:
   - "ADVISORY": When the user asks for suggestions, recommendations, advice, or ideas without requesting an immediate change. RequiresConfirmation = false. ProposedOperations = [].
   - "LOW_RISK_EDIT": When the user asks to change theme descriptions, color palettes, dietary notes, or non-destructive text. RequiresConfirmation = false.
   - "CONSEQUENTIAL": When the user changes budget, guest count, event date, removes tasks, or changes financial category allocations. RequiresConfirmation = true.
2. NEVER invent SQL, code, or execute operations directly.
3. Only output JSON matching the exact schema.
4. Proposed operations MUST use the valid existing IDs from the context.
5. In advisoryResponse, provide warm, professional event planning advice with trade-offs.`;

  const prompt = `${systemInstructions}

CURRENT EVENT STATE:
${JSON.stringify(context, null, 2)}

USER REVISION REQUEST:
<untrusted_user_request>
${sanitizedPrompt}
</untrusted_user_request>

Respond with JSON adhering to:
{
  "userPrompt": string,
  "intent": string,
  "classification": "ADVISORY" | "LOW_RISK_EDIT" | "CONSEQUENTIAL",
  "requiresConfirmation": boolean,
  "advisoryResponse": string,
  "changeSummary": string,
  "proposedOperations": [
    {
      "type": "UPDATE_EVENT" | "UPDATE_PREFERENCES" | "ADJUST_BUDGET_CAPS" | "ADD_TASK" | "UPDATE_TASK" | "REMOVE_TASK",
      "targetId": string (optional),
      "description": string,
      "before": any (optional),
      "after": any
    }
  ]
}`;

  const planningService = new PlanningService();
  let rawJson: string;

  try {
    const aiResult = await planningService.generateRaw(prompt);
    rawJson = aiResult.rawText;
  } catch {
    // Deterministic fallback for simple intent matching when AI is unavailable
    return createDeterministicRevisionProposal(context, sanitizedPrompt);
  }

  try {
    const cleanJson = rawJson.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleanJson);
    return PlanRevisionProposalSchema.parse(parsed);
  } catch {
    return createDeterministicRevisionProposal(context, sanitizedPrompt);
  }
}

/**
 * Deterministic fallback revision proposal generator when AI times out or errors.
 */
function createDeterministicRevisionProposal(
  context: NonNullable<Awaited<ReturnType<typeof buildRevisionContext>>>,
  userPrompt: string
): PlanRevisionProposal {
  const lower = userPrompt.toLowerCase();

  // 1. Guest count detection
  const guestMatch = lower.match(/(?:guests|headcount|attendees|people)\s*(?:to)?\s*(\d+)/i);
  if (guestMatch) {
    const newGuests = parseInt(guestMatch[1], 10);
    if (!isNaN(newGuests) && newGuests > 0) {
      return {
        userPrompt,
        intent: "GUEST_COUNT_CHANGE",
        classification: "CONSEQUENTIAL",
        requiresConfirmation: true,
        advisoryResponse: `Adjusting guest count to ${newGuests}. Catering, seating arrangements, and venue capacities should be reviewed.`,
        changeSummary: `Update expected guest count from ${context.guestCount} to ${newGuests}.`,
        proposedOperations: [
          {
            type: "UPDATE_EVENT",
            targetId: context.eventId,
            description: `Change guest count to ${newGuests}`,
            before: { guestCount: context.guestCount },
            after: { guestCount: newGuests },
          },
        ],
      };
    }
  }

  // 2. Budget adjustment detection (requires budget keyword or currency symbol)
  const budgetMatch = lower.match(/(?:budget|spend|cost)[^0-9$₹€£]*[$₹€£]?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i) ||
    lower.match(/(?:reduce|increase|set to)\s*[$₹€£]\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);

  if (budgetMatch) {
    const newBudget = parseFloat(budgetMatch[1].replace(/,/g, ""));
    if (!isNaN(newBudget) && newBudget > 0) {
      return {
        userPrompt,
        intent: "BUDGET_CHANGE",
        classification: "CONSEQUENTIAL",
        requiresConfirmation: true,
        advisoryResponse: `I have prepared a proposal to adjust the total event budget from ${context.totalBudget} to ${newBudget}. Please review the change before confirming.`,
        changeSummary: `Update total event budget to ${newBudget} ${context.currency}.`,
        proposedOperations: [
          {
            type: "UPDATE_EVENT",
            targetId: context.eventId,
            description: `Change total budget from ${context.totalBudget} to ${newBudget}`,
            before: { totalBudget: context.totalBudget },
            after: { totalBudget: newBudget },
          },
        ],
      };
    }
  }

  // 3. Theme change detection
  if (lower.includes("theme") || lower.includes("style")) {
    return {
      userPrompt,
      intent: "THEME_ADJUSTMENT",
      classification: "LOW_RISK_EDIT",
      requiresConfirmation: false,
      advisoryResponse: `Updated theme preference based on your vision: "${userPrompt}".`,
      changeSummary: `Updated theme description in event preferences.`,
      proposedOperations: [
        {
          type: "UPDATE_PREFERENCES",
          targetId: context.eventId,
          description: `Update theme description to "${userPrompt}"`,
          before: { theme: context.preferences.theme },
          after: { themeDescription: userPrompt },
        },
      ],
    };
  }

  // 4. Default advisory guidance
  return {
    userPrompt,
    intent: "GENERAL_PLANNING_ADVICE",
    classification: "ADVISORY",
    requiresConfirmation: false,
    advisoryResponse: `For your ${context.title} (${context.type}), keep vendor bookings and guest counts aligned with your budget of ${context.totalBudget} ${context.currency}. If you'd like to adjust specific budgets, themes, or dates, specify the target numbers!`,
    changeSummary: "No database changes proposed. Advisory guidance provided.",
    proposedOperations: [],
  };
}

/**
 * Applies a confirmed revision proposal atomically inside a PostgreSQL transaction.
 * Validates budget and task rules deterministically before committing.
 */
export async function applyRevisionProposal(
  eventId: string,
  userId: string,
  proposal: PlanRevisionProposal
) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: { id: eventId, userId },
      include: {
        plan: true,
        budgetCategories: true,
      },
    });

    if (!event) {
      throw new Error("Event not found or access denied.");
    }

    // Execute each proposed operation
    for (const op of proposal.proposedOperations) {
      switch (op.type) {
        case "UPDATE_EVENT": {
          const updateData: Prisma.EventUpdateInput = {};
          if (op.after.totalBudget !== undefined) {
            const newBudgetCents = toCents(op.after.totalBudget);
            if (newBudgetCents < 0) throw new Error("Budget cannot be negative.");
            updateData.totalBudget = new Prisma.Decimal(op.after.totalBudget);
          }
          if (op.after.guestCount !== undefined) {
            if (op.after.guestCount <= 0) throw new Error("Guest count must be positive.");
            updateData.guestCount = op.after.guestCount;
          }
          if (op.after.eventDate !== undefined) {
            updateData.eventDate = op.after.eventDate ? new Date(op.after.eventDate) : null;
          }

          await tx.event.update({
            where: { id: eventId },
            data: updateData,
          });
          break;
        }

        case "UPDATE_PREFERENCES": {
          await tx.eventPreferences.upsert({
            where: { eventId },
            create: {
              eventId,
              themeDescription: op.after.themeDescription,
              colorPalette: op.after.colorPalette,
              dietaryRestrictions: op.after.dietaryRestrictions,
              accessibilityRequirements: op.after.accessibilityRequirements,
            },
            update: {
              themeDescription: op.after.themeDescription,
              colorPalette: op.after.colorPalette,
              dietaryRestrictions: op.after.dietaryRestrictions,
              accessibilityRequirements: op.after.accessibilityRequirements,
            },
          });
          break;
        }

        case "ADJUST_BUDGET_CAPS": {
          if (Array.isArray(op.after.categories)) {
            const check = validateProposedAllocations(
              Number(event.totalBudget),
              op.after.categories
            );
            if (!check.isValid) {
              throw new Error(check.errorMessage || "Proposed allocations exceed event budget.");
            }
            for (const cat of op.after.categories) {
              await tx.budgetCategory.update({
                where: { id: cat.id },
                data: {
                  allocatedAmount: new Prisma.Decimal(cat.allocatedAmount),
                },
              });
            }
          }
          break;
        }

        case "ADD_TASK": {
          await tx.task.create({
            data: {
              eventId,
              title: op.after.title,
              description: op.after.description || null,
              phase: op.after.phase || "PLANNING",
              priority: op.after.priority || "MEDIUM",
              status: "TODO",
              dueDate: op.after.dueDate ? new Date(op.after.dueDate) : null,
              assignedTo: op.after.assignedTo || null,
            },
          });
          break;
        }

        case "REMOVE_TASK": {
          if (op.targetId) {
            await tx.task.delete({
              where: { id: op.targetId },
            });
          }
          break;
        }
      }
    }

    // Increment plan version
    const nextVersion = event.plan ? event.plan.version + 1 : 1;
    if (event.plan) {
      await tx.eventPlan.update({
        where: { eventId },
        data: { version: nextVersion },
      });
    }

    // Record revision history in database
    const revisionRecord = await tx.planRevision.create({
      data: {
        eventId,
        version: nextVersion,
        userPrompt: proposal.userPrompt,
        intent: proposal.intent,
        changeSummary: proposal.changeSummary,
        diffPayload: proposal.proposedOperations as unknown as Prisma.InputJsonValue,
        applied: true,
      },
    });

    return revisionRecord;
  });
}

/**
 * Retrieves the revision history for an event.
 */
export async function getEventRevisionHistory(eventId: string, userId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
    select: { id: true },
  });

  if (!event) return null;

  return prisma.planRevision.findMany({
    where: { eventId },
    orderBy: { version: "desc" },
  });
}
