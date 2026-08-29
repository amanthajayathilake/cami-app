import { BadRequestException } from "@nestjs/common";

const MAX_NOTE_LENGTH = 2000;
const MAX_AUTHOR_NAME_LENGTH = 120;

/** POST /requests/:id/notes. */
export class CreateNoteDto {
  body!: string;
  authorName!: string;

  static fromBody(raw: unknown): CreateNoteDto {
    const record = (raw ?? {}) as Record<string, unknown>;
    const body = record.body;
    const authorName = record.authorName;

    if (typeof body !== "string" || body.trim().length === 0) {
      throw new BadRequestException(
        "body is required and must be a non-empty string",
      );
    }
    if (body.length > MAX_NOTE_LENGTH) {
      throw new BadRequestException(
        `body must be ${MAX_NOTE_LENGTH} characters or fewer`,
      );
    }
    if (typeof authorName !== "string" || authorName.trim().length === 0) {
      throw new BadRequestException(
        "authorName is required and must be a non-empty string",
      );
    }
    if (authorName.length > MAX_AUTHOR_NAME_LENGTH) {
      throw new BadRequestException(
        `authorName must be ${MAX_AUTHOR_NAME_LENGTH} characters or fewer`,
      );
    }

    const dto = new CreateNoteDto();
    dto.body = body.trim();
    dto.authorName = authorName.trim();

    return dto;
  }
}
