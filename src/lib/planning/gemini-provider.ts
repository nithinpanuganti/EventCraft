import { GoogleGenerativeAI } from "@google/generative-ai";
import { PlanningProvider } from "./provider-interface";
import { GeneratedEventPlan, GeneratedEventPlanSchema } from "./schema";
import { SanitizedPlanningContext } from "./context-builder";
import { validateAndNormalizePlan } from "./deterministic-validator";

export class GeminiPlanningProvider implements PlanningProvider {
  public readonly name = "google-gemini";
  public readonly defaultModel: string;
  private apiKey?: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.defaultModel = model || process.env.GEMINI_MODEL || "gemini-1.5-pro";
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  public async generatePlan(context: SanitizedPlanningContext): Promise<GeneratedEventPlan> {
    if (!this.isConfigured() || !this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on this server.");
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.defaultModel,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2, // Low temperature for high adherence to structured schema
      },
    });

    const systemPrompt = `You are the lead event planning assistant for EventCraft AI.
Generate a structured, actionable event plan strictly conforming to the requested JSON schema.
Critical constraints:
1. Return ONLY valid JSON with keys matching the schema: summary, theme, budget, milestones, tasks, dayOfSchedule, vendors, risksAndAlternatives.
2. The event is of type: ${context.type}.
3. The total budget is: ${context.totalBudget} ${context.currency} (${context.guestCount} guests).
4. Category percentages in 'budget.categories' must sum to 100%. Never propose budgets exceeding ${context.totalBudget}.
5. Do not invent fake vendor companies or contact information. Only provide checklist criteria and typical questions to ask.
6. If the date is unconfirmed, use relative offset days from the event (e.g. -180 for 6 months out).
7. Respect cultural and dietary preferences without bias.`;

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

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Event Parameters:\n${userPrompt}` },
    ]);

    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Empty response received from Google Gemini.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      throw new Error("Malformed JSON received from Google Gemini.");
    }

    // Attach metadata
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
      throw new Error(`Gemini plan schema validation failed: ${JSON.stringify(errMessages)}`);
    }

    // Pass through deterministic validator for financial cents accuracy and calendar dates
    const validation = validateAndNormalizePlan(parseResult.data, context);
    return validation.adjustedPlan;
  }
}
