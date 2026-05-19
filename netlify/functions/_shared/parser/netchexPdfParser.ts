import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { addDays, format, parse } from "date-fns";
import type { ParsedScheduleDraft, ParsedShiftDraft } from "../../../../src/domain/types";
import { normalizeDepartmentLabel } from "../../../../src/lib/department";

interface TextItem {
  str: string;
  transform: number[];
}

interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  pageNumber: number;
}

interface TextRow {
  y: number;
  pageNumber: number;
  order: number;
  items: PositionedTextItem[];
}

interface DayColumn {
  shortDay: string;
  date: string;
  x: number;
}

const dayHeaderPattern = /^(\d{1,2})\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/;
const timePattern = /^(\d{1,2}:\d{2})(AM|PM)$/i;
const footerPattern = /^https?:|^Page\s+\d+\s+of\s+\d+$/i;

function toTime24(value: string, meridiem: string): string {
  const parsed = parse(`${value}${meridiem.toUpperCase()}`, "h:mma", new Date());
  return format(parsed, "HH:mm");
}

function sortTextItems(items: PositionedTextItem[]): PositionedTextItem[] {
  return [...items].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
    const yDelta = b.y - a.y;
    if (Math.abs(yDelta) > 4) return yDelta;
    return a.x - b.x;
  });
}

function deriveDateRange(items: PositionedTextItem[]): { start: string; end: string } | undefined {
  const rangeLine = items.find((item) => /\d{2}\/\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}\/\d{2}/.test(item.str))?.str;
  if (!rangeLine) {
    return undefined;
  }

  const match = rangeLine.match(/(\d{2})\/(\d{2})\/(\d{2})\s*-\s*(\d{2})\/(\d{2})\/(\d{2})/);
  if (!match) {
    return undefined;
  }

  const [, startMonth, startDay, startYear, endMonth, endDay, endYear] = match;
  return {
    start: `20${startYear}-${startMonth}-${startDay}`,
    end: `20${endYear}-${endMonth}-${endDay}`
  };
}

function buildDayColumns(items: PositionedTextItem[], rangeStart: string): DayColumn[] {
  const startDate = new Date(`${rangeStart}T00:00:00`);
  const columns: DayColumn[] = [];

  for (const item of items) {
    const match = item.str.match(dayHeaderPattern);
    if (!match) continue;

    const dayNumber = Number(match[1]);
    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = addDays(startDate, offset);
      if (candidate.getUTCDate() === dayNumber) {
        columns.push({
          shortDay: match[2],
          date: format(candidate, "yyyy-MM-dd"),
          x: item.x
        });
      }
    }
  }

  return columns.sort((a, b) => a.x - b.x);
}

function groupRows(items: PositionedTextItem[]): TextRow[] {
  const rows: TextRow[] = [];

  for (const item of items) {
    const current = rows.at(-1);
    if (current && current.pageNumber === item.pageNumber && Math.abs(current.y - item.y) <= 4) {
      current.items.push(item);
      continue;
    }

    rows.push({ y: item.y, pageNumber: item.pageNumber, order: rows.length, items: [item] });
  }

  return rows.map((row) => ({
    y: row.y,
    pageNumber: row.pageNumber,
    order: row.order,
    items: row.items.sort((a, b) => a.x - b.x)
  }));
}

function rowText(row: TextRow, minX = -Infinity, maxX = Infinity): string {
  return row.items
    .filter((item) => item.x >= minX && item.x <= maxX)
    .map((item) => item.str)
    .join(" ")
    .trim();
}

function isHoursText(value: string): boolean {
  return /^\d+(?:\.\d+)?\s+Hrs$/i.test(value);
}

function isEmployeeStart(row: TextRow): boolean {
  const leftText = rowText(row, 40, 130);
  if (!leftText || !leftText.includes(",")) return false;
  if (isHoursText(leftText) || footerPattern.test(leftText)) return false;
  return !["EMPLOYEES", "GIWP", "Netchex Scheduler"].includes(leftText);
}

function employeeNameForBlock(rows: TextRow[]): string {
  const nameParts: string[] = [];

  for (const row of rows) {
    const leftText = rowText(row, 40, 150);
    if (!leftText || isHoursText(leftText)) break;
    if (footerPattern.test(leftText)) continue;
    nameParts.push(leftText);
  }

  return normalizeDepartmentLabel(nameParts.join(" "));
}

interface TimeEntry {
  item: PositionedTextItem;
  rowIndex: number;
}

function columnTimeEntries(rows: TextRow[], column: DayColumn): TimeEntry[] {
  return rows.flatMap((row, rowIndex) =>
    row.items
      .filter((item) => Math.abs(item.x - (column.x - 10)) <= 18 && timePattern.test(item.str))
      .map((item) => ({ item, rowIndex }))
  );
}

function departmentForShift(rows: TextRow[], column: DayColumn, afterRowIndex: number): string {
  const departmentParts = rows
    .slice(afterRowIndex + 1)
    .flatMap((row) => row.items)
    .filter((item) => Math.abs(item.x - column.x) <= 30)
    .filter((item) => !timePattern.test(item.str) && item.str !== "-")
    .map((item) => item.str)
    .filter((value) => !isHoursText(value) && !footerPattern.test(value) && value.toUpperCase() !== "TIME OFF");

  return normalizeDepartmentLabel(departmentParts.slice(0, 3).join(" "));
}

function shiftFromTimes(
  employeeName: string,
  column: DayColumn,
  startItem: PositionedTextItem,
  endItem: PositionedTextItem,
  departmentLabel: string,
  index: number
): ParsedShiftDraft | undefined {
  const startMatch = startItem.str.match(timePattern);
  const endMatch = endItem.str.match(timePattern);
  if (!startMatch || !endMatch) return undefined;

  const normalizedDepartment = departmentLabel || "Unknown Department";
  if (normalizedDepartment.toUpperCase().includes("UNAVAILABLE") || normalizedDepartment.toUpperCase().includes("TIME OFF")) {
    return undefined;
  }

  return {
    temporaryId: `parsed-${index}`,
    employeeName,
    shiftDate: column.date,
    startTime: toTime24(startMatch[1], startMatch[2]),
    endTime: toTime24(endMatch[1], endMatch[2]),
    departmentLabel: normalizedDepartment,
    sourceConfidence: normalizedDepartment === "Unknown Department" ? "low" : "medium",
    sourceNotes: normalizedDepartment === "Unknown Department" ? "Department label was not found near time block." : undefined
  };
}

export async function parseNetchexPdf(
  buffer: Buffer | Uint8Array,
  sourceFileName: string
): Promise<ParsedScheduleDraft> {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false });
  const items: PositionedTextItem[] = [];

  const warnings: string[] = [];
  let document;

  try {
    document = await loadingTask.promise;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      items.push(
        ...(content.items as TextItem[])
          .map((item) => ({
            str: item.str.trim(),
            x: item.transform[4],
            y: item.transform[5],
            pageNumber
          }))
          .filter((item) => item.str)
      );
    }

    const sortedItems = sortTextItems(items);
    const range = deriveDateRange(sortedItems);
    if (!range) {
      return {
        sourceFileName,
        dateRangeStart: "",
        dateRangeEnd: "",
        shifts: [],
        warnings: ["The schedule date range could not be read from the PDF."]
      };
    }

    const dayColumns = buildDayColumns(sortedItems, range.start);
    const shifts: ParsedShiftDraft[] = [];

    if (dayColumns.length === 0) {
      warnings.push("No day headers were found in the PDF.");
    }

    const rows = groupRows(sortedItems);
    const employeeStartIndexes = rows.flatMap((row, index) => (isEmployeeStart(row) ? [index] : []));

    for (let index = 0; index < employeeStartIndexes.length; index += 1) {
      const startIndex = employeeStartIndexes[index];
      const endIndex = employeeStartIndexes[index + 1] ?? rows.length;
      const blockRows = rows.slice(startIndex, endIndex);
      const employeeName = employeeNameForBlock(blockRows);
      if (!employeeName) continue;

      for (const column of dayColumns) {
        const timeEntries = columnTimeEntries(blockRows, column);
        for (let timeIndex = 0; timeIndex + 1 < timeEntries.length; timeIndex += 2) {
          const startEntry = timeEntries[timeIndex];
          const endEntry = timeEntries[timeIndex + 1];
          const departmentLabel = departmentForShift(blockRows, column, endEntry.rowIndex);
          const shift = shiftFromTimes(
            employeeName,
            column,
            startEntry.item,
            endEntry.item,
            departmentLabel,
            shifts.length + 1
          );
          if (shift) shifts.push(shift);
        }
      }
    }

    return {
      sourceFileName,
      dateRangeStart: range.start,
      dateRangeEnd: range.end,
      shifts,
      warnings
    };
  } finally {
    await document?.destroy();
    await loadingTask.destroy();
  }
}
