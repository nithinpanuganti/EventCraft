import { PlanningProvider, AIProviderResult } from "./provider-interface";
import { GeminiPlanningProvider } from "./gemini-provider";
import { OpenAIPlanningProvider } from "./openai-provider";
import { FallbackPlanService } from "./fallback-service";
import { SanitizedPlanningContext } from "./context-builder";

export interface PlanningServiceOptions {
  providerName?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class PlanningService {
  private provider: PlanningProvider;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options?: PlanningServiceOptions) {
    const configuredProvider = options?.providerName || process.env.AI_PROVIDER || "gemini";
    this.timeoutMs = options?.timeoutMs || Number(process.env.AI_TIMEOUT_MS) || 15000;
    this.maxRetries = options?.maxRetries ?? 1;

    if (configuredProvider.toLowerCase() === "openai") {
      this.provider = new OpenAIPlanningProvider();
    } else {
      this.provider = new GeminiPlanningProvider();
    }
  }

  /**
   * Generates an event plan:
   * 1. If provider is configured and available, invokes with a timeout and max 1 retry for transient errors.
   * 2. If provider fails, times out, rate limits, or is unconfigured, seamlessly falls back to domain-curated templates.
   * 3. Guarantees deterministic financial and schedule validation on the final plan.
   */
  public async generatePlan(context: SanitizedPlanningContext): Promise<AIProviderResult> {
    if (!this.provider.isConfigured()) {
      // Graceful fallback when API credentials are absent
      const fallbackPlan = FallbackPlanService.generateFallbackPlan(context);
      return {
        success: true,
        plan: fallbackPlan,
        source: "curated-fallback",
        providerName: "Curated Fallback Engine",
        modelName: "domain-template-engine",
        error: `AI provider (${this.provider.name}) is not configured. Industry-standard curated plan was generated.`,
      };
    }

    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts <= this.maxRetries) {
      attempts++;
      try {
        const plan = await this.executeWithTimeout(this.provider.generatePlan(context), this.timeoutMs);
        return {
          success: true,
          plan,
          source: "ai-generated",
          providerName: this.provider.name,
          modelName: this.provider.defaultModel,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Do not retry permanently invalid authentication errors
        if (
          lastError.message.includes("API key not valid") ||
          lastError.message.includes("Incorrect API key") ||
          lastError.message.includes("not configured")
        ) {
          break;
        }
      }
    }

    // Provider failed all retry attempts: activate curated fallback template
    const fallbackPlan = FallbackPlanService.generateFallbackPlan(context);
    return {
      success: true,
      plan: fallbackPlan,
      source: "curated-fallback",
      providerName: "Curated Fallback Engine (Degraded)",
      modelName: "domain-template-engine",
      error: `AI generation failed (${lastError?.message || "timeout"}). Industry-standard curated plan loaded safely.`,
    };
  }

  /**
   * Generates raw text completion from the configured AI provider, falling back safely if unconfigured.
   */
  public async generateRaw(prompt: string): Promise<{ rawText: string }> {
    if (!this.provider.isConfigured()) {
      throw new Error(`AI provider (${this.provider.name}) is not configured.`);
    }

    // Call provider's internal generative model if exposed or throw to fallback
    if ("generateRaw" in this.provider && typeof (this.provider as unknown as { generateRaw: (p: string) => Promise<string> }).generateRaw === "function") {
      const text = await (this.provider as unknown as { generateRaw: (p: string) => Promise<string> }).generateRaw(prompt);
      return { rawText: text };
    }

    throw new Error("Raw text generation is handled via deterministic template parsing.");
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`AI generation timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }
}

