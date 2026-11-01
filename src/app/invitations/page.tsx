"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/layout/AuthContext";
import { LocalEvent } from "@/lib/storage/types";
import {
  getLocalInvitation,
  saveLocalInvitation,
  listLocalEvents,
} from "@/lib/storage/local-repository";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { QrCodeSvg } from "@/components/ui/QrCodeSvg";
import {
  Printer,
  Sparkles,
  Calendar,
  MapPin,
  Check,
  Heart,
  PartyPopper,
  Building2,
  Gem,
  LayoutTemplate,
} from "lucide-react";

type TemplateKey =
  | "classic_wedding"
  | "milestone_birthday"
  | "corporate_gala"
  | "community_gathering"
  | "modern_minimalist";

interface TemplateConfig {
  id: TemplateKey;
  name: string;
  icon: React.ElementType;
  badge: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  fontClass: string;
}

const TEMPLATES: Record<TemplateKey, TemplateConfig> = {
  classic_wedding: {
    id: "classic_wedding",
    name: "Classic Wedding",
    icon: Heart,
    badge: "Romantic",
    cardBg: "from-rose-500/10 via-amber-500/5 to-purple-500/10 dark:from-rose-950/40 dark:to-purple-950/40",
    borderColor: "border-rose-400/30",
    textColor: "text-rose-950 dark:text-rose-100",
    accentColor: "text-rose-600 dark:text-rose-400",
    fontClass: "font-serif",
  },
  milestone_birthday: {
    id: "milestone_birthday",
    name: "Milestone Birthday",
    icon: PartyPopper,
    badge: "Festive",
    cardBg: "from-purple-500/15 via-pink-500/10 to-amber-500/15 dark:from-purple-950/50 dark:to-pink-950/40",
    borderColor: "border-purple-400/40",
    textColor: "text-purple-950 dark:text-purple-100",
    accentColor: "text-purple-600 dark:text-purple-400",
    fontClass: "font-sans",
  },
  corporate_gala: {
    id: "corporate_gala",
    name: "Corporate Gala",
    icon: Building2,
    badge: "Executive",
    cardBg: "from-blue-600/10 via-slate-500/5 to-cyan-500/10 dark:from-blue-950/50 dark:to-slate-900/50",
    borderColor: "border-blue-500/30",
    textColor: "text-slate-900 dark:text-slate-100",
    accentColor: "text-blue-600 dark:text-blue-400",
    fontClass: "font-sans",
  },
  community_gathering: {
    id: "community_gathering",
    name: "Golden Gathering",
    icon: Gem,
    badge: "Luxury",
    cardBg: "from-amber-500/20 via-yellow-500/10 to-orange-500/15 dark:from-amber-950/50 dark:to-yellow-950/40",
    borderColor: "border-amber-400/40",
    textColor: "text-amber-950 dark:text-amber-100",
    accentColor: "text-amber-600 dark:text-amber-400",
    fontClass: "font-serif",
  },
  modern_minimalist: {
    id: "modern_minimalist",
    name: "Modern Minimalist",
    icon: LayoutTemplate,
    badge: "Clean Glass",
    cardBg: "from-surface-500/5 via-white/40 to-surface-500/10 dark:from-surface-900/60 dark:to-surface-800/60",
    borderColor: "border-surface-300 dark:border-white/10",
    textColor: "text-surface-900",
    accentColor: "text-primary-600 dark:text-primary-400",
    fontClass: "font-mono",
  },
};

function InvitationsContent() {
  const searchParams = useSearchParams();
  const isGuestView = searchParams.get("view") === "guest";
  const { activeEvent, isGuest } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [availableEvents, setAvailableEvents] = useState<LocalEvent[]>([]);

  const [templateId, setTemplateId] = useState<TemplateKey>("classic_wedding");
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [dressCode, setDressCode] = useState("Cocktail Attire");

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

  useEffect(() => {
    if (!selectedEventId) return;

    async function loadInv() {
      try {
        const evt = availableEvents.find((e) => e.id === selectedEventId);

        const saved = await getLocalInvitation(selectedEventId);
        if (saved) {
          setTemplateId(saved.templateId as TemplateKey);
          setTitle(saved.title || "");
          setEventTitle(saved.eventTitle || "");
          setHostName(saved.hostName || "");
          setEventDate(saved.eventDate || "");
          setEventTime(saved.eventTime || "");
          setLocation(saved.location || "");
          setDescription(saved.description || "");
          setDressCode(saved.dressCode || "Cocktail Attire");
        } else if (evt) {
          setTitle(`Invitation: ${evt.title}`);
          setEventTitle(evt.title);
          setHostName("The Event Host");
          setEventDate(evt.eventDate || "2026-12-15");
          setEventTime("6:30 PM");
          setLocation(evt.location || "Grand Ballroom, City Center");
          setDescription("We cordially request the honor of your presence to celebrate this unforgettable milestone.");
          setDressCode(evt.type === "WEDDING" ? "Formal / Black Tie Optional" : "Cocktail Attire");
          setTemplateId(
            evt.type === "WEDDING"
              ? "classic_wedding"
              : evt.type === "BIRTHDAY"
              ? "milestone_birthday"
              : "corporate_gala"
          );
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadInv();
  }, [selectedEventId, availableEvents]);

  const handleSave = async () => {
    if (!selectedEventId) return;
    try {
      await saveLocalInvitation({
        eventId: selectedEventId,
        title: title || `Invitation: ${eventTitle}`,
        templateId,
        hostName,
        eventTitle,
        eventDate,
        eventTime,
        location,
        description,
        dressCode,
        primaryColor: "#7c3aed",
        secondaryColor: "#6366f1",
        fontFamily: "Inter, sans-serif",
        rsvpDeadline: eventDate || "2026-12-01",
        qrPayload: `${typeof window !== "undefined" ? window.location.origin : ""}/guests?view=rsvp&event=${selectedEventId}`,
      });
      setNotification({
        type: "success",
        title: "Invitation Saved",
        message: "Invitation card configuration saved to your browser database.",
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Save Failed",
        message: "Failed to persist invitation details.",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentTpl = TEMPLATES[templateId] || TEMPLATES.classic_wedding;
  const qrUrl = typeof window !== "undefined"
    ? `${window.location.origin}/guests?view=rsvp&event=${selectedEventId}`
    : `/guests?view=rsvp&event=${selectedEventId}`;

  // GUEST PRESENTATION VIEW
  if (isGuestView || isGuest) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 space-y-6 animate-page-enter">
        <div className="text-center space-y-2">
          <Badge variant="primary" size="md">Digital Invitation Card</Badge>
          <h1 className="text-3xl font-extrabold text-surface-900">You Are Cordially Invited</h1>
        </div>

        {/* The Invitation Card */}
        <div
          className={`rounded-3xl p-8 sm:p-12 bg-gradient-to-br ${currentTpl.cardBg} border ${currentTpl.borderColor} shadow-glass-xl backdrop-blur-xl relative overflow-hidden text-center space-y-8 specular-top`}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest font-bold opacity-70">
              Exclusive Invitation
            </span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold ${currentTpl.fontClass} ${currentTpl.textColor}`}>
              {eventTitle || "Special Event"}
            </h2>
            <p className="text-sm italic opacity-80">Hosted with care by {hostName || "Your Host"}</p>
          </div>

          <div className="max-w-md mx-auto text-sm leading-relaxed opacity-90 border-y border-white/20 py-4">
            &ldquo;{description || "We look forward to sharing this wonderful occasion with you."}&rdquo;
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left max-w-md mx-auto bg-white/20 dark:bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/30 dark:border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold opacity-75">
                <Calendar className="h-3.5 w-3.5" />
                <span>Date & Time</span>
              </div>
              <div className="font-semibold">{eventDate || "Date TBD"}</div>
              <div className="opacity-80">{eventTime || "6:00 PM"}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold opacity-75">
                <MapPin className="h-3.5 w-3.5" />
                <span>Venue & Location</span>
              </div>
              <div className="font-semibold truncate">{location || "Venue Name"}</div>
            </div>
          </div>

          {dressCode && (
            <div className="text-xs">
              <span className="opacity-70">Attire: </span>
              <span className="font-bold">{dressCode}</span>
            </div>
          )}

          <div className="flex flex-col items-center justify-center gap-4 pt-2">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-white/40">
              <QrCodeSvg value={qrUrl} size={130} />
            </div>
            <span className="text-[11px] opacity-70">Scan QR Code to Confirm RSVP</span>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <Link href={`/guests?view=rsvp&event=${selectedEventId}`}>
              <Button variant="primary" size="lg" className="shadow-glass-glow font-bold">
                Confirm RSVP Attendance
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ORGANIZER BUILDER VIEW
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
              Invitation & RSVP Page Builder
            </h1>
            <Badge variant="primary" size="sm">5 Curated Themes</Badge>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Customize luxury invitation cards, generate QR codes, and preview real-time guest passes.
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
            onClick={handlePrint}
            className="flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Card</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-1.5 shadow-glass-glow"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Save Invitation</span>
          </Button>
        </div>
      </div>

      {/* Workspace: Left Editor, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Form (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Template Selector */}
          <Card variant="elevated" className="p-5 specular-top space-y-3">
            <label className="text-xs font-bold text-surface-900 uppercase tracking-wider block">
              Choose Visual Theme
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => {
                const tpl = TEMPLATES[key];
                const Icon = tpl.icon;
                const isSelected = templateId === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTemplateId(key)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-primary-500/15 border-primary-500 ring-2 ring-primary-500/30 text-surface-900"
                        : "glass-surface-subtle border-white/60 dark:border-white/10 hover:border-primary-400/40 text-surface-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-surface-900">{tpl.name}</div>
                        <div className="text-[10px] text-surface-500">{tpl.badge}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Invitation Content Form */}
          <Card variant="elevated" className="p-5 specular-top space-y-4">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              Card Typography & Details
            </h3>

            <Input
              label="Event Name"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="e.g. Elena & Marcus's Wedding Reception"
            />

            <Input
              label="Host Name(s)"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="e.g. The Rostova Family"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Event Date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <Input
                label="Event Time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 5:30 PM"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Venue & Address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Starlight Pavilion, 100 Main St"
              />
              <Input
                label="Dress Code"
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
                placeholder="e.g. Cocktail Attire"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-700 block mb-1">
                Personal Invitation Message
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-surface-900/70 border border-surface-200 dark:border-surface-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Write a heartfelt invitation message..."
              />
            </div>
          </Card>
        </div>

        {/* Live Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary-500" />
              <span>Live Liquid Glass Preview</span>
            </span>
            <Badge variant="outline" size="sm">
              Template: {currentTpl.name}
            </Badge>
          </div>

          {/* Invitation Card Render */}
          <div
            className={`rounded-3xl p-8 sm:p-12 bg-gradient-to-br ${currentTpl.cardBg} border ${currentTpl.borderColor} shadow-glass-xl backdrop-blur-xl relative overflow-hidden text-center space-y-6 specular-top transition-all`}
          >
            {/* Ambient specular sheen */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />

            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-widest font-bold opacity-60">
                You Are Cordially Invited
              </span>
              <h2
                className={`text-2xl sm:text-3xl md:text-4xl font-extrabold ${currentTpl.fontClass} ${currentTpl.textColor}`}
              >
                {eventTitle || "Special Event Gathering"}
              </h2>
              <p className="text-xs italic opacity-80">
                Hosted with pleasure by {hostName || "The Host"}
              </p>
            </div>

            <div className="max-w-md mx-auto text-xs sm:text-sm leading-relaxed opacity-90 border-y border-white/20 py-3.5">
              &ldquo;{description || "We request the honor of your presence."}&rdquo;
            </div>

            {/* Time & Location details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-left max-w-md mx-auto bg-white/30 dark:bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 font-bold opacity-75 text-[11px]">
                  <Calendar className="h-3 w-3" />
                  <span>Date & Time</span>
                </div>
                <div className="font-bold">{eventDate || "TBD"}</div>
                <div className="text-[11px] opacity-80">{eventTime || "TBD"}</div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1 font-bold opacity-75 text-[11px]">
                  <MapPin className="h-3 w-3" />
                  <span>Location</span>
                </div>
                <div className="font-bold truncate">{location || "Venue Name"}</div>
              </div>
            </div>

            {dressCode && (
              <div className="text-xs">
                <span className="opacity-70">Attire: </span>
                <span className="font-semibold">{dressCode}</span>
              </div>
            )}

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center gap-2 pt-2">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-white/40">
                <QrCodeSvg value={qrUrl} size={110} />
              </div>
              <span className="text-[10px] opacity-70">
                Scan with smartphone camera to RSVP
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvitationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <InvitationsContent />
    </Suspense>
  );
}
