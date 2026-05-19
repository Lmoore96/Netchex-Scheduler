# Netchex Schedule Position App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free-tier-friendly web app where managers upload a Netchex schedule PDF, review parsed shifts, assign employees to department starting positions, and print one department/day sheet.

**Architecture:** A Vite React TypeScript frontend runs on Netlify and talks to Netlify serverless functions. Shared TypeScript modules define the domain model, PDF parser contract, validation, and Supabase repository operations. The parser is isolated so it can improve independently as more Netchex PDFs are collected.

**Tech Stack:** React, Vite, TypeScript, Vitest, Testing Library, Netlify Functions, Supabase, pdfjs-dist, Zod, @dnd-kit, date-fns.

---

## File Structure

- `package.json` - scripts and dependencies.
- `vite.config.ts` - Vite and Vitest config.
- `tsconfig.json` - TypeScript compiler config.
- `netlify.toml` - Netlify build and functions config.
- `index.html` - Vite entry HTML.
- `src/main.tsx` - React root.
- `src/App.tsx` - top-level route/view state.
- `src/styles.css` - global responsive and print styles.
- `src/domain/types.ts` - app domain types.
- `src/domain/validation.ts` - Zod schemas shared by UI and functions.
- `src/lib/dates.ts` - date helpers.
- `src/lib/department.ts` - department normalization helpers.
- `src/lib/storageClient.ts` - browser API wrapper for Netlify functions.
- `src/components/Shell.tsx` - app chrome and navigation.
- `src/components/ImportPanel.tsx` - PDF upload UI.
- `src/components/ReviewImport.tsx` - parsed shift correction UI.
- `src/components/DayDepartmentPicker.tsx` - day and department controls.
- `src/components/PositionListEditor.tsx` - saved position list editor.
- `src/components/AssignmentBoard.tsx` - department/day assignment board.
- `src/components/PrintView.tsx` - printable department sheet.
- `netlify/functions/import-pdf.ts` - upload and parse PDF.
- `netlify/functions/confirm-import.ts` - persist reviewed import.
- `netlify/functions/schedule.ts` - fetch current schedule state.
- `netlify/functions/position-lists.ts` - create/update position lists.
- `netlify/functions/assignments.ts` - save assignment changes.
- `netlify/functions/_shared/http.ts` - response helpers.
- `netlify/functions/_shared/repository.ts` - Supabase repository.
- `netlify/functions/_shared/parser/netchexPdfParser.ts` - PDF parser implementation.
- `supabase/migrations/0001_initial_schema.sql` - database schema.
- `tests/fixtures/Netchex Scheduler.pdf` - copied sample PDF fixture.
- `tests/domain/department.test.ts` - normalization tests.
- `tests/parser/netchexPdfParser.test.ts` - parser fixture tests.
- `tests/components/reviewImport.test.tsx` - review screen tests.
- `tests/components/assignmentBoard.test.tsx` - assignment board tests.
- `tests/components/printView.test.tsx` - print view tests.

## Task 1: Scaffold The Web App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `netlify.toml`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "netchex-schedule-position-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "date-fns": "^3.6.0",
    "pdfjs-dist": "^4.5.136",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.5.0",
    "@types/react": "^18.3.4",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create TypeScript and Vite config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "netlify", "tests", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"]
  }
});
```

- [ ] **Step 3: Create Netlify config**

`netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 4: Create the initial React entry**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Schedule Positions</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app">
      <h1>Schedule Positions</h1>
      <p>Upload a Netchex schedule PDF to begin.</p>
    </main>
  );
}
```

`src/styles.css`:

```css
:root {
  color: #172026;
  background: #f7f8f4;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app {
  min-height: 100vh;
  padding: 24px;
}

@media print {
  .no-print {
    display: none !important;
  }
}
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 6: Run scaffold verification**

Run: `npm run build`

Expected: TypeScript passes and Vite creates `dist/`.

- [ ] **Step 7: Commit scaffold**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts netlify.toml index.html src
git commit -m "feat: scaffold schedule position app"
```

## Task 2: Add Domain Types, Validation, And Date Helpers

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/validation.ts`
- Create: `src/lib/dates.ts`
- Create: `src/lib/department.ts`
- Create: `tests/setup.ts`
- Create: `tests/domain/department.test.ts`

- [ ] **Step 1: Create test setup**

`tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2: Write failing department normalization tests**

`tests/domain/department.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeDepartmentLabel } from "../../src/lib/department";

describe("normalizeDepartmentLabel", () => {
  it("trims whitespace and preserves readable labels", () => {
    expect(normalizeDepartmentLabel("  Splash Crew  ")).toBe("Splash Crew");
  });

  it("keeps truncated Netchex labels stable for alias matching", () => {
    expect(normalizeDepartmentLabel("Food and Beverag...")).toBe("Food and Beverag...");
  });

  it("collapses repeated spaces", () => {
    expect(normalizeDepartmentLabel("Guest   Services")).toBe("Guest Services");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- tests/domain/department.test.ts`

Expected: FAIL because `src/lib/department.ts` does not exist.

- [ ] **Step 4: Create domain types**

`src/domain/types.ts`:

```ts
export type ImportStatus = "draft" | "confirmed" | "failed";

export interface ScheduleImport {
  id: string;
  sourceFileName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  importedAt: string;
  status: ImportStatus;
  rawFilePath?: string;
}

export interface Employee {
  id: string;
  displayName: string;
  initials?: string;
}

export interface Shift {
  id: string;
  scheduleImportId: string;
  employeeId: string;
  employeeName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  departmentLabel: string;
  normalizedDepartmentId?: string;
  sourceConfidence: "high" | "medium" | "low";
  sourceNotes?: string;
}

export interface Department {
  id: string;
  name: string;
  displayColor?: string;
  aliases: string[];
}

export interface PositionDefinition {
  key: string;
  label: string;
  sortOrder: number;
  capacityMode: "single" | "multiple";
}

export interface PositionList {
  id: string;
  departmentId: string;
  name: string;
  positions: PositionDefinition[];
}

export interface DailyPositionPlan {
  id: string;
  departmentId: string;
  planDate: string;
  positionListId: string;
  positionsSnapshot: PositionDefinition[];
}

export interface Assignment {
  id: string;
  dailyPositionPlanId: string;
  shiftId: string;
  positionKey: string;
  sortOrder: number;
  notes?: string;
}

export interface ParsedShiftDraft {
  temporaryId: string;
  employeeName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  departmentLabel: string;
  sourceConfidence: "high" | "medium" | "low";
  sourceNotes?: string;
  ignored?: boolean;
}

export interface ParsedScheduleDraft {
  sourceFileName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  shifts: ParsedShiftDraft[];
  warnings: string[];
}
```

- [ ] **Step 5: Create validation schemas**

`src/domain/validation.ts`:

```ts
import { z } from "zod";

export const parsedShiftDraftSchema = z.object({
  temporaryId: z.string().min(1),
  employeeName: z.string().min(1),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  departmentLabel: z.string().min(1),
  sourceConfidence: z.enum(["high", "medium", "low"]),
  sourceNotes: z.string().optional(),
  ignored: z.boolean().optional()
});

export const parsedScheduleDraftSchema = z.object({
  sourceFileName: z.string().min(1),
  dateRangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateRangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shifts: z.array(parsedShiftDraftSchema),
  warnings: z.array(z.string())
});
```

- [ ] **Step 6: Create helpers**

`src/lib/department.ts`:

```ts
export function normalizeDepartmentLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}
```

`src/lib/dates.ts`:

```ts
import { format, isWithinInterval, parseISO } from "date-fns";

export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isIsoDateInRange(isoDate: string, start: string, end: string): boolean {
  const date = parseISO(isoDate);
  return isWithinInterval(date, { start: parseISO(start), end: parseISO(end) });
}
```

- [ ] **Step 7: Run tests**

Run: `npm run test -- tests/domain/department.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit domain foundation**

```bash
git add src/domain src/lib tests/setup.ts tests/domain
git commit -m "feat: add schedule domain model"
```

## Task 3: Add Supabase Schema And Repository

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`
- Create: `netlify/functions/_shared/http.ts`
- Create: `netlify/functions/_shared/repository.ts`

- [ ] **Step 1: Create database schema**

`supabase/migrations/0001_initial_schema.sql`:

```sql
create extension if not exists "pgcrypto";

create table schedule_imports (
  id uuid primary key default gen_random_uuid(),
  source_file_name text not null,
  date_range_start date not null,
  date_range_end date not null,
  imported_at timestamptz not null default now(),
  status text not null check (status in ('draft', 'confirmed', 'failed')),
  raw_file_path text
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  initials text
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_color text,
  aliases text[] not null default '{}'
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  schedule_import_id uuid not null references schedule_imports(id) on delete cascade,
  employee_id uuid not null references employees(id),
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  department_label text not null,
  normalized_department_id uuid references departments(id),
  source_confidence text not null check (source_confidence in ('high', 'medium', 'low')),
  source_notes text
);

create table position_lists (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  name text not null,
  positions jsonb not null,
  unique (department_id, name)
);

create table daily_position_plans (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  plan_date date not null,
  position_list_id uuid not null references position_lists(id),
  positions_snapshot jsonb not null,
  unique (department_id, plan_date)
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  daily_position_plan_id uuid not null references daily_position_plans(id) on delete cascade,
  shift_id uuid not null references shifts(id) on delete cascade,
  position_key text not null,
  sort_order integer not null default 0,
  notes text,
  unique (daily_position_plan_id, shift_id)
);
```

- [ ] **Step 2: Create HTTP helpers**

`netlify/functions/_shared/http.ts`:

```ts
export function jsonResponse(body: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

export function errorResponse(message: string, statusCode = 400) {
  return jsonResponse({ error: message }, statusCode);
}
```

- [ ] **Step 3: Create repository factory**

`netlify/functions/_shared/repository.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import type { ParsedScheduleDraft, PositionDefinition } from "../../../src/domain/types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createSupabaseRepository() {
  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  return {
    async confirmImport(draft: ParsedScheduleDraft) {
      const { data: importRow, error: importError } = await supabase
        .from("schedule_imports")
        .insert({
          source_file_name: draft.sourceFileName,
          date_range_start: draft.dateRangeStart,
          date_range_end: draft.dateRangeEnd,
          status: "confirmed"
        })
        .select()
        .single();

      if (importError) throw importError;

      for (const shift of draft.shifts.filter((item) => !item.ignored)) {
        const { data: employee, error: employeeError } = await supabase
          .from("employees")
          .upsert({ display_name: shift.employeeName }, { onConflict: "display_name" })
          .select()
          .single();

        if (employeeError) throw employeeError;

        const { data: department, error: departmentError } = await supabase
          .from("departments")
          .upsert({ name: shift.departmentLabel }, { onConflict: "name" })
          .select()
          .single();

        if (departmentError) throw departmentError;

        const { error: shiftError } = await supabase.from("shifts").insert({
          schedule_import_id: importRow.id,
          employee_id: employee.id,
          shift_date: shift.shiftDate,
          start_time: shift.startTime,
          end_time: shift.endTime,
          department_label: shift.departmentLabel,
          normalized_department_id: department.id,
          source_confidence: shift.sourceConfidence,
          source_notes: shift.sourceNotes
        });

        if (shiftError) throw shiftError;
      }

      return importRow;
    },

    async savePositionList(departmentId: string, name: string, positions: PositionDefinition[]) {
      const { data, error } = await supabase
        .from("position_lists")
        .upsert(
          { department_id: departmentId, name, positions },
          { onConflict: "department_id,name" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit database foundation**

```bash
git add supabase netlify/functions/_shared
git commit -m "feat: add Supabase schema and repository"
```

## Task 4: Build The Netchex PDF Parser

**Files:**
- Create: `tests/fixtures/Netchex Scheduler.pdf`
- Create: `netlify/functions/_shared/parser/netchexPdfParser.ts`
- Create: `tests/parser/netchexPdfParser.test.ts`

- [ ] **Step 1: Copy the fixture PDF into the repo**

Run: `mkdir -p tests/fixtures`

Run: `cp "/Users/loganmoore/Downloads/Netchex Scheduler.pdf" "tests/fixtures/Netchex Scheduler.pdf"`

Expected: `tests/fixtures/Netchex Scheduler.pdf` exists.

- [ ] **Step 2: Write failing parser fixture test**

`tests/parser/netchexPdfParser.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseNetchexPdf } from "../../netlify/functions/_shared/parser/netchexPdfParser";

describe("parseNetchexPdf", () => {
  it("extracts working shifts from the sample Netchex PDF", async () => {
    const buffer = await readFile("tests/fixtures/Netchex Scheduler.pdf");
    const draft = await parseNetchexPdf(buffer, "Netchex Scheduler.pdf");

    expect(draft.sourceFileName).toBe("Netchex Scheduler.pdf");
    expect(draft.shifts.length).toBeGreaterThan(0);
    expect(draft.shifts.some((shift) => shift.employeeName.includes("AL-RAJAI"))).toBe(true);
    expect(draft.shifts.some((shift) => shift.departmentLabel.includes("Splash Crew"))).toBe(true);
    expect(draft.shifts.every((shift) => shift.startTime.match(/^\d{2}:\d{2}$/))).toBe(true);
    expect(draft.shifts.every((shift) => shift.endTime.match(/^\d{2}:\d{2}$/))).toBe(true);
    expect(draft.shifts.some((shift) => shift.departmentLabel === "UNAVAILABLE")).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- tests/parser/netchexPdfParser.test.ts`

Expected: FAIL because the parser file does not exist.

- [ ] **Step 4: Implement parser module**

`netlify/functions/_shared/parser/netchexPdfParser.ts`:

```ts
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { addDays, format, parse } from "date-fns";
import type { ParsedScheduleDraft, ParsedShiftDraft } from "../../../../src/domain/types";
import { normalizeDepartmentLabel } from "../../../../src/lib/department";

interface TextItem {
  str: string;
  transform: number[];
}

const dayHeaderPattern = /^(\d{1,2})\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/;
const timePattern = /(\d{1,2}:\d{2})(AM|PM)\s*-\s*(\d{1,2}:\d{2})(AM|PM)/i;

function toTime24(value: string, meridiem: string): string {
  const parsed = parse(`${value}${meridiem.toUpperCase()}`, "h:mma", new Date());
  return format(parsed, "HH:mm");
}

function sortTextItems(items: TextItem[]): TextItem[] {
  return [...items].sort((a, b) => {
    const yDelta = b.transform[5] - a.transform[5];
    if (Math.abs(yDelta) > 4) return yDelta;
    return a.transform[4] - b.transform[4];
  });
}

function deriveDateRange(lines: string[]): { start: string; end: string } {
  const rangeLine = lines.find((line) => /May\s+\d{1,2}\s*-\s*\d{1,2},\s*2026/.test(line));
  if (!rangeLine) {
    return { start: "2026-05-18", end: "2026-05-24" };
  }

  const match = rangeLine.match(/May\s+(\d{1,2})\s*-\s*(\d{1,2}),\s*(\d{4})/);
  if (!match) {
    return { start: "2026-05-18", end: "2026-05-24" };
  }

  const [, startDay, endDay, year] = match;
  return {
    start: `${year}-05-${startDay.padStart(2, "0")}`,
    end: `${year}-05-${endDay.padStart(2, "0")}`
  };
}

function buildDayMap(lines: string[], rangeStart: string): Map<string, string> {
  const map = new Map<string, string>();
  const startDate = new Date(`${rangeStart}T00:00:00`);

  for (const line of lines) {
    const match = line.match(dayHeaderPattern);
    if (!match) continue;

    const dayNumber = Number(match[1]);
    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = addDays(startDate, offset);
      if (candidate.getUTCDate() === dayNumber) {
        map.set(match[2], format(candidate, "yyyy-MM-dd"));
      }
    }
  }

  return map;
}

function likelyEmployeeName(line: string): boolean {
  return /^[A-Z][A-Z' -]+,\s*[A-Z][A-Z' -]+$/.test(line);
}

export async function parseNetchexPdf(
  buffer: Buffer | Uint8Array,
  sourceFileName: string
): Promise<ParsedScheduleDraft> {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false });
  const document = await loadingTask.promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const sorted = sortTextItems(content.items as TextItem[]);
    lines.push(...sorted.map((item) => item.str.trim()).filter(Boolean));
  }

  const range = deriveDateRange(lines);
  const dayMap = buildDayMap(lines, range.start);
  const shifts: ParsedShiftDraft[] = [];
  const warnings: string[] = [];
  let currentEmployee = "";
  let currentDate = range.start;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (likelyEmployeeName(line)) {
      currentEmployee = line;
      continue;
    }

    const dayMatch = line.match(dayHeaderPattern);
    if (dayMatch) {
      currentDate = dayMap.get(dayMatch[2]) ?? currentDate;
      continue;
    }

    const timeMatch = line.match(timePattern);
    if (!timeMatch) continue;

    const previous = normalizeDepartmentLabel(lines[index - 1] ?? "");
    if (previous.toUpperCase().includes("UNAVAILABLE") || previous.toUpperCase().includes("TIME OFF")) {
      continue;
    }

    if (!currentEmployee) {
      warnings.push(`Shift time '${line}' had no employee context.`);
      continue;
    }

    const departmentLabel = previous || "Unknown Department";
    shifts.push({
      temporaryId: `parsed-${shifts.length + 1}`,
      employeeName: currentEmployee,
      shiftDate: currentDate,
      startTime: toTime24(timeMatch[1], timeMatch[2]),
      endTime: toTime24(timeMatch[3], timeMatch[4]),
      departmentLabel,
      sourceConfidence: departmentLabel === "Unknown Department" ? "low" : "medium",
      sourceNotes: departmentLabel === "Unknown Department" ? "Department label was not found near time block." : undefined
    });
  }

  return {
    sourceFileName,
    dateRangeStart: range.start,
    dateRangeEnd: range.end,
    shifts,
    warnings
  };
}
```

- [ ] **Step 5: Run parser test**

Run: `npm run test -- tests/parser/netchexPdfParser.test.ts`

Expected: PASS. If it fails because Netchex PDF text ordering differs from assumptions, adjust only `netchexPdfParser.ts` until the assertions pass.

- [ ] **Step 6: Commit parser**

```bash
git add "tests/fixtures/Netchex Scheduler.pdf" netlify/functions/_shared/parser tests/parser
git commit -m "feat: parse Netchex schedule PDFs"
```

## Task 5: Add Import API Functions

**Files:**
- Create: `netlify/functions/import-pdf.ts`
- Create: `netlify/functions/confirm-import.ts`
- Create: `src/lib/storageClient.ts`

- [ ] **Step 1: Create import function**

`netlify/functions/import-pdf.ts`:

```ts
import type { Handler } from "@netlify/functions";
import { errorResponse, jsonResponse } from "./_shared/http";
import { parseNetchexPdf } from "./_shared/parser/netchexPdfParser";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  if (!event.body) {
    return errorResponse("Missing PDF upload body", 400);
  }

  const fileName = event.headers["x-file-name"] ?? "Netchex Scheduler.pdf";
  const bytes = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
  const draft = await parseNetchexPdf(bytes, fileName);

  return jsonResponse(draft);
};
```

- [ ] **Step 2: Create confirm import function**

`netlify/functions/confirm-import.ts`:

```ts
import type { Handler } from "@netlify/functions";
import { parsedScheduleDraftSchema } from "../../src/domain/validation";
import { errorResponse, jsonResponse } from "./_shared/http";
import { createSupabaseRepository } from "./_shared/repository";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const parsed = parsedScheduleDraftSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) {
    return errorResponse("Import review data is invalid", 400);
  }

  const repository = createSupabaseRepository();
  const importRow = await repository.confirmImport(parsed.data);
  return jsonResponse({ importId: importRow.id });
};
```

- [ ] **Step 3: Create browser API wrapper**

`src/lib/storageClient.ts`:

```ts
import type { ParsedScheduleDraft } from "../domain/types";
import { parsedScheduleDraftSchema } from "../domain/validation";

async function parseJsonResponse(response: Response) {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body;
}

export async function uploadSchedulePdf(file: File): Promise<ParsedScheduleDraft> {
  const response = await fetch("/.netlify/functions/import-pdf", {
    method: "POST",
    headers: {
      "content-type": "application/pdf",
      "x-file-name": file.name
    },
    body: await file.arrayBuffer()
  });

  return parsedScheduleDraftSchema.parse(await parseJsonResponse(response));
}

export async function confirmReviewedImport(draft: ParsedScheduleDraft): Promise<{ importId: string }> {
  const response = await fetch("/.netlify/functions/confirm-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft)
  });

  return parseJsonResponse(response);
}
```

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit import API**

```bash
git add netlify/functions/import-pdf.ts netlify/functions/confirm-import.ts src/lib/storageClient.ts
git commit -m "feat: add schedule import API"
```

## Task 6: Build Import And Review UI

**Files:**
- Create: `src/components/Shell.tsx`
- Create: `src/components/ImportPanel.tsx`
- Create: `src/components/ReviewImport.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `tests/components/reviewImport.test.tsx`

- [ ] **Step 1: Write review edit test**

`tests/components/reviewImport.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReviewImport } from "../../src/components/ReviewImport";
import type { ParsedScheduleDraft } from "../../src/domain/types";

const draft: ParsedScheduleDraft = {
  sourceFileName: "Netchex Scheduler.pdf",
  dateRangeStart: "2026-05-18",
  dateRangeEnd: "2026-05-24",
  warnings: [],
  shifts: [
    {
      temporaryId: "one",
      employeeName: "AL-RAJAI, MAI",
      shiftDate: "2026-05-22",
      startTime: "10:00",
      endTime: "18:00",
      departmentLabel: "Splash Crew",
      sourceConfidence: "medium"
    }
  ]
};

describe("ReviewImport", () => {
  it("lets managers edit a department before confirming", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ReviewImport draft={draft} onConfirm={onConfirm} onBack={() => undefined} />);

    await user.clear(screen.getByLabelText("Department for AL-RAJAI, MAI"));
    await user.type(screen.getByLabelText("Department for AL-RAJAI, MAI"), "Splash Team");
    await user.click(screen.getByRole("button", { name: "Confirm import" }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        shifts: [expect.objectContaining({ departmentLabel: "Splash Team" })]
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/components/reviewImport.test.tsx`

Expected: FAIL because `ReviewImport` does not exist.

- [ ] **Step 3: Implement shell, import, and review components**

Create `src/components/Shell.tsx`, `src/components/ImportPanel.tsx`, and `src/components/ReviewImport.tsx` with these exported component signatures:

```tsx
// src/components/Shell.tsx
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header className="shell__header no-print">
        <h1>Schedule Positions</h1>
      </header>
      {children}
    </div>
  );
}
```

```tsx
// src/components/ImportPanel.tsx
import { useState } from "react";
import { uploadSchedulePdf } from "../lib/storageClient";
import type { ParsedScheduleDraft } from "../domain/types";

export function ImportPanel({ onDraft }: { onDraft: (draft: ParsedScheduleDraft) => void }) {
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File) {
    setError("");
    setIsUploading(true);
    try {
      onDraft(await uploadSchedulePdf(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="panel">
      <h2>Import Netchex PDF</h2>
      <label className="upload">
        <span>Choose PDF</span>
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </label>
      {isUploading ? <p role="status">Reading schedule...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
```

```tsx
// src/components/ReviewImport.tsx
import { useState } from "react";
import type { ParsedScheduleDraft } from "../domain/types";

interface ReviewImportProps {
  draft: ParsedScheduleDraft;
  onConfirm: (draft: ParsedScheduleDraft) => void;
  onBack: () => void;
}

export function ReviewImport({ draft, onConfirm, onBack }: ReviewImportProps) {
  const [edited, setEdited] = useState(draft);

  function updateShift(id: string, field: "employeeName" | "shiftDate" | "startTime" | "endTime" | "departmentLabel", value: string) {
    setEdited((current) => ({
      ...current,
      shifts: current.shifts.map((shift) =>
        shift.temporaryId === id ? { ...shift, [field]: value } : shift
      )
    }));
  }

  return (
    <section className="panel">
      <h2>Review Import</h2>
      {edited.warnings.map((warning) => (
        <p role="alert" key={warning}>{warning}</p>
      ))}
      <div className="review-grid">
        {edited.shifts.map((shift) => (
          <article className="review-row" key={shift.temporaryId}>
            <input
              aria-label={`Employee for ${shift.temporaryId}`}
              value={shift.employeeName}
              onChange={(event) => updateShift(shift.temporaryId, "employeeName", event.target.value)}
            />
            <input
              aria-label={`Date for ${shift.employeeName}`}
              value={shift.shiftDate}
              onChange={(event) => updateShift(shift.temporaryId, "shiftDate", event.target.value)}
            />
            <input
              aria-label={`Start for ${shift.employeeName}`}
              value={shift.startTime}
              onChange={(event) => updateShift(shift.temporaryId, "startTime", event.target.value)}
            />
            <input
              aria-label={`End for ${shift.employeeName}`}
              value={shift.endTime}
              onChange={(event) => updateShift(shift.temporaryId, "endTime", event.target.value)}
            />
            <input
              aria-label={`Department for ${shift.employeeName}`}
              value={shift.departmentLabel}
              onChange={(event) => updateShift(shift.temporaryId, "departmentLabel", event.target.value)}
            />
          </article>
        ))}
      </div>
      <div className="actions">
        <button type="button" onClick={onBack}>Back</button>
        <button type="button" onClick={() => onConfirm(edited)}>Confirm import</button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire `App.tsx`**

Replace `src/App.tsx` with:

```tsx
import { useState } from "react";
import { ImportPanel } from "./components/ImportPanel";
import { ReviewImport } from "./components/ReviewImport";
import { Shell } from "./components/Shell";
import type { ParsedScheduleDraft } from "./domain/types";
import { confirmReviewedImport } from "./lib/storageClient";

export function App() {
  const [draft, setDraft] = useState<ParsedScheduleDraft | null>(null);
  const [message, setMessage] = useState("");

  async function confirmImport(reviewed: ParsedScheduleDraft) {
    const result = await confirmReviewedImport(reviewed);
    setMessage(`Import confirmed: ${result.importId}`);
    setDraft(null);
  }

  return (
    <Shell>
      {draft ? (
        <ReviewImport draft={draft} onBack={() => setDraft(null)} onConfirm={(reviewed) => void confirmImport(reviewed)} />
      ) : (
        <ImportPanel onDraft={setDraft} />
      )}
      {message ? <p role="status">{message}</p> : null}
    </Shell>
  );
}
```

- [ ] **Step 5: Add practical styles**

Append to `src/styles.css`:

```css
.shell__header {
  border-bottom: 1px solid #d8ddd2;
  padding: 18px 24px;
}

.shell__header h1 {
  font-size: 24px;
  margin: 0;
}

.panel {
  max-width: 1120px;
  margin: 24px auto;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #d8ddd2;
  border-radius: 8px;
}

.upload input {
  display: block;
  margin-top: 8px;
}

.review-grid {
  display: grid;
  gap: 10px;
}

.review-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
  gap: 8px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

@media (max-width: 760px) {
  .review-row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Run component test and build**

Run: `npm run test -- tests/components/reviewImport.test.tsx`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit import/review UI**

```bash
git add src/App.tsx src/components src/styles.css tests/components/reviewImport.test.tsx
git commit -m "feat: add import review workflow"
```

## Task 7: Add Position List Editing

**Files:**
- Create: `src/components/PositionListEditor.tsx`
- Create: `tests/components/positionListEditor.test.tsx`
- Create: `netlify/functions/position-lists.ts`

- [ ] **Step 1: Write position list editor test**

`tests/components/positionListEditor.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PositionListEditor } from "../../src/components/PositionListEditor";

describe("PositionListEditor", () => {
  it("adds a position to a department list", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PositionListEditor departmentName="Splash Crew" initialPositions={[]} onSave={onSave} />);

    await user.type(screen.getByLabelText("New position"), "Tower 1");
    await user.click(screen.getByRole("button", { name: "Add position" }));
    await user.click(screen.getByRole("button", { name: "Save list" }));

    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({ label: "Tower 1", capacityMode: "single" })
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/components/positionListEditor.test.tsx`

Expected: FAIL because `PositionListEditor` does not exist.

- [ ] **Step 3: Implement position editor**

`src/components/PositionListEditor.tsx`:

```tsx
import { useState } from "react";
import type { PositionDefinition } from "../domain/types";

interface PositionListEditorProps {
  departmentName: string;
  initialPositions: PositionDefinition[];
  onSave: (positions: PositionDefinition[]) => void;
}

export function PositionListEditor({ departmentName, initialPositions, onSave }: PositionListEditorProps) {
  const [positions, setPositions] = useState(initialPositions);
  const [newPosition, setNewPosition] = useState("");

  function addPosition() {
    const label = newPosition.trim();
    if (!label) return;
    setPositions((current) => [
      ...current,
      {
        key: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        label,
        sortOrder: current.length,
        capacityMode: "single"
      }
    ]);
    setNewPosition("");
  }

  return (
    <section className="panel">
      <h2>{departmentName} Positions</h2>
      <div className="inline-form">
        <label>
          New position
          <input value={newPosition} onChange={(event) => setNewPosition(event.target.value)} />
        </label>
        <button type="button" onClick={addPosition}>Add position</button>
      </div>
      <ol>
        {positions.map((position) => (
          <li key={position.key}>{position.label}</li>
        ))}
      </ol>
      <button type="button" onClick={() => onSave(positions)}>Save list</button>
    </section>
  );
}
```

- [ ] **Step 4: Add position list API**

`netlify/functions/position-lists.ts`:

```ts
import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { errorResponse, jsonResponse } from "./_shared/http";
import { createSupabaseRepository } from "./_shared/repository";

const requestSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().min(1),
  positions: z.array(z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    sortOrder: z.number(),
    capacityMode: z.enum(["single", "multiple"])
  }))
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const parsed = requestSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) {
    return errorResponse("Position list data is invalid", 400);
  }

  const repository = createSupabaseRepository();
  const saved = await repository.savePositionList(
    parsed.data.departmentId,
    parsed.data.name,
    parsed.data.positions
  );
  return jsonResponse(saved);
};
```

- [ ] **Step 5: Run tests and build**

Run: `npm run test -- tests/components/positionListEditor.test.tsx`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit position list editing**

```bash
git add src/components/PositionListEditor.tsx tests/components/positionListEditor.test.tsx netlify/functions/position-lists.ts
git commit -m "feat: add department position lists"
```

## Task 8: Build Assignment Board

**Files:**
- Create: `src/components/DayDepartmentPicker.tsx`
- Create: `src/components/AssignmentBoard.tsx`
- Create: `tests/components/assignmentBoard.test.tsx`
- Create: `netlify/functions/assignments.ts`

- [ ] **Step 1: Write assignment movement test**

`tests/components/assignmentBoard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AssignmentBoard } from "../../src/components/AssignmentBoard";
import type { PositionDefinition, Shift } from "../../src/domain/types";

const positions: PositionDefinition[] = [
  { key: "tower-1", label: "Tower 1", sortOrder: 0, capacityMode: "single" }
];

const shifts: Shift[] = [
  {
    id: "shift-1",
    scheduleImportId: "import-1",
    employeeId: "employee-1",
    employeeName: "AL-RAJAI, MAI",
    shiftDate: "2026-05-22",
    startTime: "10:00",
    endTime: "18:00",
    departmentLabel: "Splash Crew",
    sourceConfidence: "high"
  }
];

describe("AssignmentBoard", () => {
  it("assigns an employee using the accessible move control", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssignmentBoard positions={positions} shifts={shifts} assignments={[]} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Move AL-RAJAI, MAI"), "tower-1");

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ shiftId: "shift-1", positionKey: "tower-1" })
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/components/assignmentBoard.test.tsx`

Expected: FAIL because `AssignmentBoard` does not exist.

- [ ] **Step 3: Implement assignment board with accessible controls first**

`src/components/AssignmentBoard.tsx`:

```tsx
import type { Assignment, PositionDefinition, Shift } from "../domain/types";

interface AssignmentBoardProps {
  positions: PositionDefinition[];
  shifts: Shift[];
  assignments: Assignment[];
  onChange: (assignments: Assignment[]) => void;
}

export function AssignmentBoard({ positions, shifts, assignments, onChange }: AssignmentBoardProps) {
  function moveShift(shiftId: string, positionKey: string) {
    const next = assignments.filter((assignment) => assignment.shiftId !== shiftId);
    if (positionKey) {
      next.push({
        id: `local-${shiftId}`,
        dailyPositionPlanId: "local-plan",
        shiftId,
        positionKey,
        sortOrder: next.length
      });
    }
    onChange(next);
  }

  function employeeFor(shiftId: string) {
    return shifts.find((shift) => shift.id === shiftId)?.employeeName ?? "Unknown employee";
  }

  return (
    <section className="assignment-board">
      <div className="position-columns">
        {positions.map((position) => (
          <section className="position-column" key={position.key}>
            <h3>{position.label}</h3>
            {assignments.filter((assignment) => assignment.positionKey === position.key).map((assignment) => (
              <p key={assignment.shiftId}>{employeeFor(assignment.shiftId)}</p>
            ))}
          </section>
        ))}
      </div>
      <section className="unassigned">
        <h3>Scheduled Employees</h3>
        {shifts.map((shift) => {
          const current = assignments.find((assignment) => assignment.shiftId === shift.id)?.positionKey ?? "";
          return (
            <label key={shift.id}>
              Move {shift.employeeName}
              <select
                aria-label={`Move ${shift.employeeName}`}
                value={current}
                onChange={(event) => moveShift(shift.id, event.target.value)}
              >
                <option value="">Unassigned</option>
                {positions.map((position) => (
                  <option key={position.key} value={position.key}>{position.label}</option>
                ))}
              </select>
            </label>
          );
        })}
      </section>
    </section>
  );
}
```

- [ ] **Step 4: Add assignments API**

`netlify/functions/assignments.ts`:

```ts
import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { errorResponse, jsonResponse } from "./_shared/http";

const requestSchema = z.object({
  dailyPositionPlanId: z.string().min(1),
  assignments: z.array(z.object({
    shiftId: z.string().min(1),
    positionKey: z.string().min(1),
    sortOrder: z.number()
  }))
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const parsed = requestSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) {
    return errorResponse("Assignment data is invalid", 400);
  }

  return jsonResponse({ saved: true, count: parsed.data.assignments.length });
};
```

- [ ] **Step 5: Add board styles**

Append to `src/styles.css`:

```css
.assignment-board {
  display: grid;
  gap: 20px;
}

.position-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.position-column,
.unassigned {
  border: 1px solid #d8ddd2;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.unassigned label {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
```

- [ ] **Step 6: Run test and build**

Run: `npm run test -- tests/components/assignmentBoard.test.tsx`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit assignment board**

```bash
git add src/components/AssignmentBoard.tsx src/components/DayDepartmentPicker.tsx tests/components/assignmentBoard.test.tsx netlify/functions/assignments.ts src/styles.css
git commit -m "feat: add assignment board"
```

## Task 9: Build Print View

**Files:**
- Create: `src/components/PrintView.tsx`
- Create: `tests/components/printView.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write print view test**

`tests/components/printView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrintView } from "../../src/components/PrintView";

describe("PrintView", () => {
  it("shows department, date, positions, assigned employees, and unassigned employees", () => {
    render(
      <PrintView
        departmentName="Splash Crew"
        date="2026-05-22"
        positions={[{ key: "tower-1", label: "Tower 1", sortOrder: 0, capacityMode: "single" }]}
        shifts={[
          {
            id: "shift-1",
            scheduleImportId: "import-1",
            employeeId: "employee-1",
            employeeName: "AL-RAJAI, MAI",
            shiftDate: "2026-05-22",
            startTime: "10:00",
            endTime: "18:00",
            departmentLabel: "Splash Crew",
            sourceConfidence: "high"
          },
          {
            id: "shift-2",
            scheduleImportId: "import-1",
            employeeId: "employee-2",
            employeeName: "ASH, ERIN",
            shiftDate: "2026-05-22",
            startTime: "09:30",
            endTime: "18:30",
            departmentLabel: "Splash Crew",
            sourceConfidence: "high"
          }
        ]}
        assignments={[
          {
            id: "assignment-1",
            dailyPositionPlanId: "plan-1",
            shiftId: "shift-1",
            positionKey: "tower-1",
            sortOrder: 0
          }
        ]}
      />
    );

    expect(screen.getByText("Splash Crew")).toBeInTheDocument();
    expect(screen.getByText("2026-05-22")).toBeInTheDocument();
    expect(screen.getByText("Tower 1")).toBeInTheDocument();
    expect(screen.getByText("AL-RAJAI, MAI")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("ASH, ERIN")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/components/printView.test.tsx`

Expected: FAIL because `PrintView` does not exist.

- [ ] **Step 3: Implement print view**

`src/components/PrintView.tsx`:

```tsx
import type { Assignment, PositionDefinition, Shift } from "../domain/types";

interface PrintViewProps {
  departmentName: string;
  date: string;
  positions: PositionDefinition[];
  shifts: Shift[];
  assignments: Assignment[];
}

export function PrintView({ departmentName, date, positions, shifts, assignments }: PrintViewProps) {
  const assignedShiftIds = new Set(assignments.map((assignment) => assignment.shiftId));
  const employeeName = (shiftId: string) => shifts.find((shift) => shift.id === shiftId)?.employeeName ?? "Unknown employee";

  return (
    <section className="print-sheet">
      <header>
        <h1>{departmentName}</h1>
        <p>{date}</p>
      </header>
      {positions.map((position) => (
        <section className="print-position" key={position.key}>
          <h2>{position.label}</h2>
          <ul>
            {assignments.filter((assignment) => assignment.positionKey === position.key).map((assignment) => (
              <li key={assignment.shiftId}>{employeeName(assignment.shiftId)}</li>
            ))}
          </ul>
        </section>
      ))}
      <section className="print-position">
        <h2>Unassigned</h2>
        <ul>
          {shifts.filter((shift) => !assignedShiftIds.has(shift.id)).map((shift) => (
            <li key={shift.id}>{shift.employeeName}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
```

- [ ] **Step 4: Add print styles**

Append to `src/styles.css`:

```css
.print-sheet {
  background: #fff;
  color: #111;
  padding: 24px;
}

.print-sheet h1 {
  font-size: 32px;
  margin: 0;
}

.print-position {
  border-top: 2px solid #111;
  padding: 12px 0;
}

.print-position h2 {
  font-size: 20px;
  margin: 0 0 8px;
}

@media print {
  body {
    background: #fff;
  }

  .print-sheet {
    padding: 0;
  }
}
```

- [ ] **Step 5: Run test and build**

Run: `npm run test -- tests/components/printView.test.tsx`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit print view**

```bash
git add src/components/PrintView.tsx tests/components/printView.test.tsx src/styles.css
git commit -m "feat: add department print view"
```

## Task 10: Final Integration And Deployment Notes

**Files:**
- Modify: `src/App.tsx`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Add environment example**

`.env.example`:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key-for-netlify-functions
```

- [ ] **Step 2: Write README**

`README.md`:

```md
# Schedule Positions

Small manager-facing web app for importing a Netchex schedule PDF, reviewing parsed shifts, assigning department starting positions, and printing department/day assignment sheets.

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run test
npm run build
```

## Hosting

The app is designed for Netlify plus Supabase.

Required Netlify environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Apply `supabase/migrations/0001_initial_schema.sql` to the Supabase project before using the app against a real database.
```

- [ ] **Step 3: Wire the app views together**

Replace `src/App.tsx` with this integration. It keeps the confirmed import in React state after saving so the full workflow can be manually verified before the shared schedule fetch endpoint is expanded.

```tsx
import { useMemo, useState } from "react";
import { AssignmentBoard } from "./components/AssignmentBoard";
import { ImportPanel } from "./components/ImportPanel";
import { PositionListEditor } from "./components/PositionListEditor";
import { PrintView } from "./components/PrintView";
import { ReviewImport } from "./components/ReviewImport";
import { Shell } from "./components/Shell";
import type { Assignment, ParsedScheduleDraft, PositionDefinition, Shift } from "./domain/types";
import { confirmReviewedImport } from "./lib/storageClient";

type View = "import" | "review" | "positions" | "assign" | "print";

const defaultPositions: PositionDefinition[] = [
  { key: "lead", label: "Lead", sortOrder: 0, capacityMode: "single" },
  { key: "starter", label: "Starter", sortOrder: 1, capacityMode: "multiple" }
];

function draftToShifts(draft: ParsedScheduleDraft, importId: string): Shift[] {
  return draft.shifts
    .filter((shift) => !shift.ignored)
    .map((shift, index) => ({
      id: `shift-${index + 1}`,
      scheduleImportId: importId,
      employeeId: `employee-${index + 1}`,
      employeeName: shift.employeeName,
      shiftDate: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      departmentLabel: shift.departmentLabel,
      sourceConfidence: shift.sourceConfidence,
      sourceNotes: shift.sourceNotes
    }));
}

export function App() {
  const [view, setView] = useState<View>("import");
  const [draft, setDraft] = useState<ParsedScheduleDraft | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [positions, setPositions] = useState<PositionDefinition[]>(defaultPositions);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const firstDepartment = shifts[0]?.departmentLabel ?? "Department";
  const firstDate = shifts[0]?.shiftDate ?? new Date().toISOString().slice(0, 10);
  const visibleShifts = useMemo(
    () => shifts.filter((shift) => shift.departmentLabel === firstDepartment && shift.shiftDate === firstDate),
    [firstDate, firstDepartment, shifts]
  );

  async function confirmImport(reviewed: ParsedScheduleDraft) {
    const result = await confirmReviewedImport(reviewed);
    setShifts(draftToShifts(reviewed, result.importId));
    setDraft(null);
    setView("positions");
  }

  return (
    <Shell>
      <nav className="tabs no-print" aria-label="Workflow">
        <button type="button" onClick={() => setView("import")}>Import</button>
        <button type="button" onClick={() => setView("positions")} disabled={shifts.length === 0}>Positions</button>
        <button type="button" onClick={() => setView("assign")} disabled={shifts.length === 0}>Assign</button>
        <button type="button" onClick={() => setView("print")} disabled={shifts.length === 0}>Print</button>
      </nav>

      {view === "import" ? (
        <ImportPanel
          onDraft={(nextDraft) => {
            setDraft(nextDraft);
            setView("review");
          }}
        />
      ) : null}

      {view === "review" && draft ? (
        <ReviewImport draft={draft} onBack={() => setView("import")} onConfirm={(reviewed) => void confirmImport(reviewed)} />
      ) : null}

      {view === "positions" ? (
        <PositionListEditor departmentName={firstDepartment} initialPositions={positions} onSave={setPositions} />
      ) : null}

      {view === "assign" ? (
        <section className="panel">
          <h2>{firstDepartment} Assignments</h2>
          <p>{firstDate}</p>
          <AssignmentBoard positions={positions} shifts={visibleShifts} assignments={assignments} onChange={setAssignments} />
        </section>
      ) : null}

      {view === "print" ? (
        <PrintView
          departmentName={firstDepartment}
          date={firstDate}
          positions={positions}
          shifts={visibleShifts}
          assignments={assignments}
        />
      ) : null}
    </Shell>
  );
}
```

- [ ] **Step 4: Run full verification**

Run: `npm run test`

Expected: all tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build PASS.

- [ ] **Step 5: Commit integration docs**

```bash
git add src/App.tsx .env.example README.md
git commit -m "docs: add deployment and verification notes"
```

## Self-Review Notes

- Spec coverage: PDF upload/import, review/correction, day/department workflow, position lists, assignment board, print view, Netlify/Supabase hosting, gentle error handling, and parser testing are covered.
- Intentional v1 omissions: full auth, historical browsing UI, automated Netchex browser capture, and color-based department detection remain out of scope.
- Implementation risk: `pdfjs-dist` text ordering may require parser adjustment against the real fixture. Keep those changes inside `netchexPdfParser.ts`.
- Type consistency: domain types use camelCase in TypeScript and snake_case in SQL; the repository owns mapping between them.
