import { describe, expect, it, vi } from "vitest";
import { TypeOrmRequestsRepository } from "../src/requests/persistence/typeorm-requests.repository";

const DEFAULT_OPTIONS = {
  sortBy: "createdAt" as const,
  sortDir: "desc" as const,
  limit: 25,
  offset: 0,
};

function buildRows(count: number) {
  const now = new Date("2024-01-01T00:00:00.000Z");
  return Array.from({ length: count }, (_, i) => ({
    id: `req-${i}`,
    message: `message ${i}`,
    status: "open",
    category: null,
    confidence: null,
    note_count: String(i % 3),
    latest_note_body: i % 3 > 0 ? `note ${i}` : null,
    created_at: now,
    updated_at: now,
    total_count: String(count),
  }));
}

describe("TypeOrmRequestsRepository", () => {
  it("fetches a whole page plus note stats and the total count in a single round trip, no matter how many rows come back", async () => {
    const rows = buildRows(50);
    const dataSource = { query: vi.fn().mockResolvedValue(rows) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository({} as any, {} as any, dataSource as any);

    const page = await repo.findAllWithStats(DEFAULT_OPTIONS);

    // This is the actual regression test for the N+1 bug: the old code
    // issued one extra query per request to fetch its notes, so 50 rows
    // meant 51 round trips. The fix means exactly one call, always.
    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(page.items).toHaveLength(50);
    expect(page.total).toBe(50);
    expect(page.limit).toBe(25);
    expect(page.offset).toBe(0);
  });

  it("passes search, status, sort column and paging through as query parameters", async () => {
    const dataSource = { query: vi.fn().mockResolvedValue([]) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository({} as any, {} as any, dataSource as any);

    await repo.findAllWithStats({
      search: "billing",
      status: "open",
      sortBy: "status",
      sortDir: "asc",
      limit: 10,
      offset: 20,
    });

    const [sql, params] = dataSource.query.mock.calls[0];
    expect(sql).toContain("ORDER BY r.status ASC");
    expect(params).toEqual(["%billing%", 10, 20, "open"]);
  });

  it("passes null for status when no status filter is given", async () => {
    const dataSource = { query: vi.fn().mockResolvedValue([]) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository({} as any, {} as any, dataSource as any);

    await repo.findAllWithStats({
      sortBy: "createdAt",
      sortDir: "desc",
      limit: 25,
      offset: 0,
    });

    const [, params] = dataSource.query.mock.calls[0];
    expect(params).toEqual([null, 25, 0, null]);
  });

  it("returns an empty page with total 0 when nothing matches", async () => {
    const dataSource = { query: vi.fn().mockResolvedValue([]) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository({} as any, {} as any, dataSource as any);

    const page = await repo.findAllWithStats(DEFAULT_OPTIONS);

    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("maps the aggregated snake_case columns into the RequestListItem shape", async () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const dataSource = {
      query: vi.fn().mockResolvedValue([
        {
          id: "req-1",
          message: "hello",
          status: "open",
          category: null,
          confidence: null,
          note_count: "3",
          latest_note_body: "most recent note",
          created_at: now,
          updated_at: now,
          total_count: "1",
        },
      ]),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository({} as any, {} as any, dataSource as any);

    const page = await repo.findAllWithStats(DEFAULT_OPTIONS);

    expect(page.items[0]).toEqual({
      id: "req-1",
      message: "hello",
      status: "open",
      category: null,
      confidence: null,
      noteCount: 3,
      latestNotePreview: "most recent note",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it("finds a single request with its notes relation loaded", async () => {
    const existing = { id: "req-1", status: "open" };
    const requests = { findOne: vi.fn().mockResolvedValue(existing) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository(requests as any, {} as any, {} as any);

    const found = await repo.findById("req-1");

    expect(requests.findOne).toHaveBeenCalledWith({
      where: { id: "req-1" },
      relations: { notes: true },
    });
    expect(found).toBe(existing);
  });

  it("creates a new request row with sensible open-state defaults", async () => {
    const requests = {
      create: vi.fn((data) => ({ ...data })),
      save: vi.fn(async (row) => row),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository(requests as any, {} as any, {} as any);

    const created = await repo.create("a new message");

    expect(requests.create).toHaveBeenCalledWith({
      message: "a new message",
      status: "open",
      category: null,
      confidence: null,
    });
    expect(created.message).toBe("a new message");
  });

  it("updateStatus() returns null instead of throwing when the row does not exist", async () => {
    const requests = { findOne: vi.fn().mockResolvedValue(null) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository(requests as any, {} as any, {} as any);

    const result = await repo.updateStatus("missing", "resolved");

    expect(result).toBeNull();
  });

  it("updateStatus() mutates and saves the row when it exists", async () => {
    const existing = { id: "req-1", status: "open" };
    const requests = {
      findOne: vi.fn().mockResolvedValue(existing),
      save: vi.fn(async (row) => row),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository(requests as any, {} as any, {} as any);

    const result = await repo.updateStatus("req-1", "resolved");

    expect(result?.status).toBe("resolved");
    expect(requests.save).toHaveBeenCalledWith(existing);
  });

  it("lists notes for a request ordered by the given sort direction", async () => {
    const notes = {
      find: vi.fn().mockResolvedValue([
        {
          id: "note-1",
          body: "hi",
          authorName: "Alex",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      ]),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository({} as any, notes as any, {} as any);

    const result = await repo.listNotes("req-1", "desc");

    expect(notes.find).toHaveBeenCalledWith({
      where: { requestId: "req-1" },
      order: { createdAt: "DESC" },
    });
    expect(result[0]).toEqual({
      id: "note-1",
      body: "hi",
      authorName: "Alex",
      createdAt: "2024-01-01T00:00:00.000Z",
    });
  });

  it("adds a note to a request", async () => {
    const createdAt = new Date("2024-01-01T00:00:00.000Z");
    const notes = {
      create: vi.fn((data) => ({ ...data })),
      save: vi.fn(async (row) => ({ ...row, id: "note-1", createdAt })),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new TypeOrmRequestsRepository({} as any, notes as any, {} as any);

    const result = await repo.addNote("req-1", "called back", "Priya");

    expect(notes.create).toHaveBeenCalledWith({
      requestId: "req-1",
      body: "called back",
      authorName: "Priya",
    });
    expect(result).toEqual({
      id: "note-1",
      body: "called back",
      authorName: "Priya",
      createdAt: createdAt.toISOString(),
    });
  });
});
