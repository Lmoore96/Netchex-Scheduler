# Netchex Schedule Position App Design

Date: 2026-05-19

## Goal

Build a small web app that lets managers import a Netchex scheduler PDF, review the parsed schedule, filter by department and day, assign scheduled employees to starting positions, and print one department-specific assignment sheet for employees.

The first version should be useful with the workflow managers already have:

1. Export the weekly schedule from Netchex as a PDF.
2. Upload the PDF into the app.
3. Review and correct parsed schedule data.
4. Pick a day and department.
5. Assign employees to starting positions.
6. Print a clean department sheet.

Automatic Netchex login, screenshotting, or browser capture is out of scope for v1. It can be explored later after the PDF upload workflow is reliable.

## Scope

### In Scope

- Hosted web app usable from managers' own devices.
- Netchex PDF upload.
- Schedule parsing from visible PDF text.
- Review and correction screen for imported schedule data.
- Current schedule view with day picker, defaulting to today when today is in the imported week.
- Department filtering based on shift department/job labels.
- Saved position lists per department.
- Daily selection of which position list applies to a department.
- Drag-and-drop assignment board, with accessible non-drag move controls if needed.
- Autosaved assignments.
- One-department, one-day print view.
- Lightweight shared access without a full user account system.

### Out of Scope For V1

- Full authentication and per-manager permissions.
- Historical schedule browsing UI.
- Automatic Netchex login, screenshot capture, or PDF export automation.
- Reliance on Netchex shift colors for department detection.
- Payroll, attendance, availability, break, or labor-cost features.
- Employee-facing self-service.

## Users

The app is for managers who need to see the current schedule, filter to their department, assign starting positions, and print the assignments for employees. Managers can see the whole schedule; no sensitive data separation is required for v1.

## Hosting Direction

Use a free-tier-friendly hosted architecture:

- Frontend and serverless functions: Netlify.
- Database: Supabase Postgres free tier.
- Optional file storage: Supabase Storage for uploaded PDFs.

Netlify's current pricing page lists a Free plan with deploys, custom domains with SSL, serverless functions, storage, and a monthly credit limit. Supabase's current pricing page lists a Free plan with a small Postgres database, file storage, and enough capacity for a lightweight internal tool. If usage grows, the app should be able to move to paid tiers without redesigning the product.

References:

- https://www.netlify.com/pricing/
- https://supabase.com/pricing

## Core Workflow

### Import

Managers upload the Netchex weekly schedule PDF. The import module attempts to extract:

- Employee name.
- Shift date.
- Shift start time.
- Shift end time.
- Department/job label from the shift block.

Department color is not required. The parser should ignore or mark non-working blocks such as unavailable/time-off entries so they do not become assignable shifts.

### Review

After parsing, managers see a review screen grouped by day and employee. Each parsed shift can be edited before confirmation. The app should flag issues such as:

- Missing or unclear employee name.
- Missing or unclear shift time.
- Missing or unclear department label.
- Duplicate-looking shifts.
- Unavailable/time-off blocks that were ignored or need confirmation.

The review step is required because the parser may not be perfect. The app should import what it can and let managers fix the rest instead of blocking the workflow.

### Schedule Board

After confirmation, the imported schedule becomes the current schedule. The board defaults to today when today is included in the imported week. Managers can switch to any day in the imported week.

Managers choose a department and see scheduled employees for that department/day. Employees not yet assigned to positions appear in an unassigned holding area.

### Position Lists

Each department can have saved position lists. A position list includes:

- List name.
- Ordered positions.
- Whether each position allows one employee or multiple employees.

Managers can create, edit, reorder, and delete positions in a list. On a given day, a manager can choose the saved list that applies and make day-specific tweaks before printing.

### Assignment

The assignment board lets managers place scheduled employees into positions.

Rules:

- Only employees scheduled for the selected department/day are assignable by default.
- Employees can be dragged from unassigned into a position.
- Employees can be moved between positions.
- Employees can be moved back to unassigned.
- Positions configured for one employee should prevent multiple assignments or warn clearly.
- Assignments autosave after changes.
- Saving state must be visible so managers know whether changes are pending or saved.

### Print

The print view is one department for one day. It should include:

- Date.
- Department name.
- Position names.
- Assigned employee names.
- Unassigned scheduled employees at the bottom, so nobody is missed.

The print layout should be clean, high contrast, and suitable for posting where employees arrive.

## Data Model

The app should store imports as dated records, even if the v1 UI mostly shows only the current schedule. This keeps future history features possible without changing the data foundation.

### ScheduleImport

- `id`
- `source_file_name`
- `date_range_start`
- `date_range_end`
- `imported_at`
- `status`
- `raw_file_path` optional

### Employee

- `id`
- `display_name`
- `initials` optional

### Shift

- `id`
- `schedule_import_id`
- `employee_id`
- `shift_date`
- `start_time`
- `end_time`
- `department_label`
- `normalized_department_id` optional
- `source_confidence`
- `source_notes` optional

### Department

- `id`
- `name`
- `display_color` optional, chosen inside the app
- `aliases`

Aliases let the app map truncated or variant Netchex labels, such as `Food and Beverag...`, to a clean department name.

### PositionList

- `id`
- `department_id`
- `name`
- `positions`

Each position should include a label, sort order, and capacity mode.

### DailyPositionPlan

- `id`
- `department_id`
- `plan_date`
- `position_list_id`
- `positions_snapshot`

The snapshot preserves the exact list used that day even if the saved template changes later.

### Assignment

- `id`
- `daily_position_plan_id`
- `shift_id`
- `position_key`
- `sort_order`
- `notes` optional

## Architecture

### Frontend

A responsive web interface with these screens:

- Import.
- Review Import.
- Schedule Board.
- Position Lists.
- Print View.

The UI should be practical and work-focused. Managers should be able to complete the daily task quickly on a laptop, tablet, or phone.

### Server Functions

Netlify functions handle:

- PDF upload request.
- PDF parsing.
- Import confirmation.
- Assignment mutations.
- Position list mutations.

PDF parsing should live in its own module with tests and fixtures so it can improve over time as more Netchex exports are collected.

### Database

Supabase stores departments, employees, shifts, position lists, daily plans, and assignments.

Uploaded PDF files may be stored in Supabase Storage during early development for debugging. For v1 production use, long-term PDF storage is optional and can be disabled if free-tier storage should be conserved.

## Error Handling

The app should fail gently:

- If upload fails, keep the user on the import screen and explain what to try.
- If parsing is partial, show parsed data plus warnings on the review screen.
- If assignment saving fails, show an error and keep the unsaved change visible.
- If the database is unavailable, avoid showing changes as saved.
- If a manager tries to print before all scheduled employees are assigned, show unassigned employees clearly rather than blocking print.

## Testing Plan

Use the provided Netchex Scheduler PDF as the first parser fixture.

Tests should cover:

- PDF parser extraction of names, dates, shift times, and department labels.
- Ignoring or flagging unavailable/time-off blocks.
- Review edits before import confirmation.
- Department alias normalization.
- Position list creation and editing.
- Assignment movement between unassigned and positions.
- Single-capacity and multi-capacity position behavior.
- Print view content for one department/day.
- Responsive behavior for manager devices.

## Future Enhancements

- Optional simple shared access code.
- Historical schedule browsing.
- Automatic Netchex export using a trusted computer or browser automation.
- Better department normalization suggestions.
- Department display colors chosen inside the app.
- CSV or Excel import if Netchex supports it later.
- Audit trail of assignment changes if needed.

## Open Decisions

No blocking product decisions remain for the v1 design. Implementation should still validate which PDF parsing library works best on Netlify functions and whether uploaded PDFs should be stored long term or discarded after parsing.
