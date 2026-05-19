import { format, isWithinInterval, parseISO } from "date-fns";

export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isIsoDateInRange(isoDate: string, start: string, end: string): boolean {
  const date = parseISO(isoDate);
  return isWithinInterval(date, { start: parseISO(start), end: parseISO(end) });
}
