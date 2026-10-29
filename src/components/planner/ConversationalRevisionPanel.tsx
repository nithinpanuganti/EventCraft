"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Send,
  AlertCircle,
  CheckCircle2,
  Terminal,
} from "lucide-react";
import { getLocalEvent } from "@/lib/storage/local-repository";
import {
  interpretLocalPlanningCommand,
  applyLocalProposal,
  InterpretedCommandProposal,
} from "@/lib/local-planning/command-interpreter";

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
  const [proposal, setProposal] = useState<InterpretedCommandProposal | null>(null);
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

      const event = await getLocalEvent(eventId);
      if (!event) {
        throw new Error("Event not found in local browser storage.");
      }

      const localProposal = interpretLocalPlanningCommand(event, prompt.trim());
      setProposal(localProposal);
      setPrompt("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to interpret command.";
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

      const event = await getLocalEvent(eventId);
      if (!event) throw new Error("Event not found");

      await applyLocalProposal(event, proposal);

      setSuccessMessage("Local changes applied successfully! Updated records are now active.");
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
    setSuccessMessage("Command proposal discarded. No changes were made to your plan.");
  };

  return (
    <div className="space-y-4 rounded-2xl glass-surface p-5 shadow-glass relative overflow-hidden">
      {/* Specular top sheen */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 to-transparent pointer-events-none" />

      <div className="flex items-center justify-between border-b border-surface-200/70 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_2px_8px_rgba(124,58,237,0.3)]">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-surface-900">Deterministic Local Command Interpreter</h3>
            <p className="text-xs text-surface-500">
              Type natural planning commands. Interpreted and applied directly inside your browser.
            </p>
          </div>
        </div>
        <Badge variant="primary" size="sm">
          Offline Rule Engine
        </Badge>
      </div>

      {/* Input Form */}
      <form onSubmit={handlePropose} className="flex gap-2">
        <Input
          placeholder='e.g. "add task Book Caterer", "adjust budget to 60000", "show remaining budget"...'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isProposing || isApplying}
          className="flex-1 text-sm shadow-glass-subtle"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isProposing}
          disabled={!prompt.trim() || isApplying}
          className="gap-1.5 shrink-0 shadow-glass font-semibold"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Execute</span>
        </Button>
      </form>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger-50/90 p-3.5 text-xs text-danger-700 border border-danger-200/80 backdrop-blur-sm animate-page-enter">
          <AlertCircle className="h-4 w-4 shrink-0 text-danger-600" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-success-50/90 p-3.5 text-xs text-success-700 border border-success-200/80 backdrop-blur-sm animate-page-enter">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Proposed Changes Preview Card */}
      {proposal && (
        <div className="space-y-3.5 rounded-2xl glass-surface-elevated p-5 shadow-glass-elevated border border-primary-200/80 animate-page-enter">
          <div className="flex items-center justify-between border-b border-surface-200/60 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-500">
              Proposed Operation
            </span>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  proposal.classification === "CONSEQUENTIAL"
                    ? "warning"
                    : proposal.classification === "LOW_RISK_EDIT"
                    ? "primary"
                    : "secondary"
                }
              >
                {proposal.classification.replace(/_/g, " ")}
              </Badge>
              {proposal.requiresConfirmation && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-warning-800 bg-warning-50 px-2.5 py-0.5 rounded-full border border-warning-200 shadow-sm">
                  <AlertCircle className="h-3 w-3 text-warning-600" />
                  Confirmation Required
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-surface-900">{proposal.changeSummary}</h4>
            <p className="text-xs text-surface-600 whitespace-pre-line leading-relaxed">
              {proposal.advisoryResponse}
            </p>
          </div>

          {/* Granular Operation Diffs */}
          {proposal.proposedOperations.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wide">
                Targeted Mutations:
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {proposal.proposedOperations.map((op, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-surface-200/70 glass-surface-subtle p-2.5 text-xs shadow-glass-subtle"
                  >
                    <span className="font-semibold text-surface-800">{op.description}</span>
                    <span className="rounded-md bg-primary-100/80 px-2 py-0.5 text-[10px] font-mono font-bold text-primary-800 border border-primary-200/60">
                      {op.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Confirmation Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-200/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReject}
              disabled={isApplying}
              className="text-xs font-medium"
            >
              Cancel
            </Button>
            {proposal.proposedOperations.length > 0 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApply}
                isLoading={isApplying}
                className="gap-1.5 text-xs font-semibold shadow-glass"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Confirm & Apply Locally</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleReject}
                className="text-xs"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
