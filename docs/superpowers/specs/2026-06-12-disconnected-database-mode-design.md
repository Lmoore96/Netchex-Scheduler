# Disconnected Database Mode Design

## Goal

Add a persistent admin toggle that lets managers use the application without contacting Supabase. In disconnected mode, managers import a PDF for their current schedule and the application stores working data in that device's browser.

## User Interface

- Add an `Admin` button in the application header.
- The button opens a compact admin menu.
- The menu contains a `Database connected` toggle and a short status label.
- The toggle value is saved in browser storage and changes only when a user changes it manually.
- When disconnected, show a visible `Local mode` status in the header so managers know data is device-specific.
- Hide or disable database-only controls when they are not meaningful. The import workflow remains available.

## Storage Modes

### Connected

Connected mode preserves the existing behavior:

- PDF parsing uses the Netlify import function.
- Confirmed schedules, saved schedules, position lists, manual shifts, assignment plans, and rotation plans use the existing Supabase-backed functions.
- Existing Supabase data is unchanged.

### Disconnected

Disconnected mode must not call Supabase-backed functions.

- PDF parsing still uses `/.netlify/functions/import-pdf`; parsing does not require database storage.
- The parsed PDF is converted directly into shifts with a locally generated schedule import ID.
- Imported schedules are stored in browser `localStorage`.
- Position lists are loaded, saved, and deleted in browser storage.
- Manual shifts are appended to the selected local schedule in browser storage.
- Assignment plans are saved and loaded by schedule, date, and department in browser storage.
- Rotation plans are saved and loaded by schedule and date in browser storage.
- Callouts and the current working schedule are restored locally so a refresh does not erase the day's work.
- The `Load Saved` tab lists local schedules rather than database schedules.

## Mode Switching

- The mode setting uses its own stable browser-storage key.
- Switching off the database immediately routes future reads and writes to local storage.
- Switching the database back on immediately restores the existing Supabase-backed behavior.
- Switching modes does not copy, merge, or delete data.
- Local data remains available if disconnected mode is selected again later.
- Database errors do not automatically change the toggle.

## Architecture

Introduce a small storage-mode module responsible for:

- Reading and writing the persistent database-connected setting.
- Providing browser-storage operations with the same data shapes used by the existing storage client.
- Generating stable local IDs and timestamps.
- Validating locally stored data before returning it.

The application owns the current mode and passes it to components that currently call storage directly. Storage selection remains explicit:

- `App` selects connected or local schedule, list, manual-shift, and assignment operations.
- `RotationBuilder` receives the mode or persistence operations instead of assuming the database.
- `ImportPanel` continues to parse PDFs the same way; confirmation behavior is selected by `App`.

This keeps disconnected behavior isolated and leaves Netlify functions and Supabase code unchanged.

## Error Handling

- Corrupt or outdated local records are ignored rather than crashing the app.
- Local storage quota or write failures display the same visible error patterns already used by the app.
- The admin menu explains that local-mode data exists only on the current browser/device.
- If PDF parsing fails, the existing parser error remains unchanged.

## Testing

- Verify the database toggle persists across remounts.
- Verify disconnected PDF confirmation does not call the confirm-import endpoint.
- Verify local schedule import, listing, loading, and deletion.
- Verify local position-list CRUD.
- Verify local manual shifts.
- Verify local assignment and rotation plan save/load.
- Verify connected mode continues to call the existing endpoints.
- Run the full component/unit test suite and production build.

## Out Of Scope

- Synchronizing local data into Supabase.
- Sharing disconnected-mode data between devices.
- Authentication or administrator permissions.
- Removing Supabase code or environment variables.
