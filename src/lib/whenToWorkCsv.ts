import type { ParsedScheduleDraft, ParsedShiftDraft } from "../domain/types";
import { parsedScheduleDraftSchema } from "../domain/validation";

type CsvRow = Record<string, string>;

const requiredHeaders = ["Shift ID", "Position Name", "Date", "Start Time", "End Time", "Employee Name"];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);

  return rows;
}

function rowsFromCsv(text: string): CsvRow[] {
  const [headers, ...records] = parseCsv(text).map((row) => row.map((cell) => cell.trim()));
  if (!headers) return [];

  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`WhenToWork CSV is missing required columns: ${missingHeaders.join(", ")}`);
  }

  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index]?.trim() ?? ""]))
  );
}

function parseDate(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) throw new Error(`Invalid WhenToWork date: ${value}`);
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(value.trim());
  if (!match) throw new Error(`Invalid WhenToWork time: ${value}`);
  const [, rawHour, minute, period] = match;
  let hour = Number(rawHour);
  if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (period.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function dateRange(shifts: ParsedShiftDraft[]) {
  const dates = [...new Set(shifts.map((shift) => shift.shiftDate))].sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

export function parseWhenToWorkCsv(csvText: string, sourceFileName: string): ParsedScheduleDraft {
  const rows = rowsFromCsv(csvText);
  let skippedBlankEmployees = 0;

  const shifts = rows.flatMap((row, index): ParsedShiftDraft[] => {
    const employeeName = row["Employee Name"].trim();
    if (!employeeName) {
      skippedBlankEmployees += 1;
      return [];
    }

    return [{
      temporaryId: row["Shift ID"] || `whentowork-row-${index + 1}`,
      employeeName,
      shiftDate: parseDate(row.Date),
      startTime: parseTime(row["Start Time"]),
      endTime: parseTime(row["End Time"]),
      departmentLabel: row["Position Name"],
      sourceConfidence: "high",
      sourceNotes: row["Position ID"] ? `WhenToWork position ${row["Position ID"]}` : undefined
    }];
  });

  if (shifts.length === 0) {
    throw new Error("WhenToWork CSV did not include any assigned shifts.");
  }

  const range = dateRange(shifts);
  const warnings = skippedBlankEmployees > 0 ? [`Skipped ${skippedBlankEmployees} rows without employee names.`] : [];

  return parsedScheduleDraftSchema.parse({
    sourceFileName,
    dateRangeStart: range.start,
    dateRangeEnd: range.end,
    shifts,
    warnings
  });
}
