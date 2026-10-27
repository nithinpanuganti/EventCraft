import { z } from "zod";

export const RevisionClassificationEnum = z.enum([
  "ADVISORY",       // Low risk suggestion, questions, or non-persisted ideas
  "LOW_RISK_EDIT",  // Minor text or theme adjustments applied without destructive changes
  "CONSEQUENTIAL",  // Budget changes, guest count change, timeline/date shifts, task deletions
]);

export const RevisionOperationTypeEnum = z.enum([
  "UPDATE_EVENT",          // Changes title, date, guestCount, totalBudget
  "UPDATE_PREFERENCES",    // Changes themeDescription, colorPalette, dietary, accessibility
  "ADJUST_BUDGET_CAPS",    // Adjusts approved category allocations
  "ADD_TASK",              // Creates a new task
  "UPDATE_TASK",           // Modifies task title, phase, priority, due date
  "REMOVE_TASK",           // Deletes a task
]);

export const ProposedOperationSchema = z.object({
  type: RevisionOperationTypeEnum,
  targetId: z.string().optional(),
  description: z.string(),
  before: z.any().optional(),
  after: z.any(),
});

export const PlanRevisionProposalSchema = z.object({
  userPrompt: z.string(),
  intent: z.string().describe("Concise intent descriptor, e.g. BUDGET_REDUCTION or THEME_CHANGE"),
  classification: RevisionClassificationEnum,
  requiresConfirmation: z.boolean(),
  advisoryResponse: z.string().describe("Clear natural language guidance, trade-offs, and explanation"),
  changeSummary: z.string().describe("Human-readable bullet points explaining what will change"),
  proposedOperations: z.array(ProposedOperationSchema).default([]),
});

export type PlanRevisionProposal = z.infer<typeof PlanRevisionProposalSchema>;
export type ProposedOperation = z.infer<typeof ProposedOperationSchema>;
