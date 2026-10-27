import React, { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EventWizard } from "@/components/events/EventWizard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sparkles } from "lucide-react";

export default function NewEventPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-page-enter">
      <PageHeader
        title="Event Creation Wizard"
        description="Configure event requirements, dates, budgets, and themes with real-time draft saving."
        badge={
          <Badge variant="primary">
            <Sparkles className="h-3 w-3 mr-1" />
            5-Step Planning
          </Badge>
        }
      />

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <EventWizard />
      </Suspense>
    </div>
  );
}
