"use client";

import React, { useState } from "react";
import { formatMoney } from "@/lib/budget/financial-engine";
import { type CategoryFinancialSummary } from "@/lib/budget/financial-engine";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AlertCircle, RotateCcw, Save } from "lucide-react";

interface CategoryAllocationEditorProps {
  categories: CategoryFinancialSummary[];
  totalBudget: number;
  currency: string;
  onSave: (allocations: { id: string; allocatedAmount: number }[]) => Promise<void>;
  onCancel?: () => void;
}

export function CategoryAllocationEditor({
  categories,
  totalBudget,
  currency,
  onSave,
  onCancel,
}: CategoryAllocationEditorProps) {
  const [allocations, setAllocations] = useState<{ [id: string]: number }>(() =>
    Object.fromEntries(categories.map((c) => [c.id, c.allocatedAmount]))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute live proposal sum
  const proposedTotal = Object.values(allocations).reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
  const unallocated = totalBudget - proposedTotal;
  const isOverBudget = proposedTotal > totalBudget;
  const overAmount = isOverBudget ? proposedTotal - totalBudget : 0;

  const handleChange = (id: string, value: string) => {
    setError(null);
    const parsed = parseFloat(value);
    setAllocations((prev) => ({
      ...prev,
      [id]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleReset = () => {
    setAllocations(Object.fromEntries(categories.map((c) => [c.id, c.allocatedAmount])));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverBudget) {
      setError(`Cannot save allocations: Total exceeds event budget by ${formatMoney(overAmount, currency)}.`);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const payload = Object.entries(allocations).map(([id, allocatedAmount]) => ({
        id,
        allocatedAmount,
      }));
      await onSave(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save category allocations.";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Live Financial Header Metrics in Glass Surface */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl glass-surface-subtle border border-surface-200/80 text-xs shadow-glass-subtle">
        <div>
          <span className="text-surface-500 block font-medium">Total Event Budget</span>
          <span className="text-sm font-bold font-mono text-surface-900">{formatMoney(totalBudget, currency)}</span>
        </div>
        <div>
          <span className="text-surface-500 block font-medium">Proposed Allocated</span>
          <span className={`text-sm font-bold font-mono ${isOverBudget ? "text-danger-600" : "text-surface-900"}`}>
            {formatMoney(proposedTotal, currency)}
          </span>
        </div>
        <div>
          <span className="text-surface-500 block font-medium">
            {isOverBudget ? "Exceeded Budget By" : "Remaining Unallocated"}
          </span>
          <span className={`text-sm font-bold font-mono ${isOverBudget ? "text-danger-600" : "text-emerald-600"}`}>
            {isOverBudget ? `+${formatMoney(overAmount, currency)}` : formatMoney(unallocated, currency)}
          </span>
        </div>
      </div>

      {/* Over budget banner */}
      {isOverBudget && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-danger-50/90 border border-danger-200/80 text-xs text-danger-800 shadow-glass-subtle backdrop-blur-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-danger-600" />
          <span>
            Allocations exceed your total budget by <strong>{formatMoney(overAmount, currency)}</strong>. Please decrease one or more category allocations.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-danger-50/90 border border-danger-200/80 text-xs text-danger-800 shadow-glass-subtle backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Category input rows */}
      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {categories.map((cat) => {
          const val = allocations[cat.id] ?? 0;
          const pct = totalBudget > 0 ? ((val / totalBudget) * 100).toFixed(1) : "0";
          const hasExpenses = cat.totalActualSpent > 0;

          return (
            <div
              key={cat.id}
              className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-surface-200/70 glass-surface-subtle hover:bg-white/70 transition-colors shadow-glass-subtle"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-surface-900 truncate">{cat.name}</span>
                  {hasExpenses && (
                    <Badge variant="secondary" size="sm">
                      {formatMoney(cat.totalActualSpent, currency)} spent
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-surface-500 mt-0.5">
                  Represents {pct}% of overall target budget
                </div>
              </div>

              <div className="flex items-center gap-2 w-48 shrink-0">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={val === 0 ? "" : val}
                    onChange={(e) => handleChange(cat.id, e.target.value)}
                    placeholder="0.00"
                    disabled={isSaving}
                    className="h-8 text-xs font-mono text-right pr-2"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-surface-200/60">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isSaving}
          className="gap-1.5 text-xs text-surface-500 hover:text-surface-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset to Saved</span>
        </Button>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSaving}
            disabled={isOverBudget}
            className="gap-1.5 text-xs font-semibold shadow-glass"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Allocations</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
