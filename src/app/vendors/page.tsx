"use client";

import React, { useEffect, useState, useCallback, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { VendorModal } from "@/components/vendors/VendorModal";
import { QuoteModal } from "@/components/vendors/QuoteModal";
import { QuoteComparisonTable } from "@/components/vendors/QuoteComparisonTable";
import { formatMoney } from "@/lib/budget/financial-engine";
import { type VendorWithQuotes } from "@/lib/vendors/vendor-service";
import { VendorStatus } from "@/lib/storage/types";
import {
  getLocalEvents,
  getLocalVendorsAndCategories,
  createLocalVendor,
  updateLocalVendor,
  deleteLocalVendor,
  addLocalVendorQuote,
  selectLocalVendorQuote,
} from "@/lib/storage/local-repository";
import { useAuth } from "@/components/layout/AuthContext";
import {
  Building2,
  Calendar,
  PlusCircle,
  FileText,
  Mail,
  Phone,
  Globe,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  type: string;
  currency: string;
}

function VendorsContent() {
  const searchParams = useSearchParams();
  const urlEventId = searchParams.get("eventId");
  const { user, activeEvent } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(urlEventId);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Vendors state
  const [vendors, setVendors] = useState<VendorWithQuotes[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<string>("directory");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorWithQuotes | null>(null);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [targetVendorForQuote, setTargetVendorForQuote] = useState<{ id: string; name: string } | null>(null);

  const [, startTransition] = useTransition();

  // Load events from local IndexedDB
  const loadEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      setError(null);
      const evList = await getLocalEvents(user?.id);
      setEvents(evList);

      if (evList.length > 0) {
        setSelectedEventId((prev) => (prev && evList.some((e: EventItem) => e.id === prev) ? prev : (activeEvent?.id || evList[0].id)));
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load events from local storage.");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [user?.id, activeEvent?.id]);

  // Load vendors for selected event
  const loadVendors = useCallback(async (eventId: string) => {
    try {
      setLoadingVendors(true);
      setError(null);
      const { vendors: vList, categories: cList } = await getLocalVendorsAndCategories(eventId);
      setVendors(vList);
      setCategories(cList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load vendors.";
      setError(msg);
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (selectedEventId) {
      loadVendors(selectedEventId);
    }
  }, [selectedEventId, loadVendors]);

  // Save vendor (create or update)
  const handleSaveVendor = async (data: {
    categoryName: string;
    companyName: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    websiteUrl?: string | null;
    status: VendorStatus;
    notes?: string | null;
  }) => {
    if (!selectedEventId) return;

    try {
      if (editingVendor) {
        await updateLocalVendor(editingVendor.id, data);
      } else {
        await createLocalVendor({
          eventId: selectedEventId,
          ...data,
        });
      }

      await loadVendors(selectedEventId);
      setEditingVendor(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save vendor.";
      throw new Error(msg);
    }
  };

  // Delete vendor
  const handleDeleteVendor = async (vendorId: string, name: string) => {
    if (!selectedEventId) return;
    if (!confirm(`Are you sure you want to delete vendor "${name}" and all their quotes?`)) return;

    try {
      await deleteLocalVendor(vendorId);
      await loadVendors(selectedEventId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete vendor.";
      alert(msg);
    }
  };

  // Save quotation
  const handleSaveQuote = async (quoteData: {
    vendorId: string;
    description: string;
    quotedAmount: number;
    currency: string;
    validUntil?: string | null;
    isSelected: boolean;
    quoteDocumentUrl?: string | null;
  }) => {
    if (!selectedEventId) return;

    try {
      await addLocalVendorQuote({
        ...quoteData,
        eventId: selectedEventId,
      });
      await loadVendors(selectedEventId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record quote.";
      throw new Error(msg);
    }
  };

  // Select quote
  const handleSelectQuote = async (quoteId: string) => {
    if (!selectedEventId) return;

    try {
      await selectLocalVendorQuote(selectedEventId, quoteId);
      await loadVendors(selectedEventId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to select quote.";
      alert(msg);
    }
  };

  if (loadingEvents) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Vendor Directory & Quotations"
          description="Track service providers, manage quotes, and compare vendor offers side-by-side."
        />
        <EmptyState
          icon={Building2}
          title="Local profile required"
          description="Please select or create a local browser profile to view and manage your vendor directory and quotes."
          actionLabel="Select Profile"
          actionHref="/login"
        />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Vendor Directory & Quotations"
          description="Track service providers, manage quotes, and compare vendor offers side-by-side."
        />
        <EmptyState
          icon={Building2}
          title="No events found"
          description="Create your first event draft to unlock vendor directory management and quote comparisons."
          actionLabel="Create Event"
          actionHref="/events/new"
        />
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const totalQuotesCount = vendors.reduce((sum, v) => sum + v.quotes.length, 0);

  // Filter vendors
  const filteredVendors = vendors.filter((v) => {
    if (selectedCategory !== "ALL" && v.categoryName !== selectedCategory) return false;
    if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: VendorStatus) => {
    switch (status) {
      case "BOOKED":
        return <Badge variant="success" className="text-[10px]">Booked</Badge>;
      case "QUOTED":
        return <Badge variant="primary" className="text-[10px]">Quoted</Badge>;
      case "CONTACTED":
        return <Badge variant="warning" className="text-[10px]">Contacted</Badge>;
      case "DECLINED":
        return <Badge variant="danger" className="text-[10px]">Declined</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Researching</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-page-enter">
      {/* Top Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Vendor Directory & Quotations"
          description="Organize candidate providers, log official quotes, and compare side-by-side pricing."
        />

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Calendar className="h-4 w-4 text-surface-500" />
          <select
            value={selectedEventId || ""}
            onChange={(e) => {
              const id = e.target.value;
              startTransition(() => {
                setSelectedEventId(id);
              });
            }}
            className="rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-xs font-medium text-surface-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Safety Directive Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-warning-500/20 bg-warning-50/70 p-3.5 text-xs text-warning-900 shadow-sm">
        <ShieldAlert className="h-4 w-4 shrink-0 text-warning-600 mt-0.5" />
        <div>
          <span className="font-semibold text-warning-950">Deterministic Vendor Integrity:</span> All
          records below represent verified user-logged vendor communications and quotations.
          EventCraft AI never fabricates vendor identities, phone numbers, or unverified quotes.
        </div>
      </div>

      {loadingVendors && (
        <div className="flex h-36 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          {error}
        </div>
      )}

      {!loadingVendors && selectedEvent && (
        <>
          {/* Main Workspace Tabs Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-200">
            <Tabs
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: "directory", label: "Vendor Directory", count: vendors.length },
                { id: "quotes", label: "Quotation Comparison", count: totalQuotesCount },
              ]}
            />

            <Button
              size="sm"
              onClick={() => {
                setEditingVendor(null);
                setIsVendorModalOpen(true);
              }}
              className="gap-1.5 text-xs self-start sm:self-auto"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Vendor</span>
            </Button>
          </div>

          {/* TAB 1: VENDOR DIRECTORY */}
          {activeTab === "directory" && (
            <div className="space-y-4 pt-2">
              {/* Category & Status Filters */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-50 border border-surface-200 rounded-xl text-xs">
                <span className="font-semibold text-surface-700">Filter by:</span>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded border border-surface-300 bg-white px-2.5 py-1 text-xs text-surface-800"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded border border-surface-300 bg-white px-2.5 py-1 text-xs text-surface-800"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RESEARCHING">Researching</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUOTED">Quoted</option>
                  <option value="BOOKED">Booked</option>
                  <option value="DECLINED">Declined</option>
                </select>

                <span className="ml-auto text-surface-500 text-[11px]">
                  Showing {filteredVendors.length} of {vendors.length} vendors
                </span>
              </div>

              {filteredVendors.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No vendors found"
                  description="Add vendor candidates for catering, photography, venues, or decor to begin organizing your event services."
                  actionLabel="Add First Vendor"
                  onAction={() => {
                    setEditingVendor(null);
                    setIsVendorModalOpen(true);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVendors.map((vendor) => {
                    const selectedQuote = vendor.quotes.find((q) => q.isSelected);

                    return (
                      <Card key={vendor.id} className="p-4 border-surface-200 space-y-3 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-surface-900">{vendor.companyName}</h4>
                              {getStatusBadge(vendor.status)}
                            </div>
                            <span className="text-[11px] text-surface-500 font-medium">
                              {vendor.categoryName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingVendor(vendor);
                                setIsVendorModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-surface-500 hover:text-surface-900"
                              title="Edit vendor"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVendor(vendor.id, vendor.companyName)}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete vendor"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Contact details */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-surface-600 bg-surface-50/70 p-2 rounded-lg border border-surface-100">
                          {vendor.contactPerson && (
                            <div>
                              <span className="text-surface-400 block">Contact:</span>
                              <span className="font-medium text-surface-800">{vendor.contactPerson}</span>
                            </div>
                          )}
                          {vendor.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-surface-400" />
                              <span>{vendor.phone}</span>
                            </div>
                          )}
                          {vendor.email && (
                            <div className="flex items-center gap-1 truncate col-span-2">
                              <Mail className="h-3 w-3 text-surface-400 shrink-0" />
                              <a href={`mailto:${vendor.email}`} className="text-primary-600 hover:underline truncate">
                                {vendor.email}
                              </a>
                            </div>
                          )}
                          {vendor.websiteUrl && (
                            <div className="flex items-center gap-1 truncate col-span-2">
                              <Globe className="h-3 w-3 text-surface-400 shrink-0" />
                              <a
                                href={vendor.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:underline truncate"
                              >
                                {vendor.websiteUrl.replace(/^https?:\/\//, "")}
                              </a>
                            </div>
                          )}
                        </div>

                        {vendor.notes && (
                          <p className="text-[11px] text-surface-500 italic">
                            &ldquo;{vendor.notes}&rdquo;
                          </p>
                        )}

                        {/* Quotations summary footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-surface-100 text-[11px]">
                          <div>
                            {selectedQuote ? (
                              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Selected: {formatMoney(selectedQuote.quotedAmount, selectedQuote.currency)}</span>
                              </span>
                            ) : (
                              <span className="text-surface-400">
                                {vendor.quotes.length} quote{vendor.quotes.length !== 1 ? "s" : ""} logged
                              </span>
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTargetVendorForQuote({ id: vendor.id, name: vendor.companyName });
                              setIsQuoteModalOpen(true);
                            }}
                            className="h-6 text-[10px] px-2 gap-1 text-primary-700 border-primary-200 bg-primary-50 hover:bg-primary-100"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Log Quote</span>
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUOTE COMPARISON TABLE */}
          {activeTab === "quotes" && (
            <div className="pt-2">
              <Card className="p-5 border-surface-200">
                <QuoteComparisonTable
                  vendors={vendors}
                  onSelectQuote={handleSelectQuote}
                />
              </Card>
            </div>
          )}
        </>
      )}

      {/* Vendor Modal */}
      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => {
          setIsVendorModalOpen(false);
          setEditingVendor(null);
        }}
        initialVendor={editingVendor}
        onSave={handleSaveVendor}
      />

      {/* Quote Modal */}
      {targetVendorForQuote && (
        <QuoteModal
          isOpen={isQuoteModalOpen}
          onClose={() => {
            setIsQuoteModalOpen(false);
            setTargetVendorForQuote(null);
          }}
          vendorId={targetVendorForQuote.id}
          vendorName={targetVendorForQuote.name}
          defaultCurrency={selectedEvent?.currency || "USD"}
          onSave={handleSaveQuote}
        />
      )}
    </div>
  );
}

export default function VendorsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <VendorsContent />
    </Suspense>
  );
}
