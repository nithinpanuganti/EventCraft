"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrganizerLoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login?role=organizer");
  }, [router]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
    </div>
  );
}

