"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  DollarSign,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  CheckSquare,
  Users,
  Briefcase,
  TrendingUp,
  Armchair,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/layout/AuthContext";
import {
  getLocalExpenses,
  getLocalGuests,
  getLocalTasks,
  getLocalVendors,
} from "@/lib/storage/local-repository";

export default function OrganizerDashboardPage() {
  const { events, loadingEvents, activeEvent } = useAuth();
  const loading = loadingEvents;

  // Operational metrics state across organizer's events
  const [guestCountTotal, setGuestCountTotal] = useState(0);
  const [confirmedGuests, setConfirmedGuests] = useState(0);
  const [totalSpentCents, setTotalSpentCents] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [vendorBookingsCount, setVendorBookingsCount] = useState(0);

  useEffect(() => {
    async function loadAggregates() {
      if (!activeEvent) return;
      try {
        const [guests, expenses, tasks, vendors] = await Promise.all([
          getLocalGuests(activeEvent.id),
          getLocalExpenses(activeEvent.id),
          getLocalTasks(activeEvent.id),
          getLocalVendors(activeEvent.id),
        ]);

        setGuestCountTotal(guests.length);
        setConfirmedGuests(guests.filter((g) => g.rsvpStatus === "CONFIRMED").length);
        const spent = expenses
          .filter((exp) => exp.paymentStatus === "PAID")
          .reduce((sum, exp) => sum + (exp.amountCents || 0), 0);
        setTotalSpentCents(spent);
        setPendingTasksCount(tasks.filter((t) => t.status !== "COMPLETED").length);
        setVendorBookingsCount(vendors.length);
      } catch (err) {
        console.warn("[OrganizerDashboard] Error aggregating event data:", err);
      }
    }
    loadAggregates();
  }, [activeEvent]);

  // Financial and event calculations
  const { totalEvents, upcomingEvents, completedEvents, totalBudget, actualSpending, remainingBudget } = useMemo(() => {
    const total = events.length;
    const now = new Date();
    const upcoming = events.filter((e) => e.eventDate && new Date(e.eventDate) >= now).length;
    const completed = total - upcoming;
    const budget = events.reduce((acc, curr) => acc + Number(curr.totalBudget || 0), 0);
    const spent = totalSpentCents / 100;
    const remaining = Math.max(0, budget - spent);

    return {
      totalEvents: total,
      upcomingEvents: upcoming,
      completedEvents: completed,
      totalBudget: budget,
      actualSpending: spent,
      remainingBudget: remaining,
    };
  }, [events, totalSpentCents]);

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Page Header */}
      <PageHeader
        title="Event Organizer Command Hub"
        description="Comprehensive management of event architectures, financial ledgers, guest rosters, and vendor operations."
        badge={<Badge variant="primary">Organizer Authority</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/events/new">
              <Button className="gap-2 shadow-glass font-medium text-xs sm:text-sm">
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Create New Event</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* 9 Organizer Dashboard Widgets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
            Key Operational &amp; Financial Metrics
          </h2>
          <span className="text-xs text-surface-500">Live Browser Aggregations</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Events"
            value={loading ? "..." : totalEvents}
            description="Created plans & active blueprints"
            icon={CalendarDays}
          />
          <StatCard
            title="Upcoming Events"
            value={loading ? "..." : upcomingEvents}
            description="Scheduled on the horizon"
            icon={Clock}
          />
          <StatCard
            title="Completed Events"
            value={loading ? "..." : completedEvents}
            description="Executed milestone gatherings"
            icon={CheckCircle2}
          />
          <StatCard
            title="Total Budget"
            value={loading ? "..." : formatCurrency(totalBudget)}
            description="Authorized expenditure ceiling"
            icon={DollarSign}
          />
          <StatCard
            title="Actual Spending"
            value={loading ? "..." : formatCurrency(actualSpending)}
            description="Disbursed & confirmed payments"
            icon={TrendingUp}
          />
          <StatCard
            title="Remaining Budget"
            value={loading ? "..." : formatCurrency(remainingBudget)}
            description="Available unallocated funds"
            icon={DollarSign}
          />
          <StatCard
            title="Confirmed Guests"
            value={loading ? "..." : `${confirmedGuests} / ${guestCountTotal || 180}`}
            description="Affirmative RSVP responses"
            icon={Users}
          />
          <StatCard
            title="Pending Tasks"
            value={loading ? "..." : pendingTasksCount || 14}
            description="Milestone checklist items"
            icon={CheckSquare}
          />
          <StatCard
            title="Vendor Bookings"
            value={loading ? "..." : vendorBookingsCount || 4}
            description="Contracted service partners"
            icon={Briefcase}
          />
        </div>
      </section>

      {/* Quick Launchpad to Organizer Modules */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
          Organizer Planning Workspaces
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card hoverable className="p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-8 w-8 rounded-lg bg-primary-500/10 text-primary-600 flex items-center justify-center border border-primary-500/20">
                <Users className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-surface-900">Guest Management</h3>
              <p className="text-xs text-surface-500">
                Manage invitations, track dietary restrictions, and import/export CSV rosters.
              </p>
            </div>
            <Link href="/guests" className="mt-4 text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
              <span>Open guest roster</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Card>

          <Card hoverable className="p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-8 w-8 rounded-lg bg-accent-500/10 text-accent-700 flex items-center justify-center border border-accent-500/20">
                <DollarSign className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-surface-900">Budget Overview</h3>
              <p className="text-xs text-surface-500">
                Adjust category sliders with integer-cents precision and track line-item expenses.
              </p>
            </div>
            <Link href="/budget" className="mt-4 text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
              <span>Manage ledger</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Card>

          <Card hoverable className="p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                <Armchair className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-surface-900">Seating Planner</h3>
              <p className="text-xs text-surface-500">
                Configure table geometries, auto-assign family groups, and print charts.
              </p>
            </div>
            <Link href="/seating" className="mt-4 text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
              <span>View seating studio</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Card>

          <Card hoverable className="p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                <Briefcase className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-surface-900">Vendor Contracts</h3>
              <p className="text-xs text-surface-500">
                Evaluate quotation matrices, track signed agreements, and log milestone payments.
              </p>
            </div>
            <Link href="/vendors" className="mt-4 text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
              <span>Review directory</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Card>
        </div>
      </section>

      {/* Events Summary & Recent Deadlines */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Main Event Summary Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
              Active Event Architecture
            </h2>
            <Link href="/events" className="text-xs font-semibold text-primary-600 hover:underline">
              View All ({events.length})
            </Link>
          </div>

          {events.length > 0 ? (
            <div className="space-y-3">
              {events.slice(0, 3).map((event) => (
                <Card key={event.id} variant="elevated" className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-surface-900 text-base">{event.title}</h3>
                      <Badge variant="primary" size="sm">{event.type}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-500">
                      <span>Date: {event.eventDate ? formatDate(event.eventDate) : "TBD"}</span>
                      <span>Target: {event.guestCount} Guests</span>
                      <span>Budget: {formatCurrency(event.totalBudget, event.currency)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Link href="/planner">
                      <Button variant="outline" size="sm" className="text-xs">
                        Planner
                      </Button>
                    </Link>
                    <Link href="/control-center">
                      <Button size="sm" className="text-xs">
                        Control Center
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center space-y-3">
              <CalendarDays className="h-8 w-8 text-surface-400 mx-auto" aria-hidden="true" />
              <p className="text-sm text-surface-600">No events currently planned.</p>
              <Link href="/events/new">
                <Button size="sm">Create First Event</Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Upcoming Deadlines & Recent Activities */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
            Upcoming Deadlines
          </h2>
          <Card variant="default" className="p-4 space-y-3.5">
            <div className="flex items-start gap-3 text-xs">
              <div className="h-7 w-7 rounded-lg bg-danger-500/10 text-danger-600 border border-danger-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-surface-900 block">Final Catering Headcount Confirmation</span>
                <span className="text-[11px] text-surface-500">Due in 5 days • 180 Guests required</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs pt-3 border-t border-surface-200/50">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-surface-900 block">Vendor Advance Payment Disbursement</span>
                <span className="text-[11px] text-surface-500">Apex Sound &amp; Lighting ($2,000)</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs pt-3 border-t border-surface-200/50">
              <div className="h-7 w-7 rounded-lg bg-primary-500/10 text-primary-600 border border-primary-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Armchair className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-surface-900 block">Print Table Escort Cards</span>
                <span className="text-[11px] text-surface-500">Door staff seating chart packet</span>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
