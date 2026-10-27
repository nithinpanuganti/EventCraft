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
        return <Badge variant="success" className="text-[10px]">Paid</Badge>;
      case "OVERDUE":
        return <Badge variant="danger" className="text-[10px]">Overdue</Badge>;
      default:
        return <Badge variant="warning" className="text-[10px]">Pending</Badge>;
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-surface-200 bg-surface-50 text-xs text-surface-500">
        <p>No actual expenses logged yet.</p>
        <p className="mt-1 text-[11px] text-surface-400">
          Click &ldquo;Record Expense&rdquo; above to log vendor deposits, purchases, or invoices.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface-50 text-surface-600 font-semibold border-b border-surface-200">
          <tr>
            <th className="py-2.5 px-3">Description</th>
            <th className="py-2.5 px-3">Category</th>
            <th className="py-2.5 px-3">Date</th>
            <th className="py-2.5 px-3 text-right">Amount</th>
            <th className="py-2.5 px-3 text-center">Status</th>
            <th className="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {expenses.map((exp) => (
            <tr key={exp.id} className="hover:bg-surface-50/70 transition-colors">
              <td className="py-2.5 px-3 font-medium text-surface-900">
                <div>{exp.name}</div>
                {exp.notes && (
                  <div className="text-[11px] text-surface-500 font-normal truncate max-w-xs">
                    {exp.notes}
                  </div>
                )}
              </td>
              <td className="py-2.5 px-3 text-surface-600">
                <span className="inline-block px-2 py-0.5 rounded bg-surface-100 text-[11px] font-medium text-surface-700">
                  {exp.categoryName}
                </span>
              </td>
              <td className="py-2.5 px-3 text-surface-500 font-mono text-[11px]">
                {new Date(exp.dateIncurred).toLocaleDateString()}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold text-surface-900">
                {formatMoney(exp.amount, currency)}
              </td>
              <td className="py-2.5 px-3 text-center">
                {getStatusBadge(exp.paymentStatus)}
              </td>
              <td className="py-2.5 px-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(exp)}
                    className="h-7 w-7 p-0 text-surface-500 hover:text-surface-900"
                    title="Edit expense"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(exp.id, exp.name)}
                    disabled={deletingId === exp.id}
                    className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
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
