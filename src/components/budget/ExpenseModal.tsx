"use client";

import React, { useState } from "react";
import { formatMoney } from "@/lib/budget/financial-engine";
import { type CategoryFinancialSummary } from "@/lib/budget/financial-engine";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";

export interface ExpenseRecord {
  id: string;
  budgetCategoryId: string;
  categoryName: string;
  name: string;
  amount: number;
  dateIncurred: Date | string;
  paymentStatus: string;
  notes: string | null;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryFinancialSummary[];
  currency: string;
  initialExpense?: ExpenseRecord | null;
  onSave: (expenseData: {
    budgetCategoryId: string;
    name: string;
    amount: number;
    dateIncurred: string;
    paymentStatus: "PENDING" | "PAID" | "OVERDUE";
    notes?: string | null;
  }) => Promise<void>;
}

export function ExpenseModal({
  isOpen,
  onClose,
  categories,
  currency,
  initialExpense,
  onSave,
}: ExpenseModalProps) {
  const [budgetCategoryId, setBudgetCategoryId] = useState(
    initialExpense?.budgetCategoryId || categories[0]?.id || ""
  );
  const [name, setName] = useState(initialExpense?.name || "");
  const [amount, setAmount] = useState(initialExpense?.amount ? String(initialExpense.amount) : "");
  const [dateIncurred, setDateIncurred] = useState(
    initialExpense?.dateIncurred
      ? new Date(initialExpense.dateIncurred).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID" | "OVERDUE">(
    (initialExpense?.paymentStatus as "PENDING" | "PAID" | "OVERDUE") || "PENDING"
  );
  const [notes, setNotes] = useState(initialExpense?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please provide a valid expense amount greater than 0.");
      return;
    }
    if (!name.trim()) {
      setError("Expense name/description is required.");
      return;
    }
    if (!budgetCategoryId) {
      setError("Please assign this expense to a budget category.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        budgetCategoryId,
        name: name.trim(),
        amount: numAmount,
        dateIncurred,
        paymentStatus,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save expense.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialExpense ? "Edit Expense" : "Record Actual Expense"}
      description="Track verified expenditures, deposits, or invoices against your budget."
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="shadow-glass font-medium"
          >
            {initialExpense ? "Update Expense" : "Record Expense"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-xl bg-danger-50/90 border border-danger-200/80 text-danger-800 text-xs shadow-glass-subtle">
            {error}
          </div>
        )}

        <Input
          label="Description"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Venue deposit, DJ booking, Cake payment"
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label={`Amount (${currency})`}
            required
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />

          <Input
            label="Date Incurred"
            required
            type="date"
            value={dateIncurred}
            onChange={(e) => setDateIncurred(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="Category"
            required
            value={budgetCategoryId}
            onChange={(e) => setBudgetCategoryId(e.target.value)}
            disabled={isSubmitting}
            options={categories.map((cat) => ({
              value: cat.id,
              label: `${cat.name} (${formatMoney(cat.allocatedAmount, currency)})`,
            }))}
          />

          <Select
            label="Payment Status"
            value={paymentStatus}
            onChange={(e) =>
              setPaymentStatus(e.target.value as "PENDING" | "PAID" | "OVERDUE")
            }
            disabled={isSubmitting}
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "PAID", label: "Paid" },
              { value: "OVERDUE", label: "Overdue" },
            ]}
          />
        </div>

        <Textarea
          label="Notes or Vendor Reference (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Invoice #1234, 50% deposit via bank transfer, etc."
          disabled={isSubmitting}
        />
      </form>
    </Modal>
  );
}
