"use client";

import React from "react";
import { formatMoney } from "@/lib/budget/financial-engine";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Check, ExternalLink, Calendar, CheckCircle2 } from "lucide-react";
import { type VendorWithQuotes } from "@/lib/storage/types";

interface QuoteComparisonTableProps {
  vendors: VendorWithQuotes[];
  onSelectQuote: (quoteId: string) => Promise<void>;
}

export function QuoteComparisonTable({
  vendors,
  onSelectQuote,
}: QuoteComparisonTableProps) {
  // Flatten all quotes with vendor names
  const allQuotes = vendors.flatMap((v) =>
    v.quotes.map((q) => ({
      ...q,
      vendorName: v.companyName,
      vendorCategory: v.categoryName,
      vendorContact: v.contactPerson,
      vendorPhone: v.phone,
      vendorEmail: v.email,
    }))
  );

  if (allQuotes.length === 0) {
    return (
      <div className="flex h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-300/70 glass-surface-subtle text-xs text-surface-500 shadow-glass-subtle">
        <p className="font-semibold text-surface-700">No vendor quotations logged yet.</p>
        <p className="mt-1 text-[11px] text-surface-400">
          Add quotes to your vendors to enable side-by-side pricing comparisons.
        </p>
      </div>
    );
  }

  // Find lowest price quote per category
  const lowestByCategory = new Map<string, number>();
  for (const q of allQuotes) {
    const curr = lowestByCategory.get(q.vendorCategory);
    if (curr === undefined || q.quotedAmount < curr) {
      lowestByCategory.set(q.vendorCategory, q.quotedAmount);
    }
  }

  return (
    <div className="glass-table-wrapper">
      <table className="w-full text-left text-xs">
        <thead className="glass-table-thead text-surface-700 font-semibold border-b border-surface-200/70">
          <tr>
            <th className="py-3 px-3.5">Vendor & Category</th>
            <th className="py-3 px-3.5">Package / Scope</th>
            <th className="py-3 px-3.5 text-right">Quoted Amount</th>
            <th className="py-3 px-3.5">Valid Until</th>
            <th className="py-3 px-3.5 text-center">Status</th>
            <th className="py-3 px-3.5 text-right">Selection Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200/50">
          {allQuotes.map((q) => {
            const isLowest = lowestByCategory.get(q.vendorCategory) === q.quotedAmount;
            const isExpired =
              q.validUntil && new Date(q.validUntil).getTime() < new Date().setHours(0, 0, 0, 0);

            return (
              <tr
                key={q.id}
                className={`transition-colors ${
                  q.isSelected ? "bg-emerald-50/50" : "hover:bg-white/60"
                }`}
              >
                <td className="py-3.5 px-3.5">
                  <div className="font-bold text-surface-900">{q.vendorName}</div>
                  <div className="text-[11px] text-surface-500 font-medium">{q.vendorCategory}</div>
                </td>
                <td className="py-3.5 px-3.5 font-medium text-surface-800">
                  <div>{q.description}</div>
                  {q.quoteDocumentUrl && (
                    <a
                      href={q.quoteDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary-600 hover:underline mt-0.5"
                    >
                      <span>View PDF Proposal</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </td>
                <td className="py-3.5 px-3.5 text-right font-mono font-bold text-surface-900">
                  <div>{formatMoney(q.quotedAmount, q.currency)}</div>
                  {isLowest && (
                    <span className="text-[10px] text-emerald-600 font-semibold block">
                      Lowest in category
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-3.5 text-surface-500 text-[11px]">
                  {q.validUntil ? (
                    <span className={`flex items-center gap-1 ${isExpired ? "text-danger-600 font-semibold" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(q.validUntil).toLocaleDateString()}</span>
                      {isExpired && <span>(Expired)</span>}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3.5 px-3.5 text-center">
                  {q.isSelected ? (
                    <Badge variant="success" size="sm" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Selected</span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      Alternative
                    </Badge>
                  )}
                </td>
                <td className="py-3.5 px-3.5 text-right">
                  {q.isSelected ? (
                    <span className="text-emerald-700 font-bold text-xs">Active</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectQuote(q.id)}
                      className="h-7 text-[11px] px-2.5 gap-1 text-primary-700 border-primary-200/80 hover:bg-primary-50 shadow-glass-subtle font-semibold"
                    >
                      <Check className="h-3 w-3" />
                      <span>Select Offer</span>
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
