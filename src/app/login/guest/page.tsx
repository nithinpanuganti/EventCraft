"use client";

import React from "react";
import { RoleLoginPage } from "@/components/auth/RoleLoginPage";

export default function GuestLoginPage() {
  return <RoleLoginPage role="GUEST" targetDashboard="/dashboard/guest" />;
}
