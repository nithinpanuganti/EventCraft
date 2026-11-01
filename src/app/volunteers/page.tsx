"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useAuth } from "@/components/layout/AuthContext";
import {
  LocalVolunteer,
  VolunteerStatus,
  LocalEvent,
} from "@/lib/storage/types";
import {
  listLocalEvents,
  getLocalVolunteers,
  createLocalVolunteer,
  updateLocalVolunteer,
  deleteLocalVolunteer,
} from "@/lib/storage/local-repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ToastNotification } from "@/components/ui/ToastNotification";
import {
  HeartHandshake,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Phone,
  MapPin,
  X,
  Search,
} from "lucide-react";

const STATUS_BADGES: Record<
  VolunteerStatus,
  { label: string; variant: "success" | "warning" | "danger" | "primary" }
> = {
  CONFIRMED: { label: "Confirmed", variant: "primary" },
  CHECKED_IN: { label: "On Duty", variant: "success" },
  COMPLETED: { label: "Completed", variant: "primary" },
  NO_SHOW: { label: "No Show", variant: "danger" },
};

function VolunteersContent() {
  const { activeEvent } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);
  const [volunteers, setVolunteers] = useState<LocalVolunteer[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<LocalVolunteer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Welcome Greeter",
    shiftStart: "16:00",
    shiftEnd: "20:00",
    location: "Main Entrance Foyer",
    status: "CONFIRMED" as VolunteerStatus,
    notes: "",
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

  const loadVolunteers = async (eventId: string) => {
    if (!eventId) return;
    try {
      const list = await getLocalVolunteers(eventId);
      setVolunteers(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadVolunteers(selectedEventId);
    }
  }, [selectedEventId]);

  // Metrics
  const totalVolunteers = volunteers.length;
  const onDutyCount = volunteers.filter((v) => v.status === "CHECKED_IN").length;
  const confirmedCount = volunteers.filter((v) => v.status === "CONFIRMED").length;

  // Filtered
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((v) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.role.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [volunteers, searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setEditingVolunteer(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "Welcome Greeter",
      shiftStart: "16:00",
      shiftEnd: "20:00",
      location: "Main Entrance Foyer",
      status: "CONFIRMED",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: LocalVolunteer) => {
    setEditingVolunteer(v);
    setFormData({
      name: v.name,
      email: v.email || "",
      phone: v.phone || "",
      role: v.role,
      shiftStart: v.shiftStart,
      shiftEnd: v.shiftEnd,
      location: v.location,
      status: v.status,
      notes: v.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingVolunteer) {
        await updateLocalVolunteer(editingVolunteer.id, {
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          role: formData.role.trim(),
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
          location: formData.location.trim(),
          status: formData.status,
          notes: formData.notes.trim() || undefined,
        });
        setNotification({
          type: "success",
          title: "Volunteer Updated",
          message: `${formData.name}'s record has been updated.`,
        });
      } else {
        await createLocalVolunteer({
          eventId: selectedEventId,
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          role: formData.role.trim(),
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
          location: formData.location.trim(),
          status: formData.status,
          notes: formData.notes.trim() || undefined,
        });
        setNotification({
          type: "success",
          title: "Volunteer Added",
          message: `${formData.name} added to volunteer staff.`,
        });
      }
      setIsModalOpen(false);
      await loadVolunteers(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (volunteerId: string, name: string) => {
    if (!confirm(`Remove ${name} from volunteer team?`)) return;
    try {
      await deleteLocalVolunteer(volunteerId);
      await loadVolunteers(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (volunteerId: string, status: VolunteerStatus) => {
    try {
      await updateLocalVolunteer(volunteerId, { status });
      await loadVolunteers(selectedEventId);
    } catch (err) {
      console.error(err);
    }
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
              Volunteer Team & Shift Manager
            </h1>
            <Badge variant="primary" size="sm">Staff Coordination</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Coordinate volunteers, assign service zones, track arrival status, and schedule shifts.
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
            <span>Add Volunteer</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-surface-500 font-medium">Total Volunteers</div>
          <div className="text-2xl font-black text-surface-900 mt-1">{totalVolunteers}</div>
        </Card>
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-emerald-600 font-medium">Currently On Duty</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{onDutyCount}</div>
        </Card>
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-primary-600 font-medium">Confirmed / Scheduled</div>
          <div className="text-2xl font-black text-primary-600 mt-1">{confirmedCount}</div>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card variant="default" className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search volunteers by name, role, or station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-100/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <select
          aria-label="Filter by Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl bg-surface-100/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"
        >
          <option value="ALL">All Statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CHECKED_IN">On Duty</option>
          <option value="COMPLETED">Completed</option>
          <option value="NO_SHOW">No Show</option>
        </select>
      </Card>

      {/* Volunteer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVolunteers.length > 0 ? (
          filteredVolunteers.map((vol) => {
            const sBadge = STATUS_BADGES[vol.status];
            return (
              <Card key={vol.id} variant="elevated" className="p-5 specular-top flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-surface-900">{vol.name}</h3>
                      <div className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-0.5">
                        {vol.role}
                      </div>
                    </div>
                    <Badge variant={sBadge.variant} size="sm">
                      {sBadge.label}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-surface-600 bg-surface-500/5 p-3 rounded-xl border border-white/10">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-surface-400 shrink-0" />
                      <span>
                        Shift: <strong>{vol.shiftStart} – {vol.shiftEnd}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-surface-400 shrink-0" />
                      <span>Station: {vol.location}</span>
                    </div>
                    {vol.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-surface-400 shrink-0" />
                        <a href={`tel:${vol.phone}`} className="hover:underline text-primary-600">
                          {vol.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-200/50 dark:border-surface-800/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {vol.status !== "CHECKED_IN" ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(vol.id, "CHECKED_IN")}
                        className="text-[11px] font-bold text-emerald-600 hover:underline px-1"
                      >
                        Check In
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(vol.id, "COMPLETED")}
                        className="text-[11px] font-bold text-primary-600 hover:underline px-1"
                      >
                        Complete Shift
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(vol)}
                      className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(vol.id, vol.name)}
                      className="p-1.5 text-surface-400 hover:text-rose-500 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-3 py-12 text-center text-xs text-surface-400">
            <HeartHandshake className="h-10 w-10 mx-auto mb-2 opacity-50" />
            No volunteers match the selected filters.
          </div>
        )}
      </div>

      {/* Add / Edit Volunteer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-surface rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-glass-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-3">
              <h3 className="font-bold text-surface-900">
                {editingVolunteer ? "Edit Volunteer Record" : "Add Team Volunteer"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-surface-400 hover:text-surface-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVolunteer} className="space-y-4">
              <Input
                label="Full Name"
                required
                placeholder="e.g. Chloe Bennett"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Role / Title"
                  required
                  placeholder="e.g. VIP Greeter"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
                <Input
                  label="Station / Zone"
                  required
                  placeholder="e.g. Foyer Entrance"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Shift Start"
                  placeholder="16:00"
                  value={formData.shiftStart}
                  onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                />
                <Input
                  label="Shift End"
                  placeholder="20:00"
                  value={formData.shiftEnd}
                  onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Phone"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as VolunteerStatus })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                  >
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="CHECKED_IN">On Duty</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="NO_SHOW">No Show</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200/50 dark:border-surface-800/50">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="shadow-glass-glow">
                  Save Volunteer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VolunteersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <VolunteersContent />
    </Suspense>
  );
}
