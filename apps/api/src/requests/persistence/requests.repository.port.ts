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

export type ListRequestsOptions = {
  /** Case-insensitive substring match */
  search?: string;
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

export type RequestNoteItem = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export interface RequestsRepositoryPort {
  findAllWithStats(options: ListRequestsOptions): Promise<RequestsPage>;
  findById(id: string): Promise<CustomerRequest | null>;
  create(message: string): Promise<CustomerRequest>;
  updateStatus(
    id: string,
    status: RequestStatus,
  ): Promise<CustomerRequest | null>;
  save(request: CustomerRequest): Promise<CustomerRequest>;
  listNotes(
    requestId: string,
    sortDir: SortDirection,
  ): Promise<RequestNoteItem[]>;
  addNote(
    requestId: string,
    body: string,
    authorName: string,
  ): Promise<RequestNoteItem>;
}

export const REQUESTS_REPOSITORY = Symbol("REQUESTS_REPOSITORY");
