export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}
export const text = (value: unknown, name: string, max = 240): string => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail(400, `${name} must contain 1–${max} characters.`);
  return (value as string).trim();
};
export const integer = (value: unknown, name: string, min = 0): number => {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < min ||
    (value as number) > 100_000_000
  )
    fail(400, `${name} must be a whole number between ${min} and 100000000.`);
  return value as number;
};
export const date = (value: unknown, name: string): string => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    fail(400, `${name} must be an ISO UTC timestamp.`);
  const normalized = new Date(value as string).toISOString();
  if (normalized.slice(0, 10) !== (value as string).slice(0, 10))
    fail(400, `${name} must be a valid calendar date.`);
  return normalized;
};
