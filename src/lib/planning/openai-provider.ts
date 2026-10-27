import OpenAI from "openai";
import { PlanningProvider } from "./provider-interface";
import { GeneratedEventPlan, GeneratedEventPlanSchema } from "./schema";
import { SanitizedPlanningContext } from "./context-builder";
import { validateAndNormalizePlan } from "./deterministic-validator";

export class OpenAIPlanningProvider implements PlanningProvider {
  public readonly name = "openai";
  public readonly defaultModel: string;
  private apiKey?: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    this.defaultModel = model || process.env.OPENAI_MODEL || "gpt-4o";
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  public async generatePlan(context: SanitizedPlanningContext): Promise<GeneratedEventPlan> {
    if (!this.isConfigured() || !this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured on this server.");
    }

    const openai = new OpenAI({
      apiKey: this.apiKey,
    });

    const systemPrompt = `You are the lead event planning engine for EventCraft AI.
Generate a structured, comprehensive JSON event plan conforming strictly to the requested schema.
Rules:
1. Return ONLY valid JSON with keys: summary, theme, budget, milestones, tasks, dayOfSchedule, vendors, risksAndAlternatives.
2. Event type is: ${context.type}.
3. Total budget is: ${context.totalBudget} ${context.currency}.
4. Category percentages in 'budget.categories' MUST sum to 100%.
5. Never invent fake vendor company names or phone numbers. Only supply criteria and questions.
6. If the date is unconfirmed, use relative offsetDays (-180, -90, -30, 0).`;

    const userPrompt = JSON.stringify({
      event: {
        title: context.title,
        type: context.type,
        description: context.description,
        eventDate: context.eventDate || "Unconfirmed / Early Draft",
        location: context.location || "TBD General Setting",
        guestCount: context.guestCount,
        totalBudget: context.totalBudget,
        currency: context.currency,
        themePreferences: context.themePreferences,
        culturalPreferences: context.culturalPreferences,
        dietaryRestrictions: context.dietaryRestrictions,
        accessibilityRequirements: context.accessibilityRequirements,
        specialInstructions: context.specialInstructions,
      },
    });

    const completion = await openai.chat.completions.create({
      model: this.defaultModel,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Event Parameters:\n${userPrompt}` },
      ],
    });

    const text = completion.choices[0]?.message?.content;

    if (!text) {
      throw new Error("Empty response received from OpenAI.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      throw new Error("Malformed JSON received from OpenAI.");
    }

    const planCandidate = {
      ...(parsedJson as Record<string, unknown>),
      metadata: {
        source: "ai-generated" as const,
        provider: this.name,
        model: this.defaultModel,
        version: 1,
        generatedAt: new Date().toISOString(),
      },
    };

    const parseResult = GeneratedEventPlanSchema.safeParse(planCandidate);
    if (!parseResult.success) {
      const errMessages = parseResult.error.flatten().fieldErrors;
      throw new Error(`OpenAI plan schema validation failed: ${JSON.stringify(errMessages)}`);
    }

    const validation = validateAndNormalizePlan(parseResult.data, context);
    return validation.adjustedPlan;
  }
}
