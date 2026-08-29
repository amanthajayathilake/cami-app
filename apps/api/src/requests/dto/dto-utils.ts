import { BadRequestException } from "@nestjs/common";

/** Clamps a query string number into [min, max], falling back when absent. */
export function clampInt(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new BadRequestException("limit/offset must be integers");
  }

  return Math.min(Math.max(parsed, min), max);
}

/** Validates a query string value against a fixed allow-list, or falls back. */
export function parseEnum<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  fallback: T,
  fieldName: string,
): T {
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const value = String(raw);
  if (!allowed.includes(value as T)) {
    throw new BadRequestException(
      `${fieldName} must be one of: ${allowed.join(", ")}`,
    );
  }

  return value as T;
}
