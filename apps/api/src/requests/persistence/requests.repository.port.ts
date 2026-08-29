import { CustomerRequest, RequestStatus } from "../customer-request.entity";

export type RequestListItem = {
  id: string;
  message: string;
  status: RequestStatus;
  category: string | null;
  confidence: number | null;
  noteCount: number;
  latestNotePreview: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Fields GET /requests can be sorted by. */
export type RequestsSortField = "createdAt" | "status" | "noteCount";
export const REQUESTS_SORT_FIELDS: RequestsSortField[] = [
  "createdAt",
  "status",
  "noteCount",
];

export type SortDirection = "asc" | "desc";
export const SORT_DIRECTIONS: SortDirection[] = ["asc", "desc"];

/** Options accepted by findAllWithStats - keyword search, status filter, sort, and paging. */
export type ListRequestsOptions = {
  /** Case-insensitive substring match */
  search?: string;
  /** Filter to a single status */
  status?: RequestStatus;
  sortBy: RequestsSortField;
  sortDir: SortDirection;
  limit: number;
  offset: number;
};

export type RequestsPage = {
  items: RequestListItem[];
  total: number;
  limit: number;
  offset: number;
};

export interface RequestsRepositoryPort {
  /** Paged, searchable, sortable list with note stats, one query round trip. */
  findAllWithStats(options: ListRequestsOptions): Promise<RequestsPage>;
  findById(id: string): Promise<CustomerRequest | null>;
  create(message: string): Promise<CustomerRequest>;
  /** Returns null if no request exists with this id - the service decides what that means. */
  updateStatus(
    id: string,
    status: RequestStatus,
  ): Promise<CustomerRequest | null>;
  save(request: CustomerRequest): Promise<CustomerRequest>;
}

export const REQUESTS_REPOSITORY = Symbol("REQUESTS_REPOSITORY");
