import { Injectable } from "@nestjs/common";
import {
  ClassificationResult,
  ClassifierProvider,
} from "./classifier-provider";

/**
 * Dependency-free classifier based on keyword matching; real LLM provider later impl
 */
@Injectable()
export class KeywordClassifierProvider implements ClassifierProvider {
  async classify(message: string): Promise<ClassificationResult> {
    const text = message.toLowerCase();

    if (/bill|invoice|payment|refund|charge/.test(text)) {
      return { category: "billing", confidence: 0.86 };
    }
    if (/buy|pricing|demo|sales|upgrade|plan/.test(text)) {
      return { category: "sales", confidence: 0.8 };
    }
    if (/help|broken|error|issue|support|bug/.test(text)) {
      return { category: "support", confidence: 0.78 };
    }

    return { category: "unknown", confidence: 0.4 };
  }
}
