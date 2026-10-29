"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { VENDOR_CATEGORIES } from "@/lib/vendors/schemas";
import { VendorStatus, type VendorWithQuotes } from "@/lib/storage/types";

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVendor?: VendorWithQuotes | null;
  onSave: (vendorData: {
    categoryName: string;
    companyName: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    websiteUrl?: string | null;
    status: VendorStatus;
    notes?: string | null;
  }) => Promise<void>;
}

export function VendorModal({
  isOpen,
  onClose,
  initialVendor,
  onSave,
}: VendorModalProps) {
  const [categoryName, setCategoryName] = useState(
    initialVendor?.categoryName || VENDOR_CATEGORIES[0]
  );
  const [companyName, setCompanyName] = useState(initialVendor?.companyName || "");
  const [contactPerson, setContactPerson] = useState(initialVendor?.contactPerson || "");
  const [email, setEmail] = useState(initialVendor?.email || "");
  const [phone, setPhone] = useState(initialVendor?.phone || "");
  const [websiteUrl, setWebsiteUrl] = useState(initialVendor?.websiteUrl || "");
  const [status, setStatus] = useState<VendorStatus>(initialVendor?.status || "RESEARCHING");
  const [notes, setNotes] = useState(initialVendor?.notes || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company / Vendor name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        categoryName,
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        status,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save vendor.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialVendor ? "Edit Vendor Record" : "Add Vendor to Directory"}
      description="Manage candidate contacts, proposals, and booking statuses."
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
            {initialVendor ? "Update Vendor" : "Save Vendor"}
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
          label="Company / Vendor Name"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Blossom & Vine Floral Studio"
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="Category"
            required
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            disabled={isSubmitting}
            options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />

          <Select
            label="Pipeline Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as VendorStatus)}
            disabled={isSubmitting}
            options={[
              { value: "RESEARCHING", label: "Researching" },
              { value: "CONTACTED", label: "Contacted" },
              { value: "QUOTED", label: "Quoted" },
              { value: "BOOKED", label: "Booked" },
              { value: "DECLINED", label: "Declined" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Contact Person"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="e.g. Sarah Jenkins"
            disabled={isSubmitting}
          />

          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 234-5678"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@vendor.com"
            disabled={isSubmitting}
          />

          <Input
            label="Website URL"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://..."
            disabled={isSubmitting}
          />
        </div>

        <Textarea
          label="Private Planning Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Recommended by venue coordinator, offers 10% weekday discount..."
          disabled={isSubmitting}
        />
      </form>
    </Modal>
  );
}
