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
  "#6366f1", // indigo
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#3b82f6", // blue
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
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-surface-200 bg-surface-50 text-sm text-surface-500">
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
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform"
        >
          {/* Base background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
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
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xs font-medium text-surface-500">Total Budget</span>
          <span className="text-sm font-bold text-surface-900">
            {formatMoney(totalBudget, currency)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 flex-1 w-full text-xs">
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center justify-between py-1 border-b border-surface-100 last:border-none">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="font-medium text-surface-800 truncate max-w-[140px]">
                {slice.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-right">
              <span className="text-surface-600 font-medium">
                {formatMoney(slice.amount, currency)}
              </span>
              <span className="text-surface-400 w-10 text-right">
                {slice.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
