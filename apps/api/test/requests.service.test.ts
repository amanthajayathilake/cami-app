import { describe, expect, it } from "vitest";
import { RequestsService } from "../src/requests/requests.service";
import { createFakeRequestsRepository, makeCustomerRequest } from "./fakes";

describe("RequestsService", () => {
  const defaultOptions = {
    sortBy: "createdAt" as const,
    sortDir: "desc" as const,
    limit: 25,
    offset: 0,
  };

  it("lists requests through the repository's single aggregated query", async () => {
    const { repo } = createFakeRequestsRepository([
      makeCustomerRequest({ message: "first" }),
      makeCustomerRequest({ message: "second" }),
    ]);
    const service = new RequestsService(repo);

    const page = await service.list(defaultOptions);

    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(2);
    expect(repo.findAllWithStats).toHaveBeenCalledTimes(1);
    // Regression guard for the old N+1 bug: the service must build the list
    // from findAllWithStats alone, never by looping and calling findById.
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it("passes search, sort and paging options straight through to the repository", async () => {
    const { repo } = createFakeRequestsRepository([
      makeCustomerRequest({ message: "billing question" }),
      makeCustomerRequest({ message: "sales question" }),
    ]);
    const service = new RequestsService(repo);

    await service.list({
      search: "billing",
      sortBy: "status",
      sortDir: "asc",
      limit: 10,
      offset: 5,
    });

    expect(repo.findAllWithStats).toHaveBeenCalledWith({
      search: "billing",
      sortBy: "status",
      sortDir: "asc",
      limit: 10,
      offset: 5,
    });
  });

  it("filters by status and passes the filter through to the repository", async () => {
    const { repo } = createFakeRequestsRepository([
      makeCustomerRequest({ message: "open one", status: "open" }),
      makeCustomerRequest({ message: "resolved one", status: "resolved" }),
    ]);
    const service = new RequestsService(repo);

    const page = await service.list({
      ...defaultOptions,
      status: "resolved",
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].message).toBe("resolved one");
    expect(repo.findAllWithStats).toHaveBeenCalledWith(
      expect.objectContaining({ status: "resolved" }),
    );
  });

  it("returns a request by id", async () => {
    const existing = makeCustomerRequest();
    const { repo } = createFakeRequestsRepository([existing]);
    const service = new RequestsService(repo);

    const found = await service.getById(existing.id);

    expect(found.id).toBe(existing.id);
  });

  it("throws a not-found error for an unknown id", async () => {
    const { repo } = createFakeRequestsRepository();
    const service = new RequestsService(repo);

    await expect(service.getById("missing")).rejects.toThrow("missing");
  });

  it("updates status when the request exists", async () => {
    const existing = makeCustomerRequest({ status: "open" });
    const { repo } = createFakeRequestsRepository([existing]);
    const service = new RequestsService(repo);

    const updated = await service.updateStatus(existing.id, "resolved");

    expect(updated.status).toBe("resolved");
  });

  it("throws a not-found error when updating status on an unknown id", async () => {
    const { repo } = createFakeRequestsRepository();
    const service = new RequestsService(repo);

    await expect(service.updateStatus("missing", "resolved")).rejects.toThrow();
  });

  it("creates a new request through the repository", async () => {
    const { repo } = createFakeRequestsRepository();
    const service = new RequestsService(repo);

    const created = await service.create("a brand new request");

    expect(created.message).toBe("a brand new request");
    expect(created.status).toBe("open");
  });

  it("saves a mutated request as-is", async () => {
    const existing = makeCustomerRequest({ category: null });
    const { repo, rows } = createFakeRequestsRepository([existing]);
    const service = new RequestsService(repo);

    existing.category = "billing";
    await service.save(existing);

    expect(rows.get(existing.id)!.category).toBe("billing");
  });

  it("lists notes for a request, oldest first by default", async () => {
    const existing = makeCustomerRequest();
    const { repo } = createFakeRequestsRepository([existing]);
    const service = new RequestsService(repo);

    await service.addNote(existing.id, "first note", "Alex");
    await service.addNote(existing.id, "second note", "Sam");
    const notes = await service.listNotes(existing.id, "asc");

    expect(notes.map((n) => n.body)).toEqual(["first note", "second note"]);
  });

  it("throws a not-found error when listing notes for an unknown request", async () => {
    const { repo } = createFakeRequestsRepository();
    const service = new RequestsService(repo);

    await expect(service.listNotes("missing", "asc")).rejects.toThrow();
  });

  it("throws a not-found error when adding a note to an unknown request", async () => {
    const { repo } = createFakeRequestsRepository();
    const service = new RequestsService(repo);

    await expect(
      service.addNote("missing", "a note", "Alex"),
    ).rejects.toThrow();
  });
});
