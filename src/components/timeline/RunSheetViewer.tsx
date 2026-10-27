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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-100">
        <div>
          <h3 className="text-sm font-semibold text-surface-900">
            {eventTitle} — Event-Day Run-of-Show
          </h3>
          <p className="text-xs text-surface-500">
            Chronological run-sheet for coordinators, vendors, and venue leads on{" "}
            {eventDate ? new Date(eventDate).toLocaleDateString() : "Event Day"}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Run-Sheet</span>
          </Button>

          {isEditing ? (
            <Button
              size="sm"
              disabled={isSaving}
              onClick={handleSave}
              className="gap-1.5 text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="gap-1.5 text-xs"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Run-Sheet</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Activity Timeline Table */}
      {items.length === 0 ? (
        <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-surface-200 bg-surface-50 text-xs text-surface-500">
          <Clock className="h-6 w-6 text-surface-400 mb-1" />
          <p>No run-of-show schedule recorded yet.</p>
          <p className="mt-0.5 text-[11px] text-surface-400">
            Generate an event plan or click Edit Run-Sheet to add activities.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-200/70 bg-white/40 backdrop-blur-md shadow-glass">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/70 backdrop-blur-md text-surface-700 font-semibold border-b border-surface-200/60">
              <tr>
                <th className="py-2.5 px-3 w-28">Time</th>
                <th className="py-2.5 px-3">Activity</th>
                <th className="py-2.5 px-3 w-40">Responsible Lead</th>
                <th className="py-2.5 px-3">Notes & Logistics</th>
                {isEditing && <th className="py-2.5 px-3 w-16 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {items.map((act, index) => (
                <tr key={index} className="hover:bg-primary-50/20 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-primary-700 bg-primary-50/20">
                    {act.time}
                  </td>
                  <td className="py-3 px-3 font-medium text-surface-900">
                    {act.activity}
                  </td>
                  <td className="py-3 px-3 text-surface-600">
                    <span className="inline-flex items-center gap-1 font-medium text-surface-700">
                      <User className="h-3 w-3 text-surface-400" />
                      <span>{act.lead || "Coordinator"}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-surface-500 text-[11px] leading-relaxed">
                    {act.notes || "—"}
                  </td>
                  {isEditing && (
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(index)}
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
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
        <form onSubmit={handleAddItem} className="p-3.5 rounded-xl border border-surface-200/70 bg-white/60 backdrop-blur-md shadow-glass space-y-3 text-xs">
          <div className="font-semibold text-surface-800">Add Schedule Block</div>
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
            <Button type="submit" size="sm" className="gap-1.5 shrink-0">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Block</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
