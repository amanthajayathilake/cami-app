import { describe, expect, it } from "vitest";
import { CreateRequestDto } from "../src/requests/dto/create-request.dto";
import { UpdateStatusDto } from "../src/requests/dto/update-status.dto";
import { ClassifyRequestDto } from "../src/requests/dto/classify-request.dto";
import { HistoryQueryDto } from "../src/requests/dto/history-query.dto";
import { RequestsQueryDto } from "../src/requests/dto/requests-query.dto";
import { NotesQueryDto } from "../src/requests/dto/notes-query.dto";
import { CreateNoteDto } from "../src/requests/dto/create-note.dto";

describe("CreateRequestDto", () => {
  it("trims a valid message", () => {
    const dto = CreateRequestDto.fromBody({ message: "  hello there  " });
    expect(dto.message).toBe("hello there");
  });

  it("rejects a missing message", () => {
    expect(() => CreateRequestDto.fromBody({})).toThrow(/message is required/);
  });

  it("rejects a blank (whitespace-only) message", () => {
    expect(() => CreateRequestDto.fromBody({ message: "   " })).toThrow(
      /message is required/,
    );
  });

  it("rejects a non-string message", () => {
    expect(() => CreateRequestDto.fromBody({ message: 123 })).toThrow(
      /message is required/,
    );
  });

  it("rejects a body that is not an object", () => {
    expect(() => CreateRequestDto.fromBody(null)).toThrow();
    expect(() => CreateRequestDto.fromBody("nope")).toThrow();
  });
});

describe("UpdateStatusDto", () => {
  it.each(["open", "in_progress", "resolved"] as const)(
    "accepts %s as a valid status",
    (status) => {
      const dto = UpdateStatusDto.fromBody({ status });
      expect(dto.status).toBe(status);
    },
  );

  it("rejects an unknown status", () => {
    expect(() => UpdateStatusDto.fromBody({ status: "archived" })).toThrow(
      /status must be one of/,
    );
  });

  it("rejects a missing status", () => {
    expect(() => UpdateStatusDto.fromBody({})).toThrow(/status must be one of/);
  });

  it("rejects a null body", () => {
    expect(() => UpdateStatusDto.fromBody(null)).toThrow();
  });
});

describe("ClassifyRequestDto", () => {
  it("trims the message and keeps an optional requestId", () => {
    const dto = ClassifyRequestDto.fromBody({
      message: "  need help  ",
      requestId: "req-1",
    });
    expect(dto.message).toBe("need help");
    expect(dto.requestId).toBe("req-1");
  });

  it("allows requestId to be omitted entirely for ad-hoc classification", () => {
    const dto = ClassifyRequestDto.fromBody({ message: "hello" });
    expect(dto.requestId).toBeUndefined();
  });

  it("rejects an empty message", () => {
    expect(() => ClassifyRequestDto.fromBody({ message: "" })).toThrow(
      /non-empty string/,
    );
  });

  it("rejects a message over the 2000 character limit", () => {
    const longMessage = "a".repeat(2001);
    expect(() => ClassifyRequestDto.fromBody({ message: longMessage })).toThrow(
      /2000 characters/,
    );
  });

  it("accepts a message right at the length limit", () => {
    const message = "a".repeat(2000);
    expect(() => ClassifyRequestDto.fromBody({ message })).not.toThrow();
  });

  it("rejects a non-string requestId", () => {
    expect(() =>
      ClassifyRequestDto.fromBody({ message: "hi", requestId: 42 }),
    ).toThrow(/requestId must be a string/);
  });

  it("rejects a missing body entirely", () => {
    expect(() => ClassifyRequestDto.fromBody(undefined)).toThrow(
      /non-empty string/,
    );
  });
});

describe("HistoryQueryDto", () => {
  it("defaults limit and offset when nothing is provided", () => {
    const dto = HistoryQueryDto.fromQuery({});
    expect(dto.limit).toBe(25);
    expect(dto.offset).toBe(0);
    expect(dto.category).toBeUndefined();
  });

  it("accepts any of the known categories", () => {
    const dto = HistoryQueryDto.fromQuery({ category: "sales" });
    expect(dto.category).toBe("sales");
  });

  it("rejects an unknown category", () => {
    expect(() => HistoryQueryDto.fromQuery({ category: "spam" })).toThrow(
      /category must be one of/,
    );
  });

  it("treats an empty-string category the same as not provided", () => {
    const dto = HistoryQueryDto.fromQuery({ category: "" });
    expect(dto.category).toBeUndefined();
  });

  it("clamps a limit above the maximum down to 100", () => {
    const dto = HistoryQueryDto.fromQuery({ limit: "500" });
    expect(dto.limit).toBe(100);
  });

  it("clamps a limit below 1 up to 1", () => {
    const dto = HistoryQueryDto.fromQuery({ limit: "0" });
    expect(dto.limit).toBe(1);
  });

  it("rejects a non-integer limit", () => {
    expect(() => HistoryQueryDto.fromQuery({ limit: "abc" })).toThrow(
      /must be integers/,
    );
  });

  it("rejects a non-integer offset", () => {
    expect(() => HistoryQueryDto.fromQuery({ offset: "1.5" })).toThrow(
      /must be integers/,
    );
  });
});

describe("RequestsQueryDto", () => {
  it("defaults to createdAt desc with no search when nothing is provided", () => {
    const dto = RequestsQueryDto.fromQuery({});
    expect(dto.sortBy).toBe("createdAt");
    expect(dto.sortDir).toBe("desc");
    expect(dto.search).toBeUndefined();
    expect(dto.status).toBeUndefined();
    expect(dto.limit).toBe(25);
    expect(dto.offset).toBe(0);
  });

  it.each(["open", "in_progress", "resolved"] as const)(
    "accepts %s as a valid status filter",
    (status) => {
      const dto = RequestsQueryDto.fromQuery({ status });
      expect(dto.status).toBe(status);
    },
  );

  it("rejects an unknown status value", () => {
    expect(() => RequestsQueryDto.fromQuery({ status: "archived" })).toThrow(
      /status must be one of/,
    );
  });

  it("treats an empty-string status the same as not provided", () => {
    const dto = RequestsQueryDto.fromQuery({ status: "" });
    expect(dto.status).toBeUndefined();
  });

  it.each(["createdAt", "status", "noteCount"] as const)(
    "accepts %s as a valid sortBy value",
    (sortBy) => {
      const dto = RequestsQueryDto.fromQuery({ sortBy });
      expect(dto.sortBy).toBe(sortBy);
    },
  );

  it("rejects an unknown sortBy value", () => {
    expect(() => RequestsQueryDto.fromQuery({ sortBy: "priority" })).toThrow(
      /sortBy must be one of/,
    );
  });

  it.each(["asc", "desc"] as const)(
    "accepts %s as a valid sortDir value",
    (sortDir) => {
      const dto = RequestsQueryDto.fromQuery({ sortDir });
      expect(dto.sortDir).toBe(sortDir);
    },
  );

  it("rejects an unknown sortDir value", () => {
    expect(() => RequestsQueryDto.fromQuery({ sortDir: "sideways" })).toThrow(
      /sortDir must be one of/,
    );
  });

  it("trims whitespace off a search term", () => {
    const dto = RequestsQueryDto.fromQuery({ search: "  billing  " });
    expect(dto.search).toBe("billing");
  });

  it("treats an empty-string search the same as not provided", () => {
    const dto = RequestsQueryDto.fromQuery({ search: "" });
    expect(dto.search).toBeUndefined();
  });

  it("clamps a limit above the maximum down to 100", () => {
    const dto = RequestsQueryDto.fromQuery({ limit: "500" });
    expect(dto.limit).toBe(100);
  });

  it("rejects a non-integer limit", () => {
    expect(() => RequestsQueryDto.fromQuery({ limit: "abc" })).toThrow(
      /must be integers/,
    );
  });
});

describe("NotesQueryDto", () => {
  it("defaults to ascending (oldest first) when nothing is provided", () => {
    const dto = NotesQueryDto.fromQuery({});
    expect(dto.sortDir).toBe("asc");
  });

  it.each(["asc", "desc"] as const)(
    "accepts %s as a valid sortDir value",
    (sortDir) => {
      const dto = NotesQueryDto.fromQuery({ sortDir });
      expect(dto.sortDir).toBe(sortDir);
    },
  );

  it("rejects an unknown sortDir value", () => {
    expect(() => NotesQueryDto.fromQuery({ sortDir: "sideways" })).toThrow(
      /sortDir must be one of/,
    );
  });
});

describe("CreateNoteDto", () => {
  it("trims a valid body and authorName", () => {
    const dto = CreateNoteDto.fromBody({
      body: "  called the customer back  ",
      authorName: "  Priya  ",
    });
    expect(dto.body).toBe("called the customer back");
    expect(dto.authorName).toBe("Priya");
  });

  it("rejects a missing body", () => {
    expect(() => CreateNoteDto.fromBody({ authorName: "Priya" })).toThrow(
      /body is required/,
    );
  });

  it("rejects a blank (whitespace-only) body", () => {
    expect(() =>
      CreateNoteDto.fromBody({ body: "   ", authorName: "Priya" }),
    ).toThrow(/body is required/);
  });

  it("rejects a body over the 2000 character limit", () => {
    const longBody = "a".repeat(2001);
    expect(() =>
      CreateNoteDto.fromBody({ body: longBody, authorName: "Priya" }),
    ).toThrow(/2000 characters/);
  });

  it("rejects a missing authorName", () => {
    expect(() => CreateNoteDto.fromBody({ body: "a note" })).toThrow(
      /authorName is required/,
    );
  });

  it("rejects a blank (whitespace-only) authorName", () => {
    expect(() =>
      CreateNoteDto.fromBody({ body: "a note", authorName: "   " }),
    ).toThrow(/authorName is required/);
  });

  it("rejects an authorName over the 120 character limit", () => {
    const longName = "a".repeat(121);
    expect(() =>
      CreateNoteDto.fromBody({ body: "a note", authorName: longName }),
    ).toThrow(/120 characters/);
  });

  it("rejects a body that is not an object", () => {
    expect(() => CreateNoteDto.fromBody(null)).toThrow();
  });
});
