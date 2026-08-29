import { Inject, Injectable } from "@nestjs/common";
import { RequestsService } from "../requests.service";
import {
  CLASSIFIER_PROVIDER,
  CLASSIFIER_PROVIDER_NAME,
  ClassificationResult,
  ClassifierProvider,
} from "./classifier-provider";
import {
  CLASSIFICATION_HISTORY_REPOSITORY,
  ClassificationHistoryRepositoryPort,
  HistoryPage,
} from "./classification-history.repository.port";
import { ClassifyRequestDto } from "../dto/classify-request.dto";
import { HistoryQueryDto } from "../dto/history-query.dto";

export type ClassifyResponse = {
  category: ClassificationResult["category"];
  confidence: number;
  requestId: string | null;
};

const SHORT_MESSAGE_WORD_COUNT = 3;
const SHORT_MESSAGE_PENALTY = 0.15;
const MIN_CONFIDENT_SCORE = 0.55;
const MIN_SOFTENED_SCORE = 0.5;

/**
 * Classification: calls provider, applies controller business rules, and records the run to history.
 */
@Injectable()
export class ClassificationService {
  constructor(
    @Inject(CLASSIFIER_PROVIDER)
    private readonly classifier: ClassifierProvider,
    @Inject(CLASSIFIER_PROVIDER_NAME)
    private readonly providerName: string,
    @Inject(CLASSIFICATION_HISTORY_REPOSITORY)
    private readonly historyRepository: ClassificationHistoryRepositoryPort,
    private readonly requestsService: RequestsService,
  ) {}

  async classify(dto: ClassifyRequestDto): Promise<ClassifyResponse> {
    const result = this.applyConfidenceRules(
      dto.message,
      await this.classifier.classify(dto.message),
    );

    if (dto.requestId) {
      await this.applyToRequest(dto.requestId, result);
    }

    await this.historyRepository.record({
      requestId: dto.requestId ?? null,
      message: dto.message,
      category: result.category,
      confidence: result.confidence,
      provider: this.providerName,
    });

    return {
      category: result.category,
      confidence: result.confidence,
      requestId: dto.requestId ?? null,
    };
  }

  listHistory(query: HistoryQueryDto): Promise<HistoryPage> {
    return this.historyRepository.findMany({
      category: query.category,
      limit: query.limit,
      offset: query.offset,
    });
  }

  private async applyToRequest(
    requestId: string,
    result: ClassificationResult,
  ): Promise<void> {
    // getById throws NotFoundException if the request doesn't exist - that's
    const request = await this.requestsService.getById(requestId);
    request.category = result.category;
    request.confidence = result.confidence;
    if (request.status === "open") {
      request.status = "in_progress";
    }
    await this.requestsService.save(request);
  }

  /**
   * short messages get a confidence penalty, and low-confidence guesses get downgraded to "unknown" rather than shown as a category.
   */
  private applyConfidenceRules(
    message: string,
    result: ClassificationResult,
  ): ClassificationResult {
    let adjusted = result;

    const wordCount = message.trim().split(/\s+/).filter(Boolean).length;
    if (
      wordCount < SHORT_MESSAGE_WORD_COUNT &&
      adjusted.category !== "unknown"
    ) {
      adjusted = {
        category: adjusted.category,
        confidence: Math.max(
          MIN_SOFTENED_SCORE,
          adjusted.confidence - SHORT_MESSAGE_PENALTY,
        ),
      };
    }

    if (adjusted.confidence < MIN_CONFIDENT_SCORE) {
      adjusted = { category: "unknown", confidence: adjusted.confidence };
    }

    return adjusted;
  }
}
