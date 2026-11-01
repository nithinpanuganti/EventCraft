"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LocalProfile,
  LocalEvent,
  UserRole,
} from "@/lib/storage/types";
import {
  getActiveLocalProfile,
  getLocalProfiles,
  setActiveLocalProfile,
  createLocalProfile,
  deleteLocalProfile,
  listLocalEvents,
  seedDemoAccountsAndEvents,
} from "@/lib/storage/local-repository";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  userRole: UserRole;
  isOrganizer: boolean;
  isCoordinator: boolean;
  isVendor: boolean;
  isGuest: boolean;
  refreshSession: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  switchRoleQuick: (role: UserRole) => Promise<void>;
  createProfile: (
    nameOrParams:
      | string
      | {
          name: string;
          email: string;
          role?: UserRole;
          passcode?: string;
          phone?: string;
          organization?: string;
          assignedEventIds?: string[];
          vendorId?: string;
          guestId?: string;
        },
    maybeEmail?: string,
    maybeRole?: UserRole
  ) => Promise<LocalProfile>;
  loadDemoAccounts: () => Promise<void>;
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

  const userRole: UserRole = activeProfile?.role || "ORGANIZER";

  const refreshEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      if (!activeProfile) {
        setEvents([]);
        return;
      }

      // If user is organizer or has no assignedEventIds, show their created events
      let localEvents: LocalEvent[] = [];
      if (activeProfile.role === "ORGANIZER" || !activeProfile.assignedEventIds || activeProfile.assignedEventIds.length === 0) {
        localEvents = await listLocalEvents(activeProfile.id);
        // If an organizer has 0 events, also check all events so they can see existing events
        if (localEvents.length === 0) {
          const allEvents = await listLocalEvents();
          if (allEvents.length > 0) localEvents = allEvents;
        }
      } else {
        // Coordinator / Vendor / Guest: list all events and filter by assignedEventIds
        const allEvents = await listLocalEvents();
        localEvents = allEvents.filter((e) => activeProfile.assignedEventIds?.includes(e.id));
        if (localEvents.length === 0 && allEvents.length > 0) {
          localEvents = allEvents; // fallback to allow viewing for demo
        }
      }

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

      let localEvents: LocalEvent[] = [];
      if (currentProfile.role === "ORGANIZER" || !currentProfile.assignedEventIds || currentProfile.assignedEventIds.length === 0) {
        localEvents = await listLocalEvents(currentProfile.id);
        if (localEvents.length === 0) {
          const allEvents = await listLocalEvents();
          if (allEvents.length > 0) localEvents = allEvents;
        }
      } else {
        const allEvents = await listLocalEvents();
        localEvents = allEvents.filter((e) => currentProfile.assignedEventIds?.includes(e.id));
        if (localEvents.length === 0 && allEvents.length > 0) {
          localEvents = allEvents;
        }
      }

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
      await refreshSession();
      router.refresh();
    },
    [refreshSession, router]
  );

  const switchRoleQuick = useCallback(
    async (targetRole: UserRole) => {
      const all = await getLocalProfiles();
      const match = all.find((p) => p.role === targetRole);
      if (match) {
        await switchProfile(match.id);
      } else {
        // If no profile with this role exists yet, auto-create a demo one
        const newProf = await createLocalProfile({
          name: `${targetRole.charAt(0) + targetRole.slice(1).toLowerCase()} User`,
          email: `${targetRole.toLowerCase()}@eventcraft.local`,
          role: targetRole,
        });
        await switchProfile(newProf.id);
      }
    },
    [switchProfile]
  );

  const createProfile = useCallback(
    async (
      nameOrParams:
        | string
        | {
            name: string;
            email: string;
            role?: UserRole;
            passcode?: string;
            phone?: string;
            organization?: string;
            assignedEventIds?: string[];
            vendorId?: string;
            guestId?: string;
          },
      maybeEmail?: string,
      maybeRole?: UserRole
    ) => {
      const created = await createLocalProfile(nameOrParams, maybeEmail, undefined, maybeRole);
      await refreshSession();
      return created;
    },
    [refreshSession]
  );

  const loadDemoAccounts = useCallback(async () => {
    await seedDemoAccountsAndEvents();
    await refreshSession();
  }, [refreshSession]);

  const removeProfile = useCallback(
    async (profileId: string) => {
      await deleteLocalProfile(profileId);
      await refreshSession();
    },
    [refreshSession]
  );

  const logout = useCallback(async () => {
    router.push("/login");
  }, [router]);

  const session: SessionUser | null = useMemo(
    () =>
      activeProfile
        ? {
            id: activeProfile.id,
            name: activeProfile.name,
            email: activeProfile.email,
            role: activeProfile.role || "ORGANIZER",
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
      userRole,
      isOrganizer: userRole === "ORGANIZER",
      isCoordinator: userRole === "COORDINATOR",
      isVendor: userRole === "VENDOR",
      isGuest: userRole === "GUEST",
      refreshSession,
      refreshEvents,
      switchProfile,
      switchRoleQuick,
      createProfile,
      loadDemoAccounts,
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
      userRole,
      refreshSession,
      refreshEvents,
      switchProfile,
      switchRoleQuick,
      createProfile,
      loadDemoAccounts,
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
