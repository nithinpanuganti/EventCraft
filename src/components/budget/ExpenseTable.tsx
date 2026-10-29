"use client";

import React, { useState } from "react";
import { formatMoney } from "@/lib/budget/financial-engine";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Edit2, Trash2 } from "lucide-react";
import { type ExpenseRecord } from "./ExpenseModal";

interface ExpenseTableProps {
  expenses: ExpenseRecord[];
  currency: string;
  onEdit: (expense: ExpenseRecord) => void;
  onDelete: (expenseId: string) => Promise<void>;
}

export function ExpenseTable({
  expenses,
  currency,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the expense "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(id);
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success" size="sm">Paid</Badge>;
      case "OVERDUE":
        return <Badge variant="danger" size="sm">Overdue</Badge>;
      default:
        return <Badge variant="warning" size="sm">Pending</Badge>;
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="flex h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-300/70 glass-surface-subtle text-xs text-surface-500 shadow-glass-subtle">
        <p className="font-semibold text-surface-700">No actual expenses logged yet.</p>
        <p className="mt-1 text-[11px] text-surface-400">
          Click &ldquo;Record Expense&rdquo; above to log vendor deposits, purchases, or invoices.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-table-wrapper">
      <table className="w-full text-left text-xs">
        <thead className="glass-table-thead text-surface-700 font-semibold border-b border-surface-200/70">
          <tr>
            <th className="py-3 px-3.5">Description</th>
            <th className="py-3 px-3.5">Category</th>
            <th className="py-3 px-3.5">Date</th>
            <th className="py-3 px-3.5 text-right">Amount</th>
            <th className="py-3 px-3.5 text-center">Status</th>
            <th className="py-3 px-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200/50">
          {expenses.map((exp) => (
            <tr key={exp.id} className="hover:bg-white/60 transition-colors">
              <td className="py-3 px-3.5 font-semibold text-surface-900">
                <div>{exp.name}</div>
                {exp.notes && (
                  <div className="text-[11px] text-surface-500 font-normal truncate max-w-xs">
                    {exp.notes}
                  </div>
                )}
              </td>
              <td className="py-3 px-3.5 text-surface-600">
                <span className="inline-block px-2.5 py-0.5 rounded-full glass-surface-subtle border border-surface-200/80 text-[11px] font-semibold text-surface-700 shadow-glass-subtle">
                  {exp.categoryName}
                </span>
              </td>
              <td className="py-3 px-3.5 text-surface-500 font-mono text-[11px]">
                {new Date(exp.dateIncurred).toLocaleDateString()}
              </td>
              <td className="py-3 px-3.5 text-right font-mono font-bold text-surface-900">
                {formatMoney(exp.amount, currency)}
              </td>
              <td className="py-3 px-3.5 text-center">
                {getStatusBadge(exp.paymentStatus)}
              </td>
              <td className="py-3 px-3.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(exp)}
                    className="h-7 w-7 p-0 text-surface-400 hover:text-surface-900 rounded-lg"
                    title="Edit expense"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(exp.id, exp.name)}
                    disabled={deletingId === exp.id}
                    className="h-7 w-7 p-0 text-danger-500 hover:text-danger-700 hover:bg-danger-50/80 rounded-lg"
                    title="Delete expense"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
