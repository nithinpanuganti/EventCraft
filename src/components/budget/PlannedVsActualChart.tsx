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
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-surface-200 bg-surface-50 text-sm text-surface-500">
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
      <div className="flex items-center gap-6 text-xs font-medium text-surface-600 pb-2 border-b border-surface-100">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-primary-500" />
          <span>Planned Allocation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-emerald-500" />
          <span>Actual Spending</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-rose-500" />
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
              <div className="flex justify-between items-baseline font-medium text-surface-800">
                <span className="truncate max-w-[200px]">{cat.name}</span>
                <span className="text-surface-500 font-mono">
                  {formatMoney(cat.totalActualSpent, currency)} / {formatMoney(cat.allocatedAmount, currency)}
                  {isOver && (
                    <span className="text-rose-600 font-semibold ml-1.5">
                      (+{formatMoney(cat.overrunAmount, currency)})
                    </span>
                  )}
                </span>
              </div>

              {/* Dual Bar Track */}
              <div className="space-y-1">
                {/* Planned bar */}
                <div className="h-2 w-full bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-400 rounded-full transition-all duration-300"
                    style={{ width: `${plannedPct}%` }}
                    title={`Planned: ${formatMoney(cat.allocatedAmount, currency)}`}
                  />
                </div>
                {/* Actual bar */}
                <div className="h-2 w-full bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver ? "bg-rose-500" : "bg-emerald-500"
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
