"use client";

import React from "react";
import { formatMoney } from "@/lib/budget/financial-engine";
import { type CategoryFinancialSummary } from "@/lib/budget/financial-engine";

interface PlannedVsActualChartProps {
  categories: CategoryFinancialSummary[];
  currency: string;
}

export function PlannedVsActualChart({ categories, currency }: PlannedVsActualChartProps) {
  if (categories.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border-2 border-dashed border-surface-300/70 glass-surface-subtle text-sm text-surface-500 shadow-glass-subtle">
        <p>No categories to compare.</p>
      </div>
    );
  }

  // Find max value across all categories to scale bars proportionally
  const maxVal = Math.max(
    ...categories.map((c) => Math.max(c.allocatedAmount, c.totalActualSpent)),
    1
  );

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-surface-600 pb-3 border-b border-surface-200/60">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 shadow-sm" />
          <span>Planned Allocation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-sm" />
          <span>Actual Spending</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-rose-400 to-rose-600 shadow-sm" />
          <span>Over-Budget Spend</span>
        </div>
      </div>

      {/* Category Bars */}
      <div className="space-y-4 pt-1">
        {categories.map((cat) => {
          const plannedPct = Math.min(100, (cat.allocatedAmount / maxVal) * 100);
          const actualPct = Math.min(100, (cat.totalActualSpent / maxVal) * 100);
          const isOver = cat.isOverBudget;

          return (
            <div key={cat.id} className="space-y-1.5 text-xs">
              <div className="flex justify-between items-baseline font-semibold text-surface-800">
                <span className="truncate max-w-[200px]">{cat.name}</span>
                <span className="text-surface-500 font-mono text-[11px]">
                  {formatMoney(cat.totalActualSpent, currency)} / {formatMoney(cat.allocatedAmount, currency)}
                  {isOver && (
                    <span className="text-danger-600 font-bold ml-1.5">
                      (+{formatMoney(cat.overrunAmount, currency)})
                    </span>
                  )}
                </span>
              </div>

              {/* Dual Bar Track in Translucent Glass */}
              <div className="space-y-1">
                {/* Planned bar */}
                <div className="h-2 w-full bg-surface-200/50 rounded-full overflow-hidden p-0.5 border border-surface-200/50">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-300"
                    style={{ width: `${plannedPct}%` }}
                    title={`Planned: ${formatMoney(cat.allocatedAmount, currency)}`}
                  />
                </div>
                {/* Actual bar */}
                <div className="h-2 w-full bg-surface-200/50 rounded-full overflow-hidden p-0.5 border border-surface-200/50">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver
                        ? "bg-gradient-to-r from-danger-500 to-danger-600 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                        : "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_6px_rgba(16,185,129,0.35)]"
                    }`}
                    style={{ width: `${actualPct}%` }}
                    title={`Spent: ${formatMoney(cat.totalActualSpent, currency)}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
