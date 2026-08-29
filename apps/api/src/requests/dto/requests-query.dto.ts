import { REQUEST_STATUSES, RequestStatus } from "../customer-request.entity";
import {
  REQUESTS_SORT_FIELDS,
  RequestsSortField,
  SORT_DIRECTIONS,
  SortDirection,
} from "../persistence/requests.repository.port";
import { clampInt, parseEnum } from "./dto-utils";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/** GET /requests. */
export class RequestsQueryDto {
  search?: string;
  status?: RequestStatus;
  sortBy!: RequestsSortField;
  sortDir!: SortDirection;
  limit!: number;
  offset!: number;

  static fromQuery(query: Record<string, unknown>): RequestsQueryDto {
    const dto = new RequestsQueryDto();

    if (query.search !== undefined && String(query.search).trim() !== "") {
      dto.search = String(query.search).trim();
    }

    if (query.status !== undefined && String(query.status).trim() !== "") {
      dto.status = parseEnum(query.status, REQUEST_STATUSES, "open", "status");
    }

    dto.sortBy = parseEnum(
      query.sortBy,
      REQUESTS_SORT_FIELDS,
      "createdAt",
      "sortBy",
    );
    dto.sortDir = parseEnum(query.sortDir, SORT_DIRECTIONS, "desc", "sortDir");
    dto.limit = clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    dto.offset = clampInt(query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

    return dto;
  }
}
