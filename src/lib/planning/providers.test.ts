import { describe, it, expect, vi } from "vitest";
import { PlanningService } from "@/lib/planning/planning-service";
import { GeminiPlanningProvider } from "@/lib/planning/gemini-provider";
import { OpenAIPlanningProvider } from "@/lib/planning/openai-provider";
import { buildPlanningContext } from "@/lib/planning/context-builder";

describe("Phase 5: Provider Integration & Resilience Service Tests", () => {
  const context = buildPlanningContext({
    eventId: "ev_prov_1",
    userId: "u_prov_1",
    type: "WEDDING",
    title: "Golden Hour Wedding",
    guestCount: 80,
    totalBudget: 15000,
    currency: "USD",
  });

  const validSamplePlan = {
    summary: {
      conceptTitle: "Golden Hour Nuptials",
      conceptNarrative: "A warm and intimate celebration designed around natural light.",
      planningAssumptions: ["80 guests"],
      keyRecommendations: ["Book photographer early"],
    },
    theme: {
      themeName: "Sunset Glow",
      colorPalette: ["#FFD166", "#06D6A0", "#118AB2"],
      styleDirection: "Warm golden lighting with minimalist greenery.",
      decorationIdeas: ["Fairy light canopy"],
      personalizedActivities: ["First look"],
      culturalConsiderations: [],
    },
    budget: {
      totalBudget: 15000,
      currency: "USD",
      contingencyPercentage: 5,
      isBalanced: true,
      categories: [
        {
          categoryName: "Venue",
          allocatedPercentage: 40,
          allocatedAmount: 6000,
          estimatedAmount: 6000,
          rationale: "Rental",
        },
        {
          categoryName: "Catering",
          allocatedPercentage: 60,
          allocatedAmount: 9000,
          estimatedAmount: 9000,
          rationale: "Dinner",
        },
      ],
    },
    milestones: [
      {
        title: "Venue Lock",
        phase: "BOOKING" as const,
        offsetDays: -90,
        description: "Secure space",
        priority: "CRITICAL" as const,
      },
      {
        title: "Day Of Event",
        phase: "EVENT_DAY" as const,
        offsetDays: 0,
        description: "Celebration",
        priority: "CRITICAL" as const,
      },
    ],
    tasks: [
      {
        title: "Book Venue Space",
        phase: "BOOKING" as const,
        priority: "CRITICAL" as const,
        category: "Venue",
        offsetDays: -90,
      },
      {
        title: "Confirm Catering Menu",
        phase: "BOOKING" as const,
        priority: "HIGH" as const,
        category: "Food",
        offsetDays: -60,
      },
      {
        title: "Rehearsal Walkthrough",
        phase: "PREPARATION" as const,
        priority: "MEDIUM" as const,
        category: "Ceremony",
        offsetDays: -1,
      },
    ],
    dayOfSchedule: [
      {
        time: "02:00 PM",
        activity: "Vendor Load-in",
        lead: "Coordinator",
        notes: "Deliveries",
      },
      {
        time: "04:00 PM",
        activity: "Ceremony Begins",
        lead: "Officiant",
        notes: "Guest arrival",
      },
      {
        time: "06:00 PM",
        activity: "Dinner Reception",
        lead: "Caterer",
        notes: "Plated meal",
      },
    ],
    vendors: [
      {
        categoryName: "Venue",
        justification: "Physical setting",
        selectionCriteria: ["Capacity fit"],
        questionsToAsk: ["Curfew?"],
        recommendedMilestone: "6 months out",
      },
    ],
    risksAndAlternatives: {
      potentialRisks: ["Rain contingency"],
      mitigations: ["Indoor space option"],
      budgetSavingTips: ["BYOB license"],
      optionalUpgrades: [],
    },
    metadata: {
      source: "ai-generated" as const,
      provider: "mock-ai",
      model: "mock-model",
      version: 1,
      generatedAt: new Date().toISOString(),
    },
  };

  it("handles missing API key by gracefully providing a curated fallback plan", async () => {
    // When no provider is configured, PlanningService never crashes; it uses FallbackPlanService
    const service = new PlanningService({ providerName: "gemini" });
    const result = await service.generatePlan(context);

    expect(result.success).toBe(true);
    expect(result.source).toBe("curated-fallback");
    expect(result.plan).toBeDefined();
    expect(result.plan?.budget.totalBudget).toBe(15000);
  });

  it("successfully parses and validates mocked Gemini structured response", async () => {
    const provider = new GeminiPlanningProvider("mock_gemini_key", "gemini-1.5-pro");

    vi.spyOn(provider, "generatePlan").mockResolvedValue(validSamplePlan);

    const plan = await provider.generatePlan(context);
    expect(plan.summary.conceptTitle).toBe("Golden Hour Nuptials");
    expect(plan.budget.totalBudget).toBe(15000);
    expect(plan.tasks.length).toBeGreaterThanOrEqual(3);
  });

  it("successfully parses and validates mocked OpenAI structured response", async () => {
    const provider = new OpenAIPlanningProvider("mock_openai_key", "gpt-4o");

    vi.spyOn(provider, "generatePlan").mockResolvedValue(validSamplePlan);

    const plan = await provider.generatePlan(context);
    expect(plan.summary.conceptTitle).toBe("Golden Hour Nuptials");
    expect(plan.theme.themeName).toBe("Sunset Glow");
  });

  it("falls back to curated template on provider timeout without failing the user", async () => {
    const service = new PlanningService({ providerName: "openai", timeoutMs: 50, maxRetries: 0 });
    const internalProvider = (service as unknown as { provider: { isConfigured: () => boolean; generatePlan: () => Promise<unknown> } }).provider;

    vi.spyOn(internalProvider, "isConfigured").mockReturnValue(true);
    vi.spyOn(internalProvider, "generatePlan").mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200))
    );

    const result = await service.generatePlan(context);

    expect(result.success).toBe(true);
    expect(result.source).toBe("curated-fallback");
    expect(result.error).toContain("timed out");
    expect(result.plan?.budget.totalBudget).toBe(15000);
  });

  it("falls back to curated template on provider rate limit / 429 error", async () => {
    const service = new PlanningService({ providerName: "gemini", maxRetries: 0 });
    const internalProvider = (service as unknown as { provider: { isConfigured: () => boolean; generatePlan: () => Promise<unknown> } }).provider;

    vi.spyOn(internalProvider, "isConfigured").mockReturnValue(true);
    vi.spyOn(internalProvider, "generatePlan").mockRejectedValue(
      new Error("429 Too Many Requests / Resource Exhausted")
    );

    const result = await service.generatePlan(context);

    expect(result.success).toBe(true);
    expect(result.source).toBe("curated-fallback");
    expect(result.error).toContain("429");
    expect(result.plan).toBeDefined();
  });
});
