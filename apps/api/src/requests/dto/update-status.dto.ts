import { BadRequestException } from "@nestjs/common";
import { REQUEST_STATUSES, RequestStatus } from "../customer-request.entity";

/** PATCH /requests/:id/status. */
export class UpdateStatusDto {
  status!: RequestStatus;

  static fromBody(body: unknown): UpdateStatusDto {
    const status = (body as Record<string, unknown> | null)?.status;
    if (
      typeof status !== "string" ||
      !REQUEST_STATUSES.includes(status as RequestStatus)
    ) {
      throw new BadRequestException(
        `status must be one of: ${REQUEST_STATUSES.join(", ")}`,
      );
    }

    const dto = new UpdateStatusDto();
    dto.status = status as RequestStatus;

    return dto;
  }
}
