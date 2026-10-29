"use client";

import React, { useState } from "react";
import { formatMoney } from "@/lib/budget/financial-engine";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Budget Category"
      description="Create a dedicated spending envelope for this event."
      maxWidth="sm"
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
            Create Category
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
          label="Category Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Videography, Favors, Insurance"
          disabled={isSubmitting}
        />

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-700">
              Allocated Amount ({currency}) *
            </span>
            <span className="text-[11px] text-surface-500 font-mono">
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
      </form>
    </Modal>
  );
}
