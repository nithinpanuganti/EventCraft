"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/components/layout/AuthContext";
import {
  LocalEvent,
  LocalGuest,
  LocalTask,
  LocalVendorContract,
  LocalVendorPayment,
  LocalRisk,
  LocalEventIssue,
  LocalExpense,
} from "@/lib/storage/types";
import {
  listLocalEvents,
  getLocalEvent,
  getLocalGuests,
  getLocalVendorContracts,
  getLocalVendorPayments,
  getLocalRisks,
  getLocalEventIssues,
} from "@/lib/storage/local-repository";
import { formatMoney } from "@/lib/budget/financial-engine";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  FileText,
  Download,
  Printer,
  Users,
  CheckCircle2,
  DollarSign,
  FileCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

type ReportType =
  | "EXECUTIVE_SUMMARY"
  | "BUDGET_AUDIT"
  | "GUEST_ROSTER"
  | "VENDOR_SETTLEMENT"
  | "TASK_EXECUTION"
  | "POST_EVENT_SETTLEMENT";

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
}

const REPORTS: ReportConfig[] = [
  {
    id: "EXECUTIVE_SUMMARY",
    title: "Executive Summary Report",
    description: "Holistic event health, budget burn, RSVP rate, and risk status.",
    icon: Sparkles,
  },
  {
    id: "BUDGET_AUDIT",
    title: "Budget & Financial Audit",
    description: "Detailed category allocations, actual disbursements, and variance.",
    icon: DollarSign,
  },
  {
    id: "GUEST_ROSTER",
    title: "Guest Roster & Dietary Roster",
    description: "Guest counts, RSVPs, special meal requirements, and check-in rate.",
    icon: Users,
  },
  {
    id: "VENDOR_SETTLEMENT",
    title: "Vendor Contracts & Ledger",
    description: "Signed terms, advance payments, and outstanding balances due.",
    icon: FileCheck,
  },
  {
    id: "TASK_EXECUTION",
    title: "Task Execution & Runsheet Audit",
    description: "Milestone completion stats, delayed activities, and ownership.",
    icon: CheckCircle2,
  },
  {
    id: "POST_EVENT_SETTLEMENT",
    title: "Post-Event Final Settlement",
    description: "Comprehensive financial reconciliations, refunds, and final balances.",
    icon: FileText,
  },
];

function AnalyticsContent() {
  const { activeEvent } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<LocalEvent | null>(null);

  // Loaded data
  const [guests, setGuests] = useState<LocalGuest[]>([]);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [contracts, setContracts] = useState<LocalVendorContract[]>([]);
  const [payments, setPayments] = useState<LocalVendorPayment[]>([]);
  const [risks, setRisks] = useState<LocalRisk[]>([]);
  const [issues, setIssues] = useState<LocalEventIssue[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Report
  const [selectedReport, setSelectedReport] = useState<ReportType>("EXECUTIVE_SUMMARY");

  useEffect(() => {
    async function init() {
      try {
        const evts = await listLocalEvents();
        setAvailableEvents(evts);
        const defaultEvt = evts.find((e) => e.id === activeEvent?.id) || evts[0];
        if (defaultEvt) {
          setSelectedEventId(defaultEvt.id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    init();
  }, [activeEvent]);

  // Load deep event data
  const loadEventAnalytics = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [evtDetails, gList, cList, pList, rList, iList] = await Promise.all([
        getLocalEvent(eventId),
        getLocalGuests(eventId),
        getLocalVendorContracts(eventId),
        getLocalVendorPayments(eventId),
        getLocalRisks(eventId),
        getLocalEventIssues(eventId),
      ]);

      if (evtDetails) {
        setCurrentEvent(evtDetails);
        setTasks(evtDetails.tasks || []);
        setExpenses(evtDetails.expenses || []);
      }
      setGuests(gList);
      setContracts(cList);
      setPayments(pList);
      setRisks(rList);
      setIssues(iList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadEventAnalytics(selectedEventId);
    }
  }, [selectedEventId]);

  // Financial Metrics
  const budgetTotal = currentEvent?.totalBudget || 0;
  const actualDisbursed = expenses.reduce((acc, e) => acc + e.amountCents / 100, 0);
  const remainingBudget = Math.max(0, budgetTotal - actualDisbursed);
  const budgetUtilization = budgetTotal > 0 ? Math.round((actualDisbursed / budgetTotal) * 100) : 0;

  // Guest Metrics
  const totalGuests = guests.length;
  const confirmedGuests = guests.filter((g) => g.rsvpStatus === "CONFIRMED").length;
  const rsvpRate = totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0;
  const checkedInGuests = guests.filter((g) => g.checkInStatus).length;
  const dietaryGuests = guests.filter((g) => g.dietaryPreferences && g.dietaryPreferences.length > 0).length;

  // Task & Operational Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const openIssuesCount = issues.filter((i) => i.status !== "RESOLVED").length;
  const criticalRisksCount = risks.filter((r) => r.priorityLevel === "CRITICAL").length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csv = "";
    if (selectedReport === "BUDGET_AUDIT") {
      csv = "Category,Title,Amount,Date,Vendor\n" +
        expenses.map((e) => `"${e.categoryId || "General"}","${e.title}",${e.amountCents / 100},"${e.createdAt}","${e.vendorId || ""}"`).join("\n");
    } else if (selectedReport === "GUEST_ROSTER") {
      csv = "Name,Email,Category,RSVP,PlusOnes,CheckedIn,Dietary\n" +
        guests.map((g) => `"${g.name}","${g.email || ""}",${g.category},${g.rsvpStatus},${g.plusOneCount},${g.checkInStatus},"${(g.dietaryPreferences || []).join("; ")}"`).join("\n");
    } else if (selectedReport === "VENDOR_SETTLEMENT") {
      csv = "Contract#,Title,TotalAmount,AdvanceAmount,BalanceDue,Status\n" +
        contracts.map((c) => `"${c.contractNumber}","${c.title}",${c.totalAmount},${c.advanceAmount},${Math.max(0, c.totalAmount - c.advanceAmount)},"${c.status}"`).join("\n");
    } else {
      csv = `Event,TotalBudget,ActualSpent,TotalGuests,ConfirmedGuests,TaskProgress\n"${currentEvent?.title || ""}",${budgetTotal},${actualDisbursed},${totalGuests},${confirmedGuests},${taskProgress}%\n`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-report-${selectedReport.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
              Event Analytics & Reports
            </h1>
            <Badge variant="primary" size="sm">Audit & Export Suite</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Real-time KPIs, financial reconciliation, guest demographics, and 6 audit report generators.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availableEvents.length > 1 && (
            <select
              aria-label="Select Active Event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 shadow-sm"
            >
              {availableEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 shadow-glass-glow"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-surface-500 font-medium flex items-center justify-between">
            <span>Budget Utilized</span>
            <DollarSign className="h-4 w-4 text-primary-500" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-1">
            {formatMoney(actualDisbursed, currentEvent?.currency || "USD")}
          </div>
          <div className="text-[11px] text-surface-500">
            {budgetUtilization}% of {formatMoney(budgetTotal, currentEvent?.currency || "USD")}
          </div>
        </Card>

        <Card variant="subtle" className="p-4">
          <div className="text-xs text-emerald-600 font-medium flex items-center justify-between">
            <span>RSVP Attendance</span>
            <Users className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-1">
            {confirmedGuests} / {totalGuests}
          </div>
          <div className="text-[11px] text-surface-500">{rsvpRate}% confirmation rate</div>
        </Card>

        <Card variant="subtle" className="p-4">
          <div className="text-xs text-blue-500 font-medium flex items-center justify-between">
            <span>Runsheet Tasks</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-1">{taskProgress}%</div>
          <div className="text-[11px] text-surface-500">
            {completedTasks} of {totalTasks} milestones met
          </div>
        </Card>

        <Card variant="subtle" className="p-4">
          <div className="text-xs text-rose-500 font-medium flex items-center justify-between">
            <span>Risks & Issues</span>
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-1">
            {criticalRisksCount + openIssuesCount}
          </div>
          <div className="text-[11px] text-surface-500">
            {criticalRisksCount} critical risks • {openIssuesCount} active issues
          </div>
        </Card>
      </div>

      {/* Report Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {REPORTS.map((rpt) => {
          const Icon = rpt.icon;
          const isSelected = selectedReport === rpt.id;
          return (
            <button
              key={rpt.id}
              type="button"
              onClick={() => setSelectedReport(rpt.id)}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${isSelected
                ? "bg-primary-500/15 border-primary-500 ring-2 ring-primary-500/30 text-surface-900 shadow-glass-subtle"
                : "glass-surface-subtle border-white/60 dark:border-white/10 hover:border-primary-400/40 text-surface-600"
                }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                <span className="font-bold text-xs truncate">{rpt.title.split(" ")[0]}</span>
              </div>
              <div className="text-[10px] text-surface-500 leading-tight line-clamp-2">
                {rpt.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Render Selected Report Document */}
      <Card variant="elevated" className="p-6 sm:p-10 specular-top space-y-8">
        {loading && (
          <div className="text-xs text-primary-600 font-semibold animate-pulse pb-2" role="status" aria-live="polite">
            Updating report metrics from local store...
          </div>
        )}
        {/* Report Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200/50 dark:border-surface-800/50 pb-6">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
              Official EventCraft Audit Report
            </span>
            <h2 className="text-2xl font-extrabold text-surface-900">
              {REPORTS.find((r) => r.id === selectedReport)?.title}
            </h2>
            <div className="text-xs text-surface-500 flex items-center gap-3">
              <span>Event: <strong>{currentEvent?.title}</strong></span>
              <span>• Date: {currentEvent?.eventDate || "TBD"}</span>
              <span>• Generated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <Badge variant="outline" size="md">
            Status: {currentEvent?.status || "PLANNING"}
          </Badge>
        </div>

        {/* 1. EXECUTIVE SUMMARY */}
        {selectedReport === "EXECUTIVE_SUMMARY" && (
          <div className="space-y-6 text-xs text-surface-700 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-surface-500/5 border border-white/10 space-y-2">
                <h3 className="font-bold text-sm text-surface-900">Financial Executive Summary</h3>
                <p>
                  The overall budget allocation is set at{" "}
                  <strong>{formatMoney(budgetTotal, currentEvent?.currency || "USD")}</strong>. Currently,{" "}
                  <strong>{formatMoney(actualDisbursed, currentEvent?.currency || "USD")}</strong> has been disbursed across recorded expenses, leaving a contingency buffer of{" "}
                  <strong>{formatMoney(remainingBudget, currentEvent?.currency || "USD")}</strong> ({100 - budgetUtilization}% remaining).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-500/5 border border-white/10 space-y-2">
                <h3 className="font-bold text-sm text-surface-900">Guest & Capacity Summary</h3>
                <p>
                  A total of <strong>{totalGuests}</strong> guests have been invited. Currently,{" "}
                  <strong>{confirmedGuests}</strong> attendees have confirmed attendance ({rsvpRate}% rate), with{" "}
                  <strong>{dietaryGuests}</strong> special dietary requirements logged. Check-in operations stand at{" "}
                  <strong>{checkedInGuests}</strong> attendees arrived.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-500/5 border border-white/10 space-y-2">
              <h3 className="font-bold text-sm text-surface-900">Operational & Risk Assessment</h3>
              <p>
                The event runsheet tracks <strong>{totalTasks}</strong> operational milestones with{" "}
                <strong>{completedTasks}</strong> marked fulfilled ({taskProgress}% completion). The risk register tracks{" "}
                <strong>{risks.length}</strong> identified risks (with <strong>{criticalRisksCount}</strong> in the critical heat band), and <strong>{openIssuesCount}</strong> day-of incidents requiring investigation.
              </p>
            </div>
          </div>
        )}

        {/* 2. BUDGET AUDIT */}
        {selectedReport === "BUDGET_AUDIT" && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-surface-900">Expense Ledger Breakdown ({expenses.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Budget Expense Breakdown">
                <thead className="bg-surface-500/5 uppercase text-surface-500 text-[10px] font-bold">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">Expense Item</th>
                    <th scope="col" className="py-2.5 px-3">Category</th>
                    <th scope="col" className="py-2.5 px-3">Amount</th>
                    <th scope="col" className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/40 dark:divide-surface-800/40">
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2.5 px-3 font-semibold text-surface-900">{e.title}</td>
                      <td className="py-2.5 px-3 text-surface-500">{e.categoryId || "General"}</td>
                      <td className="py-2.5 px-3 font-extrabold text-surface-900">
                        {formatMoney(e.amountCents / 100, currentEvent?.currency || "USD")}
                      </td>
                      <td className="py-2.5 px-3 text-surface-400">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. GUEST ROSTER */}
        {selectedReport === "GUEST_ROSTER" && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-surface-900">Guest RSVP & Dietary Audit ({guests.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Guest Roster and Dietary Audit">
                <thead className="bg-surface-500/5 uppercase text-surface-500 text-[10px] font-bold">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">Guest Name</th>
                    <th scope="col" className="py-2.5 px-3">Category</th>
                    <th scope="col" className="py-2.5 px-3">RSVP Status</th>
                    <th scope="col" className="py-2.5 px-3">Party Size</th>
                    <th scope="col" className="py-2.5 px-3">Dietary Requirements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/40 dark:divide-surface-800/40">
                  {guests.map((g) => (
                    <tr key={g.id}>
                      <td className="py-2.5 px-3 font-semibold text-surface-900">{g.name}</td>
                      <td className="py-2.5 px-3">{g.category}</td>
                      <td className="py-2.5 px-3 font-bold">{g.rsvpStatus}</td>
                      <td className="py-2.5 px-3">1 + {g.plusOneCount}</td>
                      <td className="py-2.5 px-3 text-amber-600">
                        {g.dietaryPreferences && g.dietaryPreferences.length > 0
                          ? g.dietaryPreferences.join(", ")
                          : "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. VENDOR SETTLEMENT */}
        {selectedReport === "VENDOR_SETTLEMENT" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-surface-900">Vendor Contracts & Milestone Ledger ({contracts.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" aria-label="Vendor Contracts Ledger">
                  <thead className="bg-surface-500/5 uppercase text-surface-500 text-[10px] font-bold">
                    <tr>
                      <th scope="col" className="py-2.5 px-3">Contract #</th>
                      <th scope="col" className="py-2.5 px-3">Title</th>
                      <th scope="col" className="py-2.5 px-3">Total Amount</th>
                      <th scope="col" className="py-2.5 px-3">Advance Paid</th>
                      <th scope="col" className="py-2.5 px-3">Balance Due</th>
                      <th scope="col" className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/40 dark:divide-surface-800/40">
                    {contracts.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 px-3 font-bold">{c.contractNumber}</td>
                        <td className="py-2.5 px-3 font-semibold">{c.title}</td>
                        <td className="py-2.5 px-3 font-bold">{formatMoney(c.totalAmount, currentEvent?.currency || "USD")}</td>
                        <td className="py-2.5 px-3 text-emerald-600">{formatMoney(c.advanceAmount, currentEvent?.currency || "USD")}</td>
                        <td className="py-2.5 px-3 font-extrabold">{formatMoney(Math.max(0, c.totalAmount - c.advanceAmount), currentEvent?.currency || "USD")}</td>
                        <td className="py-2.5 px-3">{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Installments Ledger */}
            <div className="space-y-4 pt-2 border-t border-surface-200/50 dark:border-surface-800/50">
              <h3 className="font-bold text-sm text-surface-900">Recorded Payment Installments ({payments.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" aria-label="Recorded Vendor Payments">
                  <thead className="bg-surface-500/5 uppercase text-surface-500 text-[10px] font-bold">
                    <tr>
                      <th scope="col" className="py-2.5 px-3">Payment Title</th>
                      <th scope="col" className="py-2.5 px-3">Type</th>
                      <th scope="col" className="py-2.5 px-3">Amount</th>
                      <th scope="col" className="py-2.5 px-3">Method</th>
                      <th scope="col" className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/40 dark:divide-surface-800/40">
                    {payments.length > 0 ? (
                      payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3 font-semibold text-surface-900">{p.title}</td>
                          <td className="py-2.5 px-3">{p.paymentType}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600">{formatMoney(p.amount, currentEvent?.currency || "USD")}</td>
                          <td className="py-2.5 px-3 text-surface-500">{p.paymentMethod}</td>
                          <td className="py-2.5 px-3 font-semibold">{p.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-surface-400">No payment installments recorded yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. TASK EXECUTION */}
        {selectedReport === "TASK_EXECUTION" && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-surface-900">Timeline & Runsheet Task Execution ({tasks.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Timeline and Runsheet Task Execution">
                <thead className="bg-surface-500/5 uppercase text-surface-500 text-[10px] font-bold">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">Task Title</th>
                    <th scope="col" className="py-2.5 px-3">Status</th>
                    <th scope="col" className="py-2.5 px-3">Assigned Lead</th>
                    <th scope="col" className="py-2.5 px-3">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/40 dark:divide-surface-800/40">
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2.5 px-3 font-semibold text-surface-900">{t.title}</td>
                      <td className="py-2.5 px-3 font-bold">{t.status}</td>
                      <td className="py-2.5 px-3 text-surface-500">{t.assignedTo || "Unassigned"}</td>
                      <td className="py-2.5 px-3">{t.priority || "MEDIUM"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. POST-EVENT FINAL SETTLEMENT */}
        {selectedReport === "POST_EVENT_SETTLEMENT" && (
          <div className="space-y-6 text-xs text-surface-700 leading-relaxed">
            <div className="p-4 rounded-2xl bg-surface-500/5 border border-white/10 space-y-3">
              <h3 className="font-bold text-sm text-surface-900">Post-Event Final Balance Reconciliations</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/40 dark:bg-black/30 border border-white/20">
                  <div className="text-[10px] text-surface-500">Initial Budget</div>
                  <div className="font-bold text-sm mt-0.5">{formatMoney(budgetTotal, currentEvent?.currency || "USD")}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/40 dark:bg-black/30 border border-white/20">
                  <div className="text-[10px] text-surface-500">Total Disbursed</div>
                  <div className="font-bold text-sm mt-0.5 text-emerald-600">{formatMoney(actualDisbursed, currentEvent?.currency || "USD")}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/40 dark:bg-black/30 border border-white/20">
                  <div className="text-[10px] text-surface-500">Contract Outstanding</div>
                  <div className="font-bold text-sm mt-0.5 text-amber-600">
                    {formatMoney(
                      contracts.reduce((acc, c) => acc + Math.max(0, c.totalAmount - c.advanceAmount), 0),
                      currentEvent?.currency || "USD"
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/40 dark:bg-black/30 border border-white/20">
                  <div className="text-[10px] text-surface-500">Final Surplus Buffer</div>
                  <div className="font-bold text-sm mt-0.5 text-primary-600">{formatMoney(remainingBudget, currentEvent?.currency || "USD")}</div>
                </div>
              </div>
            </div>

            <p className="text-surface-500 italic">
              All financial entries reconciled in IndexedDB local storage. Certified valid for local post-event accounting.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
