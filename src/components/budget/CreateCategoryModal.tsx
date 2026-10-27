"use client";

import React, { useState } from "react";
import { formatMoney } from "@/lib/budget/financial-engine";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  unallocatedBudget: number;
  onSave: (data: { name: string; allocatedAmount: number }) => Promise<void>;
}

export function CreateCategoryModal({
  isOpen,
  onClose,
  currency,
  unallocatedBudget,
  onSave,
}: CreateCategoryModalProps) {
  const [name, setName] = useState("");
  const [allocatedAmount, setAllocatedAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(allocatedAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError("Please provide a valid non-negative allocation amount.");
      return;
    }
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: name.trim(),
        allocatedAmount: numAmount,
      });
      setName("");
      setAllocatedAmount("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create category.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-surface-200">
        <div className="flex items-center justify-between pb-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-900">Add Budget Category</h3>
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
            <label className="block font-medium text-surface-700 mb-1">Category Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Videography, Favors, Insurance"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-medium text-surface-700">Allocated Amount ({currency}) *</label>
              <span className="text-[11px] text-surface-400 font-normal">
                Max available: {formatMoney(unallocatedBudget, currency)}
              </span>
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={allocatedAmount}
              onChange={(e) => setAllocatedAmount(e.target.value)}
              placeholder="0.00"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
