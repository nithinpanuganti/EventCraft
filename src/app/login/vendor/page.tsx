"use client";

import React from "react";
import { RoleLoginPage } from "@/components/auth/RoleLoginPage";

export default function VendorLoginPage() {
  return <RoleLoginPage role="VENDOR" targetDashboard="/dashboard/vendor" />;
}
