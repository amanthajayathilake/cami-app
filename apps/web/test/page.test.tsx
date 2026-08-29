import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomePage from "@/app/page";
import * as api from "@/lib/api";

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

function page(items = [baseRequest], total = items.length) {
  return { items, total, limit: 25, offset: 0 };
}

/**
 * Regression tests for the "UI freshness" bug: changing status or
 * classifying used to succeed on the server but leave the table showing
 * stale data until a manual refresh, because the mutations never told
 * TanStack Query the "requests" cache was out of date.
 */
describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(api.fetchRequests).mockReset();
    vi.mocked(api.updateRequestStatus).mockReset();
    vi.mocked(api.classifyMessage).mockReset();
    vi.mocked(api.fetchNotes).mockReset();
    vi.mocked(api.addNote).mockReset();
  });

  it("refetches the list after a status change instead of leaving the table stale", async () => {
    vi.mocked(api.fetchRequests).mockResolvedValue(page());
    vi.mocked(api.updateRequestStatus).mockResolvedValue({
      ...baseRequest,
      status: "resolved",
    });

    renderWithClient(<HomePage />);

    await screen.findByText("the app is broken");
    expect(api.fetchRequests).toHaveBeenCalledTimes(1);

    const select = screen.getByRole("combobox", { name: "" });
    await userEvent.selectOptions(select, "resolved");

    // Without invalidating the "requests" query on success, this second
    // call would never happen and the row would keep showing "open".
    await waitFor(() => expect(api.fetchRequests).toHaveBeenCalledTimes(2));
  });

  it("refetches the list after classifying a request", async () => {
    vi.mocked(api.fetchRequests).mockResolvedValue(page());
    vi.mocked(api.classifyMessage).mockResolvedValue({
      category: "support",
      confidence: 0.9,
      requestId: baseRequest.id,
    });

    renderWithClient(<HomePage />);

    await screen.findByText("the app is broken");
    const button = screen.getByRole("button", { name: /classify/i });
    await userEvent.click(button);

    await waitFor(() => expect(api.fetchRequests).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText(/last action reported success/i),
    ).toBeInTheDocument();
  });

  it("shows the API's real error message when a status update fails", async () => {
    vi.mocked(api.fetchRequests).mockResolvedValue(page());
    vi.mocked(api.updateRequestStatus).mockRejectedValue(
      new Error("status must be one of: open, in_progress, resolved"),
    );

    renderWithClient(<HomePage />);

    await screen.findByText("the app is broken");
    const select = screen.getByRole("combobox", { name: "" });
    await userEvent.selectOptions(select, "resolved");

    expect(
      await screen.findByText(/status must be one of/i),
    ).toBeInTheDocument();
  });

  it("shows a friendly message while the initial list is loading", () => {
    vi.mocked(api.fetchRequests).mockImplementation(
      () => new Promise(() => {}),
    );

    renderWithClient(<HomePage />);

    expect(screen.getByText(/loading requests/i)).toBeInTheDocument();
  });

  it("re-queries with a trimmed search term and resets to the first page", async () => {
    vi.mocked(api.fetchRequests).mockResolvedValue(page());

    renderWithClient(<HomePage />);
    await screen.findByText("the app is broken");

    const input = screen.getByPlaceholderText(/search by message keyword/i);
    await userEvent.type(input, "  billing  ");
    await userEvent.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() =>
      expect(api.fetchRequests).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "billing", offset: 0 }),
      ),
    );
  });

  it("re-queries when the sort field or direction changes", async () => {
    vi.mocked(api.fetchRequests).mockResolvedValue(page());

    renderWithClient(<HomePage />);
    await screen.findByText("the app is broken");

    const sortSelect = screen.getByLabelText(/sort by/i);
    await userEvent.selectOptions(sortSelect, "status");

    await waitFor(() =>
      expect(api.fetchRequests).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: "status" }),
      ),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /toggle sort direction/i }),
    );

    await waitFor(() =>
      expect(api.fetchRequests).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: "status", sortDir: "asc" }),
      ),
    );
  });

  it("moves to the next page and requests the next offset", async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      ...baseRequest,
      id: `req-${i}`,
      message: `message ${i}`,
    }));
    vi.mocked(api.fetchRequests).mockResolvedValue(page(items, 40));

    renderWithClient(<HomePage />);
    await screen.findByText("message 0");

    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() =>
      expect(api.fetchRequests).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 25 }),
      ),
    );
  });

  it("re-queries with a status filter and resets to the first page", async () => {
    vi.mocked(api.fetchRequests).mockResolvedValue(page());

    renderWithClient(<HomePage />);
    await screen.findByText("the app is broken");

    const statusSelect = screen.getByLabelText(/^status$/i);
    await userEvent.selectOptions(statusSelect, "resolved");

    await waitFor(() =>
      expect(api.fetchRequests).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "resolved", offset: 0 }),
      ),
    );
  });

  it("opens the notes panel, lists notes, and submits a new note", async () => {
    vi.mocked(api.fetchRequests).mockResolvedValue(page());
    vi.mocked(api.fetchNotes).mockResolvedValue([
      {
        id: "note-1",
        body: "called the customer",
        authorName: "Alex",
        createdAt: new Date().toISOString(),
      },
    ]);
    vi.mocked(api.addNote).mockResolvedValue({
      id: "note-2",
      body: "followed up",
      authorName: "Sam",
      createdAt: new Date().toISOString(),
    });

    renderWithClient(<HomePage />);
    await screen.findByText("the app is broken");

    await userEvent.click(screen.getByRole("button", { name: /0 view/i }));

    expect(await screen.findByText("called the customer")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/your name/i), "Sam");
    await userEvent.type(
      screen.getByPlaceholderText(/add a note/i),
      "followed up",
    );
    await userEvent.click(screen.getByRole("button", { name: /^add note$/i }));

    await waitFor(() =>
      expect(api.addNote).toHaveBeenCalledWith("req-1", "followed up", "Sam"),
    );
    // Adding a note changes noteCount/latestNotePreview on the main list too.
    await waitFor(() => expect(api.fetchRequests).toHaveBeenCalledTimes(2));
  });
});
