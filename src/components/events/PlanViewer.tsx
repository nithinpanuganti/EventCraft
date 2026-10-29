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
      {/* Source & Status Banner with Specular Liquid Sheen */}
      <div
        className={`relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-5 shadow-glass-subtle backdrop-blur-md ${
          isFallback
            ? "border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-amber-100/70 text-amber-950"
            : "border-primary-200/80 bg-gradient-to-r from-primary-50/90 via-primary-100/60 to-accent-50/80 text-primary-950"
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 to-transparent pointer-events-none" />

        <div className="flex items-start gap-3.5">
          {isFallback ? (
            <div className="p-2 rounded-xl bg-amber-100/80 text-amber-700 shadow-sm shrink-0 mt-0.5">
              <Info className="h-5 w-5" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-primary-100/80 text-primary-700 shadow-sm shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm sm:text-base">
                {isFallback ? "Curated Domain Template Plan" : "Personalized AI-Generated Plan"}
              </span>
              <Badge variant={isFallback ? "secondary" : "primary"} size="sm">
                v{plan.metadata.version}
              </Badge>
              <Badge variant="outline" size="sm">
                {plan.metadata.provider} ({plan.metadata.model})
              </Badge>
            </div>
            <p className="text-xs mt-1.5 text-surface-600 leading-relaxed max-w-2xl">
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
            className="shrink-0 gap-2 shadow-glass-subtle font-medium"
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
        <div className="space-y-6 animate-page-enter">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-extrabold">{plan.summary.conceptTitle}</CardTitle>
                  <CardDescription className="mt-1 text-sm">{plan.summary.conceptNarrative}</CardDescription>
                </div>
                <Badge variant="primary" size="md">{plan.theme.themeName}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Recommendations */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary-600" /> Key Recommendations
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  {plan.summary.keyRecommendations.map((rec, idx) => (
                    <div key={idx} className="rounded-xl glass-surface-subtle p-3.5 text-xs text-surface-800 shadow-glass-subtle border border-surface-200/70 space-y-1">
                      <span className="font-bold text-primary-700 block text-xs">0{idx + 1}</span>
                      <p className="leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme & Style Direction */}
              <div className="border-t border-surface-200/60 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-3 flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-primary-600" /> Theme & Aesthetic Direction
                </h4>
                <p className="text-xs sm:text-sm text-surface-700 leading-relaxed mb-4">{plan.theme.styleDirection}</p>

                {/* Color Palette */}
                <div className="space-y-2 mb-4">
                  <span className="text-xs font-semibold text-surface-700">Recommended Palette:</span>
                  <div className="flex flex-wrap gap-2.5">
                    {plan.theme.colorPalette.map((color, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-full border border-surface-200/80 bg-white/80 backdrop-blur-md px-3.5 py-1 text-xs shadow-glass-subtle"
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-black/10 shadow-sm"
                          style={{ backgroundColor: color.startsWith("#") ? color : "#ccc" }}
                        />
                        <span className="font-mono text-[11px] font-semibold text-surface-800">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decoration Ideas */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-surface-700">Decoration Highlights:</span>
                  <ul className="list-disc pl-5 text-xs text-surface-600 space-y-1.5">
                    {plan.theme.decorationIdeas.map((idea, idx) => (
                      <li key={idx} className="leading-relaxed">{idea}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Assumptions */}
              {plan.summary.planningAssumptions.length > 0 && (
                <div className="rounded-xl glass-surface-subtle p-4 text-xs text-surface-600 border border-surface-200/70 shadow-glass-subtle space-y-2">
                  <span className="font-bold text-surface-900 block">Planning Assumptions:</span>
                  <ul className="list-disc pl-5 space-y-1">
                    {plan.summary.planningAssumptions.map((assump, idx) => (
                      <li key={idx} className="leading-relaxed">{assump}</li>
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
        <div className="space-y-6 animate-page-enter">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Deterministic Budget Breakdown</CardTitle>
                  <CardDescription>
                    Category amounts computed with exact cents precision from your target budget.
                  </CardDescription>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-surface-400 block font-medium">Total Budget Cap</span>
                  <span className="text-xl font-bold font-mono text-surface-900">
                    {formatCurrency(plan.budget.totalBudget, plan.budget.currency)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress bar visualizer */}
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-surface-200/50 flex overflow-hidden border border-surface-200/70 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
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

              {/* Category Table in Liquid Glass */}
              <div className="glass-table-wrapper">
                <table className="w-full text-left text-xs">
                  <thead className="glass-table-thead text-surface-700 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Allocation %</th>
                      <th className="py-3 px-4">Allocated Cap</th>
                      <th className="py-3 px-4">Estimated Range</th>
                      <th className="py-3 px-4">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/50 text-surface-800">
                    {plan.budget.categories.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-white/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-surface-900">{cat.categoryName}</td>
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

              <div className="rounded-xl glass-surface-subtle border border-surface-200/70 p-3.5 text-xs text-surface-600 flex items-center justify-between shadow-glass-subtle">
                <span>Contingency Reserve: {plan.budget.contingencyPercentage}% included</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> 100% Balanced Allocation
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: TIMELINE & TASKS */}
      {activeTab === "timeline" && (
        <div className="space-y-6 animate-page-enter">
          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle>Preparation Milestones</CardTitle>
              <CardDescription>Major phased goals leading up to your celebration.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3.5">
                {plan.milestones.map((m, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-xl glass-surface-subtle border border-surface-200/70 shadow-glass-subtle">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white font-bold text-xs shrink-0 shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-surface-900">{m.title}</h4>
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
                      <p className="text-xs text-surface-600 leading-relaxed">{m.description}</p>
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
              <div className="divide-y divide-surface-200/60">
                {plan.tasks.map((task, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between text-xs hover:bg-white/40 px-2 rounded-lg transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-bold text-surface-900 block">{task.title}</span>
                      {task.description && (
                        <p className="text-surface-500 text-[11px] leading-relaxed">{task.description}</p>
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
        <Card className="animate-page-enter">
          <CardHeader>
            <CardTitle>Day-of Run-of-Show Schedule</CardTitle>
            <CardDescription>Chronological itinerary for hosts, vendors, and coordinators.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative border-l-2 border-primary-200/60 ml-4 space-y-6 py-2">
              {plan.dayOfSchedule.map((item, idx) => (
                <div key={idx} className="relative pl-6">
                  <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-primary-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]" />
                  <div className="rounded-xl glass-surface-subtle p-3.5 border border-surface-200/70 shadow-glass-subtle space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200/60 shadow-sm">
                        {item.time}
                      </span>
                      <span className="font-semibold text-xs text-surface-500">Lead: {item.lead}</span>
                    </div>
                    <h4 className="text-sm font-bold text-surface-900 mt-1">{item.activity}</h4>
                    {item.notes && <p className="text-xs text-surface-500 leading-relaxed">{item.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: VENDOR GUIDELINES */}
      {activeTab === "vendors" && (
        <Card className="animate-page-enter">
          <CardHeader>
            <CardTitle>Vendor Criteria & Interview Guidelines</CardTitle>
            <CardDescription>
              Objective checklists and interview questions to evaluate candidates. (No synthetic vendor endorsements).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {plan.vendors.map((v, idx) => (
                <div key={idx} className="rounded-2xl glass-surface-subtle border border-surface-200/70 p-4 space-y-3 shadow-glass-subtle">
                  <div className="flex items-center justify-between border-b border-surface-200/60 pb-2">
                    <h4 className="font-bold text-surface-900 text-sm flex items-center gap-1.5">
                      <Store className="h-4 w-4 text-primary-600" /> {v.categoryName}
                    </h4>
                    <span className="text-[10px] text-surface-500 font-mono">{v.recommendedMilestone}</span>
                  </div>
                  <p className="text-xs text-surface-600 leading-relaxed">{v.justification}</p>

                  <div>
                    <span className="text-[11px] font-bold text-surface-700 block mb-1">Selection Criteria:</span>
                    <ul className="list-disc pl-4 text-xs text-surface-600 space-y-0.5">
                      {v.selectionCriteria.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-surface-700 block mb-1">Key Questions to Ask:</span>
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
        <div className="grid gap-6 sm:grid-cols-2 animate-page-enter">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" /> Planning Risks & Mitigations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {plan.risksAndAlternatives.potentialRisks.map((risk, idx) => (
                <div key={idx} className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs space-y-1 shadow-glass-subtle backdrop-blur-sm">
                  <span className="font-bold text-amber-900 block">Risk: {risk}</span>
                  <p className="text-surface-700 leading-relaxed">
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
                <ul className="list-disc pl-5 text-xs text-surface-600 space-y-1 leading-relaxed">
                  {plan.risksAndAlternatives.budgetSavingTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>

              {plan.risksAndAlternatives.optionalUpgrades.length > 0 && (
                <div className="border-t border-surface-200/60 pt-3 space-y-2">
                  <span className="text-xs font-bold text-surface-800 block">Optional Experiential Upgrades:</span>
                  <ul className="list-disc pl-5 text-xs text-surface-600 space-y-1 leading-relaxed">
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
