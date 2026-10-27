"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlanViewer } from "@/components/events/PlanViewer";
import { ConversationalRevisionPanel } from "@/components/planner/ConversationalRevisionPanel";
import {
  GeneratedEventPlan,
  PlanMilestone,
  PlanTask,
  PlanDayOfScheduleItem,
  PlanVendorItem,
} from "@/lib/planning/schema";
import { Sparkles, Calendar, PlusCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface EventItem {
  id: string;
  title: string;
  type: string;
  status: string;
}

function PlannerContent() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventIdParam);
  const [currentPlan, setCurrentPlan] = useState<GeneratedEventPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  // 1. Fetch user's saved events
  useEffect(() => {
    fetch("/api/events")
      .then(async (res) => {
        if (res.status === 401) {
          setIsUnauthenticated(true);
          return { events: [] };
        }
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || "Failed to load events");
        }
        return res.json();
      })
      .then((data) => {
        const evList: EventItem[] = data.events || [];
        setEvents(evList);
        if (!selectedEventId && evList.length > 0) {
          setSelectedEventId(evList[0].id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedEventId]);

  // 2. Fetch selected event details and plan
  const loadEventPlan = useCallback((evId: string) => {
    setLoading(true);
    setError(null);
    fetch(`/api/events/${evId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not retrieve event");
        return res.json();
      })
      .then((data) => {
        const ev = data.event;
        if (ev?.plan?.aiRecommendations) {
          const recs = ev.plan.aiRecommendations as Record<string, unknown>;
          const summaryObj = (recs.summary as Record<string, unknown>) || {};
          const themeObj = (recs.theme as Record<string, unknown>) || {};
          const budgetObj = (recs.budget as Record<string, unknown>) || {};
          const risksObj = (recs.risksAndAlternatives as Record<string, unknown>) || {};
          const metaObj = (recs.metadata as Record<string, unknown>) || {};

          setCurrentPlan({
            summary: {
              conceptTitle: ev.plan.conceptTitle,
              conceptNarrative: ev.plan.conceptNarrative,
              planningAssumptions: Array.isArray(summaryObj.planningAssumptions) ? summaryObj.planningAssumptions : [],
              keyRecommendations: Array.isArray(summaryObj.keyRecommendations) ? summaryObj.keyRecommendations : [],
            },
            theme: {
              themeName: typeof themeObj.themeName === "string" ? themeObj.themeName : "Celebration Concept",
              colorPalette: Array.isArray(themeObj.colorPalette) ? themeObj.colorPalette : ["#333", "#666"],
              styleDirection: typeof themeObj.styleDirection === "string" ? themeObj.styleDirection : "",
              decorationIdeas: Array.isArray(themeObj.decorationIdeas) ? themeObj.decorationIdeas : [],
              personalizedActivities: Array.isArray(themeObj.personalizedActivities) ? themeObj.personalizedActivities : [],
              culturalConsiderations: Array.isArray(themeObj.culturalConsiderations) ? themeObj.culturalConsiderations : [],
            },
            budget: {
              totalBudget: Number(budgetObj.totalBudget || ev.totalBudget),
              currency: String(budgetObj.currency || ev.currency),
              categories: Array.isArray(budgetObj.categories) ? budgetObj.categories : [],
              contingencyPercentage: Number(budgetObj.contingencyPercentage) || 5,
              isBalanced: true,
            },
            milestones: Array.isArray(recs.milestones) ? (recs.milestones as PlanMilestone[]) : [],
            tasks: Array.isArray(recs.tasks) ? (recs.tasks as PlanTask[]) : [],
            dayOfSchedule: Array.isArray(ev.plan.dayOfSchedule)
              ? (ev.plan.dayOfSchedule as PlanDayOfScheduleItem[])
              : [],
            vendors: Array.isArray(recs.vendors) ? (recs.vendors as PlanVendorItem[]) : [],
            risksAndAlternatives: {
              potentialRisks: Array.isArray(risksObj.potentialRisks) ? risksObj.potentialRisks : [],
              mitigations: Array.isArray(risksObj.mitigations) ? risksObj.mitigations : [],
              budgetSavingTips: Array.isArray(risksObj.budgetSavingTips) ? risksObj.budgetSavingTips : [],
              optionalUpgrades: Array.isArray(risksObj.optionalUpgrades) ? risksObj.optionalUpgrades : [],
            },
            metadata: {
              source: metaObj.source === "curated-fallback" ? "curated-fallback" : "ai-generated",
              provider: typeof metaObj.provider === "string" ? metaObj.provider : "System",
              model: typeof metaObj.model === "string" ? metaObj.model : "default",
              version: ev.plan.version || 1,
              generatedAt: ev.plan.updatedAt || new Date().toISOString(),
            },
          });
        } else {
          setCurrentPlan(null);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventPlan(selectedEventId);
    }
  }, [selectedEventId, loadEventPlan]);

  // 3. Generate or regenerate plan
  const handleGeneratePlan = async () => {
    if (!selectedEventId) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${selectedEventId}/plan`, {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Plan generation failed.");
      }

      const data = await res.json();
      setCurrentPlan(data.plan);
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
            Phase 5 GenAI Engine
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/events/new">
              <Button size="sm" variant="outline" className="gap-1.5">
                <PlusCircle className="h-4 w-4" />
                <span>New Event</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Event Selector Bar */}
      {events.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white p-3 shadow-subtle">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-surface-600">Active Event:</span>
            <select
              value={selectedEventId || ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="rounded-lg border border-surface-300 bg-surface-50 px-3 py-1.5 text-xs font-semibold text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
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
              className="gap-1.5 bg-primary-600 hover:bg-primary-700"
            >
              <Sparkles className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
              <span>{generating ? "Generating Plan..." : currentPlan ? "Regenerate Plan" : "Generate Plan"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-xs text-danger-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
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
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : isUnauthenticated ? (
        <EmptyState
          icon={Calendar}
          title="Sign in required"
          description="Please sign in or create an account to view and generate AI event plans."
          actionLabel="Sign In"
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
