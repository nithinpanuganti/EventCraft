import { z } from "zod";

// Task priority enum matching Prisma
export const PlanTaskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

// Task phase enum matching Prisma
export const PlanTaskPhaseSchema = z.enum([
  "PLANNING",
  "BOOKING",
  "PREPARATION",
  "EVENT_DAY",
  "POST_EVENT",
]);

// A. Plan Summary
export const PlanSummarySchema = z.object({
  conceptTitle: z.string().trim().min(3).max(200),
  conceptNarrative: z.string().trim().min(20).max(3000),
  planningAssumptions: z.array(z.string().trim().max(300)).default([]),
  keyRecommendations: z.array(z.string().trim().max(300)).min(1).max(10),
});

// B. Theme & Personalization
export const PlanThemeSchema = z.object({
  themeName: z.string().trim().min(2).max(150),
  colorPalette: z.array(z.string().trim().max(50)).min(2).max(8),
  styleDirection: z.string().trim().max(1000),
  decorationIdeas: z.array(z.string().trim().max(300)).min(1).max(10),
  personalizedActivities: z.array(z.string().trim().max(300)).default([]),
  culturalConsiderations: z.array(z.string().trim().max(300)).default([]),
});

// C. Budget Proposal (Category allocation)
export const PlanBudgetProposalCategorySchema = z.object({
  categoryName: z.string().trim().min(2).max(100),
  allocatedPercentage: z.number().min(0).max(100),
  allocatedAmount: z.number().min(0),
  estimatedAmount: z.number().min(0),
  rationale: z.string().trim().max(300),
});

export const PlanBudgetProposalSchema = z.object({
  totalBudget: z.number().min(0),
  currency: z.string().trim().length(3),
  categories: z.array(PlanBudgetProposalCategorySchema).min(2).max(15),
  contingencyPercentage: z.number().min(0).max(30).default(5),
  isBalanced: z.boolean().default(true),
});

// D. Preparation Timeline (Milestones)
export const PlanMilestoneSchema = z.object({
  title: z.string().trim().min(3).max(150),
  phase: PlanTaskPhaseSchema,
  offsetDays: z.number().int(), // negative for days before event, 0 for day-of, positive for post-event
  targetDate: z.string().optional(), // ISO date string if eventDate known
  description: z.string().trim().max(500),
  priority: PlanTaskPrioritySchema.default("MEDIUM"),
});

// E. Task Checklist
export const PlanTaskSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  phase: PlanTaskPhaseSchema,
  priority: PlanTaskPrioritySchema.default("MEDIUM"),
  category: z.string().trim().max(100).optional(),
  offsetDays: z.number().int().default(-30),
  dueDate: z.string().optional(), // ISO date if computable
});

// F. Event-Day Schedule (Run-of-show)
export const PlanDayOfScheduleItemSchema = z.object({
  time: z.string().trim().min(1).max(30), // e.g. "09:00 AM", "T-2 Hours", "14:00"
  activity: z.string().trim().min(2).max(200),
  lead: z.string().trim().max(100).default("Lead Coordinator"),
  notes: z.string().trim().max(500).optional(),
});

// G. Vendor Checklist
export const PlanVendorItemSchema = z.object({
  categoryName: z.string().trim().min(2).max(100),
  justification: z.string().trim().max(300),
  selectionCriteria: z.array(z.string().trim().max(300)).min(1).max(5),
  questionsToAsk: z.array(z.string().trim().max(300)).min(1).max(5),
  recommendedMilestone: z.string().trim().max(150),
});

// H. Alternatives & Risk Mitigations
export const PlanRisksAndAlternativesSchema = z.object({
  potentialRisks: z.array(z.string().trim().max(300)).min(1).max(8),
  mitigations: z.array(z.string().trim().max(300)).min(1).max(8),
  budgetSavingTips: z.array(z.string().trim().max(300)).min(1).max(8),
  optionalUpgrades: z.array(z.string().trim().max(300)).default([]),
});

// Master Event Plan Schema
export const GeneratedEventPlanSchema = z.object({
  summary: PlanSummarySchema,
  theme: PlanThemeSchema,
  budget: PlanBudgetProposalSchema,
  milestones: z.array(PlanMilestoneSchema).min(2).max(20),
  tasks: z.array(PlanTaskSchema).min(3).max(50),
  dayOfSchedule: z.array(PlanDayOfScheduleItemSchema).min(3).max(30),
  vendors: z.array(PlanVendorItemSchema).min(1).max(15),
  risksAndAlternatives: PlanRisksAndAlternativesSchema,
  metadata: z.object({
    source: z.enum(["ai-generated", "curated-fallback"]),
    provider: z.string(),
    model: z.string(),
    version: z.number().int().default(1),
    generatedAt: z.string(),
  }),
});

export type GeneratedEventPlan = z.infer<typeof GeneratedEventPlanSchema>;
export type PlanSummary = z.infer<typeof PlanSummarySchema>;
export type PlanTheme = z.infer<typeof PlanThemeSchema>;
export type PlanBudgetProposal = z.infer<typeof PlanBudgetProposalSchema>;
export type PlanBudgetProposalCategory = z.infer<typeof PlanBudgetProposalCategorySchema>;
export type PlanMilestone = z.infer<typeof PlanMilestoneSchema>;
export type PlanTask = z.infer<typeof PlanTaskSchema>;
export type PlanDayOfScheduleItem = z.infer<typeof PlanDayOfScheduleItemSchema>;
export type PlanVendorItem = z.infer<typeof PlanVendorItemSchema>;
export type PlanRisksAndAlternatives = z.infer<typeof PlanRisksAndAlternativesSchema>;
