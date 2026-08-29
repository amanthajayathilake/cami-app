import { BadRequestException } from "@nestjs/common";

/** POST /requests. */
export class CreateRequestDto {
  message!: string;

  static fromBody(body: unknown): CreateRequestDto {
    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).message !== "string" ||
      ((body as Record<string, unknown>).message as string).trim().length === 0
    ) {
      throw new BadRequestException(
        "message is required and must be a non-empty string",
      );
    }

    const dto = new CreateRequestDto();
    dto.message = ((body as Record<string, unknown>).message as string).trim();

    return dto;
  }
}
