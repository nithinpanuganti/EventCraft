"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { CalendarDays, PlusCircle, Users, DollarSign, LogIn, ArrowRight } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/layout/AuthContext";

export default function MyEventsPage() {
  const { events, loadingEvents } = useAuth();
  const loading = loadingEvents;
  const isUnauthenticated = false;

  return (
    <div className="space-y-6 animate-page-enter">
      <PageHeader
        title="My Events"
        description="View and manage your saved weddings, birthday celebrations, and community gatherings."
        actions={
          <Link href="/events/new">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Create New Event</span>
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : isUnauthenticated ? (
        <EmptyState
          icon={LogIn}
          title="Sign in to view your events"
          description="Your events are safely protected and isolated by user account. Sign in to view and manage your saved plans."
          actionLabel="Sign In to Your Account"
          actionHref="/login"
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No saved events found"
          description="You haven't created any events yet. Click below to create your first event plan."
          actionLabel="Create An Event Now"
          actionHref="/events/new"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} hoverable className="flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" size="sm">
                      {event.type}
                    </Badge>
                    <Badge
                      variant={event.status === "DRAFT" ? "secondary" : "success"}
                      size="sm"
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-surface-500 font-mono">
                    {formatDate(event.eventDate)}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-surface-900 text-base">{event.title}</h3>
                  {event.location && (
                    <p className="text-xs text-surface-500 mt-0.5">{event.location}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-surface-600 border-t border-surface-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-surface-400" />
                    <span>{event.guestCount} guests</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-surface-400" />
                    <span className="font-semibold text-surface-800">
                      {formatCurrency(Number(event.totalBudget), event.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-surface-100 pt-3 flex items-center justify-between">
                <span className="text-[11px] text-surface-400">
                  Updated {formatDate(event.updatedAt)}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/events/new?resumeId=${event.id}`}
                    className="inline-flex items-center text-xs font-semibold text-surface-600 hover:text-surface-900"
                  >
                    <span>Resume Planning</span>
                  </Link>
                  <span className="text-surface-300">•</span>
                  <Link
                    href={`/planner`}
                    className="inline-flex items-center text-xs font-semibold text-primary-600 hover:text-primary-700"
                  >
                    <span>Open Planner</span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
