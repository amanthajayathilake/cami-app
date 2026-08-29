import { describe, expect, it, vi } from "vitest";
import { ClassificationService } from "../src/requests/classification/classification.service";
import { RequestsService } from "../src/requests/requests.service";
import { ClassifyRequestDto } from "../src/requests/dto/classify-request.dto";
import { HistoryQueryDto } from "../src/requests/dto/history-query.dto";
import {
  ClassificationResult,
  ClassifierProvider,
} from "../src/requests/classification/classifier-provider";
import {
  createFakeHistoryRepository,
  createFakeRequestsRepository,
  makeCustomerRequest,
} from "./fakes";

function fakeClassifier(result: ClassificationResult): ClassifierProvider {
  return { classify: vi.fn(async () => result) };
}

function buildService(
  classifierResult: ClassificationResult,
  seedRequests: ReturnType<typeof makeCustomerRequest>[] = [],
) {
  const { repo: requestsRepo, rows } =
    createFakeRequestsRepository(seedRequests);
  const { repo: historyRepo, entries } = createFakeHistoryRepository();
  const classifier = fakeClassifier(classifierResult);
  const service = new ClassificationService(
    classifier,
    "keyword",
    historyRepo,
    new RequestsService(requestsRepo),
  );
  return { service, requestsRepo, historyRepo, rows, entries };
}

describe("ClassificationService", () => {
  it("records an ad-hoc classification in history without touching any request", async () => {
    const { service, requestsRepo, entries } = buildService({
      category: "billing",
      confidence: 0.9,
    });

    const result = await service.classify(
      ClassifyRequestDto.fromBody({ message: "please refund my last invoice" }),
    );

    expect(result.category).toBe("billing");
    expect(result.requestId).toBeNull();
    expect(entries).toHaveLength(1);
    expect(entries[0].requestId).toBeNull();
    expect(requestsRepo.save).not.toHaveBeenCalled();
  });

  it("links a classification to a request and bumps status from open to in_progress", async () => {
    const existing = makeCustomerRequest({ status: "open" });
    const { service, rows } = buildService(
      { category: "support", confidence: 0.9 },
      [existing],
    );

    await service.classify(
      ClassifyRequestDto.fromBody({
        message: "the app is broken again",
        requestId: existing.id,
      }),
    );

    const updated = rows.get(existing.id)!;
    expect(updated.status).toBe("in_progress");
    expect(updated.category).toBe("support");
    expect(updated.confidence).toBeCloseTo(0.9);
  });

  it("leaves status alone when a request has already moved past open", async () => {
    const existing = makeCustomerRequest({ status: "resolved" });
    const { service, rows } = buildService(
      { category: "billing", confidence: 0.9 },
      [existing],
    );

    await service.classify(
      ClassifyRequestDto.fromBody({
        message: "billing question",
        requestId: existing.id,
      }),
    );

    expect(rows.get(existing.id)!.status).toBe("resolved");
  });

  it("throws when classifying against a requestId that does not exist", async () => {
    const { service } = buildService({ category: "billing", confidence: 0.9 });

    await expect(
      service.classify(
        ClassifyRequestDto.fromBody({
          message: "hello",
          requestId: "does-not-exist",
        }),
      ),
    ).rejects.toThrow();
  });

  describe("confidence calibration", () => {
    it("softens confidence for very short messages", async () => {
      const { service } = buildService({
        category: "billing",
        confidence: 0.86,
      });

      const result = await service.classify(
        ClassifyRequestDto.fromBody({ message: "refund now" }),
      );

      expect(result.category).toBe("billing");
      expect(result.confidence).toBeCloseTo(0.71);
    });

    it("floors the softened confidence at 0.5, which then falls below the confident bar", async () => {
      const { service } = buildService({
        category: "billing",
        confidence: 0.58,
      });

      const result = await service.classify(
        ClassifyRequestDto.fromBody({ message: "pay now" }),
      );

      // 0.58 - 0.15 = 0.43, floored to 0.5, still under the 0.55 confident
      // bar, so this gets downgraded to unknown.
      expect(result.category).toBe("unknown");
      expect(result.confidence).toBe(0.5);
    });

    it("downgrades low-confidence guesses to unknown without touching longer messages' wording", async () => {
      const { service } = buildService({ category: "sales", confidence: 0.4 });

      const result = await service.classify(
        ClassifyRequestDto.fromBody({
          message: "just checking something out today",
        }),
      );

      expect(result.category).toBe("unknown");
      expect(result.confidence).toBe(0.4);
    });

    it("leaves confidence untouched for a normal-length, confident message", async () => {
      const { service } = buildService({
        category: "support",
        confidence: 0.78,
      });

      const result = await service.classify(
        ClassifyRequestDto.fromBody({
          message: "the app keeps crashing when I try to log in",
        }),
      );

      expect(result.category).toBe("support");
      expect(result.confidence).toBe(0.78);
    });
  });

  describe("listHistory", () => {
    it("passes the parsed filter straight through and returns only matching rows", async () => {
      const { service, historyRepo, entries } = buildService({
        category: "billing",
        confidence: 0.9,
      });
      entries.push(
        {
          id: "seed-1",
          requestId: null,
          message: "a",
          category: "billing",
          confidence: 0.9,
          provider: "keyword",
          createdAt: new Date().toISOString(),
        },
        {
          id: "seed-2",
          requestId: null,
          message: "b",
          category: "sales",
          confidence: 0.9,
          provider: "keyword",
          createdAt: new Date().toISOString(),
        },
      );

      const page = await service.listHistory(
        HistoryQueryDto.fromQuery({ category: "billing" }),
      );

      expect(page.items).toHaveLength(1);
      expect(page.items[0].category).toBe("billing");
      expect(historyRepo.findMany).toHaveBeenCalledWith({
        category: "billing",
        limit: 25,
        offset: 0,
      });
    });
  });
});
