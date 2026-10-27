import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Shield, Sliders, Cpu } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl animate-page-enter">
      <PageHeader
        title="Settings & Preferences"
        description="Configure application defaults, currency preferences, and view system status."
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-surface-900">
              <Sliders className="h-4 w-4 text-primary-600" />
              <CardTitle>Regional & Currency Preferences</CardTitle>
            </div>
            <CardDescription>
              Default currency and formatting used across your event financial ledgers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-surface-700">
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="font-medium">Default Currency</span>
              <Badge variant="secondary">INR (₹)</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="font-medium">Number Formatting</span>
              <span className="text-surface-500 font-mono">₹1,23,456.78</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-surface-900">
              <Cpu className="h-4 w-4 text-primary-600" />
              <CardTitle>System & Model Status</CardTitle>
            </div>
            <CardDescription>
              Environment capabilities configured for the current development phase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-surface-700">
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="font-medium">Current Architecture Phase</span>
              <Badge variant="primary">Phase 9: Production Hardening & Deployment Ready</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="font-medium">Database Persistence</span>
              <Badge variant="success">Active (PostgreSQL / Prisma ORM with Migrations)</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-medium">GenAI Planning Adapter</span>
              <Badge variant="success">Active (Gemini / OpenAI with Curated Domain Fallbacks)</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-surface-900">
              <Shield className="h-4 w-4 text-success-600" />
              <CardTitle>Security & Privacy Directives</CardTitle>
            </div>
            <CardDescription>Active security invariants protecting application data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-surface-600 leading-relaxed">
            <p>&bull; Client-side code never possesses access to LLM API keys or database connection strings.</p>
            <p>&bull; Client validation is supplemented by server-side Zod validation on all mutations.</p>
            <p>&bull; Authentication and user-isolated tenancy boundaries will be enforced on all queries.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
