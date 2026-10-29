"use client";

import React, { useEffect, useState, useCallback, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  formatMoney,
  type OverallBudgetSummary,
} from "@/lib/budget/financial-engine";
import dynamic from "next/dynamic";
import { BudgetDonutChart } from "@/components/budget/BudgetDonutChart";
import { PlannedVsActualChart } from "@/components/budget/PlannedVsActualChart";
import { ExpenseTable } from "@/components/budget/ExpenseTable";
import { type ExpenseRecord } from "@/components/budget/ExpenseModal";

const CategoryAllocationEditor = dynamic(
  () => import("@/components/budget/CategoryAllocationEditor").then((mod) => mod.CategoryAllocationEditor),
  { ssr: false }
);
const ExpenseModal = dynamic(
  () => import("@/components/budget/ExpenseModal").then((mod) => mod.ExpenseModal),
  { ssr: false }
);
const CreateCategoryModal = dynamic(
  () => import("@/components/budget/CreateCategoryModal").then((mod) => mod.CreateCategoryModal),
  { ssr: false }
);
import {
  AlertTriangle,
  AlertCircle,
  PlusCircle,
  PieChart,
  DollarSign,
  Receipt,
  Layers,
  Edit3,
  Calendar,
} from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  type: string;
  totalBudget: number;
  currency: string;
  status: string;
}

import { useAuth } from "@/components/layout/AuthContext";
import {
  getLocalEvent,
  getLocalBudgetCategories,
  getLocalExpenses,
  createLocalBudgetCategory,
  setLocalBulkAllocations,
  deleteLocalBudgetCategory,
  createLocalExpense,
  updateLocalExpense,
  deleteLocalExpense,
} from "@/lib/storage/local-repository";
import { computeOverallBudgetSummary } from "@/lib/budget/financial-engine";

function BudgetContent() {
  const searchParams = useSearchParams();
  const urlEventId = searchParams.get("eventId");
  const { events, user, loadingEvents } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(urlEventId);
  const [budgetData, setBudgetData] = useState<{
    event: EventItem;
    summary: OverallBudgetSummary;
    expenses: ExpenseRecord[];
  } | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal & Tab States
  const [isAllocationEditorOpen, setIsAllocationEditorOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Keep selected event synced
  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // Load budget overview for selected event directly from local storage
  const loadBudget = useCallback(async (eventId: string) => {
    try {
      setLoadingBudget(true);
      setError(null);

      const [event, categories, expenses] = await Promise.all([
        getLocalEvent(eventId),
        getLocalBudgetCategories(eventId),
        getLocalExpenses(eventId),
      ]);

      if (!event) {
        throw new Error("Event not found in local browser storage.");
      }

      // Compute overall deterministic budget summary using financial engine
      const rawCategories = categories.map((c) => ({
        id: c.id,
        name: c.name,
        allocatedAmount: c.allocatedCents / 100,
        allocatedPercentage: c.allocatedPercentage,
      }));
      const rawExpenses = expenses.map((e) => ({
        id: e.id,
        budgetCategoryId: e.categoryId,
        amount: e.amountCents / 100,
        name: e.title,
        dateIncurred: e.paidDate || e.dueDate || e.createdAt,
      }));
      const summary = computeOverallBudgetSummary(
        event.totalBudget,
        event.currency,
        rawCategories,
        rawExpenses
      );

      // Map local expenses to UI format
      const mappedExpenses: ExpenseRecord[] = expenses.map((exp) => {
        const cat = categories.find((c) => c.id === exp.categoryId);
        return {
          id: exp.id,
          budgetCategoryId: exp.categoryId,
          categoryName: cat?.name || "Uncategorized",
          name: exp.title,
          amount: exp.amountCents / 100,
          dateIncurred: exp.paidDate || exp.dueDate || exp.createdAt,
          paymentStatus: exp.paymentStatus,
          notes: exp.notes ?? null,
        };
      });

      setBudgetData({
        event: {
          id: event.id,
          title: event.title,
          type: event.type,
          totalBudget: event.totalBudget,
          currency: event.currency,
          status: event.status,
        },
        summary,
        expenses: mappedExpenses,
      });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load budget data.");
      setBudgetData(null);
    } finally {
      setLoadingBudget(false);
    }
  }, []);

  // Sync effect when selected event changes
  useEffect(() => {
    if (selectedEventId) {
      loadBudget(selectedEventId);
    } else {
      setLoadingBudget(false);
    }
  }, [selectedEventId, loadBudget]);

  // Save bulk allocations
  const handleSaveAllocations = async (allocations: { id: string; allocatedAmount: number }[]) => {
    if (!selectedEventId) return;
    const catAllocations = allocations.map((a) => {
      const total = budgetData?.event.totalBudget || 1;
      const pct = (a.allocatedAmount / total) * 100;
      return {
        categoryId: a.id,
        allocatedAmount: a.allocatedAmount,
        allocatedPercentage: Number(pct.toFixed(1)),
      };
    });

    await setLocalBulkAllocations(selectedEventId, catAllocations);
    await loadBudget(selectedEventId);
    setIsAllocationEditorOpen(false);
  };

  // Create new category
  const handleCreateCategory = async (catData: { name: string; allocatedAmount: number }) => {
    if (!selectedEventId) return;
    await createLocalBudgetCategory(selectedEventId, catData.name, catData.allocatedAmount);
    await loadBudget(selectedEventId);
  };

  // Save expense (create or update)
  const handleSaveExpense = async (data: {
    budgetCategoryId: string;
    name: string;
    amount: number;
    dateIncurred: string;
    paymentStatus: "PENDING" | "PAID" | "OVERDUE";
    notes?: string | null;
  }) => {
    if (!selectedEventId) return;

    if (editingExpense) {
      await updateLocalExpense(editingExpense.id, {
        categoryId: data.budgetCategoryId,
        title: data.name,
        amount: data.amount,
        paymentStatus: data.paymentStatus,
        notes: data.notes,
      });
    } else {
      await createLocalExpense({
        eventId: selectedEventId,
        categoryId: data.budgetCategoryId,
        title: data.name,
        amount: data.amount,
        paymentStatus: data.paymentStatus,
        notes: data.notes,
      });
    }

    await loadBudget(selectedEventId);
    setEditingExpense(null);
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!selectedEventId) return;
    await deleteLocalExpense(expenseId);
    await loadBudget(selectedEventId);
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!selectedEventId) return;
    if (!confirm(`Are you sure you want to delete category "${categoryName}"?`)) return;

    await deleteLocalBudgetCategory(categoryId);
    await loadBudget(selectedEventId);
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
          title="Deterministic Budget Ledger"
          description="Authoritative financial calculations, planned vs. actual variance, and real-time expense tracking."
        />
        <EmptyState
          icon={PieChart}
          title="Local profile required"
          description="Please select or create a local browser profile to view and manage your event budgets and expenses."
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
          title="Deterministic Budget Ledger"
          description="Track planned category allocations, log actual expenses, and monitor financial variance."
        />
        <EmptyState
          icon={PieChart}
          title="No events found"
          description="Create your first event to unlock financial management and expense tracking."
          actionLabel="Create Event"
          actionHref="/events/new"
        />
      </div>
    );
  }

  const summary = budgetData?.summary;
  const currency = budgetData?.event.currency || "USD";

  return (
    <div className="space-y-6 pb-12 animate-page-enter">
      {/* Top Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Deterministic Budget Ledger"
          description="Authoritative financial calculations, planned vs. actual variance, and real-time expense tracking."
        />

        {/* Event Selector Dropdown with Glass Styling */}
        <div className="flex items-center gap-2 self-start md:self-auto rounded-2xl glass-card px-3.5 py-2 shadow-glass-subtle">
          <Calendar className="h-4 w-4 text-primary-600" />
          <select
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
                {evt.title} ({evt.type}) - {formatMoney(Number(evt.totalBudget), evt.currency)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingBudget && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-danger-200/80 bg-danger-50/80 backdrop-blur-md p-4 text-xs text-danger-800 shadow-glass">
          {error}
        </div>
      )}

      {summary && !loadingBudget && (
        <>
          {/* Overrun Alert Banners with Glass Surface */}
          {summary.isOverBudget && (
            <div className="flex items-start gap-3 rounded-2xl border border-danger-200/80 bg-danger-50/85 backdrop-blur-md p-4 text-xs text-danger-900 shadow-glass animate-page-enter">
              <AlertCircle className="h-5 w-5 shrink-0 text-danger-600 mt-0.5" />
              <div>
                <span className="font-bold text-danger-950 text-sm">
                  Overall Budget Overrun Warning!
                </span>
                <p className="mt-0.5 leading-relaxed">
                  Actual expenses ({formatMoney(summary.totalActualSpent, currency)}) have exceeded your target budget ({formatMoney(summary.totalBudget, currency)}) by{" "}
                  <strong className="text-danger-700">{formatMoney(summary.overrunAmount, currency)}</strong>.
                </p>
              </div>
            </div>
          )}

          {summary.isApproachingThreshold && !summary.isOverBudget && (
            <div className="flex items-start gap-3 rounded-2xl border border-warning-200/80 bg-warning-50/85 backdrop-blur-md p-4 text-xs text-warning-900 shadow-glass animate-page-enter">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning-600 mt-0.5" />
              <div>
                <span className="font-bold text-warning-950 text-sm">
                  Budget Approaching Limit ({summary.utilizationPercentage}%)
                </span>
                <p className="mt-0.5 leading-relaxed">
                  Spending has reached or exceeded the {summary.warningThresholdPercent}% safety threshold. Only{" "}
                  <strong className="text-warning-800">{formatMoney(summary.remainingBudget, currency)}</strong> remains available.
                </p>
              </div>
            </div>
          )}

          {/* Key Metric Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card hoverable className="p-4">
              <div className="flex items-center justify-between text-surface-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Target Budget</span>
                <div className="p-1.5 rounded-lg bg-primary-100/80 text-primary-600">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-surface-900">
                {formatMoney(summary.totalBudget, currency)}
              </div>
              <div className="text-[11px] text-surface-500 mt-1 font-medium">
                Allocated: {formatMoney(summary.totalAllocated, currency)} ({summary.allocationUtilizationPercentage}%)
              </div>
            </Card>

            <Card hoverable className="p-4">
              <div className="flex items-center justify-between text-surface-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Actual Spending</span>
                <div className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-600">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              <div className={`text-lg sm:text-xl font-extrabold font-mono ${summary.isOverBudget ? "text-danger-600" : "text-surface-900"}`}>
                {formatMoney(summary.totalActualSpent, currency)}
              </div>
              <div className="text-[11px] text-surface-500 mt-1 font-medium">
                Utilization: {summary.utilizationPercentage}%
              </div>
            </Card>

            <Card hoverable className="p-4">
              <div className="flex items-center justify-between text-surface-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Remaining Budget</span>
                <div className="p-1.5 rounded-lg bg-indigo-100/80 text-indigo-600">
                  <PieChart className="h-4 w-4" />
                </div>
              </div>
              <div className={`text-lg sm:text-xl font-extrabold font-mono ${summary.remainingBudget < 0 ? "text-danger-600" : "text-emerald-600"}`}>
                {formatMoney(summary.remainingBudget, currency)}
              </div>
              <div className="text-[11px] text-surface-500 mt-1 font-medium">
                {summary.remainingBudget < 0 ? "Over budget limit" : "Available to spend"}
              </div>
            </Card>

            <Card hoverable className="p-4">
              <div className="flex items-center justify-between text-surface-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Unallocated</span>
                <div className="p-1.5 rounded-lg bg-amber-100/80 text-amber-600">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-extrabold font-mono text-surface-900">
                {formatMoney(summary.unallocatedBudget, currency)}
              </div>
              <div className="text-[11px] text-surface-500 mt-1 font-medium">
                Ready for category assignment
              </div>
            </Card>
          </div>

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-200/60">
                <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary-600" />
                  <span>Category Allocation Distribution</span>
                </h3>
              </div>
              <BudgetDonutChart
                categories={summary.categorySummaries}
                unallocatedAmount={summary.unallocatedBudget}
                totalBudget={summary.totalBudget}
                currency={currency}
              />
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-200/60">
                <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  <span>Planned Allocation vs. Actual Spent</span>
                </h3>
              </div>
              <PlannedVsActualChart
                categories={summary.categorySummaries}
                currency={currency}
              />
            </Card>
          </div>

          {/* Category Allocations Section */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-surface-200/60">
              <div>
                <h3 className="text-sm font-bold text-surface-900">Budget Categories</h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Approved allocations, live variance, and category-level overrun alerts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateCategoryModalOpen(true)}
                  className="gap-1.5 text-xs font-medium shadow-glass-subtle"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-primary-600" />
                  <span>Add Category</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAllocationEditorOpen(!isAllocationEditorOpen)}
                  className="gap-1.5 text-xs font-medium shadow-glass-subtle"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{isAllocationEditorOpen ? "Close Editor" : "Adjust Allocations"}</span>
                </Button>
              </div>
            </div>

            {isAllocationEditorOpen ? (
              <div className="p-4 glass-surface-subtle rounded-2xl border border-surface-200/80 shadow-glass-subtle">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-800 mb-3">Adjust Category Allocations</h4>
                <CategoryAllocationEditor
                  categories={summary.categorySummaries}
                  totalBudget={summary.totalBudget}
                  currency={currency}
                  onSave={handleSaveAllocations}
                  onCancel={() => setIsAllocationEditorOpen(false)}
                />
              </div>
            ) : (
              <div className="glass-table-wrapper">
                <table className="w-full text-left text-xs">
                  <thead className="glass-table-thead text-surface-700 font-semibold border-b border-surface-200/70">
                    <tr>
                      <th className="py-3 px-3.5">Category</th>
                      <th className="py-3 px-3.5 text-right">Planned Allocation</th>
                      <th className="py-3 px-3.5 text-right">Actual Spent</th>
                      <th className="py-3 px-3.5 text-right">Remaining Balance</th>
                      <th className="py-3 px-3.5 text-center">Utilization</th>
                      <th className="py-3 px-3.5 text-center">Status</th>
                      <th className="py-3 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/50">
                    {summary.categorySummaries.map((cat) => (
                      <tr key={cat.id} className="hover:bg-white/60 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-surface-900">
                          {cat.name}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-medium text-surface-800">
                          {formatMoney(cat.allocatedAmount, currency)}
                          <span className="text-[11px] text-surface-400 block font-normal">
                            {cat.allocatedPercentage}%
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-medium text-surface-800">
                          {formatMoney(cat.totalActualSpent, currency)}
                          <span className="text-[11px] text-surface-400 block font-normal">
                            {cat.expenseCount} record{cat.expenseCount !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className={`py-3 px-3.5 text-right font-mono font-bold ${
                          cat.remainingBalance < 0 ? "text-danger-600" : "text-emerald-600"
                        }`}>
                          {formatMoney(cat.remainingBalance, currency)}
                          {cat.isOverBudget && (
                            <span className="text-[10px] text-danger-500 block font-semibold">
                              Over by {formatMoney(cat.overrunAmount, currency)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold">
                          {cat.utilizationPercentage}%
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {cat.isOverBudget ? (
                            <Badge variant="danger" size="sm">Over Budget</Badge>
                          ) : cat.isApproachingThreshold ? (
                            <Badge variant="warning" size="sm">Near Limit</Badge>
                          ) : (
                            <Badge variant="success" size="sm">On Track</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={cat.expenseCount > 0}
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            title={
                              cat.expenseCount > 0
                                ? "Cannot delete category with logged expenses"
                                : "Delete unused category"
                            }
                            className="text-surface-400 hover:text-danger-600 text-[11px] h-7 px-2 rounded-lg"
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Actual Expense Ledger Section */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-surface-200/60">
              <div>
                <h3 className="text-sm font-bold text-surface-900">Recorded Actual Expenses</h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Confirmed payments, vendor deposits, invoices, and expense receipts.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingExpense(null);
                  setIsExpenseModalOpen(true);
                }}
                className="gap-1.5 text-xs self-start sm:self-auto shadow-glass font-medium"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Record Expense</span>
              </Button>
            </div>

            <ExpenseTable
              expenses={budgetData.expenses}
              currency={currency}
              onEdit={(exp) => {
                setEditingExpense(exp);
                setIsExpenseModalOpen(true);
              }}
              onDelete={handleDeleteExpense}
            />
          </Card>
        </>
      )}

      {/* Expense Modal */}
      {summary && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          categories={summary.categorySummaries}
          currency={currency}
          initialExpense={editingExpense}
          onSave={handleSaveExpense}
        />
      )}

      {/* Create Category Modal */}
      {summary && (
        <CreateCategoryModal
          isOpen={isCreateCategoryModalOpen}
          onClose={() => setIsCreateCategoryModalOpen(false)}
          currency={currency}
          unallocatedBudget={summary.unallocatedBudget}
          onSave={handleCreateCategory}
        />
      )}
    </div>
  );
}

export default function BudgetPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <BudgetContent />
    </Suspense>
  );
}
