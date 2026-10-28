"use client";

import React, { useState } from "react";
import { GeneratedEventPlan } from "@/lib/local-planning/schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { formatCurrency } from "@/lib/utils";
import {
  Sparkles,
  DollarSign,
  CheckCircle2,
  ShieldAlert,
  Store,
  Palette,
  RotateCcw,
  Info,
} from "lucide-react";

interface PlanViewerProps {
  plan: GeneratedEventPlan;
  eventId?: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function PlanViewer({
  plan,
  onRegenerate,
  isRegenerating = false,
}: PlanViewerProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Executive Concept" },
    { id: "budget", label: "Budget Allocations" },
    { id: "timeline", label: "Milestones & Tasks" },
    { id: "runsheet", label: "Day-of Schedule" },
    { id: "vendors", label: "Vendor Guidelines" },
    { id: "risks", label: "Risks & Alternatives" },
  ];

  const isFallback = plan.metadata.source === "curated-fallback";

  return (
    <div className="space-y-6">
      {/* Source & Status Banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 ${
          isFallback
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-primary-200 bg-primary-50 text-primary-950"
        }`}
      >
        <div className="flex items-start gap-3">
          {isFallback ? (
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {isFallback ? "Curated Domain Template Plan" : "Personalized AI-Generated Plan"}
              </span>
              <Badge variant={isFallback ? "secondary" : "primary"} size="sm">
                v{plan.metadata.version}
              </Badge>
              <Badge variant="outline" size="sm">
                {plan.metadata.provider} ({plan.metadata.model})
              </Badge>
            </div>
            <p className="text-xs mt-1 text-surface-600">
              {isFallback
                ? "This plan was built using our expert-curated industry template and personalized to your budget and headcount."
                : "This plan was generated using AI structured outputs and deterministically verified for math and scheduling accuracy."}
            </p>
          </div>
        </div>

        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="shrink-0 gap-2"
          >
            <RotateCcw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
            <span>{isRegenerating ? "Regenerating..." : "Regenerate Plan"}</span>
          </Button>
        )}
      </div>

      {/* Tabs navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: OVERVIEW & THEME */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{plan.summary.conceptTitle}</CardTitle>
                  <CardDescription className="mt-1">{plan.summary.conceptNarrative}</CardDescription>
                </div>
                <Badge variant="primary">{plan.theme.themeName}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Recommendations */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary-600" /> Key Recommendations
                </h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  {plan.summary.keyRecommendations.map((rec, idx) => (
                    <div key={idx} className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-800">
                      <span className="font-bold text-primary-700 block mb-1">0{idx + 1}</span>
                      {rec}
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme & Style Direction */}
              <div className="border-t border-surface-100 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-3 flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-primary-600" /> Theme & Aesthetic Direction
                </h4>
                <p className="text-xs text-surface-700 leading-relaxed mb-4">{plan.theme.styleDirection}</p>

                {/* Color Palette */}
                <div className="space-y-2 mb-4">
                  <span className="text-xs font-semibold text-surface-700">Recommended Palette:</span>
                  <div className="flex flex-wrap gap-2">
                    {plan.theme.colorPalette.map((color, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-full border border-surface-200 bg-white px-3 py-1 text-xs shadow-subtle"
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-surface-300"
                          style={{ backgroundColor: color.startsWith("#") ? color : "#ccc" }}
                        />
                        <span className="font-mono text-[11px] text-surface-700">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decoration Ideas */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-surface-700">Decoration Highlights:</span>
                  <ul className="list-disc pl-5 text-xs text-surface-600 space-y-1">
                    {plan.theme.decorationIdeas.map((idea, idx) => (
                      <li key={idx}>{idea}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Assumptions */}
              {plan.summary.planningAssumptions.length > 0 && (
                <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-600">
                  <span className="font-semibold text-surface-900 block mb-1">Planning Assumptions:</span>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {plan.summary.planningAssumptions.map((assump, idx) => (
                      <li key={idx}>{assump}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: BUDGET ALLOCATIONS */}
      {activeTab === "budget" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Deterministic Budget Breakdown</CardTitle>
                  <CardDescription>
                    Category dollar amounts computed with exact cents precision from your target budget.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-xs text-surface-400 block">Total Budget Cap</span>
                  <span className="text-lg font-bold font-mono text-surface-900">
                    {formatCurrency(plan.budget.totalBudget, plan.budget.currency)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress bar visualizer */}
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-surface-100 flex overflow-hidden border border-surface-200">
                  {plan.budget.categories.map((cat, idx) => {
                    const colors = [
                      "bg-primary-500",
                      "bg-blue-500",
                      "bg-emerald-500",
                      "bg-amber-500",
                      "bg-purple-500",
                      "bg-rose-500",
                      "bg-teal-500",
                      "bg-indigo-500",
                    ];
                    const color = colors[idx % colors.length];
                    return (
                      <div
                        key={idx}
                        className={`${color} transition-all`}
                        style={{ width: `${cat.allocatedPercentage}%` }}
                        title={`${cat.categoryName}: ${cat.allocatedPercentage}%`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-surface-500 pt-1">
                  {plan.budget.categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary-600" />
                      <span>{cat.categoryName} ({cat.allocatedPercentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Table */}
              <div className="overflow-x-auto rounded-xl border border-surface-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-50 border-b border-surface-200 text-surface-700 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Allocation %</th>
                      <th className="py-3 px-4">Allocated Cap</th>
                      <th className="py-3 px-4">Estimated Range</th>
                      <th className="py-3 px-4">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 text-surface-800">
                    {plan.budget.categories.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-surface-50/50">
                        <td className="py-3 px-4 font-semibold text-surface-900">{cat.categoryName}</td>
                        <td className="py-3 px-4 font-mono">{cat.allocatedPercentage}%</td>
                        <td className="py-3 px-4 font-mono font-bold text-primary-700">
                          {formatCurrency(cat.allocatedAmount, plan.budget.currency)}
                        </td>
                        <td className="py-3 px-4 font-mono text-surface-600">
                          ~{formatCurrency(cat.estimatedAmount, plan.budget.currency)}
                        </td>
                        <td className="py-3 px-4 text-surface-500 text-[11px] max-w-xs">{cat.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg bg-surface-50 border border-surface-200 p-3 text-xs text-surface-500 flex items-center justify-between">
                <span>Contingency Reserve: {plan.budget.contingencyPercentage}% included</span>
                <span className="font-semibold text-success-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 100% Balanced Allocation
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: TIMELINE & TASKS */}
      {activeTab === "timeline" && (
        <div className="space-y-6">
          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle>Preparation Milestones</CardTitle>
              <CardDescription>Major phased goals leading up to your celebration.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plan.milestones.map((m, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-3 rounded-xl border border-surface-100 bg-surface-50/50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700 font-bold text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-surface-900">{m.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" size="sm">{m.phase}</Badge>
                          <Badge
                            variant={m.priority === "CRITICAL" ? "primary" : "secondary"}
                            size="sm"
                          >
                            {m.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-surface-600">{m.description}</p>
                      <div className="text-[11px] text-surface-400 font-mono pt-1">
                        {m.targetDate ? `Target: ${m.targetDate}` : `Offset: ${m.offsetDays} days relative to event`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actionable Task Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Actionable Task Checklist ({plan.tasks.length} tasks)</CardTitle>
              <CardDescription>Synchronized checklist ready to track in the Planner workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-surface-100">
                {plan.tasks.map((task, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-surface-900 block">{task.title}</span>
                      {task.description && (
                        <p className="text-surface-500 text-[11px]">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-surface-400 pt-0.5">
                        {task.category && <span>Category: {task.category}</span>}
                        <span>•</span>
                        <span>Phase: {task.phase}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" size="sm">{task.priority}</Badge>
                      {task.dueDate && (
                        <span className="text-surface-500 font-mono text-[11px]">{task.dueDate}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: RUN-OF-SHOW SCHEDULE */}
      {activeTab === "runsheet" && (
        <Card>
          <CardHeader>
            <CardTitle>Day-of Run-of-Show Schedule</CardTitle>
            <CardDescription>Chronological itinerary for hosts, vendors, and coordinators.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative border-l border-surface-200 ml-4 space-y-6 py-2">
              {plan.dayOfSchedule.map((item, idx) => (
                <div key={idx} className="relative pl-6">
                  <span className="absolute -left-2 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary-600 shadow-subtle" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                        {item.time}
                      </span>
                      <span className="font-semibold text-xs text-surface-500">Lead: {item.lead}</span>
                    </div>
                    <h4 className="text-sm font-bold text-surface-900">{item.activity}</h4>
                    {item.notes && <p className="text-xs text-surface-500">{item.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: VENDOR GUIDELINES */}
      {activeTab === "vendors" && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Criteria & Interview Guidelines</CardTitle>
            <CardDescription>
              Objective checklists and interview questions to evaluate candidates. (No synthetic vendor endorsements).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {plan.vendors.map((v, idx) => (
                <div key={idx} className="rounded-xl border border-surface-200 bg-surface-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-200 pb-2">
                    <h4 className="font-bold text-surface-900 text-sm flex items-center gap-1.5">
                      <Store className="h-4 w-4 text-primary-600" /> {v.categoryName}
                    </h4>
                    <span className="text-[10px] text-surface-500 font-mono">{v.recommendedMilestone}</span>
                  </div>
                  <p className="text-xs text-surface-600">{v.justification}</p>

                  <div>
                    <span className="text-[11px] font-semibold text-surface-700 block mb-1">Selection Criteria:</span>
                    <ul className="list-disc pl-4 text-xs text-surface-600 space-y-0.5">
                      {v.selectionCriteria.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-surface-700 block mb-1">Key Questions to Ask:</span>
                    <ul className="list-disc pl-4 text-xs text-surface-600 space-y-0.5">
                      {v.questionsToAsk.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 6: RISKS & ALTERNATIVES */}
      {activeTab === "risks" && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" /> Planning Risks & Mitigations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.risksAndAlternatives.potentialRisks.map((risk, idx) => (
                <div key={idx} className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 text-xs space-y-1">
                  <span className="font-bold text-amber-900 block">Risk: {risk}</span>
                  <p className="text-surface-700">
                    <span className="font-semibold">Mitigation:</span> {plan.risksAndAlternatives.mitigations[idx] || "Review contingency protocols."}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" /> Budget Optimization & Upgrades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-surface-800 block">Cost Reduction Opportunities:</span>
                <ul className="list-disc pl-5 text-xs text-surface-600 space-y-1">
                  {plan.risksAndAlternatives.budgetSavingTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>

              {plan.risksAndAlternatives.optionalUpgrades.length > 0 && (
                <div className="border-t border-surface-100 pt-3 space-y-2">
                  <span className="text-xs font-bold text-surface-800 block">Optional Experiential Upgrades:</span>
                  <ul className="list-disc pl-5 text-xs text-surface-600 space-y-1">
                    {plan.risksAndAlternatives.optionalUpgrades.map((upg, idx) => (
                      <li key={idx}>{upg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
