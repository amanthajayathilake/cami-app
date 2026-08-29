import { BadRequestException } from "@nestjs/common";

const MAX_MESSAGE_LENGTH = 2000;

/** POST /requests/classify. */
export class ClassifyRequestDto {
  message!: string;
  requestId?: string;

  static fromBody(body: unknown): ClassifyRequestDto {
    const record = (body ?? {}) as Record<string, unknown>;
    const message = record.message;

    if (typeof message !== "string" || message.trim().length === 0) {
      throw new BadRequestException("message must be a non-empty string");
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
      );
    }
    if (
      record.requestId !== undefined &&
      typeof record.requestId !== "string"
    ) {
      throw new BadRequestException("requestId must be a string when provided");
    }

    const dto = new ClassifyRequestDto();
    dto.message = message.trim();
    dto.requestId = record.requestId as string | undefined;

    return dto;
  }
}
