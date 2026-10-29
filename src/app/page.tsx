import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calculator,
  HeartHandshake,
  Cake,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function HomePage() {
  return (
    <div className="space-y-12 py-4 animate-page-enter">
      {/* Hero Section with Layered Glass Depth */}
      <section className="relative overflow-hidden rounded-3xl border border-white/80 glass-surface-elevated p-8 sm:p-12 shadow-glass-elevated">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/95 to-transparent pointer-events-none" />
        
        {/* Subtle internal refraction glow */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <Badge variant="primary" size="md">
            <Sparkles className="h-3.5 w-3.5 text-primary-600" />
            <span>Next-Generation Event Architecture</span>
          </Badge>

          <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 sm:text-5xl sm:leading-tight">
            Plan weddings, birthdays, & gatherings with precision.
          </h1>

          <p className="text-base text-surface-600 sm:text-lg leading-relaxed">
            EventCraft AI bridges generative event design with deterministic financial and milestone
            management. Generate concepts, strict budget allocations, and day-of schedules in one
            unified liquid-glass workspace.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link href="/events/new">
              <Button size="lg" className="shadow-glass gap-2 font-semibold">
                <span>Start Planning an Event</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="font-semibold">
                <span>Open Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="space-y-6">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-xl font-extrabold tracking-tight text-surface-900 sm:text-2xl">
            Built for Actionable Execution, Not Just Chat
          </h2>
          <p className="text-sm text-surface-500">
            Why EventCraft AI separates creative reasoning from deterministic calculations.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card hoverable className="space-y-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/90 text-primary-600 border border-primary-200/80 shadow-[inset_0_1px_1.5px_rgba(255,255,255,1),0_2px_8px_rgba(124,58,237,0.12)] backdrop-blur-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Structured GenAI Planning</CardTitle>
            <CardDescription className="text-xs sm:text-sm leading-relaxed">
              Generates cohesive themes, customized color palettes, vendor categories, and day-of
              itineraries validated against strict schemas.
            </CardDescription>
          </Card>

          <Card hoverable className="space-y-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-50 to-accent-100/90 text-accent-700 border border-accent-200/80 shadow-[inset_0_1px_1.5px_rgba(255,255,255,1),0_2px_8px_rgba(99,102,241,0.12)] backdrop-blur-md">
              <Calculator className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Deterministic Ledger</CardTitle>
            <CardDescription className="text-xs sm:text-sm leading-relaxed">
              Financial sums, actual expenses, remaining balances, and budget overruns are computed
              with 100% exact code arithmetic—never by LLM approximations.
            </CardDescription>
          </Card>

          <Card hoverable className="space-y-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-surface-100 to-surface-200/80 text-surface-800 border border-surface-200/90 shadow-[inset_0_1px_1.5px_rgba(255,255,255,1),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-md">
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
      <section className="glass-card p-6 sm:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/90 to-transparent pointer-events-none" />

        <h3 className="text-lg font-bold tracking-tight text-surface-900">Supported Event Profiles</h3>
        <p className="mt-1 text-xs sm:text-sm text-surface-500">
          Tailored planning templates and questions configured for each event type.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="glass-surface-subtle p-5 rounded-2xl border border-surface-200/70 shadow-glass-subtle space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary-100/80 text-primary-700">
                <HeartHandshake className="h-4 w-4" />
              </div>
              <div className="text-sm font-bold text-surface-900">Weddings</div>
            </div>
            <p className="text-xs text-surface-600 leading-relaxed">
              12-month timeline, ceremony vs. reception schedule, vendor quotes, seating benchmarks.
            </p>
          </div>

          <div className="glass-surface-subtle p-5 rounded-2xl border border-surface-200/70 shadow-glass-subtle space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-100/80 text-accent-700">
                <Cake className="h-4 w-4" />
              </div>
              <div className="text-sm font-bold text-surface-900">Birthdays & Anniversaries</div>
            </div>
            <p className="text-xs text-surface-600 leading-relaxed">
              Activity coordination, party themes, affordable catering splits, entertainment booking.
            </p>
          </div>

          <div className="glass-surface-subtle p-5 rounded-2xl border border-surface-200/70 shadow-glass-subtle space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-surface-200/80 text-surface-800">
                <Users className="h-4 w-4" />
              </div>
              <div className="text-sm font-bold text-surface-900">Community Gatherings</div>
            </div>
            <p className="text-xs text-surface-600 leading-relaxed">
              Permits, volunteer task delegation, accessibility ramps, sponsor budgets, safety run sheets.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
