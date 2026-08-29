import { describe, expect, it, vi } from "vitest";
import { RequestsController } from "../src/requests/requests.controller";
import { RequestsService } from "../src/requests/requests.service";
import { ClassificationService } from "../src/requests/classification/classification.service";
import { ClassifierProvider } from "../src/requests/classification/classifier-provider";
import {
  createFakeHistoryRepository,
  createFakeRequestsRepository,
} from "./fakes";

function buildController() {
  const { repo: requestsRepo } = createFakeRequestsRepository();
  const requestsService = new RequestsService(requestsRepo);
  const { repo: historyRepo } = createFakeHistoryRepository();
  const classifier: ClassifierProvider = {
    classify: vi.fn(async () => ({
      category: "billing" as const,
      confidence: 0.9,
    })),
  };
  const classificationService = new ClassificationService(
    classifier,
    "keyword",
    historyRepo,
    requestsService,
  );
  const controller = new RequestsController(
    requestsService,
    classificationService,
  );
  return { controller, requestsService, classificationService, requestsRepo };
}

/**
 * These tests exist mainly to prove the controller stayed thin after the
 * refactor - it should only parse input into DTOs and hand off to a
 * service, never apply business rules itself.
 */
describe("RequestsController", () => {
  it("list() parses query params and forwards them to the service", async () => {
    const { controller, requestsRepo } = buildController();

    const result = await controller.list({
      search: "billing",
      sortBy: "status",
      sortDir: "asc",
      limit: "10",
      offset: "0",
    });

    expect(requestsRepo.findAllWithStats).toHaveBeenCalledWith({
      search: "billing",
      sortBy: "status",
      sortDir: "asc",
      limit: 10,
      offset: 0,
    });
    expect(result).toEqual({ items: [], total: 0, limit: 10, offset: 0 });
  });

  it("list() rejects an unknown sortBy value before hitting the service", () => {
    const { controller } = buildController();

    expect(() => controller.list({ sortBy: "priority" })).toThrow(
      /sortBy must be one of/,
    );
  });

  it("list() parses a status filter and forwards it to the service", async () => {
    const { controller, requestsRepo } = buildController();

    await controller.list({ status: "in_progress" });

    expect(requestsRepo.findAllWithStats).toHaveBeenCalledWith(
      expect.objectContaining({ status: "in_progress" }),
    );
  });

  it("list() rejects an unknown status value before hitting the service", () => {
    const { controller } = buildController();

    expect(() => controller.list({ status: "archived" })).toThrow(
      /status must be one of/,
    );
  });

  it("create() rejects an empty message before it ever reaches the service", () => {
    const { controller } = buildController();

    expect(() => controller.create({ message: "   " })).toThrow(
      /non-empty string/,
    );
  });

  it("create() trims and forwards a valid message", async () => {
    const { controller } = buildController();

    const created = await controller.create({
      message: "  needs help logging in  ",
    });

    expect(created.message).toBe("needs help logging in");
  });

  it("updateStatus() rejects an invalid status", () => {
    const { controller } = buildController();

    expect(() =>
      controller.updateStatus("some-id", { status: "archived" }),
    ).toThrow(/status must be one of/);
  });

  it("classify() has no calibration logic of its own - it only forwards to the service", async () => {
    const { controller, classificationService } = buildController();
    const spy = vi.spyOn(classificationService, "classify");

    const result = await controller.classify({
      message: "please fix my invoice",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.category).toBe("billing");
  });

  it("history() parses query params and forwards them to the classification service", async () => {
    const { controller, classificationService } = buildController();
    const spy = vi.spyOn(classificationService, "listHistory");

    await controller.history({ category: "billing", limit: "10", offset: "0" });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ category: "billing", limit: 10, offset: 0 }),
    );
  });

  it("history() rejects an unknown category before hitting the service", () => {
    const { controller } = buildController();

    expect(() =>
      controller.history({ category: "not-a-real-category" }),
    ).toThrow(/category must be one of/);
  });

  it("listNotes() rejects an unknown sortDir before hitting the service", () => {
    const { controller } = buildController();

    expect(() =>
      controller.listNotes("some-id", { sortDir: "sideways" }),
    ).toThrow(/sortDir must be one of/);
  });

  it("addNote() rejects a note with no author before hitting the service", () => {
    const { controller } = buildController();

    expect(() =>
      controller.addNote("some-id", { body: "a note" }),
    ).toThrow(/authorName is required/);
  });

  it("addNote() trims and forwards a valid note to the service", async () => {
    const { controller, requestsService } = buildController();
    const request = await controller.create({ message: "needs a note" });
    const spy = vi.spyOn(requestsService, "addNote");

    await controller.addNote(request.id, {
      body: "  called the customer back  ",
      authorName: "  Priya  ",
    });

    expect(spy).toHaveBeenCalledWith(
      request.id,
      "called the customer back",
      "Priya",
    );
  });
});
