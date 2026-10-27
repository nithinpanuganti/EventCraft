"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { VENDOR_CATEGORIES } from "@/lib/vendors/schemas";
import { VendorStatus } from "@prisma/client";
import { type VendorWithQuotes } from "@/lib/vendors/vendor-service";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/30 backdrop-blur-md animate-fade-in">
      <div className="glass-surface-elevated specular-top w-full max-w-md rounded-2xl p-6 shadow-glass-elevated">
        <div className="flex items-center justify-between pb-3 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-900">
            {initialVendor ? "Edit Vendor Record" : "Add Vendor to Directory"}
          </h3>
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
            <label className="block font-medium text-surface-700 mb-1">Company / Vendor Name *</label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Blossom & Vine Floral Studio"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Category *"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                disabled={isSubmitting}
                options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>

            <div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-surface-700 mb-1">Contact Person</label>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block font-medium text-surface-700 mb-1">Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 234-5678"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-surface-700 mb-1">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@vendor.com"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block font-medium text-surface-700 mb-1">Website URL</label>
              <Input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-surface-700 mb-1">Private Planning Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Recommended by venue coordinator, offers 10% weekday discount..."
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initialVendor ? "Update Vendor" : "Save Vendor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
