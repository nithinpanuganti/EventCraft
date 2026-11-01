"use client";

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/layout/AuthContext";
import {
  LocalGuest,
  LocalTable,
  GuestCategory,
  RsvpStatus,
  LocalEvent,
} from "@/lib/storage/types";
import {
  getLocalGuests,
  createLocalGuest,
  updateLocalGuest,
  deleteLocalGuest,
  checkInGuest,
  importLocalGuestsFromCsv,
  exportLocalGuestsToCsv,
  getLocalTables,
  listLocalEvents,
} from "@/lib/storage/local-repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ToastNotification } from "@/components/ui/ToastNotification";
import {
  Users,
  UserCheck,
  Clock,
  Utensils,
  Plus,
  Search,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Armchair,
  Edit2,
  Trash2,
  X,
} from "lucide-react";

const CATEGORY_COLORS: Record<GuestCategory, string> = {
  VIP: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  FAMILY: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  FRIENDS: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  COLLEAGUES: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  OTHER: "bg-surface-500/15 text-surface-600 dark:text-surface-400 border-surface-500/30",
};

const RSVP_BADGES: Record<
  RsvpStatus,
  { label: string; variant: "success" | "warning" | "danger"; icon: React.ElementType }
> = {
  CONFIRMED: { label: "Confirmed", variant: "success", icon: CheckCircle2 },
  PENDING: { label: "Pending", variant: "warning", icon: Clock },
  DECLINED: { label: "Declined", variant: "danger", icon: XCircle },
};

function GuestsContent() {
  const searchParams = useSearchParams();
  const viewMode = searchParams.get("view"); // "rsvp" or default organizer list
  const { activeEvent, isGuest, activeProfile } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);
  const [guests, setGuests] = useState<LocalGuest[]>([]);
  const [tables, setTables] = useState<LocalTable[]>([]);
  const [, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [dietaryOnly, setDietaryOnly] = useState(false);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<LocalGuest | null>(null);
  const [viewingGuest, setViewingGuest] = useState<LocalGuest | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "FRIENDS" as GuestCategory,
    rsvpStatus: "PENDING" as RsvpStatus,
    plusOneCount: 0,
    dietaryPreferences: "",
    accessibilityRequirements: "",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load events
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const evts = await listLocalEvents();
        setAvailableEvents(evts);
        const defaultEvtId = activeEvent?.id || (evts.length > 0 ? evts[0].id : "");
        setSelectedEventId(defaultEvtId);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [activeEvent]);

  // Load guests & tables when selected event changes
  const loadGuestData = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [guestList, tableList] = await Promise.all([
        getLocalGuests(eventId),
        getLocalTables(eventId),
      ]);
      setGuests(guestList);
      setTables(tableList);
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Load Error",
        message: "Failed to load guest list from local database.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadGuestData(selectedEventId);
    }
  }, [selectedEventId]);

  // Metrics
  const metrics = useMemo(() => {
    const totalInvited = guests.length;
    const totalSeatsRequired = guests.reduce(
      (acc, g) => acc + (g.rsvpStatus === "CONFIRMED" ? 1 + (g.plusOneCount || 0) : 0),
      0
    );
    const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED").length;
    const pending = guests.filter((g) => g.rsvpStatus === "PENDING").length;
    const declined = guests.filter((g) => g.rsvpStatus === "DECLINED").length;
    const checkedIn = guests.filter((g) => g.checkInStatus).length;
    const withDietary = guests.filter(
      (g) => g.dietaryPreferences && g.dietaryPreferences.length > 0
    ).length;

    return { totalInvited, totalSeatsRequired, confirmed, pending, declined, checkedIn, withDietary };
  }, [guests]);

  // Filtered Guests
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const emailStr = g.email || "";
      const dietaryStr = (g.dietaryPreferences || []).join(" ");
      const matchesSearch =
        searchQuery === "" ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emailStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dietaryStr.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || g.rsvpStatus === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || g.category === categoryFilter;
      const matchesDietary = !dietaryOnly || (g.dietaryPreferences && g.dietaryPreferences.length > 0);

      return matchesSearch && matchesStatus && matchesCategory && matchesDietary;
    });
  }, [guests, searchQuery, statusFilter, categoryFilter, dietaryOnly]);

  const handleOpenAdd = () => {
    setEditingGuest(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      category: "FRIENDS",
      rsvpStatus: "PENDING",
      plusOneCount: 0,
      dietaryPreferences: "",
      accessibilityRequirements: "",
      notes: "",
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (guest: LocalGuest) => {
    setEditingGuest(guest);
    setFormData({
      name: guest.name,
      email: guest.email || "",
      phone: guest.phone || "",
      category: guest.category,
      rsvpStatus: guest.rsvpStatus,
      plusOneCount: guest.plusOneCount || 0,
      dietaryPreferences: (guest.dietaryPreferences || []).join(", "),
      accessibilityRequirements: guest.accessibilityRequirements || "",
      notes: guest.notes || "",
    });
    setIsAddEditOpen(true);
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const dietaryArr = formData.dietaryPreferences
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingGuest) {
        await updateLocalGuest(editingGuest.id, {
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          category: formData.category,
          rsvpStatus: formData.rsvpStatus,
          plusOneCount: Number(formData.plusOneCount) || 0,
          plusOneAllowed: Number(formData.plusOneCount) > 0,
          dietaryPreferences: dietaryArr,
          accessibilityRequirements: formData.accessibilityRequirements.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        });
        setNotification({
          type: "success",
          title: "Guest Updated",
          message: `${formData.name} was updated successfully.`,
        });
      } else {
        await createLocalGuest({
          eventId: selectedEventId,
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          category: formData.category,
          invitationStatus: "NOT_SENT",
          rsvpStatus: formData.rsvpStatus,
          plusOneAllowed: Number(formData.plusOneCount) > 0,
          plusOneCount: Number(formData.plusOneCount) || 0,
          plusOneNames: [],
          dietaryPreferences: dietaryArr,
          accessibilityRequirements: formData.accessibilityRequirements.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          checkInStatus: false,
        });
        setNotification({
          type: "success",
          title: "Guest Added",
          message: `${formData.name} was added to the guest roster.`,
        });
      }
      setIsAddEditOpen(false);
      await loadGuestData(selectedEventId);
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Save Failed",
        message: "Failed to persist guest to local database.",
      });
    }
  };

  const handleDelete = async (guestId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this event?`)) return;
    try {
      await deleteLocalGuest(guestId);
      setNotification({
        type: "info",
        title: "Guest Removed",
        message: `${name} has been removed.`,
      });
      await loadGuestData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCheckIn = async (guestId: string, currentStatus: boolean) => {
    try {
      if (!currentStatus) {
        await checkInGuest(guestId);
      } else {
        await updateLocalGuest(guestId, {
          checkInStatus: false,
          checkedInAt: null,
        });
      }
      await loadGuestData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const csv = exportLocalGuestsToCsv(guests);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-guests-${selectedEventId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setNotification({
        type: "success",
        title: "Export Complete",
        message: "Guest roster downloaded as CSV.",
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Export Failed",
        message: "Could not export guest list.",
      });
    }
  };

  // CSV Import
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importLocalGuestsFromCsv(selectedEventId, text);
      setNotification({
        type: "success",
        title: "Import Succeeded",
        message: `Successfully imported ${res.created} guests into this event.`,
      });
      await loadGuestData(selectedEventId);
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Import Error",
        message: err instanceof Error ? err.message : "Failed to parse CSV file.",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Table lookup map
  const tableNameMap = useMemo(() => {
    const map = new Map<string, string>();
    tables.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tables]);

  // GUEST ROLE OR RSVP VIEW MODE
  if (viewMode === "rsvp" || isGuest) {
    const currentGuest = guests.find(
      (g) => (g.email || "").toLowerCase() === (activeProfile?.email || "").toLowerCase()
    ) || guests[0];

    return (
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6 animate-page-enter">
        <div className="text-center space-y-2">
          <Badge variant="primary" size="md">Guest RSVP Portal</Badge>
          <h1 className="text-3xl font-extrabold text-surface-900">
            {activeEvent?.title || "Event"} — Attendance Confirmation
          </h1>
          <p className="text-sm text-surface-500">
            Confirm your presence and specify your dietary preferences for the upcoming gathering.
          </p>
        </div>

        {currentGuest ? (
          <Card variant="elevated" className="p-6 sm:p-8 specular-top space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-200/50 dark:border-surface-800/50">
              <div>
                <h2 className="text-xl font-bold text-surface-900">{currentGuest.name}</h2>
                <div className="text-xs text-surface-500">{currentGuest.email}</div>
              </div>
              <Badge
                variant={RSVP_BADGES[currentGuest.rsvpStatus].variant}
                size="md"
              >
                {RSVP_BADGES[currentGuest.rsvpStatus].label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                type="button"
                variant={currentGuest.rsvpStatus === "CONFIRMED" ? "primary" : "outline"}
                size="lg"
                onClick={async () => {
                  await updateLocalGuest(currentGuest.id, { rsvpStatus: "CONFIRMED" });
                  await loadGuestData(selectedEventId);
                }}
                className="flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Attending</span>
              </Button>

              <Button
                type="button"
                variant={currentGuest.rsvpStatus === "DECLINED" ? "secondary" : "outline"}
                size="lg"
                onClick={async () => {
                  await updateLocalGuest(currentGuest.id, { rsvpStatus: "DECLINED" });
                  await loadGuestData(selectedEventId);
                }}
                className="flex items-center justify-center gap-2"
              >
                <XCircle className="h-4 w-4 text-rose-400" />
                <span>Cannot Attend</span>
              </Button>

              <Button
                type="button"
                variant={currentGuest.rsvpStatus === "PENDING" ? "secondary" : "outline"}
                size="lg"
                onClick={async () => {
                  await updateLocalGuest(currentGuest.id, { rsvpStatus: "PENDING" });
                  await loadGuestData(selectedEventId);
                }}
                className="flex items-center justify-center gap-2"
              >
                <Clock className="h-4 w-4 text-amber-400" />
                <span>Undecided</span>
              </Button>
            </div>

            {/* Guest Details Edit */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Accompanying Plus-Ones"
                  type="number"
                  min="0"
                  max="5"
                  value={currentGuest.plusOneCount || 0}
                  onChange={async (e) => {
                    await updateLocalGuest(currentGuest.id, {
                      plusOneCount: Math.max(0, parseInt(e.target.value) || 0),
                      plusOneAllowed: (parseInt(e.target.value) || 0) > 0,
                    });
                    await loadGuestData(selectedEventId);
                  }}
                  helperText="Number of additional attendees coming with you."
                />

                <Input
                  label="Dietary / Allergies"
                  placeholder="e.g. Vegetarian, Gluten-Free, Halal, Nut Allergy"
                  value={(currentGuest.dietaryPreferences || []).join(", ")}
                  onChange={async (e) => {
                    const arr = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    await updateLocalGuest(currentGuest.id, {
                      dietaryPreferences: arr,
                    });
                    await loadGuestData(selectedEventId);
                  }}
                />
              </div>

              {currentGuest.tableId && (
                <div className="p-4 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Armchair className="h-5 w-5 text-primary-500" />
                    <div>
                      <div className="text-xs font-medium text-surface-500">Assigned Seating</div>
                      <div className="text-sm font-bold text-surface-900">
                        {tableNameMap.get(currentGuest.tableId) || "Designated Table"}
                        {currentGuest.seatNumber ? ` • Seat #${currentGuest.seatNumber}` : ""}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" size="sm">Reserved</Badge>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card variant="subtle" className="p-8 text-center space-y-3">
            <Users className="h-10 w-10 text-surface-400 mx-auto" />
            <h3 className="text-base font-semibold text-surface-900">No Guest Invitation Record Found</h3>
            <p className="text-xs text-surface-500 max-w-sm mx-auto">
              Please ask the organizer to add your email ({activeProfile?.email}) to the event roster.
            </p>
          </Card>
        )}
      </div>
    );
  }

  // ORGANIZER / COORDINATOR VIEW
  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-page-enter">
      {/* Toast Notification */}
      {notification && (
        <ToastNotification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Header & Event Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900">
              Guest Management & RSVP Tracker
            </h1>
            <Badge variant="primary" size="sm">21-Store Local DB</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Real-time RSVP tracking, dietary restrictions, seating sync, and CSV bulk import/export.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {availableEvents.length > 1 && (
            <select
              aria-label="Select Active Event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 shadow-sm focus:outline-none"
            >
              {availableEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCsv}
            accept=".csv,text/csv"
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import CSV</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 shadow-glass-glow"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Guest</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card variant="subtle" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-surface-500 font-medium">
            <span>Total Guests</span>
            <Users className="h-4 w-4 text-primary-500" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-2">
            {metrics.totalInvited}
          </div>
          <div className="text-[11px] text-surface-500">
            {metrics.totalSeatsRequired} seats needed
          </div>
        </Card>

        <Card variant="subtle" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Confirmed</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-2">
            {metrics.confirmed}
          </div>
          <div className="text-[11px] text-surface-500">
            {metrics.totalInvited ? Math.round((metrics.confirmed / metrics.totalInvited) * 100) : 0}% rate
          </div>
        </Card>

        <Card variant="subtle" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-500 font-medium">
            <span>Pending</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-2">
            {metrics.pending}
          </div>
          <div className="text-[11px] text-surface-500">Awaiting RSVP</div>
        </Card>

        <Card variant="subtle" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-rose-500 font-medium">
            <span>Declined</span>
            <XCircle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-2">
            {metrics.declined}
          </div>
          <div className="text-[11px] text-surface-500">Regrets sent</div>
        </Card>

        <Card variant="subtle" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-indigo-500 font-medium">
            <span>Dietary Needs</span>
            <Utensils className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-2">
            {metrics.withDietary}
          </div>
          <div className="text-[11px] text-surface-500">Special meals</div>
        </Card>

        <Card variant="subtle" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-cyan-500 font-medium">
            <span>Checked In</span>
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-surface-900 mt-2">
            {metrics.checkedIn}
          </div>
          <div className="text-[11px] text-surface-500">
            {metrics.confirmed ? Math.round((metrics.checkedIn / metrics.confirmed) * 100) : 0}% arrived
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card variant="default" className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search by name, email, dietary preference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-100/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            aria-label="Filter by RSVP Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-xl bg-surface-100/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"
          >
            <option value="ALL">All RSVP Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="DECLINED">Declined</option>
          </select>

          {/* Category filter */}
          <select
            aria-label="Filter by Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-xl bg-surface-100/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"
          >
            <option value="ALL">All Categories</option>
            <option value="VIP">VIP</option>
            <option value="FAMILY">Family</option>
            <option value="FRIENDS">Friends</option>
            <option value="COLLEAGUES">Colleagues</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Dietary toggle */}
          <button
            type="button"
            onClick={() => setDietaryOnly(!dietaryOnly)}
            className={`text-xs px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-all ${
              dietaryOnly
                ? "bg-primary-500/15 border-primary-500/40 text-primary-600 dark:text-primary-400 font-semibold"
                : "border-surface-200 dark:border-surface-700 text-surface-600"
            }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            <span>Dietary Only</span>
          </button>
        </div>
      </Card>

      {/* Guest Table */}
      <Card variant="elevated" className="overflow-hidden specular-top">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-500/5 border-b border-surface-200/50 dark:border-surface-800/50 uppercase tracking-wider text-[11px] text-surface-500 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Guest Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">RSVP Status</th>
                <th className="py-3.5 px-4">Plus-Ones</th>
                <th className="py-3.5 px-4">Table / Seat</th>
                <th className="py-3.5 px-4">Dietary Notes</th>
                <th className="py-3.5 px-4 text-center">Check-In</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/40 dark:divide-surface-800/40">
              {filteredGuests.length > 0 ? (
                filteredGuests.map((guest) => {
                  const rBadge = RSVP_BADGES[guest.rsvpStatus];
                  const RIcon = rBadge.icon;
                  const tableName = guest.tableId ? tableNameMap.get(guest.tableId) : null;
                  const dietaryStr = (guest.dietaryPreferences || []).join(", ");

                  return (
                    <tr
                      key={guest.id}
                      className="hover:bg-primary-500/5 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-900">{guest.name}</div>
                        <div className="text-[11px] text-surface-500 flex items-center gap-2">
                          <span>{guest.email || "No email"}</span>
                          {guest.phone && <span>• {guest.phone}</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            CATEGORY_COLORS[guest.category]
                          }`}
                        >
                          {guest.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={rBadge.variant} size="sm" className="inline-flex items-center gap-1">
                          <RIcon className="h-3 w-3" />
                          <span>{rBadge.label}</span>
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-surface-700">
                        {guest.plusOneCount > 0 ? `+${guest.plusOneCount}` : "0"}
                      </td>

                      <td className="py-3.5 px-4">
                        {tableName ? (
                          <div className="flex items-center gap-1.5 text-surface-800 font-medium">
                            <Armchair className="h-3.5 w-3.5 text-primary-500" />
                            <span>{tableName}</span>
                            {guest.seatNumber && <span className="text-surface-400">#{guest.seatNumber}</span>}
                          </div>
                        ) : (
                          <span className="text-surface-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate">
                        {dietaryStr ? (
                          <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            {dietaryStr}
                          </span>
                        ) : (
                          <span className="text-surface-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCheckIn(guest.id, guest.checkInStatus)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            guest.checkInStatus
                              ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                              : "glass-surface-subtle border-surface-300 dark:border-surface-700 text-surface-400 hover:text-emerald-500"
                          }`}
                          title={guest.checkInStatus ? "Checked In (Click to Undo)" : "Mark as Checked In"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingGuest(guest)}
                            className="p-1 rounded-md text-surface-400 hover:text-surface-800"
                            title="View Details"
                          >
                            <Users className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(guest)}
                            className="p-1 rounded-md text-surface-400 hover:text-primary-600"
                            title="Edit Guest"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(guest.id, guest.name)}
                            className="p-1 rounded-md text-surface-400 hover:text-rose-500"
                            title="Delete Guest"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-surface-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">No guests match the selected criteria</p>
                    <p className="text-xs">Add a new guest or adjust your search filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Guest Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg glass-surface rounded-3xl p-6 sm:p-7 border border-white/60 dark:border-white/10 shadow-glass-xl space-y-5">
            <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-3">
              <h3 className="text-lg font-bold text-surface-900">
                {editingGuest ? "Edit Guest Record" : "Add New Guest"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGuest} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Full Name"
                  required
                  placeholder="e.g. Liam Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="liam@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Phone (Optional)"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as GuestCategory })
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                  >
                    <option value="VIP">VIP</option>
                    <option value="FAMILY">Family</option>
                    <option value="FRIENDS">Friends</option>
                    <option value="COLLEAGUES">Colleagues</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    RSVP Status
                  </label>
                  <select
                    value={formData.rsvpStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, rsvpStatus: e.target.value as RsvpStatus })
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="DECLINED">Declined</option>
                  </select>
                </div>

                <Input
                  label="Plus-Ones Count"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.plusOneCount}
                  onChange={(e) =>
                    setFormData({ ...formData, plusOneCount: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Dietary Requirements (Comma-separated)"
                  placeholder="e.g. Vegetarian, Nut Allergy"
                  value={formData.dietaryPreferences}
                  onChange={(e) =>
                    setFormData({ ...formData, dietaryPreferences: e.target.value })
                  }
                />
                <Input
                  label="Accessibility Needs"
                  placeholder="e.g. Wheelchair access"
                  value={formData.accessibilityRequirements}
                  onChange={(e) =>
                    setFormData({ ...formData, accessibilityRequirements: e.target.value })
                  }
                />
              </div>

              <Input
                label="Organizer Notes"
                placeholder="Internal notes about arrival time, relationship, etc."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200/50 dark:border-surface-800/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="shadow-glass-glow"
                >
                  {editingGuest ? "Save Changes" : "Create Guest"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Guest Details Modal */}
      {viewingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-surface rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-glass-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-600 font-bold">
                  {viewingGuest.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-surface-900">{viewingGuest.name}</h3>
                  <div className="text-xs text-surface-500">{viewingGuest.email || "No email"}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingGuest(null)}
                className="p-1 rounded-md text-surface-400 hover:text-surface-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-surface-100 dark:border-surface-800">
                <span className="text-surface-500">Category:</span>
                <span className="font-bold">{viewingGuest.category}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-surface-100 dark:border-surface-800">
                <span className="text-surface-500">RSVP Status:</span>
                <Badge variant={RSVP_BADGES[viewingGuest.rsvpStatus].variant} size="sm">
                  {RSVP_BADGES[viewingGuest.rsvpStatus].label}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-surface-100 dark:border-surface-800">
                <span className="text-surface-500">Party Size:</span>
                <span className="font-bold">1 + {viewingGuest.plusOneCount} guest(s)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-surface-100 dark:border-surface-800">
                <span className="text-surface-500">Seating:</span>
                <span className="font-bold">
                  {viewingGuest.tableId
                    ? tableNameMap.get(viewingGuest.tableId) || "Assigned Table"
                    : "Not Seated Yet"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-surface-100 dark:border-surface-800">
                <span className="text-surface-500">Check-in:</span>
                <span className={`font-bold ${viewingGuest.checkInStatus ? "text-emerald-500" : "text-surface-400"}`}>
                  {viewingGuest.checkInStatus ? "Checked In at Venue" : "Pending Arrival"}
                </span>
              </div>
              {viewingGuest.dietaryPreferences && viewingGuest.dietaryPreferences.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                  <span className="font-semibold block">Dietary Restrictions:</span>
                  {viewingGuest.dietaryPreferences.join(", ")}
                </div>
              )}
              {viewingGuest.accessibilityRequirements && (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
                  <span className="font-semibold block">Accessibility Requirements:</span>
                  {viewingGuest.accessibilityRequirements}
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingGuest(null)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <GuestsContent />
    </Suspense>
  );
}
