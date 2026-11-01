"use client";

import React from "react";
import { useAuth } from "@/components/layout/AuthContext";
import OrganizerDashboardPage from "./organizer/page";
import CoordinatorDashboardPage from "./coordinator/page";
import VendorDashboardPage from "./vendor/page";
import GuestDashboardPage from "./guest/page";

export default function CentralDashboardRouter() {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  switch (userRole) {
    case "COORDINATOR":
      return <CoordinatorDashboardPage />;
    case "VENDOR":
      return <VendorDashboardPage />;
    case "GUEST":
      return <GuestDashboardPage />;
    case "ORGANIZER":
    default:
      return <OrganizerDashboardPage />;
  }
}
