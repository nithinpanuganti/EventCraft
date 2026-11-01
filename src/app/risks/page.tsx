"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useAuth } from "@/components/layout/AuthContext";
import {
  LocalRisk,
  RiskCategory,
  RiskPriorityLevel,
  RiskStatus,
  LocalEvent,
} from "@/lib/storage/types";
import {
  listLocalEvents,
  getLocalRisks,
  createLocalRisk,
  updateLocalRisk,
  deleteLocalRisk,
} from "@/lib/storage/local-repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ToastNotification } from "@/components/ui/ToastNotification";
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  X,
  Activity,
} from "lucide-react";

const PRIORITY_BADGES: Record<
  RiskPriorityLevel,
  { label: string; variant: "danger" | "warning" | "success" | "primary" }
> = {
  CRITICAL: { label: "Critical", variant: "danger" },
  HIGH: { label: "High", variant: "warning" },
  MEDIUM: { label: "Medium", variant: "primary" },
  LOW: { label: "Low", variant: "success" },
};

const CATEGORIES: RiskCategory[] = [
  "WEATHER",
  "VENDOR",
  "EQUIPMENT",
  "SCHEDULE",
  "BUDGET",
  "HEALTH_SAFETY",
  "LOGISTICS",
  "OTHER",
];

function RisksContent() {
  const { activeEvent } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);
  const [risks, setRisks] = useState<LocalRisk[]>([]);
  const [, setLoading] = useState(true);

  // Filters
  const [selectedCell, setSelectedCell] = useState<{ l: number; s: number } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<LocalRisk | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "WEATHER" as RiskCategory,
    likelihood: 3,
    severity: 3,
    owner: "Elena (Lead Organizer)",
    mitigationStrategy: "",
    contingencyPlan: "",
    status: "IDENTIFIED" as RiskStatus,
  });

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

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

  const loadRisks = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const list = await getLocalRisks(eventId);
      setRisks(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadRisks(selectedEventId);
    }
  }, [selectedEventId]);

  // 5x5 Matrix Cell mapping
  const matrixCells = useMemo(() => {
    const map = new Map<string, LocalRisk[]>();
    for (let l = 1; l <= 5; l++) {
      for (let s = 1; s <= 5; s++) {
        map.set(`${l}-${s}`, []);
      }
    }
    risks.forEach((r) => {
      const key = `${r.likelihood}-${r.severity}`;
      if (map.has(key)) map.get(key)!.push(r);
    });
    return map;
  }, [risks]);

  // Filtered Risks
  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      if (selectedCell && (r.likelihood !== selectedCell.l || r.severity !== selectedCell.s)) {
        return false;
      }
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      return true;
    });
  }, [risks, selectedCell, categoryFilter, statusFilter]);

  // Metrics
  const criticalCount = risks.filter((r) => r.priorityLevel === "CRITICAL").length;
  const highCount = risks.filter((r) => r.priorityLevel === "HIGH").length;
  const mitigatedCount = risks.filter((r) => r.status === "MITIGATED" || r.status === "CLOSED").length;

  const handleOpenAdd = () => {
    setEditingRisk(null);
    setFormData({
      title: "",
      category: "WEATHER",
      likelihood: 3,
      severity: 3,
      owner: "Elena (Lead Organizer)",
      mitigationStrategy: "",
      contingencyPlan: "",
      status: "IDENTIFIED",
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (risk: LocalRisk) => {
    setEditingRisk(risk);
    setFormData({
      title: risk.title,
      category: risk.category,
      likelihood: risk.likelihood,
      severity: risk.severity,
      owner: risk.owner,
      mitigationStrategy: risk.mitigationStrategy,
      contingencyPlan: risk.contingencyPlan,
      status: risk.status,
    });
    setIsAddEditOpen(true);
  };

  const handleSaveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      if (editingRisk) {
        await updateLocalRisk(editingRisk.id, {
          title: formData.title.trim(),
          category: formData.category,
          likelihood: formData.likelihood,
          severity: formData.severity,
          owner: formData.owner.trim(),
          mitigationStrategy: formData.mitigationStrategy.trim(),
          contingencyPlan: formData.contingencyPlan.trim(),
          status: formData.status,
        });
        setNotification({
          type: "success",
          title: "Risk Updated",
          message: "Contingency assessment updated.",
        });
      } else {
        await createLocalRisk({
          eventId: selectedEventId,
          title: formData.title.trim(),
          category: formData.category,
          likelihood: formData.likelihood,
          severity: formData.severity,
          owner: formData.owner.trim(),
          mitigationStrategy: formData.mitigationStrategy.trim(),
          contingencyPlan: formData.contingencyPlan.trim(),
          status: formData.status,
        });
        setNotification({
          type: "success",
          title: "Risk Logged",
          message: "New contingency risk added to the registry.",
        });
      }
      setIsAddEditOpen(false);
      await loadRisks(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    if (!confirm("Are you sure you want to remove this risk?")) return;
    try {
      await deleteLocalRisk(riskId);
      await loadRisks(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  // Cell background color by score
  const getCellBg = (l: number, s: number) => {
    const score = l * s;
    if (score >= 16) return "bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-400";
    if (score >= 10) return "bg-orange-500/20 border-orange-500/40 text-orange-600 dark:text-orange-400";
    if (score >= 6) return "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400";
    return "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-page-enter">
      {notification && (
        <ToastNotification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
              Risk & Contingency Manager
            </h1>
            <Badge variant="primary" size="sm">5×5 Heat Matrix</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Interactive risk matrix, proactive mitigation protocols, and real-time contingency tracking.
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
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 shadow-glass-glow"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Identify Risk</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-surface-500 font-medium">Total Risks Identified</div>
          <div className="text-2xl font-black text-surface-900 mt-1">{risks.length}</div>
        </Card>
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-rose-500 font-medium">Critical Priority</div>
          <div className="text-2xl font-black text-rose-500 mt-1">{criticalCount}</div>
        </Card>
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-orange-500 font-medium">High Priority</div>
          <div className="text-2xl font-black text-orange-500 mt-1">{highCount}</div>
        </Card>
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-emerald-500 font-medium">Mitigated / Resolved</div>
          <div className="text-2xl font-black text-emerald-500 mt-1">{mitigatedCount}</div>
        </Card>
      </div>

      {/* Main Grid: Left 5x5 Matrix (5 cols), Right Register (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 5x5 Matrix (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-500" />
              <span>5×5 Likelihood vs Severity Matrix</span>
            </h2>
            {selectedCell && (
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="text-[11px] text-primary-600 hover:underline"
              >
                Reset Filter
              </button>
            )}
          </div>

          <Card variant="elevated" className="p-5 specular-top space-y-4">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-surface-400 text-center">
                ▲ Likelihood (1 = Rare, 5 = Frequent)
              </div>

              {/* 5x5 Grid: Rows = Likelihood 5 down to 1 */}
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((l) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <span className="w-4 text-[10px] font-bold text-surface-400 text-right">
                      {l}
                    </span>
                    <div className="grid grid-cols-5 gap-1.5 flex-1">
                      {[1, 2, 3, 4, 5].map((s) => {
                        const cellRisks = matrixCells.get(`${l}-${s}`) || [];
                        const isSelected = selectedCell?.l === l && selectedCell?.s === s;
                        const cellColor = getCellBg(l, s);

                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setSelectedCell(isSelected ? null : { l, s })
                            }
                            className={`h-11 rounded-xl border flex flex-col items-center justify-center transition-all ${cellColor} ${
                              isSelected
                                ? "ring-2 ring-primary-500 scale-105 shadow-glass-glow z-10"
                                : "hover:scale-102"
                            }`}
                            title={`Likelihood ${l} × Severity ${s} = Score ${l * s}`}
                          >
                            <span className="text-[11px] font-extrabold">{l * s}</span>
                            {cellRisks.length > 0 && (
                              <span className="text-[9px] font-bold px-1 rounded-full bg-white/70 dark:bg-black/60 shadow-xs">
                                {cellRisks.length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pl-6 text-[10px] font-bold uppercase tracking-wider text-surface-400 pt-1">
                <span>1 (Negligible)</span>
                <span>Severity (1 to 5) ▶</span>
                <span>5 (Catastrophic)</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-surface-200/50 dark:border-surface-800/50 text-[10px] text-center font-bold">
              <div className="p-1 rounded-lg bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                1-5 Low
              </div>
              <div className="p-1 rounded-lg bg-amber-500/15 text-amber-600 border border-amber-500/30">
                6-9 Medium
              </div>
              <div className="p-1 rounded-lg bg-orange-500/15 text-orange-600 border border-orange-500/30">
                10-15 High
              </div>
              <div className="p-1 rounded-lg bg-rose-500/15 text-rose-600 border border-rose-500/30">
                16-25 Critical
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Risk Register (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <span>Risk Register ({filteredRisks.length})</span>
            </h2>

            <div className="flex items-center gap-2 text-xs">
              <select
                aria-label="Filter by Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-surface-100/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-surface-100/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="IDENTIFIED">Identified</option>
                <option value="MONITORING">Monitoring</option>
                <option value="MITIGATED">Mitigated</option>
                <option value="OCCURRED">Occurred</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredRisks.length > 0 ? (
              filteredRisks.map((risk) => {
                const pBadge = PRIORITY_BADGES[risk.priorityLevel];
                return (
                  <Card
                    key={risk.id}
                    variant="elevated"
                    className="p-4 specular-top space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                            {risk.category}
                          </span>
                          <span className="text-surface-400">•</span>
                          <span className="text-xs text-surface-500">Owner: {risk.owner}</span>
                        </div>
                        <h3 className="font-bold text-sm text-surface-900 mt-0.5">
                          {risk.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={pBadge.variant} size="sm">
                          {pBadge.label} ({risk.priorityScore})
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(risk)}
                          className="p-1 rounded text-surface-400 hover:text-primary-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRisk(risk.id)}
                          className="p-1 rounded text-surface-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {risk.mitigationStrategy && (
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200">
                          <span className="font-bold block text-[11px] mb-0.5">
                            Mitigation Strategy:
                          </span>
                          {risk.mitigationStrategy}
                        </div>
                      )}
                      {risk.contingencyPlan && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                          <span className="font-bold block text-[11px] mb-0.5">
                            Contingency Action Plan:
                          </span>
                          {risk.contingencyPlan}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-surface-200/50 dark:border-surface-800/50 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-surface-500">
                        Likelihood: <strong>{risk.likelihood}/5</strong> • Severity: <strong>{risk.severity}/5</strong>
                      </div>
                      <Badge variant="outline" size="sm">
                        Status: {risk.status}
                      </Badge>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card variant="subtle" className="p-10 text-center space-y-2">
                <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto opacity-70" />
                <h3 className="text-sm font-bold text-surface-900">No Risks In Current Filter</h3>
                <p className="text-xs text-surface-500">
                  Select a different matrix cell or identify a new event risk.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg glass-surface rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-glass-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-3">
              <h3 className="font-bold text-surface-900">
                {editingRisk ? "Edit Risk Assessment" : "Identify Contingency Risk"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 rounded-md text-surface-400 hover:text-surface-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRisk} className="space-y-4">
              <Input
                label="Risk Scenario Summary"
                required
                placeholder="e.g. Torrential rain flooding outdoor garden area"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as RiskCategory })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Owner / Lead"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                />
              </div>

              {/* Likelihood & Severity sliders */}
              <div className="grid grid-cols-2 gap-3 bg-surface-500/5 p-3 rounded-2xl border border-white/10">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Likelihood</span>
                    <span className="font-bold text-primary-600">{formData.likelihood} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData.likelihood}
                    onChange={(e) =>
                      setFormData({ ...formData, likelihood: parseInt(e.target.value) || 1 })
                    }
                    className="w-full accent-primary-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-surface-400">
                    <span>1 Rare</span>
                    <span>5 Frequent</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Severity</span>
                    <span className="font-bold text-rose-600">{formData.severity} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData.severity}
                    onChange={(e) =>
                      setFormData({ ...formData, severity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-surface-400">
                    <span>1 Low</span>
                    <span>5 Critical</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">
                  Preventative Mitigation Strategy
                </label>
                <textarea
                  rows={2}
                  placeholder="Proactive steps to prevent or minimize likelihood..."
                  value={formData.mitigationStrategy}
                  onChange={(e) => setFormData({ ...formData, mitigationStrategy: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">
                  Contingency Plan (If Incident Occurs)
                </label>
                <textarea
                  rows={2}
                  placeholder="Immediate action plan, backup equipment, secondary venue..."
                  value={formData.contingencyPlan}
                  onChange={(e) => setFormData({ ...formData, contingencyPlan: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200/50 dark:border-surface-800/50">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="shadow-glass-glow">
                  Save Assessment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RisksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <RisksContent />
    </Suspense>
  );
}
