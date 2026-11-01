"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/layout/AuthContext";
import {
  LocalTable,
  LocalGuest,
  TableShape,
  LocalEvent,
} from "@/lib/storage/types";
import {
  getLocalTables,
  createLocalTable,
  updateLocalTable,
  deleteLocalTable,
  assignGuestToTable,
  autoAssignFamilyGroups,
  getLocalGuests,
  listLocalEvents,
} from "@/lib/storage/local-repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ToastNotification } from "@/components/ui/ToastNotification";
import {
  Armchair,
  Users,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Crown,
  Circle,
  Square,
  UserCheck,
  X,
  Search,
} from "lucide-react";

function SeatingContent() {
  const searchParams = useSearchParams();
  const isGuestView = searchParams.get("view") === "guest";
  const { activeEvent, isGuest, activeProfile } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);
  const [tables, setTables] = useState<LocalTable[]>([]);
  const [guests, setGuests] = useState<LocalGuest[]>([]);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  // Modal State
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<LocalTable | null>(null);
  const [tableFormData, setTableFormData] = useState({
    name: "",
    capacity: 8,
    shape: "ROUND" as TableShape,
    isVip: false,
    notes: "",
  });

  // Active Seating State
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [unassignedSearch, setUnassignedSearch] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const evts = await listLocalEvents();
        setAvailableEvents(evts);
        const defaultEvtId = activeEvent?.id || (evts.length > 0 ? evts[0].id : "");
        setSelectedEventId(defaultEvtId);
      } catch (err) {
        console.error(err);
      }
    }
    init();
  }, [activeEvent]);

  const loadData = async (eventId: string) => {
    if (!eventId) return;
    try {
      const [tList, gList] = await Promise.all([
        getLocalTables(eventId),
        getLocalGuests(eventId),
      ]);
      setTables(tList);
      setGuests(gList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadData(selectedEventId);
    }
  }, [selectedEventId]);

  // Seated guests by table
  const guestsByTable = useMemo(() => {
    const map = new Map<string, LocalGuest[]>();
    tables.forEach((t) => map.set(t.id, []));
    guests.forEach((g) => {
      if (g.tableId && map.has(g.tableId)) {
        map.get(g.tableId)!.push(g);
      }
    });
    return map;
  }, [tables, guests]);

  // Unassigned confirmed guests
  const unassignedGuests = useMemo(() => {
    return guests.filter((g) => {
      const isUnseated = !g.tableId;
      const isConfirmed = g.rsvpStatus === "CONFIRMED" || g.rsvpStatus === "PENDING";
      const matchesSearch =
        !unassignedSearch ||
        g.name.toLowerCase().includes(unassignedSearch.toLowerCase()) ||
        g.category.toLowerCase().includes(unassignedSearch.toLowerCase());
      return isUnseated && isConfirmed && matchesSearch;
    });
  }, [guests, unassignedSearch]);

  // Total capacity vs seated count
  const metrics = useMemo(() => {
    const totalCapacity = tables.reduce((acc, t) => acc + t.capacity, 0);
    const seatedCount = guests.filter((g) => Boolean(g.tableId)).length;
    const unseatedCount = guests.filter((g) => !g.tableId && g.rsvpStatus === "CONFIRMED").length;
    return { totalCapacity, seatedCount, unseatedCount, tableCount: tables.length };
  }, [tables, guests]);

  const handleOpenAddTable = () => {
    setEditingTable(null);
    setTableFormData({
      name: `Table ${tables.length + 1}`,
      capacity: 8,
      shape: "ROUND",
      isVip: false,
      notes: "",
    });
    setIsTableModalOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableFormData.name.trim()) return;

    try {
      if (editingTable) {
        await updateLocalTable(editingTable.id, {
          name: tableFormData.name.trim(),
          capacity: Number(tableFormData.capacity) || 8,
          shape: tableFormData.shape,
          isVip: tableFormData.isVip,
          notes: tableFormData.notes.trim() || undefined,
        });
      } else {
        await createLocalTable({
          eventId: selectedEventId,
          name: tableFormData.name.trim(),
          capacity: Number(tableFormData.capacity) || 8,
          shape: tableFormData.shape,
          isVip: tableFormData.isVip,
          posX: 0,
          posY: 0,
          notes: tableFormData.notes.trim() || undefined,
        });
      }
      setIsTableModalOpen(false);
      await loadData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTable = async (tableId: string, name: string) => {
    if (!confirm(`Delete ${name}? All seated guests at this table will become unassigned.`)) return;
    try {
      await deleteLocalTable(tableId);
      await loadData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignSelectedToTable = async (tableId: string) => {
    if (!selectedGuestId) return;
    const table = tables.find((t) => t.id === tableId);
    const seated = guestsByTable.get(tableId) || [];

    if (table && seated.length >= table.capacity) {
      setNotification({
        type: "error",
        title: "Table Full",
        message: `${table.name} has reached its maximum capacity of ${table.capacity} guests.`,
      });
      return;
    }

    try {
      await assignGuestToTable(selectedGuestId, tableId);
      setSelectedGuestId(null);
      await loadData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnseatGuest = async (guestId: string) => {
    try {
      await assignGuestToTable(guestId, null);
      await loadData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoAssign = async () => {
    try {
      const assigned = await autoAssignFamilyGroups(selectedEventId);
      setNotification({
        type: "success",
        title: "Auto-Assignment Complete",
        message: `Assigned ${assigned} guests to appropriate tables by group.`,
      });
      await loadData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // GUEST PERSPECTIVE
  if (isGuestView || isGuest) {
    const myGuest = guests.find(
      (g) => (g.email || "").toLowerCase() === (activeProfile?.email || "").toLowerCase()
    );
    const myTable = myGuest?.tableId ? tables.find((t) => t.id === myGuest.tableId) : null;
    const tableMates = myGuest?.tableId
      ? (guestsByTable.get(myGuest.tableId) || []).filter((g) => g.id !== myGuest.id)
      : [];

    return (
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6 animate-page-enter">
        <div className="text-center space-y-2">
          <Badge variant="primary" size="md">Seating Pass</Badge>
          <h1 className="text-3xl font-extrabold text-surface-900">Your Table & Seating</h1>
          <p className="text-sm text-surface-500">
            Find your designated table assignment and view your table companions.
          </p>
        </div>

        {myTable ? (
          <Card variant="elevated" className="p-6 sm:p-8 specular-top space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-200/50 dark:border-surface-800/50">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-600">
                  <Armchair className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-surface-900">{myTable.name}</h2>
                  <div className="text-xs text-surface-500">
                    {myTable.shape} Table • {myTable.capacity} Seats
                  </div>
                </div>
              </div>
              {myTable.isVip && <Badge variant="warning" size="md">VIP Table</Badge>}
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Fellow Guests at Your Table ({tableMates.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tableMates.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-xl bg-surface-500/5 border border-white/10 flex items-center gap-2.5"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary-500/10 text-primary-600 flex items-center justify-center font-bold text-xs">
                      {g.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-xs text-surface-900 truncate">{g.name}</div>
                      <div className="text-[10px] text-surface-500">{g.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <Card variant="subtle" className="p-8 text-center space-y-3">
            <Armchair className="h-10 w-10 text-surface-400 mx-auto" />
            <h3 className="text-base font-semibold text-surface-900">Seating In Progress</h3>
            <p className="text-xs text-surface-500 max-w-sm mx-auto">
              The event organizers are currently finalizing table arrangements. Check back shortly!
            </p>
          </Card>
        )}
      </div>
    );
  }

  // ORGANIZER SEATING MANAGER
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
              Seating Arrangement Planner
            </h1>
            <Badge variant="primary" size="sm">Interactive</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Interactive table layout, group-based auto seating, capacity protection, and printable chart.
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
            variant="outline"
            size="sm"
            onClick={handleAutoAssign}
            className="flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary-500" />
            <span>Auto-Assign Groups</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Chart</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenAddTable}
            className="flex items-center gap-1.5 shadow-glass-glow"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Table</span>
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-surface-500 font-medium">Total Tables</div>
          <div className="text-2xl font-black text-surface-900 mt-1">{metrics.tableCount}</div>
        </Card>
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-surface-500 font-medium">Total Capacity</div>
          <div className="text-2xl font-black text-surface-900 mt-1">{metrics.totalCapacity} seats</div>
        </Card>
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-emerald-500 font-medium">Seated Guests</div>
          <div className="text-2xl font-black text-surface-900 mt-1">{metrics.seatedCount}</div>
        </Card>
        <Card variant="subtle" className="p-4">
          <div className="text-xs text-amber-500 font-medium">Unassigned (Confirmed)</div>
          <div className="text-2xl font-black text-surface-900 mt-1">{metrics.unseatedCount}</div>
        </Card>
      </div>

      {/* Main Seating Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tables Grid (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
              <Armchair className="h-4 w-4 text-primary-500" />
              <span>Event Tables ({tables.length})</span>
            </h2>
            {selectedGuestId && (
              <Badge variant="warning" size="sm">
                Click any table below to seat selected guest
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map((table) => {
              const seated = guestsByTable.get(table.id) || [];
              const isFull = seated.length >= table.capacity;
              const isOver = seated.length > table.capacity;

              return (
                <Card
                  key={table.id}
                  variant="elevated"
                  onClick={() => selectedGuestId && handleAssignSelectedToTable(table.id)}
                  className={`p-5 specular-top transition-all ${
                    selectedGuestId && !isFull
                      ? "cursor-pointer hover:border-primary-500/60 hover:ring-2 hover:ring-primary-500/30"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-surface-200/50 dark:border-surface-800/50">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-600">
                        {table.shape === "ROUND" ? (
                          <Circle className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-surface-900 text-sm flex items-center gap-1.5">
                          {table.name}
                          {table.isVip && (
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                        <div className="text-[11px] text-surface-500">
                          {table.shape.toLowerCase()} table
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isOver ? "danger" : isFull ? "warning" : "success"}
                        size="sm"
                      >
                        {seated.length} / {table.capacity}
                      </Badge>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table.id, table.name);
                        }}
                        className="p-1 rounded-md text-surface-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Seated Guests List */}
                  <div className="pt-3 space-y-1.5 min-h-[100px]">
                    {seated.length > 0 ? (
                      seated.map((guest, idx) => (
                        <div
                          key={guest.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-surface-500/5 hover:bg-surface-500/10 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] font-bold text-surface-400 w-4">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-surface-900 truncate">
                              {guest.name}
                            </span>
                            {guest.dietaryPreferences && guest.dietaryPreferences.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600">
                                Special Meal
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnseatGuest(guest.id);
                            }}
                            className="p-1 text-surface-400 hover:text-rose-500 rounded"
                            title="Unseat Guest"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="h-24 flex items-center justify-center text-xs text-surface-400 border border-dashed border-surface-300 dark:border-surface-700 rounded-xl">
                        Table Empty (Capacity: {table.capacity})
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right: Unassigned Guests Drawer */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            <span>Unassigned Guests ({unassignedGuests.length})</span>
          </h2>

          <Card variant="default" className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
              <input
                type="text"
                placeholder="Search unseated guests..."
                value={unassignedSearch}
                onChange={(e) => setUnassignedSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface-100/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {unassignedGuests.length > 0 ? (
                unassignedGuests.map((guest) => {
                  const isSelected = selectedGuestId === guest.id;
                  return (
                    <div
                      key={guest.id}
                      onClick={() => setSelectedGuestId(isSelected ? null : guest.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-primary-500/15 border-primary-500 text-surface-900 ring-2 ring-primary-500/20"
                          : "glass-surface-subtle border-white/60 dark:border-white/10 hover:border-primary-400/50"
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-bold text-surface-900 truncate">{guest.name}</div>
                        <div className="text-[10px] text-surface-500 flex items-center gap-1.5">
                          <span>{guest.category}</span>
                          {guest.plusOneCount > 0 && <span>• +{guest.plusOneCount} guest</span>}
                        </div>
                      </div>
                      <Badge variant={isSelected ? "primary" : "outline"} size="sm">
                        {isSelected ? "Selected" : "Seat"}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-surface-400">
                  <UserCheck className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  All confirmed guests are seated!
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add / Edit Table Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-surface rounded-3xl p-6 border border-white/60 dark:border-white/10 shadow-glass-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 dark:border-surface-800/50 pb-3">
              <h3 className="font-bold text-surface-900">Add Seating Table</h3>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="p-1 rounded-md text-surface-400 hover:text-surface-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <Input
                label="Table Name / Number"
                required
                placeholder="e.g. Table 1 - Diamond"
                value={tableFormData.name}
                onChange={(e) =>
                  setTableFormData({ ...tableFormData, name: e.target.value })
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Guest Capacity"
                  type="number"
                  min="2"
                  max="30"
                  required
                  value={tableFormData.capacity}
                  onChange={(e) =>
                    setTableFormData({
                      ...tableFormData,
                      capacity: parseInt(e.target.value) || 8,
                    })
                  }
                />

                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">
                    Shape
                  </label>
                  <select
                    value={tableFormData.shape}
                    onChange={(e) =>
                      setTableFormData({
                        ...tableFormData,
                        shape: e.target.value as TableShape,
                      })
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none"
                  >
                    <option value="ROUND">Round</option>
                    <option value="RECTANGULAR">Rectangular</option>
                    <option value="CUSTOM">Custom / U-Shape</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVip"
                  checked={tableFormData.isVip}
                  onChange={(e) =>
                    setTableFormData({ ...tableFormData, isVip: e.target.checked })
                  }
                  className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isVip" className="text-xs font-medium text-surface-700">
                  Mark as VIP Table (Head table, sponsors, family)
                </label>
              </div>

              <Input
                label="Location Notes"
                placeholder="e.g. Near dance floor, quiet corner"
                value={tableFormData.notes}
                onChange={(e) =>
                  setTableFormData({ ...tableFormData, notes: e.target.value })
                }
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200/50 dark:border-surface-800/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTableModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="shadow-glass-glow"
                >
                  Save Table
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SeatingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <SeatingContent />
    </Suspense>
  );
}
