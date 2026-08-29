import { describe, expect, it, vi } from "vitest";
import { TypeOrmClassificationHistoryRepository } from "../src/requests/classification/typeorm-classification-history.repository";

describe("TypeOrmClassificationHistoryRepository", () => {
  it("records an entry and returns it with an ISO created-at timestamp", async () => {
    const now = new Date("2024-05-01T12:00:00.000Z");
    const saved = {
      id: "hist-1",
      requestId: null,
      message: "hi",
      category: "billing",
      confidence: 0.9,
      provider: "keyword",
      createdAt: now,
    };
    const history = {
      create: vi.fn((entry) => ({ ...entry })),
      save: vi.fn(async () => saved),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmClassificationHistoryRepository(history as any);

    const record = await repo.record({
      requestId: null,
      message: "hi",
      category: "billing",
      confidence: 0.9,
      provider: "keyword",
    });

    expect(record.createdAt).toBe(now.toISOString());
    expect(history.create).toHaveBeenCalledWith({
      requestId: null,
      message: "hi",
      category: "billing",
      confidence: 0.9,
      provider: "keyword",
    });
  });

  it("queries every row when no category filter is given", async () => {
    const history = { findAndCount: vi.fn().mockResolvedValue([[], 0]) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmClassificationHistoryRepository(history as any);

    await repo.findMany({ limit: 25, offset: 0 });

    expect(history.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("adds a category filter and passes limit/offset through as take/skip", async () => {
    const history = { findAndCount: vi.fn().mockResolvedValue([[], 0]) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmClassificationHistoryRepository(history as any);

    await repo.findMany({ category: "sales", limit: 10, offset: 20 });

    expect(history.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: "sales" },
        take: 10,
        skip: 20,
      }),
    );
  });

  it("maps rows back into the history record shape with total/limit/offset intact", async () => {
    const now = new Date("2024-05-01T12:00:00.000Z");
    const rows = [
      {
        id: "1",
        requestId: "req-1",
        message: "m",
        category: "sales",
        confidence: 0.8,
        provider: "keyword",
        createdAt: now,
      },
    ];
    const history = { findAndCount: vi.fn().mockResolvedValue([rows, 1]) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmClassificationHistoryRepository(history as any);

    const page = await repo.findMany({ limit: 25, offset: 0 });

    expect(page).toEqual({
      items: [
        {
          id: "1",
          requestId: "req-1",
          message: "m",
          category: "sales",
          confidence: 0.8,
          provider: "keyword",
          createdAt: now.toISOString(),
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    });
  });
});
