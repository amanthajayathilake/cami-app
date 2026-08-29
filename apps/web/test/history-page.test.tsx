import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HistoryPage from "@/app/history/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  fetchHistory: vi.fn(),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const entry = {
  id: "hist-1",
  requestId: "req-1",
  message: "please refund me",
  category: "billing" as const,
  confidence: 0.9,
  provider: "keyword",
  createdAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
};

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.mocked(api.fetchHistory).mockReset();
  });

  it("shows an empty state when there is no history yet", async () => {
    vi.mocked(api.fetchHistory).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });

    renderWithClient(<HistoryPage />);

    expect(
      await screen.findByText(/no classifications recorded yet/i),
    ).toBeInTheDocument();
  });

  it("renders history rows once they load", async () => {
    vi.mocked(api.fetchHistory).mockResolvedValue({
      items: [entry],
      total: 1,
      limit: 20,
      offset: 0,
    });

    renderWithClient(<HistoryPage />);

    expect(await screen.findByText("please refund me")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "billing" })).toBeInTheDocument();
  });

  it("re-queries with the chosen category and resets back to the first page", async () => {
    vi.mocked(api.fetchHistory).mockResolvedValue({
      items: [entry],
      total: 1,
      limit: 20,
      offset: 0,
    });

    renderWithClient(<HistoryPage />);
    await screen.findByText("please refund me");

    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "billing");

    expect(api.fetchHistory).toHaveBeenLastCalledWith({
      category: "billing",
      limit: 20,
      offset: 0,
    });
  });
});
