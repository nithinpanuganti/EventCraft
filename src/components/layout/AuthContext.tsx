"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

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
  loading: boolean;
  events: EventSummaryItem[];
  loadingEvents: boolean;
  refreshSession: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventSummaryItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const router = useRouter();

  const refreshEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        const user = data?.user || null;
        setSession(user);
        if (user) {
          // Prefetch events once session is confirmed
          fetch("/api/events")
            .then((r) => (r.ok ? r.json() : { events: [] }))
            .then((d) => setEvents(d.events || []))
            .catch(() => setEvents([]));
        } else {
          setEvents([]);
        }
      } else {
        setSession(null);
        setEvents([]);
      }
    } catch {
      setSession(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        events,
        loadingEvents,
        refreshSession,
        refreshEvents,
        logout,
      }}
    >
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
