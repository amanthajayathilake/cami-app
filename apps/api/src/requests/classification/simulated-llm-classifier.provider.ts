import { Injectable } from "@nestjs/common";
import {
  CLASSIFICATION_CATEGORIES,
  ClassificationResult,
  ClassifierProvider,
} from "./classifier-provider";
import { KeywordClassifierProvider } from "./keyword-classifier.provider";

/**
 * Sample stand-in for a real LLM-backed classifier - no API key, no network
 * call, just wraps the keyword result to imitate a model response so we can
 * exercise the parsing/fallback plumbing a real provider would need.
 *
 * Swap `CLASSIFIER_PROVIDER=llm` in the environment to use this instead of
 * the keyword provider (see requests.module.ts).
 */
@Injectable()
export class SimulatedLlmClassifierProvider implements ClassifierProvider {
  constructor(private readonly fallback: KeywordClassifierProvider) {}

  async classify(message: string): Promise<ClassificationResult> {
    try {
      const raw = await this.callModel(message);
      return this.parseModelResponse(raw);
    } catch {
      // Real providers fail in ways we must plan for (timeouts, bad schema),
      // so fall back to the deterministic keyword provider instead of failing.
      return this.fallback.classify(message);
    }
  }

  /** Pretends to be an HTTP round trip to a model provider. */
  private async callModel(message: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 25));
    const guess = await this.fallback.classify(message);
    return JSON.stringify(guess);
  }

  /** Validates the "model" response the same way we'd validate a real one. */
  private parseModelResponse(raw: string): ClassificationResult {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("category" in parsed) ||
      !("confidence" in parsed)
    ) {
      throw new Error("Malformed model response");
    }

    const { category, confidence } = parsed as Record<string, unknown>;
    if (
      typeof category !== "string" ||
      !CLASSIFICATION_CATEGORIES.includes(category as never) ||
      typeof confidence !== "number"
    ) {
      throw new Error(`Unexpected model response: ${raw}`);
    }

    return {
      category: category as ClassificationResult["category"],
      confidence,
    };
  }
}
