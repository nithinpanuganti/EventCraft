"use client";

import React, { useEffect, useState, useCallback, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";

const VendorModal = dynamic(
  () => import("@/components/vendors/VendorModal").then((mod) => mod.VendorModal),
  { ssr: false }
);
const QuoteModal = dynamic(
  () => import("@/components/vendors/QuoteModal").then((mod) => mod.QuoteModal),
  { ssr: false }
);
import { QuoteComparisonTable } from "@/components/vendors/QuoteComparisonTable";
import { formatMoney } from "@/lib/budget/financial-engine";
import {
  type VendorWithQuotes,
  VendorStatus,
  LocalVendorContract,
  LocalVendorPayment,
  ContractStatus,
  VendorPaymentType,
  VendorPaymentMethod,
  PaymentStatus,
} from "@/lib/storage/types";
import {
  getLocalEvents,
  getLocalVendorsAndCategories,
  createLocalVendor,
  updateLocalVendor,
  deleteLocalVendor,
  addLocalVendorQuote,
  selectLocalVendorQuote,
  getLocalVendorContracts,
  createLocalVendorContract,
  deleteLocalVendorContract,
  getLocalVendorPayments,
  createLocalVendorPayment,
  deleteLocalVendorPayment,
} from "@/lib/storage/local-repository";
import { useAuth } from "@/components/layout/AuthContext";
import {
  Building2,
  Calendar,
  PlusCircle,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  DollarSign,
  Plus,
  FileCheck,
  X,
} from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  type: string;
  currency: string;
}

const CONTRACT_STATUS_BADGES: Record<
  ContractStatus,
  { label: string; variant: "success" | "warning" | "danger" | "primary" }
> = {
  DRAFT: { label: "Draft", variant: "warning" },
  PENDING_SIGNATURE: { label: "Pending Signature", variant: "warning" },
  SIGNED: { label: "Signed & Active", variant: "primary" },
  COMPLETED: { label: "Completed", variant: "success" },
  TERMINATED: { label: "Terminated", variant: "danger" },
};

const PAYMENT_STATUS_BADGES: Record<
  PaymentStatus,
  { label: string; variant: "success" | "warning" | "danger" | "primary" | "secondary" }
> = {
  PAID: { label: "Paid & Cleared", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  SCHEDULED: { label: "Scheduled", variant: "primary" },
  OVERDUE: { label: "Overdue", variant: "danger" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
};

function VendorsContent() {
  const searchParams = useSearchParams();
  const urlEventId = searchParams.get("eventId");
  const initialTab = searchParams.get("tab") || "directory";
  const { user, activeEvent } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(urlEventId);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Vendors state
  const [vendors, setVendors] = useState<VendorWithQuotes[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contracts & Payments state
  const [contracts, setContracts] = useState<LocalVendorContract[]>([]);
  const [payments, setPayments] = useState<LocalVendorPayment[]>([]);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorWithQuotes | null>(null);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [targetVendorForQuote, setTargetVendorForQuote] = useState<{ id: string; name: string } | null>(null);

  // Contract Modal
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    vendorId: "",
    contractNumber: "",
    title: "",
    totalAmount: 0,
    advancePayment: 0,
    status: "SIGNED" as ContractStatus,
    deliverables: "",
    terms: "",
  });

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    vendorId: "",
    contractId: "",
    amount: 0,
    paymentType: "ADVANCE" as VendorPaymentType,
    paymentMethod: "BANK_TRANSFER" as VendorPaymentMethod,
    dueDate: new Date().toISOString().slice(0, 10),
    paidDate: new Date().toISOString().slice(0, 10),
    receiptNumber: "",
    notes: "",
    status: "PAID" as PaymentStatus,
  });

  const [, startTransition] = useTransition();

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      setError(null);
      const evList = await getLocalEvents(user?.id);
      setEvents(evList);

      if (evList.length > 0) {
        setSelectedEventId((prev) =>
          prev && evList.some((e: EventItem) => e.id === prev)
            ? prev
            : activeEvent?.id || evList[0].id
        );
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load events from local storage.");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [user?.id, activeEvent?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load vendors, contracts, and payments
  const loadVendorData = useCallback(async (evId: string) => {
    try {
      setLoadingVendors(true);
      setError(null);
      const [vendorRes, contractsRes, paymentsRes] = await Promise.all([
        getLocalVendorsAndCategories(evId),
        getLocalVendorContracts(evId),
        getLocalVendorPayments(evId),
      ]);
      setVendors(vendorRes.vendors);
      setCategories(vendorRes.categories);
      setContracts(contractsRes);
      setPayments(paymentsRes);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to load vendor directory & contracts.");
      setVendors([]);
      setCategories([]);
      setContracts([]);
      setPayments([]);
    } finally {
      setLoadingVendors(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadVendorData(selectedEventId);
    } else {
      setVendors([]);
      setCategories([]);
      setContracts([]);
      setPayments([]);
    }
  }, [selectedEventId, loadVendorData]);

  // Vendor actions
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

    if (editingVendor) {
      await updateLocalVendor(editingVendor.id, data);
    } else {
      await createLocalVendor({
        eventId: selectedEventId,
        ...data,
      });
    }

    await loadVendorData(selectedEventId);
    setEditingVendor(null);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm("Are you sure you want to remove this vendor and its quotes?")) return;
    if (!selectedEventId) return;

    await deleteLocalVendor(vendorId);
    await loadVendorData(selectedEventId);
  };

  const handleSaveQuote = async (data: {
    quotedAmount: number;
    description?: string | null;
    currency?: string;
    validUntil?: string | null;
    quoteDocumentUrl?: string | null;
  }) => {
    if (!selectedEventId || !targetVendorForQuote) return;

    await addLocalVendorQuote({
      eventId: selectedEventId,
      vendorId: targetVendorForQuote.id,
      description: data.description || "Quoted Service Package",
      quotedAmount: data.quotedAmount,
      currency: data.currency,
      validUntil: data.validUntil,
      quoteDocumentUrl: data.quoteDocumentUrl,
    });

    await loadVendorData(selectedEventId);
    setTargetVendorForQuote(null);
  };

  const handleSelectQuote = async (quoteId: string) => {
    if (!selectedEventId) return;
    await selectLocalVendorQuote(selectedEventId, quoteId);
    await loadVendorData(selectedEventId);
  };

  // Contract actions
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !contractForm.title.trim()) return;

    await createLocalVendorContract({
      eventId: selectedEventId,
      vendorId: contractForm.vendorId || (vendors[0]?.id || "v-1"),
      contractNumber: contractForm.contractNumber || `CON-${Date.now().toString().slice(-4)}`,
      title: contractForm.title.trim(),
      totalAmount: contractForm.totalAmount,
      advanceAmount: contractForm.advancePayment,
      status: contractForm.status,
      signedDate: new Date().toISOString(),
      effectiveDate: new Date().toISOString(),
      completionDate: new Date().toISOString(),
      termsAndConditions: contractForm.terms || undefined,
    });

    setIsContractModalOpen(false);
    setContractForm({
      vendorId: "",
      contractNumber: "",
      title: "",
      totalAmount: 0,
      advancePayment: 0,
      status: "SIGNED",
      deliverables: "",
      terms: "",
    });
    await loadVendorData(selectedEventId);
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm("Are you sure you want to delete this contract?")) return;
    await deleteLocalVendorContract(contractId);
    if (selectedEventId) await loadVendorData(selectedEventId);
  };

  // Payment actions
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || paymentForm.amount <= 0) return;

    await createLocalVendorPayment({
      eventId: selectedEventId,
      vendorId: paymentForm.vendorId || (vendors[0]?.id || "v-1"),
      contractId: paymentForm.contractId || undefined,
      title: `${paymentForm.paymentType} Payment`,
      amount: paymentForm.amount,
      amountCents: Math.round(paymentForm.amount * 100),
      paymentType: paymentForm.paymentType,
      paymentMethod: paymentForm.paymentMethod,
      status: paymentForm.status,
      dueDate: paymentForm.dueDate,
      paidDate: paymentForm.status === "PAID" ? paymentForm.paidDate : null,
      receiptNumber: paymentForm.receiptNumber || `REC-${Date.now().toString().slice(-4)}`,
      notes: paymentForm.notes || undefined,
    });

    setIsPaymentModalOpen(false);
    setPaymentForm({
      vendorId: "",
      contractId: "",
      amount: 0,
      paymentType: "ADVANCE",
      paymentMethod: "BANK_TRANSFER",
      dueDate: new Date().toISOString().slice(0, 10),
      paidDate: new Date().toISOString().slice(0, 10),
      receiptNumber: "",
      notes: "",
      status: "PAID",
    });
    if (selectedEventId) await loadVendorData(selectedEventId);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment entry?")) return;
    await deleteLocalVendorPayment(paymentId);
    if (selectedEventId) await loadVendorData(selectedEventId);
  };

  if (!user && !loadingEvents) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Vendor Directory & Contracts"
          description="Track service providers, manage quotes, contracts, and payments."
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
          title="Vendor Directory & Contracts"
          description="Track service providers, manage quotes, contracts, and payments."
        />
        <EmptyState
          icon={Building2}
          title="No events found"
          description="Create your first event draft to unlock vendor directory management and contracts."
          actionLabel="Create Event"
          actionHref="/events/new"
        />
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const totalQuotesCount = vendors.reduce((sum, v) => sum + v.quotes.length, 0);

  // Financial sums for payments
  const totalContracted = contracts.reduce((acc, c) => acc + c.totalAmount, 0);
  const totalDisbursed = payments
    .filter((p) => p.status === "PAID")
    .reduce((acc, p) => acc + p.amount, 0);
  const outstandingBalance = Math.max(0, totalContracted - totalDisbursed);

  // Filter vendors
  const filteredVendors = vendors.filter((v) => {
    if (selectedCategory !== "ALL" && v.categoryName !== selectedCategory) return false;
    if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: VendorStatus) => {
    switch (status) {
      case "BOOKED":
        return <Badge variant="success" size="sm">Booked</Badge>;
      case "QUOTED":
        return <Badge variant="primary" size="sm">Quoted</Badge>;
      case "CONTACTED":
        return <Badge variant="warning" size="sm">Contacted</Badge>;
      case "DECLINED":
        return <Badge variant="danger" size="sm">Declined</Badge>;
      default:
        return <Badge variant="secondary" size="sm">Researching</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-page-enter max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Vendor Management & Contracts"
          description="Organize candidate providers, compare side-by-side quotes, track contracts, and manage payments."
        />

        <div className="flex items-center gap-2 self-start md:self-auto rounded-2xl glass-card px-3.5 py-2 shadow-glass-subtle">
          <Calendar className="h-4 w-4 text-primary-600" />
          <select
            aria-label="Select Event"
            value={selectedEventId || ""}
            onChange={(e) => {
              const id = e.target.value;
              startTransition(() => {
                setSelectedEventId(id);
              });
            }}
            className="glass-input rounded-xl px-3 py-1.5 text-xs font-semibold text-surface-800 shadow-glass-subtle cursor-pointer focus:outline-none"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id} className="bg-white text-surface-900">
                {evt.title} ({evt.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Safety Directive Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-warning-500/25 bg-warning-50/80 dark:bg-warning-950/20 backdrop-blur-md p-4 text-xs text-warning-950 dark:text-warning-200 shadow-glass-subtle">
        <ShieldAlert className="h-5 w-5 shrink-0 text-warning-600 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Contractual Safeguard:</span> All vendor contracts, advance disbursement receipts, and financial terms remain saved exclusively on your local device.
        </div>
      </div>

      {loadingVendors && (
        <div className="flex h-36 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-danger-200/80 bg-danger-50/80 backdrop-blur-md p-4 text-xs text-danger-800 shadow-glass">
          {error}
        </div>
      )}

      {!loadingVendors && selectedEvent && (
        <>
          {/* Main Workspace Tabs Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-200/60 dark:border-surface-800/60">
            <Tabs
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: "directory", label: "Vendor Directory", count: vendors.length },
                { id: "quotes", label: "Quotation Comparison", count: totalQuotesCount },
                { id: "contracts", label: "Contracts & Terms", count: contracts.length },
                { id: "payments", label: "Payment Ledger", count: payments.length },
              ]}
            />

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {activeTab === "contracts" && (
                <Button
                  size="sm"
                  onClick={() => setIsContractModalOpen(true)}
                  className="gap-1.5 text-xs shadow-glass font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Contract</span>
                </Button>
              )}

              {activeTab === "payments" && (
                <Button
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="gap-1.5 text-xs shadow-glass font-medium"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Record Payment</span>
                </Button>
              )}

              {activeTab === "directory" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingVendor(null);
                    setIsVendorModalOpen(true);
                  }}
                  className="gap-1.5 text-xs shadow-glass font-medium"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Add Vendor</span>
                </Button>
              )}
            </div>
          </div>

          {/* TAB 1: VENDOR DIRECTORY */}
          {activeTab === "directory" && (
            <div className="space-y-4 pt-2 animate-page-enter">
              {/* Category & Status Filters in Glass Surface */}
              <div className="flex flex-wrap items-center gap-3 p-3.5 glass-surface-subtle border border-surface-200/80 dark:border-surface-800/80 rounded-2xl text-xs shadow-glass-subtle">
                <span className="font-bold text-surface-700">Filter by:</span>

                <select
                  aria-label="Filter by Category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="glass-input rounded-xl px-3 py-1.5 text-xs text-surface-800 font-medium cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="glass-input rounded-xl px-3 py-1.5 text-xs text-surface-800 font-medium cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RESEARCHING">Researching</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUOTED">Quoted</option>
                  <option value="BOOKED">Booked</option>
                  <option value="DECLINED">Declined</option>
                </select>
              </div>

              {filteredVendors.length === 0 ? (
                <div className="py-12 text-center text-xs text-surface-400">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No vendors found matching your filter criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVendors.map((vendor) => {
                    const selectedQuote = vendor.quotes.find((q) => q.isSelected);
                    return (
                      <Card key={vendor.id} variant="elevated" className="p-5 specular-top flex flex-col justify-between space-y-4">
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                                {vendor.categoryName}
                              </span>
                              <h3 className="font-bold text-sm text-surface-900">{vendor.companyName}</h3>
                            </div>
                            {getStatusBadge(vendor.status)}
                          </div>

                          <div className="space-y-1 text-xs text-surface-600">
                            {vendor.contactPerson && (
                              <div className="truncate">Contact: {vendor.contactPerson}</div>
                            )}
                            {vendor.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="h-3 w-3 text-surface-400 shrink-0" />
                                <span className="truncate">{vendor.email}</span>
                              </div>
                            )}
                            {vendor.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-surface-400 shrink-0" />
                                <span>{vendor.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-surface-200/50 dark:border-surface-800/50 flex items-center justify-between text-xs">
                          <div>
                            {selectedQuote ? (
                              <span className="font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{formatMoney(selectedQuote.quotedAmount, selectedQuote.currency)}</span>
                              </span>
                            ) : (
                              <span className="text-surface-400">{vendor.quotes.length} quotes logged</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setTargetVendorForQuote({ id: vendor.id, name: vendor.companyName });
                                setIsQuoteModalOpen(true);
                              }}
                              className="text-[11px] px-2 py-1"
                            >
                              Log Quote
                            </Button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVendor(vendor);
                                setIsVendorModalOpen(true);
                              }}
                              className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVendor(vendor.id)}
                              className="p-1.5 text-surface-400 hover:text-rose-500 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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
            <div className="pt-2 animate-page-enter">
              <Card className="p-5 sm:p-6 specular-top">
                <QuoteComparisonTable
                  vendors={vendors}
                  onSelectQuote={handleSelectQuote}
                />
              </Card>
            </div>
          )}

          {/* TAB 3: CONTRACTS & TERMS */}
          {activeTab === "contracts" && (
            <div className="space-y-4 pt-2 animate-page-enter">
              {contracts.length === 0 ? (
                <Card variant="subtle" className="p-10 text-center space-y-3">
                  <FileCheck className="h-10 w-10 text-surface-400 mx-auto" />
                  <h3 className="text-sm font-bold text-surface-900">No Contracts Established</h3>
                  <p className="text-xs text-surface-500 max-w-sm mx-auto">
                    Create formal vendor contracts with deliverables, advance schedules, and fulfillment terms.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setIsContractModalOpen(true)}
                    className="gap-1.5 text-xs shadow-glass"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Contract</span>
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contracts.map((contract) => {
                    const cBadge = CONTRACT_STATUS_BADGES[contract.status];
                    const vendorMatch = vendors.find((v) => v.id === contract.vendorId);

                    return (
                      <Card key={contract.id} variant="elevated" className="p-5 specular-top flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                #{contract.contractNumber}
                              </span>
                              <h3 className="font-bold text-sm text-surface-900">{contract.title}</h3>
                              <div className="text-xs text-primary-600 dark:text-primary-400 font-semibold">
                                {vendorMatch ? vendorMatch.companyName : "Vendor"}
                              </div>
                            </div>
                            <Badge variant={cBadge.variant} size="sm">
                              {cBadge.label}
                            </Badge>
                          </div>

                          <div className="p-3 rounded-xl bg-surface-500/5 border border-white/10 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-surface-500">Total Contract:</span>
                              <span className="font-bold text-surface-900">
                                {formatMoney(contract.totalAmount, selectedEvent?.currency || "USD")}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-surface-500">Advance Paid:</span>
                              <span className="text-emerald-600 font-semibold">
                                {formatMoney(contract.advanceAmount, selectedEvent?.currency || "USD")}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-surface-200/50 dark:border-surface-800/50 pt-1">
                              <span className="text-surface-500 font-medium">Balance Due:</span>
                              <span className="text-surface-900 font-bold">
                                {formatMoney(Math.max(0, contract.totalAmount - contract.advanceAmount), selectedEvent?.currency || "USD")}
                              </span>
                            </div>
                          </div>

                          {contract.termsAndConditions && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-surface-500">
                                Terms & Conditions
                              </span>
                              <p className="text-xs text-surface-600 line-clamp-2">
                                {contract.termsAndConditions}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-surface-200/50 dark:border-surface-800/50 flex items-center justify-between text-xs">
                          <span className="text-surface-400 text-[11px]">
                            Signed: {contract.signedDate ? new Date(contract.signedDate).toLocaleDateString() : "Pending"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteContract(contract.id)}
                            className="p-1.5 text-surface-400 hover:text-rose-500 rounded-lg"
                            title="Delete Contract"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PAYMENT LEDGER */}
          {activeTab === "payments" && (
            <div className="space-y-5 pt-2 animate-page-enter">
              {/* Financial Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card variant="subtle" className="p-4">
                  <div className="text-xs text-surface-500 font-medium">Total Contracted</div>
                  <div className="text-2xl font-black text-surface-900 mt-1">
                    {formatMoney(totalContracted, selectedEvent?.currency || "USD")}
                  </div>
                </Card>
                <Card variant="subtle" className="p-4">
                  <div className="text-xs text-emerald-600 font-medium">Total Disbursed</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {formatMoney(totalDisbursed, selectedEvent?.currency || "USD")}
                  </div>
                </Card>
                <Card variant="subtle" className="p-4">
                  <div className="text-xs text-amber-500 font-medium">Outstanding Balance</div>
                  <div className="text-2xl font-black text-surface-900 mt-1">
                    {formatMoney(outstandingBalance, selectedEvent?.currency || "USD")}
                  </div>
                </Card>
              </div>

              {/* Payments Table */}
              <Card variant="elevated" className="overflow-hidden specular-top">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-500/5 border-b border-surface-200/50 dark:border-surface-800/50 uppercase tracking-wider text-[11px] text-surface-500 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Receipt #</th>
                        <th className="py-3 px-4">Vendor</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200/40 dark:divide-surface-800/40">
                      {payments.length > 0 ? (
                        payments.map((p) => {
                          const vendorMatch = vendors.find((v) => v.id === p.vendorId);
                          const pBadge = PAYMENT_STATUS_BADGES[p.status];
                          return (
                            <tr key={p.id} className="hover:bg-primary-500/5 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-surface-900">
                                {p.receiptNumber || "N/A"}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-surface-800">
                                {vendorMatch ? vendorMatch.companyName : "Vendor"}
                              </td>
                              <td className="py-3.5 px-4 text-surface-600">{p.paymentType}</td>
                              <td className="py-3.5 px-4 font-extrabold text-surface-900">
                                {formatMoney(p.amount, selectedEvent?.currency || "USD")}
                              </td>
                              <td className="py-3.5 px-4 text-surface-600">{p.paymentMethod}</td>
                              <td className="py-3.5 px-4">
                                <Badge variant={pBadge.variant} size="sm">
                                  {pBadge.label}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-4 text-surface-500">
                                {p.paidDate ? new Date(p.paidDate).toLocaleDateString() : p.dueDate}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(p.id)}
                                  className="p-1 rounded text-surface-400 hover:text-rose-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-surface-400">
                            No payment disbursements recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* New Contract Modal */}
      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg glass-surface rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-glass-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-3">
              <h3 className="font-bold text-surface-900">Create Vendor Contract</h3>
              <button
                type="button"
                onClick={() => setIsContractModalOpen(false)}
                className="p-1 rounded-md text-surface-400 hover:text-surface-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">
                  Select Vendor
                </label>
                <select
                  value={contractForm.vendorId}
                  onChange={(e) => setContractForm({ ...contractForm, vendorId: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                >
                  <option value="">Select a vendor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.companyName} ({v.categoryName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Contract Title"
                  required
                  placeholder="e.g. Master Catering Agreement"
                  value={contractForm.title}
                  onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                />
                <Input
                  label="Contract #"
                  placeholder="e.g. CON-2026-01"
                  value={contractForm.contractNumber}
                  onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Total Amount ($)"
                  type="number"
                  step="0.01"
                  required
                  value={contractForm.totalAmount}
                  onChange={(e) =>
                    setContractForm({ ...contractForm, totalAmount: parseFloat(e.target.value) || 0 })
                  }
                />
                <Input
                  label="Advance Payment ($)"
                  type="number"
                  step="0.01"
                  value={contractForm.advancePayment}
                  onChange={(e) =>
                    setContractForm({ ...contractForm, advancePayment: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <Input
                label="Deliverables (Comma-separated)"
                placeholder="e.g. 3-Course Dinner, Cocktail Bar, Service Staff"
                value={contractForm.deliverables}
                onChange={(e) => setContractForm({ ...contractForm, deliverables: e.target.value })}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200/50 dark:border-surface-800/50">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsContractModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="shadow-glass-glow">
                  Save Contract
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg glass-surface rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-glass-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-3">
              <h3 className="font-bold text-surface-900">Record Vendor Payment</h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-md text-surface-400 hover:text-surface-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">Vendor</label>
                  <select
                    value={paymentForm.vendorId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, vendorId: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Amount ($)"
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">Payment Type</label>
                  <select
                    value={paymentForm.paymentType}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, paymentType: e.target.value as VendorPaymentType })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                  >
                    <option value="ADVANCE">Advance / Deposit</option>
                    <option value="MILESTONE">Milestone</option>
                    <option value="FINAL">Final Settlement</option>
                    <option value="REFUND">Refund</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as VendorPaymentMethod })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Wire</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="CHECK">Check</option>
                    <option value="DIGITAL_WALLET">Digital Wallet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Receipt / Transaction #"
                  placeholder="e.g. TX-98412"
                  value={paymentForm.receiptNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                />
                <Input
                  label="Payment Date"
                  type="date"
                  value={paymentForm.paidDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200/50 dark:border-surface-800/50">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="shadow-glass-glow">
                  Record Disbursement
                </Button>
              </div>
            </form>
          </div>
        </div>
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
