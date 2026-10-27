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
      {/* Live Financial Header Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-surface-50 border border-surface-200 rounded-xl text-xs">
        <div>
          <span className="text-surface-500 block">Total Event Budget</span>
          <span className="text-sm font-bold text-surface-900">{formatMoney(totalBudget, currency)}</span>
        </div>
        <div>
          <span className="text-surface-500 block">Proposed Allocated</span>
          <span className={`text-sm font-bold ${isOverBudget ? "text-rose-600" : "text-surface-900"}`}>
            {formatMoney(proposedTotal, currency)}
          </span>
        </div>
        <div>
          <span className="text-surface-500 block">
            {isOverBudget ? "Exceeded Budget By" : "Remaining Unallocated"}
          </span>
          <span className={`text-sm font-bold ${isOverBudget ? "text-rose-600" : "text-emerald-600"}`}>
            {isOverBudget ? `+${formatMoney(overAmount, currency)}` : formatMoney(unallocated, currency)}
          </span>
        </div>
      </div>

      {/* Over budget banner */}
      {isOverBudget && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>
            Allocations exceed your total budget by <strong>{formatMoney(overAmount, currency)}</strong>. Please decrease one or more category allocations.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Category input rows */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {categories.map((cat) => {
          const val = allocations[cat.id] ?? 0;
          const pct = totalBudget > 0 ? ((val / totalBudget) * 100).toFixed(1) : "0";
          const hasExpenses = cat.totalActualSpent > 0;

          return (
            <div
              key={cat.id}
              className="flex items-center justify-between gap-4 p-3 rounded-lg border border-surface-200 bg-surface-50/50 hover:bg-surface-50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-surface-900 truncate">{cat.name}</span>
                  {hasExpenses && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-surface-500">
                      Spent: {formatMoney(cat.totalActualSpent, currency)}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-surface-500">
                  {pct}% of event budget
                </span>
              </div>

              <div className="w-36">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={allocations[cat.id] ?? ""}
                  onChange={(e) => handleChange(cat.id, e.target.value)}
                  disabled={isSaving}
                  className="h-8 text-right font-mono text-xs"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isSaving}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={isSaving || isOverBudget}
          className="gap-1.5"
        >
          {isSaving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>Save Allocations</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
