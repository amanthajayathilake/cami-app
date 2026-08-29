"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchHistory } from "@/lib/api";

const CATEGORIES = ["support", "sales", "billing", "unknown"] as const;
const PAGE_SIZE = 20;

export default function HistoryPage() {
  const [category, setCategory] = useState("");
  const [offset, setOffset] = useState(0);

  const historyQuery = useQuery({
    queryKey: ["history", category, offset],
    queryFn: () =>
      fetchHistory({
        category: category || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
  });

  const data = historyQuery.data;
  const page = data ? Math.floor(data.offset / PAGE_SIZE) + 1 : 1;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Classification history</h2>
        <p className="mt-1 text-sm text-slate-600">
          Every classification run - whether or not it was linked to a request -
          is recorded here so triage decisions can be audited later.
        </p>
      </div>

      <label className="flex max-w-xs flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Filter by category</span>
        <select
          className="rounded border border-slate-300 bg-white px-3 py-2"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {historyQuery.isLoading ? (
        <p className="text-slate-600">Loading history…</p>
      ) : historyQuery.isError ? (
        <p className="text-red-700">
          {(historyQuery.error as Error)?.message ?? "Failed to load history."}
        </p>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No classifications recorded yet
          {category ? ` for "${category}"` : ""}. Run "Classify" on a request to
          see it show up here.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Classified at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="max-w-md px-4 py-3">
                      <div className="text-slate-900">{entry.message}</div>
                      {entry.requestId ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Linked to request {entry.requestId.slice(0, 8)}…
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-slate-400">
                          Not linked to a request
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">{entry.category}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {entry.confidence.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {entry.provider}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Showing {data.offset + 1}–
              {Math.min(data.offset + data.items.length, data.total)} of{" "}
              {data.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= data.total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
