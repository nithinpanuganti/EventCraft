import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Please provide a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password is too long"),
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Step 1: Event Type & Basics
export const Step1Schema = z.object({
  type: z.enum(["WEDDING", "BIRTHDAY", "COMMUNITY"], {
    errorMap: () => ({ message: "Please select an event type (Wedding, Birthday, or Community)" }),
  }),
  title: z.string().trim().min(3, "Event title must be at least 3 characters").max(150, "Title is too long"),
  description: z.string().trim().max(1000).optional(),
});

// Step 2: Date & Location
export const Step2Schema = z.object({
  eventDate: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const parsed = Date.parse(val);
      if (isNaN(parsed)) return false;
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, "Event date cannot be in the past"),
  location: z.string().trim().max(255).optional(),
});

// Step 3: Headcount & Budget
export const Step3Schema = z.object({
  guestCount: z.coerce.number().int().min(1, "Guest count must be at least 1 person").max(50000, "Guest count exceeds limit"),
  totalBudget: z.coerce.number().min(0, "Budget cannot be negative").max(100000000, "Budget exceeds limit"),
  currency: z.string().trim().length(3, "Currency must be a 3-letter ISO code").default("INR"),
});

// Step 4: Preferences & Style
export const Step4Schema = z.object({
  themePreferences: z.string().trim().max(500).optional(),
  culturalPreferences: z.string().trim().max(500).optional(),
  dietaryRestrictions: z.string().trim().max(500).optional(),
  accessibilityRequirements: z.string().trim().max(500).optional(),
  specialInstructions: z.string().trim().max(1500).optional(),
});

// Combined Event Creation Schema
export const CreateEventSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema).merge(Step4Schema);

export const UpdateEventSchema = CreateEventSchema.partial().extend({
  status: z.enum(["DRAFT", "PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type Step1Input = z.infer<typeof Step1Schema>;
export type Step2Input = z.infer<typeof Step2Schema>;
export type Step3Input = z.infer<typeof Step3Schema>;
export type Step4Input = z.infer<typeof Step4Schema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
