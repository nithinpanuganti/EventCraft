"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  DollarSign,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  ArrowRight,
  CheckSquare,
  FileEdit,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/layout/AuthContext";

export default function DashboardPage() {
  const { events, loadingEvents } = useAuth();
  const loading = loadingEvents;
  const isUnauthenticated = false;

  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => e.eventDate && new Date(e.eventDate) >= new Date()).length;
  const totalPlannedBudget = events.reduce((acc, curr) => acc + Number(curr.totalBudget || 0), 0);

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Page Header */}
      <PageHeader
        title="Event Planning Dashboard"
        description="Monitor active event plans, budget allocations, upcoming deadlines, and draft progress."
        actions={
          <Link href="/events/new">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Create New Event</span>
            </Button>
          </Link>
        }
      />

      {/* Metrics Row (Dynamically calculated from authenticated events) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Events"
          value={loading ? "..." : totalEvents}
          description="Saved event plans & drafts"
          icon={CalendarDays}
        />
        <StatCard
          title="Upcoming Events"
          value={loading ? "..." : upcomingEvents}
          description="Scheduled in the future"
          icon={Clock}
        />
        <StatCard
          title="Planned Budget"
          value={loading ? "..." : formatCurrency(totalPlannedBudget)}
          description="Total tracked across events"
          icon={DollarSign}
        />
        <StatCard
          title="Planning Status"
          value={totalEvents > 0 ? "Production Ready" : "Draft"}
          description="GenAI & ledger active"
          icon={CheckCircle2}
        />
      </section>

      {/* Quick Action Hub */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card hoverable className="flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Event Creation Wizard</CardTitle>
            <CardDescription className="text-xs">
              Configure parameters, dates, budgets, and themes with instant draft saving.
            </CardDescription>
          </div>
          <div className="mt-4 pt-2">
            <Link href="/events/new" className="inline-flex items-center text-xs font-semibold text-primary-600 hover:text-primary-700">
              <span>Start new event</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        <Card hoverable className="flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 text-surface-700">
              <DollarSign className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Budget Overview</CardTitle>
            <CardDescription className="text-xs">
              Review planned spending ceilings and prepare for deterministic ledger calculations.
            </CardDescription>
          </div>
          <div className="mt-4 pt-2">
            <Link href="/budget" className="inline-flex items-center text-xs font-semibold text-primary-600 hover:text-primary-700">
              <span>View ledger</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        <Card hoverable className="flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 text-surface-700">
              <CheckSquare className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Vendor Checklist</CardTitle>
            <CardDescription className="text-xs">
              Track vendor candidate categories, log quotations, and manage bookings.
            </CardDescription>
          </div>
          <div className="mt-4 pt-2">
            <Link href="/vendors" className="inline-flex items-center text-xs font-semibold text-primary-600 hover:text-primary-700">
              <span>Review checklist</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </section>

      {/* Events List / Draft Resume Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-surface-900">Your Event Plans & Drafts</h2>
          <Badge variant="secondary">{events.length} Plans Saved</Badge>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        ) : isUnauthenticated ? (
          <EmptyState
            icon={LogIn}
            title="Sign in to view your dashboard"
            description="Sign in or register an account to access your saved events, resume incomplete drafts, and view budget metrics."
            actionLabel="Sign In Now"
            actionHref="/login"
          />
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events created yet"
            description="Start by creating your first wedding, birthday, or community project. EventCraft AI will assist with recommendations and timelines."
            actionLabel="Create Your First Event"
            actionHref="/events/new"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} hoverable className="flex flex-col justify-between p-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="primary" size="sm">
                      {event.type}
                    </Badge>
                    <span className="text-[11px] text-surface-400 font-mono">
                      {formatDate(event.eventDate)}
                    </span>
                  </div>

                  <h3 className="font-bold text-surface-900 text-sm mt-1">{event.title}</h3>
                  <p className="text-xs text-surface-500">
                    {event.guestCount} guests • {formatCurrency(Number(event.totalBudget), event.currency)}
                  </p>
                </div>

                <div className="mt-4 border-t border-surface-100 pt-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-surface-400">
                      Status: <span className="font-medium text-surface-700">{event.status}</span>
                    </span>
                    <span className="text-[10px] text-surface-400">
                      Updated {formatDate(event.updatedAt)}
                    </span>
                  </div>
                  <Link
                    href={`/events/new?resumeId=${event.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                  >
                    <FileEdit className="h-3.5 w-3.5" />
                    <span>Resume Planning</span>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
