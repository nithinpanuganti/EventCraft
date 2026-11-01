"use client";

import React from "react";
import { RoleLoginPage } from "@/components/auth/RoleLoginPage";

export default function CoordinatorLoginPage() {
  return <RoleLoginPage role="COORDINATOR" targetDashboard="/dashboard/coordinator" />;
}
