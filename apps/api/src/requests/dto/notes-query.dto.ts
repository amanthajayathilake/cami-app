import {
  SORT_DIRECTIONS,
  SortDirection,
} from "../persistence/requests.repository.port";
import { parseEnum } from "./dto-utils";

/** GET /requests/:id/notes. */
export class NotesQueryDto {
  sortDir!: SortDirection;

  static fromQuery(query: Record<string, unknown>): NotesQueryDto {
    const dto = new NotesQueryDto();
    // Default is oldest-first, cuz notes read like a conversation thread.
    dto.sortDir = parseEnum(query.sortDir, SORT_DIRECTIONS, "asc", "sortDir");

    return dto;
  }
}
