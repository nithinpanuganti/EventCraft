import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function HomePage() {
  return (
    <div className="space-y-12 py-4 animate-page-enter">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-surface-200/80 glass-surface-elevated p-8 sm:p-12 shadow-glass-elevated specular-top">
        <div className="max-w-3xl space-y-5">
          <Badge variant="primary" size="md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Next-Generation Event Architecture</span>
          </Badge>

          <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 sm:text-5xl sm:leading-tight">
            Plan weddings, birthdays, & gatherings with precision.
          </h1>

          <p className="text-base text-surface-600 sm:text-lg leading-relaxed">
            EventCraft AI bridges generative event design with deterministic financial and milestone
            management. Generate concepts, strict budget allocations, and day-of schedules in one
            unified workspace.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link href="/events/new">
              <Button size="lg" className="shadow-glass gap-2">
                <span>Start Planning an Event</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                <span>Open Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="space-y-6">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-xl font-bold tracking-tight text-surface-900 sm:text-2xl">
            Built for Actionable Execution, Not Just Chat
          </h2>
          <p className="text-sm text-surface-500">
            Why EventCraft AI separates creative reasoning from deterministic calculations.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card hoverable className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50/90 text-primary-700 border border-primary-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Structured GenAI Planning</CardTitle>
            <CardDescription className="text-xs sm:text-sm leading-relaxed">
              Generates cohesive themes, customized color palettes, vendor categories, and day-of
              itineraries validated against strict schemas.
            </CardDescription>
          </Card>

          <Card hoverable className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50/90 text-accent-700 border border-accent-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm">
              <Calculator className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Deterministic Ledger</CardTitle>
            <CardDescription className="text-xs sm:text-sm leading-relaxed">
              Financial sums, actual expenses, remaining balances, and budget overruns are computed
              with 100% exact code arithmetic—never by LLM approximations.
            </CardDescription>
          </Card>

          <Card hoverable className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-100/90 text-surface-800 border border-surface-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Resilient & Safe Architecture</CardTitle>
            <CardDescription className="text-xs sm:text-sm leading-relaxed">
              Full offline fallback to curated domain templates if AI services time out. No fake vendor
              rates or hallucinated contacts presented as fact.
            </CardDescription>
          </Card>
        </div>
      </section>

      {/* Supported Event Categories */}
      <section className="glass-card p-6 sm:p-8 rounded-2xl specular-top">
        <h3 className="text-lg font-bold tracking-tight text-surface-900">Supported Event Profiles</h3>
        <p className="mt-1 text-xs sm:text-sm text-surface-500">
          Tailored planning templates and questions configured for each event type.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-surface-200/70 bg-white/70 backdrop-blur-sm p-4 shadow-subtle">
            <div className="text-sm font-bold text-surface-900">Weddings</div>
            <p className="mt-1 text-xs text-surface-600 leading-normal">
              12-month timeline, ceremony vs. reception schedule, vendor quotes, seating benchmarks.
            </p>
          </div>
          <div className="rounded-xl border border-surface-200/70 bg-white/70 backdrop-blur-sm p-4 shadow-subtle">
            <div className="text-sm font-bold text-surface-900">Birthdays & Anniversaries</div>
            <p className="mt-1 text-xs text-surface-600 leading-normal">
              Activity coordination, party themes, affordable catering splits, entertainment booking.
            </p>
          </div>
          <div className="rounded-xl border border-surface-200/70 bg-white/70 backdrop-blur-sm p-4 shadow-subtle">
            <div className="text-sm font-bold text-surface-900">Community Gatherings</div>
            <p className="mt-1 text-xs text-surface-600 leading-normal">
              Permits, volunteer task delegation, accessibility ramps, sponsor budgets, safety run sheets.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
