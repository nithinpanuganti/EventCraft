"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  Armchair,
  QrCode,
  MapPin,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { QrCodeSvg } from "@/components/ui/QrCodeSvg";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/components/layout/AuthContext";
import {
  getLocalGuests,
  getLocalTables,
  getLocalInvitation,
  updateLocalGuestRsvp,
} from "@/lib/storage/local-repository";
import { LocalGuest, LocalTable, LocalInvitation } from "@/lib/storage/types";

export default function GuestDashboardPage() {
  const { session, activeProfile, activeEvent } = useAuth();
  const [guestRecord, setGuestRecord] = useState<LocalGuest | null>(null);
  const [assignedTable, setAssignedTable] = useState<LocalTable | null>(null);
  const [invitation, setInvitation] = useState<LocalInvitation | null>(null);
  const [updatingRsvp, setUpdatingRsvp] = useState(false);
  const [dietaryInput, setDietaryInput] = useState("");
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  useEffect(() => {
    async function loadGuestData() {
      if (!activeEvent) return;
      try {
        const [guests, tables, inv] = await Promise.all([
          getLocalGuests(activeEvent.id),
          getLocalTables(activeEvent.id),
          getLocalInvitation(activeEvent.id),
        ]);

        const me =
          guests.find((g) => g.id === activeProfile?.guestId) ||
          guests.find((g) => g.email === activeProfile?.email || g.name.toLowerCase().includes("liam")) ||
          guests[0] ||
          null;

        setGuestRecord(me);
        setInvitation(inv);

        if (me && me.dietaryPreferences) {
          setDietaryInput(me.dietaryPreferences.join(", "));
        }

        if (me?.tableId) {
          const tbl = tables.find((t) => t.id === me.tableId) || null;
          setAssignedTable(tbl);
        }
      } catch (err) {
        console.warn("[GuestDashboard] Error loading guest data:", err);
      }
    }
    loadGuestData();
  }, [activeEvent, activeProfile]);

  const handleUpdateRsvp = async (newStatus: "CONFIRMED" | "DECLINED" | "PENDING") => {
    if (!guestRecord) return;
    setUpdatingRsvp(true);
    try {
      const dietaryArray = dietaryInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const updated = await updateLocalGuestRsvp(guestRecord.id, newStatus, dietaryArray);
      setGuestRecord(updated);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3000);
    } catch (err) {
      console.warn("Error updating RSVP:", err);
    } finally {
      setUpdatingRsvp(false);
    }
  };

  const guestName = guestRecord?.name || session?.name || "Liam Guest";
  const isConfirmed = guestRecord?.rsvpStatus === "CONFIRMED";
  const isDeclined = guestRecord?.rsvpStatus === "DECLINED";

  const qrPassPayload = guestRecord
    ? `EVENTCRAFT-PASS-${activeEvent?.id || "evt"}-${guestRecord.id}`
    : "EVENTCRAFT-DEMO-PASS";

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Page Header */}
      <PageHeader
        title={`Welcome, ${guestName}!`}
        description="View your formal invitations, respond to RSVPs, locate your assigned dining table, and access your event entrance pass."
        badge={<Badge variant="primary">Guest Attendee Portal</Badge>}
      />

      {/* 4 Guest Dashboard Widgets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
            Your Invitation Overview
          </h2>
          <span className="text-xs text-surface-500">Attendee Status</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Invitations"
            value={1}
            description="Events celebrating with you"
            icon={Mail}
          />
          <StatCard
            title="Confirmed Events"
            value={isConfirmed ? 1 : 0}
            description="Attendance locked in"
            icon={CheckCircle2}
          />
          <StatCard
            title="Pending Responses"
            value={!isConfirmed && !isDeclined ? 1 : 0}
            description="Awaiting your reply"
            icon={Clock}
          />
          <StatCard
            title="Upcoming Events"
            value={1}
            description="Scheduled on the calendar"
            icon={CalendarDays}
          />
        </div>
      </section>

      {/* Main Invitation Showcase & RSVP Controls */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Active Invitation & RSVP Response Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card variant="elevated" className="p-6 sm:p-8 specular-top space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-200/50 pb-4">
              <div>
                <Badge variant="outline" size="sm" className="mb-2">
                  Official Event Invitation
                </Badge>
                <h2 className="text-xl sm:text-2xl font-extrabold text-surface-900 tracking-tight">
                  {invitation?.eventTitle || activeEvent?.title || "Grand Imperial Gala & Wedding"}
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Hosted by {invitation?.hostName || "The Rostova & Sterling Families"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={isConfirmed ? "success" : isDeclined ? "danger" : "warning"}
                  className="text-xs font-bold py-1 px-3"
                >
                  Status: {guestRecord?.rsvpStatus || "CONFIRMED"}
                </Badge>
              </div>
            </div>

            {/* Event Time & Venue Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-500/5 border border-surface-200/60 dark:border-surface-700/60 space-y-1">
                <div className="flex items-center gap-2 text-surface-500 font-semibold">
                  <CalendarDays className="h-4 w-4 text-primary-600" aria-hidden="true" />
                  <span>Date &amp; Time</span>
                </div>
                <p className="font-bold text-surface-900 text-sm">
                  {invitation?.eventDate ? formatDate(invitation.eventDate) : "December 18, 2026"} • {invitation?.eventTime || "17:30 EST"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-500/5 border border-surface-200/60 dark:border-surface-700/60 space-y-1">
                <div className="flex items-center gap-2 text-surface-500 font-semibold">
                  <MapPin className="h-4 w-4 text-danger-500" aria-hidden="true" />
                  <span>Venue Location</span>
                </div>
                <p className="font-bold text-surface-900 text-sm truncate">
                  {invitation?.location || "Metropolitan Crystal Pavilion, New York"}
                </p>
              </div>
            </div>

            {/* Dress code & Note */}
            <div className="text-xs text-surface-600 space-y-1 p-3.5 rounded-xl bg-primary-500/5 border border-primary-500/20">
              <span className="font-bold text-surface-900 block">Attire &amp; Dress Code:</span>
              <p>{invitation?.dressCode || "Black Tie / Formal Evening Wear Required."}</p>
            </div>

            {/* Interactive RSVP Action Controls */}
            <div className="space-y-4 pt-4 border-t border-surface-200/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                  Update Your RSVP Attendance
                </h3>
                {showSavedFeedback && (
                  <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1 animate-fade-in">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Response Saved</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => handleUpdateRsvp("CONFIRMED")}
                  disabled={updatingRsvp}
                  className={`gap-2 text-xs font-semibold py-2.5 px-5 ${
                    isConfirmed ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-glass" : ""
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Confirm Attendance (Accept)</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleUpdateRsvp("DECLINED")}
                  disabled={updatingRsvp}
                  className={`gap-2 text-xs font-semibold py-2.5 px-5 hover:border-danger-400 hover:text-danger-600 ${
                    isDeclined ? "border-danger-500 bg-danger-50 text-danger-700" : ""
                  }`}
                >
                  <XCircle className="h-4 w-4 text-danger-500" aria-hidden="true" />
                  <span>Decline with Regrets</span>
                </Button>
              </div>

              {/* Dietary Preferences & Accessibility Input */}
              <div className="space-y-2 pt-2">
                <label
                  htmlFor="dietary-input"
                  className="block text-xs font-semibold text-surface-700"
                >
                  Dietary Restrictions or Allergies (comma-separated):
                </label>
                <div className="flex gap-2">
                  <input
                    id="dietary-input"
                    type="text"
                    value={dietaryInput}
                    onChange={(e) => setDietaryInput(e.target.value)}
                    placeholder="e.g. Nut Allergy, Vegetarian, Halal"
                    className="flex-1 rounded-xl border border-surface-300 dark:border-surface-700 bg-white/80 dark:bg-surface-800/80 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateRsvp(guestRecord?.rsvpStatus || "CONFIRMED")}
                    disabled={updatingRsvp}
                    className="text-xs"
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Seating Assignment & Digital QR Pass */}
        <div className="space-y-6">
          {/* Seating Table Assignment Card */}
          <Card variant="elevated" className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary-500/10 text-primary-600 flex items-center justify-center">
                  <Armchair className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-surface-900">Your Dining Table</h3>
              </div>
              <Badge variant="primary" size="sm">
                Reserved
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-indigo-500/10 border border-primary-500/20 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-primary-700 dark:text-primary-300 tracking-wider">
                Table Assignment
              </span>
              <p className="text-lg font-black text-surface-900">
                {assignedTable?.name || "Table 1 — Imperial Head Table"}
              </p>
              <div className="flex justify-center gap-4 text-xs text-surface-600 pt-1">
                <span>Seat: <strong>Chair #{guestRecord?.seatNumber || 1}</strong></span>
                <span>Zone: <strong>{assignedTable?.zone || "Main Stage Front"}</strong></span>
              </div>
            </div>

            <Link href="/seating?view=guest" className="block text-center text-xs font-semibold text-primary-600 hover:underline">
              View Table Layout &amp; Tablemates &rarr;
            </Link>
          </Card>

          {/* Digital QR Entry Pass Card */}
          <Card variant="elevated" className="p-5 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-surface-200/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-surface-900">Digital Entry Pass</h3>
              </div>
              <Badge variant="success" size="sm">
                Verified
              </Badge>
            </div>

            <div className="flex justify-center p-3 bg-white rounded-2xl shadow-inner border border-surface-200/70 inline-block mx-auto">
              <QrCodeSvg value={qrPassPayload} size={140} />
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-mono text-[11px] font-bold text-surface-800 block truncate">
                PASS: {guestRecord?.id || "gst_demo_01"}
              </span>
              <p className="text-[11px] text-surface-500">
                Present this QR matrix to the door coordinator at check-in for expedited entry.
              </p>
            </div>

            <Link href="/check-in?view=pass" className="block text-xs font-semibold text-primary-600 hover:underline">
              Open Fullscreen Pass &rarr;
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
