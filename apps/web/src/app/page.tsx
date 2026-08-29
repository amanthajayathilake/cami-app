"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  addNote,
  classifyMessage,
  createRequest,
  fetchNotes,
  fetchRequests,
  REQUEST_STATUSES,
  RequestsSortField,
  RequestStatus,
  SortDirection,
  updateRequestStatus,
} from "@/lib/api";

const SORT_OPTIONS: { value: RequestsSortField; label: string }[] = [
  { value: "createdAt", label: "Date created" },
  { value: "status", label: "Status" },
  { value: "noteCount", label: "Notes" },
];
const PAGE_SIZE = 25;

export default function HomePage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "">("");
  const [sortBy, setSortBy] = useState<RequestsSortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [offset, setOffset] = useState(0);

  const [notesFor, setNotesFor] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [notesSortDir, setNotesSortDir] = useState<SortDirection>("asc");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const requestsQuery = useQuery({
    queryKey: [
      "requests",
      { search, status: statusFilter, sortBy, sortDir, offset },
    ],
    queryFn: () =>
      fetchRequests({
        search: search || undefined,
        status: statusFilter || undefined,
        sortBy,
        sortDir,
        limit: PAGE_SIZE,
        offset,
      }),
  });

  const notesQuery = useQuery({
    queryKey: ["notes", notesFor?.id, notesSortDir],
    queryFn: () => fetchNotes(notesFor!.id, notesSortDir),
    enabled: notesFor !== null,
  });

  const createMutation = useMutation({
    mutationFn: (message: string) => createRequest(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setDraft("");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RequestStatus }) =>
      updateRequestStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });

  const classifyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      classifyMessage(message, id),
    onSuccess: () => {
      // Classifying can change category, confidence, and status
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({
      id,
      body,
      authorName,
    }: {
      id: string;
      body: string;
      authorName: string;
    }) => addNote(id, body, authorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", notesFor?.id] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setNoteBody("");
    },
  });

  if (requestsQuery.isLoading) {
    return <p className="text-slate-600">Loading requests…</p>;
  }

  if (requestsQuery.isError) {
    return (
      <p className="text-red-700">
        Could not load requests. Is the API running at{" "}
        {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}?
      </p>
    );
  }

  const page = requestsQuery.data;
  const requests = page?.items ?? [];
  const total = page?.total ?? 0;
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function closeNotesPanel() {
    setNotesFor(null);
    setNoteAuthor("");
    setNoteBody("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Open requests</h2>
        <p className="mt-1 text-sm text-slate-600">
          Update status or run classification. Seeded volume is intentional —
          watch API behaviour under load.
        </p>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const message = draft.trim();
          if (message) {
            createMutation.mutate(message);
          }
        }}
      >
        <input
          className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Log a new customer request…"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {createMutation.isPending ? "Adding…" : "Add request"}
        </button>
      </form>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput.trim());
          setOffset(0);
        }}
      >
        <label className="flex flex-1 min-w-[12rem] flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Search</span>
          <input
            className="rounded border border-slate-300 px-3 py-2"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by message keyword…"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Status</span>
          <select
            className="rounded border border-slate-300 bg-white px-3 py-2"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as RequestStatus | "");
              setOffset(0);
            }}
          >
            <option value="">All statuses</option>
            {REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Sort by</span>
          <select
            className="rounded border border-slate-300 bg-white px-3 py-2"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as RequestsSortField);
              setOffset(0);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
            setOffset(0);
          }}
          className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          aria-label="Toggle sort direction"
        >
          {sortDir === "asc" ? "Ascending ↑" : "Descending ↓"}
        </button>

        <button
          type="submit"
          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Search
        </button>
        {search || statusFilter ? (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setStatusFilter("");
              setOffset(0);
            }}
            className="text-sm text-slate-500 underline hover:text-slate-700"
          >
            Clear filters
          </button>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((row) => (
              <tr key={row.id}>
                <td className="max-w-md px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {row.message}
                  </div>
                  {row.latestNotePreview ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Latest note: {row.latestNotePreview}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border border-slate-300 bg-white px-2 py-1"
                    value={row.status}
                    onChange={(e) =>
                      statusMutation.mutate({
                        id: row.id,
                        status: e.target.value as RequestStatus,
                      })
                    }
                  >
                    {REQUEST_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  <button
                    type="button"
                    className="underline decoration-dotted hover:text-slate-900"
                    onClick={() =>
                      setNotesFor({ id: row.id, message: row.message })
                    }
                  >
                    {row.noteCount} view
                  </button>
                </td>
                <td className="px-4 py-3">
                  {row.category ?? "—"}
                  {row.confidence != null ? (
                    <span className="ml-1 text-xs text-slate-500">
                      ({row.confidence.toFixed(2)})
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                    onClick={() =>
                      classifyMutation.mutate({
                        id: row.id,
                        message: row.message,
                      })
                    }
                  >
                    Classify
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Showing {requests.length === 0 ? 0 : offset + 1}–
          {Math.min(offset + requests.length, total)} of {total}
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
            Page {pageNumber} of {pageCount}
          </span>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {(statusMutation.isSuccess || classifyMutation.isSuccess) && (
        <p className="text-sm text-slate-600">
          Last action reported success from the API.
        </p>
      )}

      {(statusMutation.isError || classifyMutation.isError) && (
        <p className="text-sm text-red-700">
          {(statusMutation.error as Error | undefined)?.message ??
            (classifyMutation.error as Error | undefined)?.message ??
            "Last action failed."}
        </p>
      )}

      {notesFor ? (
        <div
          className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-label={`Notes for ${notesFor.message}`}
        >
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Notes</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {notesFor.message}
                </p>
              </div>
              <button
                type="button"
                onClick={closeNotesPanel}
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                aria-label="Close notes"
              >
                Close
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {notesQuery.data?.length ?? 0} note
                {notesQuery.data?.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() =>
                  setNotesSortDir(notesSortDir === "asc" ? "desc" : "asc")
                }
                className="text-xs text-slate-500 underline hover:text-slate-700"
              >
                {notesSortDir === "asc" ? "Oldest first" : "Newest first"}
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {notesQuery.isLoading ? (
                <p className="text-sm text-slate-500">Loading notes…</p>
              ) : notesQuery.data && notesQuery.data.length > 0 ? (
                notesQuery.data.map((note) => (
                  <div
                    key={note.id}
                    className="rounded border border-slate-200 bg-slate-50 p-2 text-sm"
                  >
                    <div className="text-slate-800">{note.body}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {note.authorName} ·{" "}
                      {new Date(note.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No notes yet.</p>
              )}
            </div>

            <form
              className="mt-4 space-y-2 border-t border-slate-200 pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                const body = noteBody.trim();
                const authorName = noteAuthor.trim();
                if (body && authorName) {
                  addNoteMutation.mutate({ id: notesFor.id, body, authorName });
                }
              }}
            >
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={noteAuthor}
                onChange={(e) => setNoteAuthor(e.target.value)}
                placeholder="Your name"
              />
              <textarea
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add a note…"
              />
              <button
                type="submit"
                disabled={addNoteMutation.isPending}
                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {addNoteMutation.isPending ? "Adding…" : "Add note"}
              </button>
              {addNoteMutation.isError ? (
                <p className="text-sm text-red-700">
                  {(addNoteMutation.error as Error).message}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
