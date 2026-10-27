import { z } from "zod";

export const PaymentStatusEnum = z.enum(["PENDING", "PAID", "OVERDUE"]);

export const BudgetCategoryInputSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100, "Category name too long"),
  allocatedAmount: z.number().min(0, "Allocated amount cannot be negative").max(100000000, "Allocated amount exceeds limit"),
  estimatedAmount: z.number().min(0, "Estimated amount cannot be negative").max(100000000, "Estimated amount exceeds limit").optional().default(0),
});

export const UpdateBudgetCategorySchema = BudgetCategoryInputSchema.partial();

export const BulkAdjustAllocationsSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string().min(1, "Category ID is required"),
      allocatedAmount: z.number().min(0, "Allocated amount cannot be negative"),
    })
  ).min(1, "At least one category is required"),
});

export const ExpenseInputSchema = z.object({
  budgetCategoryId: z.string().min(1, "Category is required"),
  name: z.string().trim().min(1, "Expense description is required").max(150, "Expense description too long"),
  amount: z.number().positive("Expense amount must be greater than zero").max(100000000, "Amount exceeds limit"),
  dateIncurred: z.string().or(z.date()).optional().transform((val) => {
    if (!val) return new Date();
    return typeof val === "string" ? new Date(val) : val;
  }),
  paymentStatus: PaymentStatusEnum.default("PENDING"),
  notes: z.string().trim().max(1000, "Notes cannot exceed 1000 characters").optional().nullable(),
});

export const UpdateExpenseSchema = ExpenseInputSchema.partial();
