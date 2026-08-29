import { ClassificationCategory } from "./classifier-provider";

export type ClassificationHistoryRecord = {
  id: string;
  requestId: string | null;
  message: string;
  category: ClassificationCategory;
  confidence: number;
  provider: string;
  createdAt: string;
};

export type CreateHistoryEntryInput = {
  requestId: string | null;
  message: string;
  category: ClassificationCategory;
  confidence: number;
  provider: string;
};

export type HistoryFilter = {
  category?: ClassificationCategory;
  limit: number;
  offset: number;
};

export type HistoryPage = {
  items: ClassificationHistoryRecord[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Separate from RequestsRepositoryPort because history is append-only; (filtered/paginated reads, no updates).
 */
export interface ClassificationHistoryRepositoryPort {
  record(entry: CreateHistoryEntryInput): Promise<ClassificationHistoryRecord>;
  findMany(filter: HistoryFilter): Promise<HistoryPage>;
}

export const CLASSIFICATION_HISTORY_REPOSITORY = Symbol(
  "CLASSIFICATION_HISTORY_REPOSITORY",
);
