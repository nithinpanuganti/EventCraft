"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { type PlanRevisionProposal } from "@/lib/revisions/schemas";

interface ConversationalRevisionPanelProps {
  eventId: string;
  onRevisionApplied: () => Promise<void>;
}

export function ConversationalRevisionPanel({
  eventId,
  onRevisionApplied,
}: ConversationalRevisionPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isProposing, setIsProposing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [proposal, setProposal] = useState<PlanRevisionProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
      setIsProposing(true);
      setError(null);
      setSuccessMessage(null);
      setProposal(null);

      const res = await fetch(`/api/events/${eventId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to generate plan revision proposal.");
      }

      const data = await res.json();
      setProposal(data.proposal);
      setPrompt("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate proposal.";
      setError(msg);
    } finally {
      setIsProposing(false);
    }
  };

  const handleApply = async () => {
    if (!proposal) return;

    try {
      setIsApplying(true);
      setError(null);

      const res = await fetch(`/api/events/${eventId}/revisions?action=apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to apply plan revision.");
      }

      setSuccessMessage("Plan revisions applied successfully! Updated records are now active.");
      setProposal(null);
      await onRevisionApplied();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply proposal.";
      setError(msg);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = () => {
    setProposal(null);
    setError(null);
    setSuccessMessage("Proposal discarded. No changes were made to your plan.");
  };

  return (
    <div className="rounded-2xl glass-card p-5 space-y-4 shadow-glass specular-top border border-primary-200/80 text-xs">
      <div className="flex items-center justify-between pb-3 border-b border-surface-200/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_2px_8px_rgba(124,58,237,0.3)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-surface-900 tracking-tight">Conversational Plan Revisions</h3>
            <p className="text-[11px] text-surface-500">
              Request adjustments naturally (e.g. &ldquo;Reduce budget to $15,000&rdquo;, &ldquo;Change theme to Bohemian Chic&rdquo;)
            </p>
          </div>
        </div>
        <Badge variant="primary" className="text-[10px]">
          Context-Preserving
        </Badge>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-800 backdrop-blur-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 backdrop-blur-sm animate-page-enter">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handlePropose} className="flex gap-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask EventCraft AI to adjust budgets, dates, themes, or add milestones..."
          disabled={isProposing || isApplying}
          className="flex-1 text-xs"
        />
        <Button
          type="submit"
          disabled={isProposing || isApplying || !prompt.trim()}
          className="gap-1.5 shrink-0 shadow-glass"
        >
          {isProposing ? (
            <span>Analyzing...</span>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>Propose</span>
            </>
          )}
        </Button>
      </form>

      {/* Proposal Preview & Confirmation Card */}
      {proposal && (
        <div className="p-4 sm:p-5 rounded-2xl glass-surface-elevated border border-primary-200/90 shadow-glass-elevated space-y-3 animate-page-enter specular-top">
          <div className="flex items-center justify-between pb-2 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-surface-900">Proposal: {proposal.intent}</span>
              <Badge
                variant={
                  proposal.classification === "CONSEQUENTIAL"
                    ? "warning"
                    : proposal.classification === "LOW_RISK_EDIT"
                    ? "primary"
                    : "secondary"
                }
                className="text-[10px]"
              >
                {proposal.classification}
              </Badge>
            </div>
            {proposal.requiresConfirmation && (
              <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Requires User Confirmation</span>
              </span>
            )}
          </div>

          {/* AI Advisory guidance */}
          <div className="p-3 rounded-lg bg-surface-50 text-surface-700 text-xs leading-relaxed border border-surface-200">
            {proposal.advisoryResponse}
          </div>

          {/* Structured Change Summary */}
          <div>
            <span className="font-semibold text-surface-800 block mb-1">Proposed Operational Changes:</span>
            <div className="p-2.5 rounded-lg bg-surface-50/80 border border-surface-200 text-[11px] font-mono text-surface-800">
              {proposal.changeSummary}
            </div>
          </div>

          {/* Operations List */}
          {proposal.proposedOperations.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-surface-600 uppercase tracking-wide">
                Target Record Mutations:
              </span>
              {proposal.proposedOperations.map((op, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded bg-surface-100 text-[11px] text-surface-800"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-primary-600 shrink-0" />
                  <span className="font-semibold text-primary-700">[{op.type}]</span>
                  <span>{op.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={isApplying}
              className="gap-1 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Discard Proposal</span>
            </Button>

            {proposal.proposedOperations.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                disabled={isApplying}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{isApplying ? "Applying..." : "Confirm & Apply Changes"}</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
