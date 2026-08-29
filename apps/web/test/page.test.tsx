import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as api from "@/lib/api";
import HomePage from "@/app/page";

vi.mock("@/lib/api", () => ({
  fetchRequests: vi.fn(),
  createRequest: vi.fn(),
  updateRequestStatus: vi.fn(),
  classifyMessage: vi.fn(),
  fetchNotes: vi.fn(),
  addNote: vi.fn(),
  REQUEST_STATUSES: ["open", "in_progress", "resolved"],
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 10_000, refetchOnWindowFocus: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const baseRequest = {
  id: "req-1",
  message: "the app is broken",
  status: "open" as const,
  category: null,
  confidence: null,
  noteCount: 0,
  latestNotePreview: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(api.fetchRequests).mockReset();
  });

  it("shows a friendly message while the initial list is loading", () => {
    vi.mocked(api.fetchRequests).mockImplementation(
      () => new Promise(() => {}),
    );
    renderWithClient(<HomePage />);
    expect(screen.getByText(/loading requests/i)).toBeInTheDocument();
  });

  it("renders without crashing when the list loads successfully", async () => {
    vi.mocked(api.fetchRequests).mockResolvedValue([baseRequest]);
    renderWithClient(<HomePage />);
    await screen.findByText("the app is broken");
    expect(true).toBe(true);
  });
});
