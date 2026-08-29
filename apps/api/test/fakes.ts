import { vi } from "vitest";
import {
  CustomerRequest,
  RequestStatus,
} from "../src/requests/customer-request.entity";
import {
  ListRequestsOptions,
  RequestListItem,
  RequestNoteItem,
  RequestsPage,
  RequestsRepositoryPort,
  SortDirection,
} from "../src/requests/persistence/requests.repository.port";
import {
  ClassificationHistoryRecord,
  ClassificationHistoryRepositoryPort,
  CreateHistoryEntryInput,
  HistoryFilter,
  HistoryPage,
} from "../src/requests/classification/classification-history.repository.port";

/**
 * Test doubles for the two repository ports, shared across the service and
 * controller tests. Kept in-memory and wrapped in vi.fn() so a test can both
 * assert on the resulting data and on how many times a method was called
 * (the N+1 regression tests below rely on the latter).
 */

let idCounter = 0;

export function makeCustomerRequest(
  overrides: Partial<CustomerRequest> = {},
): CustomerRequest {
  idCounter += 1;
  const now = new Date();
  return {
    id: overrides.id ?? `req-${idCounter}`,
    message: overrides.message ?? "default seeded message",
    status: overrides.status ?? "open",
    category: overrides.category ?? null,
    confidence: overrides.confidence ?? null,
    notes: overrides.notes ?? [],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  } as CustomerRequest;
}

function toListItem(row: CustomerRequest): RequestListItem {
  const notes = row.notes ?? [];
  const latest = [...notes].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  return {
    id: row.id,
    message: row.message,
    status: row.status,
    category: row.category,
    confidence: row.confidence,
    noteCount: notes.length,
    latestNotePreview: latest?.body ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const SORT_COMPARATORS: Record<
  ListRequestsOptions["sortBy"],
  (a: RequestListItem, b: RequestListItem) => number
> = {
  createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
  status: (a, b) => a.status.localeCompare(b.status),
  noteCount: (a, b) => a.noteCount - b.noteCount,
};

export function createFakeRequestsRepository(seed: CustomerRequest[] = []) {
  const rows = new Map(seed.map((row) => [row.id, row]));

  const repo: RequestsRepositoryPort = {
    findAllWithStats: vi.fn(
      async (options: ListRequestsOptions): Promise<RequestsPage> => {
        let items = Array.from(rows.values()).map(toListItem);

        if (options.search) {
          const needle = options.search.toLowerCase();
          items = items.filter((item) =>
            item.message.toLowerCase().includes(needle),
          );
        }

        if (options.status) {
          items = items.filter((item) => item.status === options.status);
        }

        items.sort(SORT_COMPARATORS[options.sortBy]);
        if (options.sortDir === "desc") {
          items.reverse();
        }

        const total = items.length;
        const page = items.slice(
          options.offset,
          options.offset + options.limit,
        );

        return { items: page, total, limit: options.limit, offset: options.offset };
      },
    ),
    findById: vi.fn(async (id: string) => rows.get(id) ?? null),
    create: vi.fn(async (message: string) => {
      const row = makeCustomerRequest({ message });
      rows.set(row.id, row);
      return row;
    }),
    updateStatus: vi.fn(async (id: string, status: RequestStatus) => {
      const existing = rows.get(id);
      if (!existing) {
        return null;
      }
      existing.status = status;
      return existing;
    }),
    save: vi.fn(async (request: CustomerRequest) => {
      rows.set(request.id, request);
      return request;
    }),
    listNotes: vi.fn(
      async (
        requestId: string,
        sortDir: SortDirection,
      ): Promise<RequestNoteItem[]> => {
        const row = rows.get(requestId);
        const notes = (row?.notes ?? []).map((note) => ({
          id: note.id,
          body: note.body,
          authorName: note.authorName,
          createdAt: note.createdAt.toISOString(),
        }));
        notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        if (sortDir === "desc") {
          notes.reverse();
        }
        return notes;
      },
    ),
    addNote: vi.fn(
      async (
        requestId: string,
        body: string,
        authorName: string,
      ): Promise<RequestNoteItem> => {
        const row = rows.get(requestId);
        const note = {
          id: `note-${idCounter++}`,
          body,
          authorName,
          requestId,
          createdAt: new Date(),
        } as CustomerRequest["notes"][number];
        if (row) {
          row.notes = [...(row.notes ?? []), note];
        }
        return {
          id: note.id,
          body: note.body,
          authorName: note.authorName,
          createdAt: note.createdAt.toISOString(),
        };
      },
    ),
  };

  return { repo, rows };
}

export function createFakeHistoryRepository() {
  const entries: ClassificationHistoryRecord[] = [];
  let seq = 0;

  const repo: ClassificationHistoryRepositoryPort = {
    record: vi.fn(async (entry: CreateHistoryEntryInput) => {
      seq += 1;
      const record: ClassificationHistoryRecord = {
        id: `hist-${seq}`,
        requestId: entry.requestId,
        message: entry.message,
        category: entry.category,
        confidence: entry.confidence,
        provider: entry.provider,
        createdAt: new Date().toISOString(),
      };
      entries.push(record);
      return record;
    }),
    findMany: vi.fn(async (filter: HistoryFilter): Promise<HistoryPage> => {
      const filtered = filter.category
        ? entries.filter((entry) => entry.category === filter.category)
        : entries;
      const page = filtered.slice(filter.offset, filter.offset + filter.limit);
      return {
        items: page,
        total: filtered.length,
        limit: filter.limit,
        offset: filter.offset,
      };
    }),
  };

  return { repo, entries };
}

