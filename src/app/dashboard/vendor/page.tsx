"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Briefcase,
  ClipboardList,
  DollarSign,
  CalendarClock,
  CheckCircle2,
  Send,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/layout/AuthContext";
import {
  getLocalVendors,
  getLocalVendorContracts,
  getLocalVendorPayments,
} from "@/lib/storage/local-repository";
import {
  LocalVendorContract,
  LocalVendorPayment,
  LocalVendorQuote,
} from "@/lib/storage/types";
import { VendorWithQuotes } from "@/lib/storage/local-repository";

export default function VendorDashboardPage() {
  const { session, activeProfile, activeEvent } = useAuth();
  const [vendorRecord, setVendorRecord] = useState<VendorWithQuotes | null>(null);
  const [contracts, setContracts] = useState<LocalVendorContract[]>([]);
  const [payments, setPayments] = useState<LocalVendorPayment[]>([]);
  const [quotes, setQuotes] = useState<LocalVendorQuote[]>([]);

  useEffect(() => {
    async function loadVendorData() {
      if (!activeEvent) return;
      try {
        const vendors = await getLocalVendors(activeEvent.id);
        const myVendor =
          vendors.find((v) => v.id === activeProfile?.vendorId) ||
          vendors.find((v) => v.contactPerson?.includes("Sophia") || v.companyName?.includes("Apex")) ||
          vendors[0] ||
          null;

        setVendorRecord(myVendor);

        if (myVendor) {
          const [vContracts, vPayments] = await Promise.all([
            getLocalVendorContracts(activeEvent.id, myVendor.id),
            getLocalVendorPayments(activeEvent.id, myVendor.id),
          ]);
          setContracts(vContracts);
          setPayments(vPayments);
          setQuotes((myVendor.quotes as unknown as LocalVendorQuote[]) || []);
        }
      } catch (err) {
        console.warn("[VendorDashboard] Error loading data:", err);
      }
    }
    loadVendorData();
  }, [activeEvent, activeProfile]);

  // Compute 6 Vendor Widgets
  const { totalBookings, pendingQuotations, confirmedBookings, upcomingServices, pendingPayments, completedServices, totalCommitted, totalPaid } = useMemo(() => {
    const totalB = contracts.length > 0 ? contracts.length : 1;
    const confirmedB = contracts.filter((c) => c.status === "SIGNED" || c.status === "COMPLETED").length || 1;
    const pendingQ = quotes.filter((q) => !q.isSelected).length;
    const upcomingS = 1;
    const completedS = contracts.filter((c) => c.status === "COMPLETED").length;

    const committed = contracts.reduce((sum, c) => sum + (c.totalAmount || 4800), 0);
    const paid = payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + (p.amount || 2000), 0);
    const pendingPay = Math.max(0, committed - paid);

    return {
      totalBookings: totalB,
      pendingQuotations: pendingQ,
      confirmedBookings: confirmedB,
      upcomingServices: upcomingS,
      pendingPayments: formatCurrency(pendingPay),
      completedServices: completedS,
      totalCommitted: formatCurrency(committed),
      totalPaid: formatCurrency(paid),
    };
  }, [contracts, quotes, payments]);

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Page Header */}
      <PageHeader
        title="Vendor Partner Commercial Portal"
        description="Deliverable milestones, quotation proposals, executed contracts, and payment settlement ledgers."
        badge={<Badge variant="primary">Verified Vendor Account</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/vendors?tab=quotes">
              <Button className="gap-2 shadow-glass font-medium text-xs sm:text-sm">
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>Submit New Quote</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* 6 Vendor Dashboard Widgets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
            Commercial &amp; Booking Pipeline
          </h2>
          <span className="text-xs text-surface-500">Contract Balance Tracking</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Bookings"
            value={totalBookings}
            description="Event engagements registered"
            icon={Briefcase}
          />
          <StatCard
            title="Pending Quotations"
            value={pendingQuotations}
            description="Proposals under review"
            icon={ClipboardList}
          />
          <StatCard
            title="Confirmed Bookings"
            value={confirmedBookings}
            description="Executed agreements"
            icon={CheckCircle2}
          />
          <StatCard
            title="Upcoming Services"
            value={upcomingServices}
            description="Day-of service deliverables"
            icon={CalendarClock}
          />
          <StatCard
            title="Pending Balance Due"
            value={pendingPayments}
            description="Scheduled milestone balance"
            icon={DollarSign}
          />
          <StatCard
            title="Completed Services"
            value={completedServices}
            description="Fully fulfilled past events"
            icon={CheckCircle2}
          />
        </div>
      </section>

      {/* Vendor Profile & Company Scope */}
      <Card variant="elevated" className="p-6 specular-top">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-200/50 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-600 flex items-center justify-center font-bold text-xl shadow-sm">
              <Building className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-surface-900">
                  {vendorRecord?.companyName || "Apex Sound, Lighting & Floral Studio"}
                </h2>
                <Badge variant="success" size="sm">Active Partner</Badge>
              </div>
              <p className="text-xs text-surface-500">
                Primary Contact: {vendorRecord?.contactPerson || session?.name || "Sophia Vendor"} • Service Category: {vendorRecord?.categoryName || "Music / DJ / Staging"}
              </p>
            </div>
          </div>

          <Link href="/vendors?tab=profile">
            <Button variant="outline" size="sm" className="text-xs">
              Edit Business Profile
            </Button>
          </Link>
        </div>

        {/* Commercial Balance Sheet */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-surface-500/5 border border-surface-200/60 dark:border-surface-700/60">
            <span className="text-surface-500 text-[10px] uppercase font-bold block">Total Contract Value</span>
            <span className="text-base font-extrabold text-surface-900">{totalCommitted}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-emerald-600 text-[10px] uppercase font-bold block">Advance Disbursed</span>
            <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">{totalPaid}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <span className="text-amber-600 text-[10px] uppercase font-bold block">Remaining Due on Teardown</span>
            <span className="text-base font-extrabold text-amber-700 dark:text-amber-400">{pendingPayments}</span>
          </div>
        </div>
      </Card>

      {/* Executed Contracts & Payment Milestones */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Contract Terms */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
              Signed Agreements &amp; Deliverables
            </h2>
            <Link href="/vendors?tab=contracts" className="text-xs font-semibold text-primary-600 hover:underline">
              View All Contracts &rarr;
            </Link>
          </div>

          <Card variant="default" className="p-5 space-y-3">
            {contracts.length > 0 ? (
              contracts.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-surface-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-surface-900">{c.title}</span>
                    <Badge variant="primary" size="sm">{c.status}</Badge>
                  </div>
                  <p className="text-xs text-surface-600 line-clamp-2">
                    {c.termsAndConditions}
                  </p>
                  <div className="flex items-center justify-between text-xs text-surface-500 pt-1 border-t border-surface-100">
                    <span>Agreement: {c.contractNumber}</span>
                    <span className="font-bold text-surface-900">{formatCurrency(c.totalAmount)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-surface-500 py-4 text-center">No signed agreements logged yet.</p>
            )}
          </Card>
        </div>

        {/* Payment History & Installments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
              Disbursement Schedule
            </h2>
            <Link href="/vendors?tab=payments" className="text-xs font-semibold text-primary-600 hover:underline">
              Full Payment Ledger &rarr;
            </Link>
          </div>

          <Card variant="default" className="p-5 space-y-3">
            {payments.length > 0 ? (
              <div className="divide-y divide-surface-200/50">
                {payments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-surface-900 block">{p.title}</span>
                      <span className="text-[11px] text-surface-500">
                        Type: {p.paymentType} • Method: {p.paymentMethod}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-surface-900 block">{formatCurrency(p.amount)}</span>
                      <Badge variant={p.status === "PAID" ? "success" : "warning"} size="sm">
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-surface-500 py-4 text-center">No scheduled disbursements found.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
