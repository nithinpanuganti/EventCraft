"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import dynamic from "next/dynamic";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlanViewer } from "@/components/events/PlanViewer";

const ConversationalRevisionPanel = dynamic(
  () => import("@/components/planner/ConversationalRevisionPanel").then((mod) => mod.ConversationalRevisionPanel),
  { ssr: false }
);
import type { GeneratedEventPlan } from "@/lib/local-planning/schema";
import { Sparkles, Calendar, PlusCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/layout/AuthContext";
import {
  getLocalEvent,
  getLocalPlan,
  generateAndSaveLocalPlan,
} from "@/lib/storage/local-repository";

function PlannerContent() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");
  const { events, user, refreshEvents } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventIdParam);
  const [currentPlan, setCurrentPlan] = useState<GeneratedEventPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selected event when events load
  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // Fetch selected event details and plan from local storage
  const loadEventPlan = useCallback(async (evId: string) => {
    setLoading(true);
    setError(null);

    try {
      const [ev, plan] = await Promise.all([
        getLocalEvent(evId),
        getLocalPlan(evId),
      ]);

      if (!ev) {
        throw new Error("Could not find event in local browser storage.");
      }

      if (plan) {
        // Map LocalEventPlan to GeneratedEventPlan format for PlanViewer
        setCurrentPlan({
          summary: {
            conceptTitle: plan.conceptTitle,
            conceptNarrative: plan.conceptNarrative,
            planningAssumptions: plan.planningAssumptions || [],
            keyRecommendations: plan.keyRecommendations || [],
          },
          theme: {
            themeName: plan.themeName,
            colorPalette: plan.colorPalette,
            styleDirection: plan.styleDirection,
            decorationIdeas: plan.decorationIdeas,
            personalizedActivities: plan.personalizedActivities,
            culturalConsiderations: plan.culturalConsiderations,
          },
          budget: {
            totalBudget: ev.totalBudget,
            currency: ev.currency,
            categories: (ev.budgetCategories || []).map((c) => ({
              categoryName: c.name,
              allocatedPercentage: c.allocatedPercentage,
              allocatedAmount: c.allocatedCents / 100,
              estimatedAmount: c.allocatedCents / 100,
              rationale: c.rationale || "",
            })),
            contingencyPercentage: 5,
            isBalanced: true,
          },
          milestones: [
            { title: "Venue & Budget Baseline", phase: "PLANNING", offsetDays: -180, description: "Establish venue and budget baseline", priority: "CRITICAL" },
            { title: "Engage Primary Vendors", phase: "BOOKING", offsetDays: -120, description: "Engage primary vendors", priority: "HIGH" },
            { title: "Confirm Headcount & Decor", phase: "PREPARATION", offsetDays: -45, description: "Confirm final headcounts and decor", priority: "MEDIUM" },
            { title: "Run-of-Show Execution", phase: "EVENT_DAY", offsetDays: 0, description: "Day-of execution according to run-sheet", priority: "CRITICAL" },
            { title: "Vendor Settlements", phase: "POST_EVENT", offsetDays: 7, description: "Settlements, return rentals, and thank yous", priority: "LOW" },
          ],
          tasks: (ev.tasks || []).map((t, idx) => ({
            title: t.title,
            phase: t.phase,
            priority: t.priority,
            offsetDays: -(30 + idx * 5),
            dueDate: t.dueDate || undefined,
            description: t.description || "",
          })),
          dayOfSchedule: (plan.dayOfSchedule || []).map((item) => ({
            time: item.time || item.timeSlot || "09:00",
            activity: item.activity,
            lead: item.lead || item.leadCoordinator || "Lead Coordinator",
            notes: item.notes || item.logisticalNotes || undefined,
          })),
          vendors: ((ev.vendors || []) as Array<{ categoryName?: string; category?: string; companyName?: string; name?: string }>).map((v) => ({
            categoryName: v.categoryName || v.category || "General Services",
            justification: `Core vendor service: ${v.companyName || v.name || "Vendor"}`,
            selectionCriteria: ["Reputation", "Contract terms"],
            questionsToAsk: ["Cancellation policy", "Overtime charges"],
            recommendedMilestone: "Booking Phase",
          })),
          risksAndAlternatives: {
            potentialRisks: ["Inclement weather", "Vendor scheduling delay"],
            mitigations: ["Reserve indoor alternative space", "Confirm backup contacts 14 days prior"],
            budgetSavingTips: ["Prioritize high-impact elements", "Opt for seasonal florals"],
            optionalUpgrades: ["Live acoustic trio", "Custom dessert bar"],
          },
          metadata: {
            source: "curated-fallback",
            provider: "Local Rule Engine",
            model: "Deterministic Template Rules",
            version: plan.version || 1,
            generatedAt: plan.updatedAt || new Date().toISOString(),
          },
        });
      } else {
        setCurrentPlan(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load local plan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventPlan(selectedEventId);
    } else {
      setLoading(false);
    }
  }, [selectedEventId, loadEventPlan]);

  // Generate or regenerate plan locally
  const handleGeneratePlan = async () => {
    if (!selectedEventId) return;
    setGenerating(true);
    setError(null);

    try {
      await generateAndSaveLocalPlan(selectedEventId);
      await refreshEvents();
      await loadEventPlan(selectedEventId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Plan generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-6 animate-page-enter">
      <PageHeader
        title="Event Planner Workspace"
        description="Review, generate, and explore complete structured AI event plans, deterministic budget ledgers, and day-of schedules."
        badge={
          <Badge variant="primary">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            GenAI Planning Engine
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/events/new">
              <Button size="sm" variant="outline" className="gap-1.5 shadow-glass-subtle font-medium">
                <PlusCircle className="h-4 w-4 text-primary-600" />
                <span>New Event</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Event Selector Bar in Luminous Glass */}
      {events.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl glass-card p-4 shadow-glass specular-top">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-600">Active Event:</span>
            <select
              value={selectedEventId || ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="rounded-xl glass-input px-3.5 py-1.5 text-xs font-semibold text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id} className="bg-white text-surface-900">
                  {ev.title} ({ev.type} • {ev.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleGeneratePlan}
              disabled={generating}
              className="gap-1.5 shadow-glass font-medium"
            >
              <Sparkles className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
              <span>{generating ? "Generating Plan..." : currentPlan ? "Regenerate Plan" : "Generate Plan"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="rounded-2xl glass-surface p-4 text-xs text-danger-700 border border-danger-200/80 bg-danger-50/80 flex items-center justify-between shadow-glass-subtle">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => handleGeneratePlan()} className="h-7 text-xs border-danger-300">
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : !user ? (
        <EmptyState
          icon={Calendar}
          title="Local profile required"
          description="Please select or create a local browser profile to view and generate event plans."
          actionLabel="Select Profile"
          actionHref="/login"
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events available to plan"
          description="Create your first wedding, birthday, or community project to unlock GenAI recommendations, budget allocations, and day-of run-sheets."
          actionLabel="Create an Event First"
          actionHref="/events/new"
        />
      ) : currentPlan ? (
        <div className="space-y-6">
          <ConversationalRevisionPanel
            eventId={selectedEventId!}
            onRevisionApplied={async () => {
              if (selectedEventId) {
                loadEventPlan(selectedEventId);
              }
            }}
          />
          <PlanViewer
            plan={currentPlan}
            eventId={selectedEventId!}
            onRegenerate={handleGeneratePlan}
            isRegenerating={generating}
          />
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title={`Plan Not Yet Generated for "${selectedEvent?.title}"`}
          description="Click below to generate a tailored event plan with theme concepts, deterministic budget category caps, milestones, and coordinator run-sheets."
          actionLabel={generating ? "Generating Plan..." : "Generate AI Event Plan"}
          onAction={handleGeneratePlan}
        />
      )}
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <PlannerContent />
    </Suspense>
  );
}
