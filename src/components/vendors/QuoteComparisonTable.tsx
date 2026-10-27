"use client";

import React from "react";
import { formatMoney } from "@/lib/budget/financial-engine";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Check, ExternalLink, Calendar, CheckCircle2 } from "lucide-react";
import { type VendorWithQuotes } from "@/lib/vendors/vendor-service";

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
      <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-surface-200 bg-surface-50 text-xs text-surface-500">
        <p>No vendor quotations logged yet.</p>
        <p className="mt-0.5 text-[11px] text-surface-400">
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
    <div className="overflow-x-auto rounded-xl border border-surface-200/70 bg-white/40 backdrop-blur-md shadow-glass">
      <table className="w-full text-left text-xs">
        <thead className="bg-white/70 backdrop-blur-md text-surface-700 font-semibold border-b border-surface-200/60">
          <tr>
            <th className="py-2.5 px-3">Vendor & Category</th>
            <th className="py-2.5 px-3">Package / Scope</th>
            <th className="py-2.5 px-3 text-right">Quoted Amount</th>
            <th className="py-2.5 px-3">Valid Until</th>
            <th className="py-2.5 px-3 text-center">Status</th>
            <th className="py-2.5 px-3 text-right">Selection Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {allQuotes.map((q) => {
            const isLowest = lowestByCategory.get(q.vendorCategory) === q.quotedAmount;
            const isExpired =
              q.validUntil && new Date(q.validUntil).getTime() < new Date().setHours(0, 0, 0, 0);

            return (
              <tr
                key={q.id}
                className={`transition-colors ${
                  q.isSelected ? "bg-emerald-50/50" : "hover:bg-primary-50/20"
                }`}
              >
                <td className="py-3 px-3">
                  <div className="font-semibold text-surface-900">{q.vendorName}</div>
                  <div className="text-[11px] text-surface-500">{q.vendorCategory}</div>
                </td>
                <td className="py-3 px-3 font-medium text-surface-800">
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
                <td className="py-3 px-3 text-right font-mono font-bold text-surface-900">
                  <div>{formatMoney(q.quotedAmount, q.currency)}</div>
                  {isLowest && (
                    <span className="text-[10px] text-emerald-600 font-normal">
                      Lowest in category
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-surface-500 text-[11px]">
                  {q.validUntil ? (
                    <span className={`flex items-center gap-1 ${isExpired ? "text-rose-600" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(q.validUntil).toLocaleDateString()}</span>
                      {isExpired && <span className="font-semibold">(Expired)</span>}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 px-3 text-center">
                  {q.isSelected ? (
                    <Badge variant="success" className="text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Selected Offer</span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Alternative
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-3 text-right">
                  {q.isSelected ? (
                    <span className="text-emerald-700 font-semibold text-[11px]">Active</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectQuote(q.id)}
                      className="h-7 text-[11px] px-2.5 gap-1 text-primary-700 border-primary-200 hover:bg-primary-50"
                    >
                      <Check className="h-3 w-3" />
                      <span>Select This Offer</span>
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
