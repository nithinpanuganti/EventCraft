import { z } from "zod";

export const TaskPhaseEnum = z.enum([
  "PLANNING",
  "BOOKING",
  "PREPARATION",
  "EVENT_DAY",
  "POST_EVENT",
]);

export const TaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const TaskStatusEnum = z.enum([
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
]);

export const TaskInputSchema = z.object({
  title: z.string().trim().min(2, "Task title must be at least 2 characters").max(150, "Task title too long"),
  description: z.string().trim().max(2000, "Description too long").optional().nullable(),
  phase: TaskPhaseEnum.default("PLANNING"),
  priority: TaskPriorityEnum.default("MEDIUM"),
  status: TaskStatusEnum.default("TODO"),
  dueDate: z.string().or(z.date()).optional().nullable().transform((val) => {
    if (!val) return null;
    return typeof val === "string" ? new Date(val) : val;
  }),
  assignedTo: z.string().trim().max(100, "Assignee role label too long").optional().nullable(),
  order: z.number().int().default(0),
  prerequisiteTaskIds: z.array(z.string()).optional().default([]),
});

export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  phase: TaskPhaseEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  status: TaskStatusEnum.optional(),
  dueDate: z.string().or(z.date()).optional().nullable().transform((val) => {
    if (!val) return null;
    return typeof val === "string" ? new Date(val) : val;
  }),
  assignedTo: z.string().trim().max(100).optional().nullable(),
  order: z.number().int().optional(),
  prerequisiteTaskIds: z.array(z.string()).optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: TaskStatusEnum,
});

export const DayOfScheduleItemSchema = z.object({
  time: z.string().trim().min(1, "Time is required").max(50),
  activity: z.string().trim().min(2, "Activity is required").max(150),
  lead: z.string().trim().max(100).optional().default("Coordinator"),
  notes: z.string().trim().max(500).optional().default(""),
});

export const UpdateDayOfScheduleSchema = z.object({
  schedule: z.array(DayOfScheduleItemSchema),
});
