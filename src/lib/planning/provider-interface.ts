import { GeneratedEventPlan } from "./schema";
import { SanitizedPlanningContext } from "./context-builder";

export interface AIProviderResult {
  success: boolean;
  plan?: GeneratedEventPlan;
  error?: string;
  source: "ai-generated" | "curated-fallback";
  providerName: string;
  modelName: string;
}

export interface PlanningProvider {
  readonly name: string;
  readonly defaultModel: string;
  isConfigured(): boolean;
  generatePlan(context: SanitizedPlanningContext): Promise<GeneratedEventPlan>;
}
