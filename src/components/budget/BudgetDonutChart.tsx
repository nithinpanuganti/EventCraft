"use client";

import React from "react";
import { formatMoney } from "@/lib/budget/financial-engine";

interface SliceData {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface BudgetDonutChartProps {
  categories: {
    name: string;
    allocatedAmount: number;
    allocatedPercentage: number;
  }[];
  unallocatedAmount: number;
  totalBudget: number;
  currency: string;
}

const PALETTE = [
  "#7c3aed", // violet
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#14b8a6", // teal
  "#f97316", // orange
];

export function BudgetDonutChart({
  categories,
  unallocatedAmount,
  totalBudget,
  currency,
}: BudgetDonutChartProps) {
  if (totalBudget <= 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-300/70 glass-surface-subtle text-sm text-surface-500 shadow-glass-subtle">
        <p>No budget defined for this event.</p>
      </div>
    );
  }

  const slices: SliceData[] = categories.map((cat, i) => ({
    name: cat.name,
    amount: cat.allocatedAmount,
    percentage: cat.allocatedPercentage,
    color: PALETTE[i % PALETTE.length],
  }));

  if (unallocatedAmount > 0) {
    const unallocatedPct = Number(((unallocatedAmount / totalBudget) * 100).toFixed(1));
    slices.push({
      name: "Unallocated",
      amount: unallocatedAmount,
      percentage: unallocatedPct,
      color: "#94a3b8", // slate-400
    });
  }

  // SVG Donut calculation
  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* SVG Donut with Glass Center Badge */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform drop-shadow-sm"
        >
          {/* Base background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(222, 219, 210, 0.45)"
            strokeWidth={strokeWidth}
          />
          {slices.map((slice, index) => {
            const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
            accumulatedPercent += slice.percentage;

            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute h-24 w-24 rounded-full glass-surface flex flex-col items-center justify-center text-center shadow-glass-subtle border border-white/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Total Budget</span>
          <span className="text-xs font-bold font-mono text-surface-900 mt-0.5">
            {formatMoney(totalBudget, currency)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 flex-1 w-full text-xs">
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/50 transition-colors border-b border-surface-200/40 last:border-none">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: slice.color }}
              />
              <span className="font-semibold text-surface-800 truncate max-w-[140px]">
                {slice.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-right">
              <span className="text-surface-700 font-mono font-medium">
                {formatMoney(slice.amount, currency)}
              </span>
              <span className="text-surface-400 font-mono text-[11px] w-10 text-right">
                {slice.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
