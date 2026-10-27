"use client";

import React, { useState } from "react";
import { formatMoney } from "@/lib/budget/financial-engine";
import { type CategoryFinancialSummary } from "@/lib/budget/financial-engine";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

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
      setError("Please provide a valid positive expense amount.");
      return;
    }
    if (!name.trim()) {
      setError("Please provide an expense description.");
      return;
    }
    if (!budgetCategoryId) {
      setError("Please select a budget category.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-surface-200">
        <div className="flex items-center justify-between pb-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-900">
            {initialExpense ? "Edit Expense" : "Record Actual Expense"}
          </h3>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-700 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="block font-medium text-surface-700 mb-1">Description *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Venue deposit, DJ booking, Cake payment"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-surface-700 mb-1">
                Amount ({currency}) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block font-medium text-surface-700 mb-1">Date Incurred *</label>
              <Input
                type="date"
                value={dateIncurred}
                onChange={(e) => setDateIncurred(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Category *"
                value={budgetCategoryId}
                onChange={(e) => setBudgetCategoryId(e.target.value)}
                disabled={isSubmitting}
                options={categories.map((cat) => ({
                  value: cat.id,
                  label: `${cat.name} (${formatMoney(cat.allocatedAmount, currency)})`,
                }))}
              />
            </div>

            <div>
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
          </div>

          <div>
            <label className="block font-medium text-surface-700 mb-1">
              Notes or Vendor Reference (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Invoice #1234, 50% deposit via bank transfer, etc."
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initialExpense ? "Update Expense" : "Record Expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
