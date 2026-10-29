"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LocalProfile,
  LocalEvent,
} from "@/lib/storage/types";
import {
  getActiveLocalProfile,
  getLocalProfiles,
  setActiveLocalProfile,
  createLocalProfile,
  deleteLocalProfile,
  listLocalEvents,
} from "@/lib/storage/local-repository";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface EventSummaryItem {
  id: string;
  title: string;
  type: "WEDDING" | "BIRTHDAY" | "COMMUNITY";
  eventDate?: string | null;
  location?: string | null;
  guestCount: number;
  totalBudget: number;
  currency: string;
  status: string;
  updatedAt: string;
}

interface AuthContextValue {
  session: SessionUser | null;
  user: LocalProfile | null;
  profiles: LocalProfile[];
  activeProfile: LocalProfile | null;
  activeEvent: EventSummaryItem | null;
  loading: boolean;
  events: EventSummaryItem[];
  loadingEvents: boolean;
  refreshSession: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  createProfile: (name: string, email: string) => Promise<LocalProfile>;
  removeProfile: (profileId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<LocalProfile | null>(null);
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventSummaryItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const router = useRouter();

  const refreshEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      if (!activeProfile) {
        setEvents([]);
        return;
      }
      const localEvents = await listLocalEvents(activeProfile.id);
      setEvents(
        localEvents.map((e: LocalEvent) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          eventDate: e.eventDate,
          location: e.location,
          guestCount: e.guestCount,
          totalBudget: e.totalBudget,
          currency: e.currency,
          status: e.status,
          updatedAt: e.updatedAt,
        }))
      );
    } catch (err) {
      console.warn("[AuthContext] Error reading local events:", err);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [activeProfile]);

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      const allProfiles = await getLocalProfiles();
      const currentProfile = await getActiveLocalProfile(allProfiles);
      setProfiles(allProfiles);
      setActiveProfile(currentProfile);

      const localEvents = await listLocalEvents(currentProfile.id);
      setEvents(
        localEvents.map((e: LocalEvent) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          eventDate: e.eventDate,
          location: e.location,
          guestCount: e.guestCount,
          totalBudget: e.totalBudget,
          currency: e.currency,
          status: e.status,
          updatedAt: e.updatedAt,
        }))
      );
    } catch (err) {
      console.warn("[AuthContext] Error reading local profile:", err);
      setActiveProfile(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const switchProfile = useCallback(
    async (profileId: string) => {
      const switched = await setActiveLocalProfile(profileId);
      setActiveProfile(switched);
      const localEvents = await listLocalEvents(switched.id);
      setEvents(
        localEvents.map((e: LocalEvent) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          eventDate: e.eventDate,
          location: e.location,
          guestCount: e.guestCount,
          totalBudget: e.totalBudget,
          currency: e.currency,
          status: e.status,
          updatedAt: e.updatedAt,
        }))
      );
      router.refresh();
    },
    [router]
  );

  const createProfile = useCallback(
    async (name: string, email: string) => {
      const created = await createLocalProfile(name, email);
      await refreshSession();
      return created;
    },
    [refreshSession]
  );

  const removeProfile = useCallback(
    async (profileId: string) => {
      await deleteLocalProfile(profileId);
      await refreshSession();
    },
    [refreshSession]
  );

  const logout = useCallback(async () => {
    // For local profiles: navigate to profile selection
    router.push("/login");
  }, [router]);

  const session: SessionUser | null = useMemo(
    () =>
      activeProfile
        ? {
            id: activeProfile.id,
            name: activeProfile.name,
            email: activeProfile.email,
          }
        : null,
    [activeProfile]
  );

  const activeEvent = useMemo(() => events[0] || null, [events]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: activeProfile,
      profiles,
      activeProfile,
      activeEvent,
      loading,
      events,
      loadingEvents,
      refreshSession,
      refreshEvents,
      switchProfile,
      createProfile,
      removeProfile,
      logout,
    }),
    [
      session,
      activeProfile,
      profiles,
      activeEvent,
      loading,
      events,
      loadingEvents,
      refreshSession,
      refreshEvents,
      switchProfile,
      createProfile,
      removeProfile,
      logout,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
