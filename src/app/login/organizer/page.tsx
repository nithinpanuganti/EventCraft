"use client";

import React from "react";
import { RoleLoginPage } from "@/components/auth/RoleLoginPage";

export default function OrganizerLoginPage() {
  return <RoleLoginPage role="ORGANIZER" targetDashboard="/dashboard/organizer" />;
}
