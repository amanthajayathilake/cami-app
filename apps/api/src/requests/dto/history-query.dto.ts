import { BadRequestException } from "@nestjs/common";
import {
  CLASSIFICATION_CATEGORIES,
  ClassificationCategory,
} from "../classification/classifier-provider";
import { clampInt } from "./dto-utils";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/** GET /requests/history. */
export class HistoryQueryDto {
  category?: ClassificationCategory;
  limit!: number;
  offset!: number;

  static fromQuery(query: Record<string, unknown>): HistoryQueryDto {
    const dto = new HistoryQueryDto();

    if (query.category !== undefined && query.category !== "") {
      const category = String(query.category);
      if (
        !CLASSIFICATION_CATEGORIES.includes(category as ClassificationCategory)
      ) {
        throw new BadRequestException(
          `category must be one of: ${CLASSIFICATION_CATEGORIES.join(", ")}`,
        );
      }
      dto.category = category as ClassificationCategory;
    }

    dto.limit = clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    dto.offset = clampInt(query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

    return dto;
  }
}
