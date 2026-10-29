"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PlusCircle, Clock, User, Printer, Trash2, Edit2, Save } from "lucide-react";

export interface DayOfActivity {
  time: string;
  activity: string;
  lead?: string;
  notes?: string;
}

interface RunSheetViewerProps {
  schedule: DayOfActivity[];
  eventTitle: string;
  eventDate?: Date | string | null;
  onSaveSchedule: (schedule: DayOfActivity[]) => Promise<void>;
}

export function RunSheetViewer({
  schedule,
  eventTitle,
  eventDate,
  onSaveSchedule,
}: RunSheetViewerProps) {
  const [items, setItems] = useState<DayOfActivity[]>(schedule || []);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New activity row state
  const [newTime, setNewTime] = useState("");
  const [newActivity, setNewActivity] = useState("");
  const [newLead, setNewLead] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const handlePrint = () => {
    window.print();
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime.trim() || !newActivity.trim()) {
      setError("Time and Activity title are required.");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        time: newTime.trim(),
        activity: newActivity.trim(),
        lead: newLead.trim() || "Lead Coordinator",
        notes: newNotes.trim() || "",
      },
    ]);

    setNewTime("");
    setNewActivity("");
    setNewLead("");
    setNewNotes("");
    setError(null);
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await onSaveSchedule(items);
      setIsEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save run-sheet.";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Run Sheet Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-200/60">
        <div>
          <h3 className="text-sm font-bold text-surface-900">
            {eventTitle} — Event-Day Run-of-Show
          </h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Chronological run-sheet for coordinators, vendors, and venue leads on{" "}
            {eventDate ? new Date(eventDate).toLocaleDateString() : "Event Day"}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="gap-1.5 text-xs shadow-glass-subtle font-medium"
          >
            <Printer className="h-3.5 w-3.5 text-primary-600" />
            <span>Print Run-Sheet</span>
          </Button>

          {isEditing ? (
            <Button
              size="sm"
              disabled={isSaving}
              onClick={handleSave}
              className="gap-1.5 text-xs shadow-glass font-medium"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="gap-1.5 text-xs shadow-glass-subtle font-medium"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Run-Sheet</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-danger-50/90 border border-danger-200/80 text-xs text-danger-800 shadow-glass-subtle backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Activity Timeline Table in Glass Table */}
      {items.length === 0 ? (
        <div className="flex h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-300/70 glass-surface-subtle text-xs text-surface-500 shadow-glass-subtle">
          <Clock className="h-6 w-6 text-surface-400 mb-1.5" />
          <p className="font-semibold text-surface-700">No run-of-show schedule recorded yet.</p>
          <p className="mt-0.5 text-[11px] text-surface-400">
            Generate an event plan or click Edit Run-Sheet to add activities.
          </p>
        </div>
      ) : (
        <div className="glass-table-wrapper">
          <table className="w-full text-left text-xs">
            <thead className="glass-table-thead text-surface-700 font-semibold border-b border-surface-200/70">
              <tr>
                <th className="py-3 px-3.5 w-32">Time</th>
                <th className="py-3 px-3.5">Activity</th>
                <th className="py-3 px-3.5 w-44">Responsible Lead</th>
                <th className="py-3 px-3.5">Notes & Logistics</th>
                {isEditing && <th className="py-3 px-3.5 w-16 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/50">
              {items.map((act, index) => (
                <tr key={index} className="hover:bg-white/60 transition-colors">
                  <td className="py-3 px-3.5 font-mono font-bold text-primary-700 bg-primary-50/30">
                    {act.time}
                  </td>
                  <td className="py-3 px-3.5 font-bold text-surface-900">
                    {act.activity}
                  </td>
                  <td className="py-3 px-3.5 text-surface-600">
                    <span className="inline-flex items-center gap-1.5 font-medium text-surface-700">
                      <User className="h-3 w-3 text-surface-400" />
                      <span>{act.lead || "Coordinator"}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-surface-500 text-[11px] leading-relaxed">
                    {act.notes || "—"}
                  </td>
                  {isEditing && (
                    <td className="py-3 px-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(index)}
                        className="h-7 w-7 p-0 text-danger-500 hover:text-danger-700 hover:bg-danger-50/80 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add New Activity Row (In Editing Mode) */}
      {isEditing && (
        <form onSubmit={handleAddItem} className="p-4 rounded-2xl glass-surface-subtle border border-surface-200/80 shadow-glass space-y-3 text-xs">
          <div className="font-bold text-surface-800">Add Schedule Block</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <Input
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="e.g. 02:00 PM - 03:00 PM"
              required
            />
            <Input
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              placeholder="e.g. Ceremony & Ring Exchange"
              required
              className="sm:col-span-2"
            />
            <Input
              value={newLead}
              onChange={(e) => setNewLead(e.target.value)}
              placeholder="e.g. Officiant / Lead Coordinator"
            />
          </div>
          <div className="flex gap-2">
            <Input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Operational notes, cue music, check microphone batteries, etc."
              className="flex-1"
            />
            <Button type="submit" size="sm" className="gap-1.5 shrink-0 shadow-glass font-medium">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Block</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
