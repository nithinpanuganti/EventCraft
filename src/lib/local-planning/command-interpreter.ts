import {
  LocalEvent,
  LocalPlanRevision,
  TaskPhase,
  TaskPriority,
  LocalEventPreferences,
} from "../storage/types";
import {
  generateId,
  updateLocalEvent,
  createLocalTask,
  updateLocalTask,
  createLocalExpense,
  generateAndSaveLocalPlan,
  saveLocalPlanRevision,
} from "../storage/local-repository";

export interface InterpretedCommandProposal {
  userPrompt: string;
  intent: string;
  classification: "ADVISORY" | "LOW_RISK_EDIT" | "CONSEQUENTIAL";
  changeSummary: string;
  advisoryResponse: string;
  requiresConfirmation: boolean;
  proposedOperations: Array<{
    type: string;
    description: string;
    targetId: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }>;
}

const SUPPORTED_COMMANDS_HELP = `
Supported Local Commands:
• "add task <Title> [due YYYY-MM-DD]" — Add a new operational task
• "complete task <Title>" — Mark a task as completed
• "change date <YYYY-MM-DD>" — Reschedule the event date
• "adjust budget <Amount>" — Change total event budget cap
• "add expense <Title> <Amount>" — Log a new expenditure
• "show remaining budget" — Display budget spent vs remaining
• "regenerate plan" — Re-run deterministic local rule engine
• "update theme <Theme description>" — Adjust event aesthetic vision
`;

/**
 * Deterministic Local Command Interpreter.
 * Replaces cloud LLM requests with strict, local pattern-matching commands.
 */
export function interpretLocalPlanningCommand(
  event: LocalEvent,
  prompt: string
): InterpretedCommandProposal {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();

  // 1. Add Task: "add task Book DJ" or "add task Order flowers due 2026-11-15"
  const addTaskMatch = trimmed.match(/^add\s+task\s+(.+?)(?:\s+(?:due|by)\s+(\d{4}-\d{2}-\d{2}))?$/i);
  if (addTaskMatch) {
    const taskTitle = addTaskMatch[1].trim();
    const dueDate = addTaskMatch[2] || undefined;
    return {
      userPrompt: prompt,
      intent: "ADD_TASK",
      classification: "LOW_RISK_EDIT",
      requiresConfirmation: false,
      changeSummary: `Add task "${taskTitle}"${dueDate ? ` due ${dueDate}` : ""}.`,
      advisoryResponse: `Task ready to be added to your checklist. Phase will be set to PREPARATION by default.`,
      proposedOperations: [
        {
          type: "ADD_TASK",
          description: `Create task "${taskTitle}"`,
          targetId: event.id,
          before: {},
          after: { title: taskTitle, dueDate, phase: "PREPARATION", priority: "MEDIUM" },
        },
      ],
    };
  }

  // 2. Mark Task Complete: "complete task Book Venue" or "mark task Finalize guest list complete"
  const completeTaskMatch = lower.match(/(?:complete|mark)\s+task\s+(?:as\s+complete\s+)?(.+?)(?:\s+complete)?$/i);
  if (completeTaskMatch) {
    const targetTitle = completeTaskMatch[1].trim();
    const existingTask = event.tasks?.find((t) => t.title.toLowerCase().includes(targetTitle));

    if (existingTask) {
      return {
        userPrompt: prompt,
        intent: "COMPLETE_TASK",
        classification: "LOW_RISK_EDIT",
        requiresConfirmation: false,
        changeSummary: `Mark task "${existingTask.title}" as COMPLETED.`,
        advisoryResponse: `Found task "${existingTask.title}". It will be marked as completed.`,
        proposedOperations: [
          {
            type: "UPDATE_TASK",
            description: `Set status of "${existingTask.title}" to COMPLETED`,
            targetId: existingTask.id,
            before: { status: existingTask.status },
            after: { status: "COMPLETED" },
          },
        ],
      };
    } else {
      return {
        userPrompt: prompt,
        intent: "COMPLETE_TASK_NOT_FOUND",
        classification: "ADVISORY",
        requiresConfirmation: false,
        changeSummary: `No matching task found for "${targetTitle}".`,
        advisoryResponse: `Could not locate a task with title matching "${targetTitle}". Check the Timeline tab for exact names.`,
        proposedOperations: [],
      };
    }
  }

  // 3. Change Event Date: "change date to 2026-12-25" or "reschedule to 2026-11-20"
  const dateMatch = lower.match(/(?:change|set|reschedule)\s+(?:event\s+)?date\s+(?:to\s+)?(\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    const newDate = dateMatch[1];
    return {
      userPrompt: prompt,
      intent: "CHANGE_EVENT_DATE",
      classification: "CONSEQUENTIAL",
      requiresConfirmation: true,
      changeSummary: `Reschedule event date from ${event.eventDate || "Unset"} to ${newDate}.`,
      advisoryResponse: `Changing the event date may impact vendor availability and task due dates. Please confirm this change.`,
      proposedOperations: [
        {
          type: "UPDATE_EVENT",
          description: `Update event date to ${newDate}`,
          targetId: event.id,
          before: { eventDate: event.eventDate },
          after: { eventDate: newDate },
        },
      ],
    };
  }

  // 4. Adjust Budget: "adjust budget to 60000" or "set budget 75000"
  const budgetMatch = lower.match(/(?:adjust|change|set|increase|reduce)\s+budget\s+(?:to\s+)?[$₹€£]?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (budgetMatch) {
    const newAmount = parseFloat(budgetMatch[1].replace(/,/g, ""));
    return {
      userPrompt: prompt,
      intent: "ADJUST_BUDGET",
      classification: "CONSEQUENTIAL",
      requiresConfirmation: true,
      changeSummary: `Adjust total budget cap from ${event.currency} ${event.totalBudget} to ${event.currency} ${newAmount}.`,
      advisoryResponse: `Modifying total budget cap. Category allocations can be recalculated in the Budget tab.`,
      proposedOperations: [
        {
          type: "UPDATE_EVENT",
          description: `Change total budget to ${newAmount}`,
          targetId: event.id,
          before: { totalBudget: event.totalBudget },
          after: { totalBudget: newAmount },
        },
      ],
    };
  }

  // 5. Add Expense: "add expense Floral Deposit 1500"
  const expenseMatch = trimmed.match(/^add\s+expense\s+(.+?)\s+[$₹€£]?\s*(\d+(?:,\d+)*(?:\.\d+)?)$/i);
  if (expenseMatch) {
    const expenseTitle = expenseMatch[1].trim();
    const expenseAmount = parseFloat(expenseMatch[2].replace(/,/g, ""));
    const defaultCat = event.budgetCategories?.[0];

    return {
      userPrompt: prompt,
      intent: "ADD_EXPENSE",
      classification: "LOW_RISK_EDIT",
      requiresConfirmation: false,
      changeSummary: `Log expense "${expenseTitle}" for ${event.currency} ${expenseAmount}.`,
      advisoryResponse: `Expense will be logged under "${defaultCat?.name || "General"}".`,
      proposedOperations: [
        {
          type: "ADD_EXPENSE",
          description: `Add expense "${expenseTitle}" of ${expenseAmount}`,
          targetId: event.id,
          before: {},
          after: {
            title: expenseTitle,
            amount: expenseAmount,
            categoryId: defaultCat?.id || "cat_default",
          },
        },
      ],
    };
  }

  // 6. Show Remaining Budget: "show remaining budget" or "budget status"
  if (lower.includes("remaining budget") || lower.includes("budget status") || lower.includes("how much left")) {
    const spentCents = (event.expenses || []).reduce((sum, e) => sum + e.amountCents, 0);
    const totalCents = event.totalBudgetCents || Math.round(event.totalBudget * 100);
    const remainingCents = Math.max(0, totalCents - spentCents);
    const spent = (spentCents / 100).toLocaleString();
    const remaining = (remainingCents / 100).toLocaleString();
    const total = (totalCents / 100).toLocaleString();

    return {
      userPrompt: prompt,
      intent: "SHOW_BUDGET_STATUS",
      classification: "ADVISORY",
      requiresConfirmation: false,
      changeSummary: `Financial overview: Total ${event.currency} ${total}, Spent ${event.currency} ${spent}, Remaining ${event.currency} ${remaining}.`,
      advisoryResponse: `You have spent ${event.currency} ${spent} out of ${event.currency} ${total}. Remaining unspent budget is ${event.currency} ${remaining}.`,
      proposedOperations: [],
    };
  }

  // 7. Regenerate Plan: "regenerate plan" or "recalculate plan"
  if (lower.includes("regenerate plan") || lower.includes("rebuild plan") || lower.includes("refresh roadmap")) {
    return {
      userPrompt: prompt,
      intent: "REGENERATE_PLAN",
      classification: "CONSEQUENTIAL",
      requiresConfirmation: true,
      changeSummary: `Re-run local rule engine to regenerate milestones, categories, and day-of schedule.`,
      advisoryResponse: `This will reset your default categories and roadmap tasks using the latest event settings. Please confirm.`,
      proposedOperations: [
        {
          type: "REGENERATE_PLAN",
          description: "Re-run local deterministic rule engine",
          targetId: event.id,
          before: {},
          after: {},
        },
      ],
    };
  }

  // 8. Update Theme / Vision
  if (lower.startsWith("update theme") || lower.startsWith("change theme")) {
    const newTheme = trimmed.replace(/^(?:update|change)\s+theme\s+(?:to\s+)?/i, "").trim();
    return {
      userPrompt: prompt,
      intent: "UPDATE_THEME",
      classification: "LOW_RISK_EDIT",
      requiresConfirmation: false,
      changeSummary: `Update event theme to "${newTheme}".`,
      advisoryResponse: `Theme preference updated locally.`,
      proposedOperations: [
        {
          type: "UPDATE_PREFERENCES",
          description: `Set theme description to "${newTheme}"`,
          targetId: event.id,
          before: { theme: event.preferences?.themePreferences },
          after: { themePreferences: newTheme },
        },
      ],
    };
  }

  // 9. Unsupported / Fallback: Provide helpful explanation and supported command list
  return {
    userPrompt: prompt,
    intent: "UNSUPPORTED_COMMAND",
    classification: "ADVISORY",
    requiresConfirmation: false,
    changeSummary: "Unrecognized local command.",
    advisoryResponse: `I didn't recognize that command. EventCraft AI operates with deterministic local rules instead of cloud AI.\n\n${SUPPORTED_COMMANDS_HELP}`,
    proposedOperations: [],
  };
}

/**
 * Commits approved operations directly into the local IndexedDB repository.
 */
export async function applyLocalProposal(
  event: LocalEvent,
  proposal: InterpretedCommandProposal
): Promise<LocalPlanRevision> {
  for (const op of proposal.proposedOperations) {
    if (op.type === "UPDATE_EVENT") {
      await updateLocalEvent(event.id, op.after as Partial<LocalEvent>);
    } else if (op.type === "ADD_TASK") {
      const { title, dueDate, phase, priority } = op.after as {
        title: string;
        dueDate?: string;
        phase?: TaskPhase;
        priority?: TaskPriority;
      };
      await createLocalTask({
        eventId: event.id,
        title,
        dueDate,
        phase: phase || "PREPARATION",
        priority: priority || "MEDIUM",
      });
    } else if (op.type === "UPDATE_TASK") {
      await updateLocalTask(op.targetId, op.after);
    } else if (op.type === "ADD_EXPENSE") {
      const { title, amount, categoryId } = op.after as {
        title: string;
        amount: number;
        categoryId: string;
      };
      await createLocalExpense({
        eventId: event.id,
        categoryId,
        title,
        amount,
      });
    } else if (op.type === "UPDATE_PREFERENCES") {
      await updateLocalEvent(event.id, {
        preferences: {
          ...event.preferences,
          ...(op.after as Partial<LocalEventPreferences>),
        },
      });
    } else if (op.type === "REGENERATE_PLAN") {
      await generateAndSaveLocalPlan(event.id);
    }
  }

  const revision: LocalPlanRevision = {
    id: generateId("rev"),
    eventId: event.id,
    version: (event.plan?.version || 1) + 1,
    userPrompt: proposal.userPrompt,
    intent: proposal.intent,
    classification: proposal.classification,
    changeSummary: proposal.changeSummary,
    advisoryResponse: proposal.advisoryResponse,
    requiresConfirmation: proposal.requiresConfirmation,
    proposedOperations: proposal.proposedOperations,
    status: "APPLIED",
    createdAt: new Date().toISOString(),
  };

  await saveLocalPlanRevision(revision);
  return revision;
}
