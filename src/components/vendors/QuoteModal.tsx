"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Vendor Quotation"
      description={`Log formal pricing proposals and contracts for ${vendorName}.`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="shadow-glass font-medium"
          >
            Record Quotation
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-xl bg-danger-50/90 border border-danger-200/80 text-danger-800 text-xs shadow-glass-subtle">
            {error}
          </div>
        )}

        <Input
          label="Package / Service Description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Standard 8-Hour Coverage + 2 Photographers"
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label={`Quoted Amount (${currency})`}
            required
            type="number"
            step="0.01"
            min="0.01"
            value={quotedAmount}
            onChange={(e) => setQuotedAmount(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />

          <Input
            label="Valid Until / Expiration"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="Document URL / Proposal Link"
          type="url"
          value={quoteDocumentUrl}
          onChange={(e) => setQuoteDocumentUrl(e.target.value)}
          placeholder="https://drive.google.com/..."
          disabled={isSubmitting}
        />

        <label className="flex items-center gap-2.5 p-3 rounded-xl glass-surface-subtle border border-surface-200/80 cursor-pointer shadow-glass-subtle">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => setIsSelected(e.target.checked)}
            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-surface-800 font-semibold text-xs">
            Mark as currently selected / shortlisted quote
          </span>
        </label>
      </form>
    </Modal>
  );
}
