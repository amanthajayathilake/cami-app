const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Alert
 */
function notifyError(message: string): void {
  if (typeof window !== "undefined") {
    window.alert(message);
  }
}

async function parseError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    message = body?.message ?? fallback;
  } catch {
    message = fallback;
  }
  notifyError(message);
  throw new Error(message);
}

export type RequestStatus = "open" | "in_progress" | "resolved";

/** Shared allow-list for the status filter dropdown and status update select. */
export const REQUEST_STATUSES: RequestStatus[] = [
  "open",
  "in_progress",
  "resolved",
];

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

export type RequestsSortField = "createdAt" | "status" | "noteCount";
export type SortDirection = "asc" | "desc";

export type RequestsPage = {
  items: RequestListItem[];
  total: number;
  limit: number;
  offset: number;
};

export async function fetchRequests(
  params: {
    search?: string;
    status?: RequestStatus;
    sortBy?: RequestsSortField;
    sortDir?: SortDirection;
    limit?: number;
    offset?: number;
  } = {},
): Promise<RequestsPage> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortDir) qs.set("sortDir", params.sortDir);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();

  const res = await fetch(`${API_URL}/requests${query ? `?${query}` : ""}`);

  if (!res.ok) {
    return parseError(res, `Failed to load requests (${res.status})`);
  }

  return res.json();
}

export type CreatedRequest = {
  id: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
};

export async function createRequest(message: string): Promise<CreatedRequest> {
  const res = await fetch(`${API_URL}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    return parseError(res, `Failed to create request (${res.status})`);
  }

  return res.json();
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
): Promise<RequestListItem> {
  const res = await fetch(`${API_URL}/requests/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    return parseError(res, `Failed to update status (${res.status})`);
  }

  return res.json();
}

export type ClassifyResult = {
  category: string;
  confidence: number;
  requestId: string | null;
};

export async function classifyMessage(
  message: string,
  requestId?: string,
): Promise<ClassifyResult> {
  const res = await fetch(`${API_URL}/requests/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, requestId }),
  });

  if (!res.ok) {
    return parseError(res, `Failed to classify (${res.status})`);
  }

  return res.json();
}

export type RequestNote = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export async function fetchNotes(
  requestId: string,
  sortDir: SortDirection = "asc",
): Promise<RequestNote[]> {
  const res = await fetch(
    `${API_URL}/requests/${requestId}/notes?sortDir=${sortDir}`,
  );

  if (!res.ok) {
    return parseError(res, `Failed to load notes (${res.status})`);
  }

  return res.json();
}

export async function addNote(
  requestId: string,
  body: string,
  authorName: string,
): Promise<RequestNote> {
  const res = await fetch(`${API_URL}/requests/${requestId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, authorName }),
  });
  if (!res.ok) {
    // console.log(
    //   new Error((await res.text()) || `Failed to add note (${res.status})`),
    // );
    return parseError(res, `Failed to add note (${res.status})`);
  }
  return res.json();
}

export type ClassificationCategory =
  | "support"
  | "sales"
  | "billing"
  | "unknown";

export type HistoryEntry = {
  id: string;
  requestId: string | null;
  message: string;
  category: ClassificationCategory;
  confidence: number;
  provider: string;
  createdAt: string;
};

export type HistoryPage = {
  items: HistoryEntry[];
  total: number;
  limit: number;
  offset: number;
};

export async function fetchHistory(params: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<HistoryPage> {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();

  const res = await fetch(
    `${API_URL}/requests/history${query ? `?${query}` : ""}`,
  );

  if (!res.ok) {
    return parseError(res, `Failed to load history (${res.status})`);
  }

  return res.json();
}
