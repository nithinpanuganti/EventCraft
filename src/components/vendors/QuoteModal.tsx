"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  defaultCurrency?: string;
  onSave: (quoteData: {
    vendorId: string;
    description: string;
    quotedAmount: number;
    currency: string;
    validUntil?: string | null;
    isSelected: boolean;
    quoteDocumentUrl?: string | null;
  }) => Promise<void>;
}

export function QuoteModal({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  defaultCurrency = "INR",
  onSave,
}: QuoteModalProps) {
  const [description, setDescription] = useState("");
  const [quotedAmount, setQuotedAmount] = useState("");
  const currency = defaultCurrency;
  const [validUntil, setValidUntil] = useState("");
  const [isSelected, setIsSelected] = useState(false);
  const [quoteDocumentUrl, setQuoteDocumentUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(quotedAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please provide a valid positive quoted amount.");
      return;
    }
    if (!description.trim()) {
      setError("Quote description is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        vendorId,
        description: description.trim(),
        quotedAmount: amount,
        currency,
        validUntil: validUntil || null,
        isSelected,
        quoteDocumentUrl: quoteDocumentUrl.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record quote.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/30 backdrop-blur-md animate-fade-in">
      <div className="glass-surface-elevated specular-top w-full max-w-md rounded-2xl p-6 shadow-glass-elevated">
        <div className="flex items-center justify-between pb-3 border-b border-surface-100">
          <div>
            <h3 className="text-base font-semibold text-surface-900">Record Vendor Quotation</h3>
            <p className="text-xs text-surface-500">{vendorName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-700 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="block font-medium text-surface-700 mb-1">
              Package / Service Description *
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Standard 8-Hour Coverage + 2 Photographers"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-surface-700 mb-1">
                Quoted Amount ({currency}) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
                placeholder="0.00"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block font-medium text-surface-700 mb-1">Valid Until / Expiration</label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-surface-700 mb-1">
              Document URL / Quote Link
            </label>
            <Input
              type="url"
              value={quoteDocumentUrl}
              onChange={(e) => setQuoteDocumentUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={isSubmitting}
            />
          </div>

          <label className="flex items-center gap-2 p-2 rounded-lg bg-surface-50 border border-surface-200 cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => setIsSelected(e.target.checked)}
              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-surface-700 font-medium">Mark as currently selected / shortlisted quote</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Record Quotation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
