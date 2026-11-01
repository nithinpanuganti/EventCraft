"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/layout/AuthContext";
import { LocalGuest, LocalTable, LocalEvent } from "@/lib/storage/types";
import {
  listLocalEvents,
  getLocalGuests,
  updateLocalGuest,
  checkInGuest,
  getLocalTables,
} from "@/lib/storage/local-repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { QrCodeSvg } from "@/components/ui/QrCodeSvg";
import {
  QrCode,
  Search,
  CheckCircle2,
  Armchair,
  Camera,
  X,
} from "lucide-react";

function CheckInContent() {
  const searchParams = useSearchParams();
  const isPassView = searchParams.get("view") === "pass";
  const { activeEvent, isGuest, activeProfile } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);
  const [guests, setGuests] = useState<LocalGuest[]>([]);
  const [tables, setTables] = useState<LocalTable[]>([]);
  const [, setLoading] = useState(true);

  // Search & Scanner
  const [searchQuery, setSearchQuery] = useState("");
  const [scannedToken, setScannedToken] = useState("");
  const [lastCheckedGuest, setLastCheckedGuest] = useState<LocalGuest | null>(null);

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

  const loadData = async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [gList, tList] = await Promise.all([
        getLocalGuests(eventId),
        getLocalTables(eventId),
      ]);
      setGuests(gList);
      setTables(tList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadData(selectedEventId);
    }
  }, [selectedEventId]);

  // Lookup map for tables
  const tableNameMap = useMemo(() => {
    const map = new Map<string, string>();
    tables.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tables]);

  // Metrics
  const totalGuests = guests.length;
  const checkedInCount = guests.filter((g) => g.checkInStatus).length;
  const pendingArrival = totalGuests - checkedInCount;
  const checkInRate = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;

  // Filtered guest list
  const filteredGuests = useMemo(() => {
    if (!searchQuery.trim()) return guests;
    const q = searchQuery.toLowerCase();
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.email && g.email.toLowerCase().includes(q)) ||
        (g.qrToken && g.qrToken.toLowerCase().includes(q))
    );
  }, [guests, searchQuery]);

  // Handle Token or ID Scan
  const handleProcessScan = async (tokenOrId: string) => {
    if (!tokenOrId.trim()) return;

    try {
      const res = await checkInGuest(tokenOrId.trim(), activeProfile?.name || "Coordinator");
      setLastCheckedGuest(res.guest);
      setNotification({
        type: res.alreadyCheckedIn ? "info" : "success",
        title: res.alreadyCheckedIn ? "Already Checked In" : "Welcome!",
        message: res.message,
      });
      setScannedToken("");
      await loadData(selectedEventId);
    } catch (err) {
      setNotification({
        type: "error",
        title: "Scan Unsuccessful",
        message: err instanceof Error ? err.message : "Guest token not recognized.",
      });
    }
  };

  // Toggle checkin manually
  const handleToggleCheckIn = async (guestId: string, currentStatus: boolean) => {
    try {
      if (!currentStatus) {
        const res = await checkInGuest(guestId);
        setLastCheckedGuest(res.guest);
      } else {
        await updateLocalGuest(guestId, {
          checkInStatus: false,
          checkedInAt: null,
        });
      }
      await loadData(selectedEventId);
    } catch (err) {
      console.error(err);
    }
  };

  // 1. GUEST DIGITAL PASS PERSPECTIVE
  if (isPassView || isGuest) {
    const myGuest = guests.find(
      (g) => (g.email || "").toLowerCase() === (activeProfile?.email || "").toLowerCase()
    ) || guests[0];

    const myTable = myGuest?.tableId ? tableNameMap.get(myGuest.tableId) : null;
    const passCode = myGuest?.qrToken || myGuest?.id || "PASS-2026-DEMO";

    return (
      <div className="max-w-md mx-auto py-10 px-4 space-y-6 animate-page-enter">
        <div className="text-center space-y-2">
          <Badge variant="primary" size="md">Digital Event Pass</Badge>
          <h1 className="text-3xl font-extrabold text-surface-900">Your Fast-Entry Pass</h1>
          <p className="text-xs text-surface-500">
            Present this QR code to the coordinator desk at the venue entrance.
          </p>
        </div>

        {myGuest ? (
          <Card variant="elevated" className="p-8 specular-top text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-500 via-indigo-500 to-pink-500" />

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-surface-400 tracking-wider">
                Authorized Attendee
              </span>
              <h2 className="text-2xl font-black text-surface-900">{myGuest.name}</h2>
              <div className="text-xs text-surface-500">{myGuest.email || "Guest"}</div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl shadow-sm border border-surface-200/80 mx-auto w-fit">
              <QrCodeSvg value={passCode} size={150} />
              <span className="text-[10px] font-mono font-bold text-surface-500 mt-2">
                {passCode}
              </span>
            </div>

            {/* Seating and party details */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-surface-500/5 text-xs text-left border border-white/10">
              <div>
                <span className="text-surface-400 block text-[10px] font-bold uppercase">
                  Assigned Seating
                </span>
                <span className="font-bold text-surface-900">
                  {myTable || "Free Seating"}
                </span>
              </div>
              <div>
                <span className="text-surface-400 block text-[10px] font-bold uppercase">
                  Party Allowance
                </span>
                <span className="font-bold text-surface-900">
                  1 + {myGuest.plusOneCount} attendee(s)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  myGuest.checkInStatus ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
              <span className="font-semibold text-surface-700">
                {myGuest.checkInStatus ? "Checked In at Venue" : "Ready for Arrival Scan"}
              </span>
            </div>
          </Card>
        ) : (
          <Card variant="subtle" className="p-8 text-center space-y-3">
            <QrCode className="h-10 w-10 text-surface-400 mx-auto" />
            <h3 className="text-sm font-bold text-surface-900">Pass Generating</h3>
            <p className="text-xs text-surface-500">
              No matching guest profile located. Ask the organizer to add your email.
            </p>
          </Card>
        )}
      </div>
    );
  }

  // 2. COORDINATOR CHECK-IN DESK
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
              Guest Check-In Console
            </h1>
            <Badge variant="primary" size="sm">Live Arrival Desk</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Real-time digital pass scanner, instant check-in verification, and seating locator.
          </p>
        </div>

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
      </div>

      {/* Arrival Progress Bar */}
      <Card variant="subtle" className="p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-surface-700">Arrival Completion: {checkInRate}%</span>
          <span className="text-primary-600 dark:text-primary-400">
            {checkedInCount} Arrived • {pendingArrival} Pending
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-surface-200/60 dark:bg-surface-800/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${checkInRate}%` }}
          />
        </div>
      </Card>

      {/* Scan & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Token Input / Simulator (5 cols) */}
        <div className="md:col-span-5 flex items-center gap-2">
          <div className="relative flex-1">
            <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Scan QR token or pass code..."
              value={scannedToken}
              onChange={(e) => setScannedToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleProcessScan(scannedToken)}
              className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleProcessScan(scannedToken)}
            className="shrink-0 shadow-glass-glow"
          >
            Verify Scan
          </Button>
        </div>

        {/* Live Filter (7 cols) */}
        <div className="md:col-span-7 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search attendee by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Last Verified Guest Banner */}
      {lastCheckedGuest && (
        <Card variant="elevated" className="p-4 bg-emerald-500/10 border-emerald-500/30 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Verified Arrival
              </div>
              <div className="font-extrabold text-sm text-surface-900">
                {lastCheckedGuest.name} ({lastCheckedGuest.category})
              </div>
              <div className="text-xs text-surface-600">
                Seating: <strong>{tableNameMap.get(lastCheckedGuest.tableId || "") || "Unassigned"}</strong> • Party: 1 + {lastCheckedGuest.plusOneCount}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastCheckedGuest(null)}
            className="p-1 text-surface-400 hover:text-surface-700"
          >
            <X className="h-4 w-4" />
          </button>
        </Card>
      )}

      {/* Guest Check-in Roster Table */}
      <Card variant="elevated" className="overflow-hidden specular-top">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-500/5 border-b border-surface-200/50 dark:border-surface-800/50 uppercase tracking-wider text-[11px] text-surface-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Attendee</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Party Size</th>
                <th className="py-3 px-4">Table Seating</th>
                <th className="py-3 px-4">Special Meals</th>
                <th className="py-3 px-4 text-center">Arrival Status</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200/40 dark:divide-surface-800/40">
              {filteredGuests.length > 0 ? (
                filteredGuests.map((g) => {
                  const tableName = g.tableId ? tableNameMap.get(g.tableId) : null;
                  return (
                    <tr key={g.id} className="hover:bg-primary-500/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-900">{g.name}</div>
                        <div className="text-[11px] text-surface-500">{g.email || g.phone}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="outline" size="sm">
                          {g.category}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-surface-700">
                        1 + {g.plusOneCount}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-surface-800">
                        {tableName ? (
                          <span className="flex items-center gap-1.5">
                            <Armchair className="h-3.5 w-3.5 text-primary-500" />
                            <span>{tableName}</span>
                          </span>
                        ) : (
                          <span className="text-surface-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-amber-600">
                        {g.dietaryPreferences && g.dietaryPreferences.length > 0
                          ? g.dietaryPreferences.join(", ")
                          : "—"}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            g.checkInStatus
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-surface-500/15 text-surface-500"
                          }`}
                        >
                          {g.checkInStatus ? "Arrived" : "Pending"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          type="button"
                          variant={g.checkInStatus ? "outline" : "primary"}
                          size="sm"
                          onClick={() => handleToggleCheckIn(g.id, g.checkInStatus)}
                          className="text-xs px-2.5 py-1"
                        >
                          {g.checkInStatus ? "Undo Check-In" : "Check In"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-surface-400">
                    No attendees match the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <CheckInContent />
    </Suspense>
  );
}

