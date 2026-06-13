# Disconnected Database Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Admin toggle that routes database-backed storage to the current browser while disconnected, without changing PDF parsing or connected Supabase behavior.

**Architecture:** A typed local repository mirrors the existing schedule, list, shift, assignment, and rotation operations. `App` owns the persistent mode and explicitly selects local or remote operations. `RotationBuilder` receives persistence functions, and `Shell` owns the isolated Admin menu.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Zod, browser `localStorage`, existing Netlify Functions and Supabase client.

---

## File Structure

- Create `src/lib/storageMode.ts`: persistent database-connected preference.
- Create `src/lib/localStorageClient.ts`: validated disconnected-mode repository.
- Create `src/components/AdminMenu.tsx`: Admin menu and switch.
- Create `tests/lib/storageMode.test.ts`, `tests/lib/localStorageClient.test.ts`, and `tests/components/adminMenu.test.tsx`.
- Create `tests/components/appLocalMode.test.tsx`: local/remote routing integration tests.
- Modify `src/components/Shell.tsx`, `src/App.tsx`, `src/components/ImportPanel.tsx`, `src/components/RotationBuilder.tsx`, and `src/styles.css`.
- Modify import and rotation component tests.

## Task 1: Persistent Mode Preference

**Files:** Create `src/lib/storageMode.ts`; test `tests/lib/storageMode.test.ts`.

- [ ] Write failing tests proving the default is connected and manually selected values survive later reads.

```ts
expect(readDatabaseConnected()).toBe(true);
writeDatabaseConnected(false);
expect(readDatabaseConnected()).toBe(false);
writeDatabaseConnected(true);
expect(readDatabaseConnected()).toBe(true);
```

- [ ] Run `npm run test -- tests/lib/storageMode.test.ts`; expect module-not-found failure.
- [ ] Implement the stable preference.

```ts
const key = "netchex-database-connected-v1";

export function readDatabaseConnected() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(key) !== "false";
}

export function writeDatabaseConnected(connected: boolean) {
  window.localStorage.setItem(key, String(connected));
}
```

- [ ] Re-run the test; expect PASS.
- [ ] Commit with `git commit -m "Add persistent database mode preference"`.

## Task 2: Browser Storage Repository

**Files:** Create `src/lib/localStorageClient.ts`; test `tests/lib/localStorageClient.test.ts`; modify `src/domain/validation.ts` only for reusable schemas.

- [ ] Write failing tests for local schedule import/list/load/delete and position-list CRUD.

```ts
const saved = importLocalSchedule(draft);
expect(listLocalSchedules()).toEqual([
  expect.objectContaining({ id: saved.importId, shiftCount: draft.shifts.length })
]);
expect(loadLocalSchedule(saved.importId)).toEqual(saved);
deleteLocalSchedule(saved.importId);
expect(listLocalSchedules()).toEqual([]);

const list = saveLocalPositionList(positionList);
expect(loadLocalPositionLists()).toEqual([list]);
deleteLocalPositionList(list.id);
expect(loadLocalPositionLists()).toEqual([]);
```

- [ ] Add failing tests for manual shifts, assignment plans, rotation plans, and workspace callouts.

```ts
const shift = addLocalManualShift(manualShiftRequest);
expect(loadLocalSchedule(shift.scheduleImportId)?.shifts).toContainEqual(shift);

expect(loadLocalAssignmentPlan(assignmentQuery)).toBeNull();
expect(loadLocalAssignmentPlan(assignmentQueryAfterSave)).toEqual(savedAssignmentPlan);

expect(loadLocalRotationPlan(rotationQuery)).toBeNull();
expect(loadLocalRotationPlan(rotationQueryAfterSave)).toEqual(savedRotationPlan);

saveLocalWorkspace({ scheduleImportId: "local-1", calloutShiftIds: { "shift-1": true } });
expect(loadLocalWorkspace()).toEqual({
  scheduleImportId: "local-1",
  calloutShiftIds: { "shift-1": true }
});
```

- [ ] Run `npm run test -- tests/lib/localStorageClient.test.ts`; expect missing-export failures.
- [ ] Implement one versioned `netchex-local-data-v1` document.

```ts
interface LocalData {
  schedules: LoadedSchedule[];
  positionLists: PositionList[];
  assignmentPlans: SavedAssignmentPlan[];
  rotationPlans: SavedRotationPlan[];
  workspace: LocalWorkspace | null;
}

export interface LocalWorkspace {
  scheduleImportId: string;
  calloutShiftIds: Record<string, boolean>;
}

type AssignmentPlanQuery = Pick<
  AssignmentPlanRequest,
  "scheduleImportId" | "planDate" | "departmentLabel"
>;

type RotationPlanQuery = Pick<RotationPlanRequest, "scheduleImportId" | "planDate">;
```

- [ ] Validate reads with Zod. Invalid or outdated data returns an empty document; write/quota failures propagate.
- [ ] Generate IDs with `crypto.randomUUID()` and timestamps with `new Date().toISOString()`.
- [ ] Export these exact operations:

```ts
importLocalSchedule(draft: ParsedScheduleDraft): LoadedSchedule;
listLocalSchedules(): SavedScheduleSummary[];
loadLocalSchedule(id: string): LoadedSchedule | null;
deleteLocalSchedule(id: string): void;
loadLocalPositionLists(): PositionList[];
saveLocalPositionList(list: PositionList): PositionList;
deleteLocalPositionList(id: string): void;
addLocalManualShift(request: ManualShiftRequest): Shift;
saveLocalAssignmentPlan(plan: AssignmentPlanRequest): SavedAssignmentPlan;
loadLocalAssignmentPlan(query: AssignmentPlanQuery): SavedAssignmentPlan | null;
saveLocalRotationPlan(plan: RotationPlanRequest): SavedRotationPlan;
loadLocalRotationPlan(query: RotationPlanQuery): SavedRotationPlan | null;
saveLocalWorkspace(workspace: LocalWorkspace): void;
loadLocalWorkspace(): LocalWorkspace | null;
```

- [ ] Deleting a schedule also removes its assignment/rotation plans and clears a matching workspace.
- [ ] Re-run local repository tests; expect PASS.
- [ ] Commit with `git commit -m "Add browser storage repository"`.

## Task 3: Admin Menu

**Files:** Create `src/components/AdminMenu.tsx`; test `tests/components/adminMenu.test.tsx`; modify `src/components/Shell.tsx` and `src/styles.css`.

- [ ] Write a failing interaction test.

```tsx
render(
  <AdminMenu
    databaseConnected
    onDatabaseConnectedChange={onDatabaseConnectedChange}
  />
);
await user.click(screen.getByRole("button", { name: "Admin" }));
await user.click(screen.getByRole("switch", { name: "Database connected" }));
expect(onDatabaseConnectedChange).toHaveBeenCalledWith(false);
```

- [ ] Add a failing disconnected-state test expecting `Local mode: data stays on this device`.
- [ ] Run `npm run test -- tests/components/adminMenu.test.tsx`; expect missing-component failure.
- [ ] Implement a compact menu with an accessible switch using `role="switch"`, `aria-checked`, and `aria-label="Database connected"`.
- [ ] Change `Shell` to accept `databaseConnected` and `onDatabaseConnectedChange`, render `AdminMenu`, and show a `Local mode` badge when disconnected.
- [ ] Style the anchored menu with existing surface/line/teal variables and constrain it to the mobile viewport.
- [ ] Re-run Admin tests; expect PASS.
- [ ] Commit with `git commit -m "Add database admin toggle UI"`.

## Task 4: Route App Operations By Mode

**Files:** Modify `src/App.tsx` and `src/components/ImportPanel.tsx`; create `tests/components/appLocalMode.test.tsx`; modify `tests/components/importPanel.test.tsx`.

- [ ] Write a failing disconnected import test that stores `false` under the preference key, mocks a parsed PDF, uploads it, and asserts:

```ts
expect(confirmReviewedImport).not.toHaveBeenCalled();
expect(importLocalSchedule).toHaveBeenCalledWith(parsedDraft);
expect(screen.getByRole("button", { name: "Positions" })).toBeEnabled();
```

- [ ] Add a connected-mode test asserting the existing confirm/load endpoints are still called.
- [ ] Add a local workspace restore test with a saved schedule and callout map preloaded before rendering.
- [ ] Run `npm run test -- tests/components/appLocalMode.test.tsx`; expect failures because `App` has no mode routing.
- [ ] Initialize and persist mode in `App`.

```ts
const [databaseConnected, setDatabaseConnected] = useState(readDatabaseConnected);

function changeDatabaseConnected(connected: boolean) {
  writeDatabaseConnected(connected);
  setDatabaseConnected(connected);
  setConfirmError("");
  setPositionListError("");
  setSavedScheduleError("");
  setAssignmentSaveState("idle");
}
```

- [ ] Pass mode props to `Shell`.
- [ ] In `confirmImport`, call `importLocalSchedule(reviewed)` and load its shifts when disconnected; otherwise preserve the existing Supabase confirm/load flow.
- [ ] Route saved-schedule list/load/delete, position-list load/save/delete, manual shifts, and assignment save/load to their local equivalents when disconnected.
- [ ] Persist the current local schedule ID and callout map after import, manual shifts, schedule load, and every callout change.
- [ ] Restore the local workspace when the app mounts or changes into disconnected mode.
- [ ] Add `databaseConnected` to `ImportPanel`. In local mode rename `Load Saved` to `Load Local`, label the picker `Saved on this device`, and display `Local schedules are available only in this browser.`
- [ ] Update import tests for both connected and local copy.
- [ ] Run `npm run test -- tests/components/appLocalMode.test.tsx tests/components/importPanel.test.tsx`; expect PASS.
- [ ] Commit with `git commit -m "Route app persistence through local mode"`.

## Task 5: Inject Rotation Persistence

**Files:** Modify `src/components/RotationBuilder.tsx`, `src/App.tsx`, and `tests/components/rotationBuilderPersistence.test.tsx`.

- [ ] Write a failing test that supplies `onSavePlan` and `onLoadPlan`, clicks `Save rotations`, and verifies the supplied save function receives the plan while global `fetch` is untouched.
- [ ] Run `npm run test -- tests/components/rotationBuilderPersistence.test.tsx`; expect TypeScript/prop failure.
- [ ] Add optional persistence props with the existing remote functions as defaults.

```ts
interface RotationBuilderProps {
  shifts: Shift[];
  onSavePlan?: typeof saveRotationPlan;
  onLoadPlan?: typeof loadRotationPlan;
}
```

- [ ] Replace direct save/load calls with the injected functions.
- [ ] From `App`, pass remote operations in connected mode and async wrappers around `saveLocalRotationPlan`/`loadLocalRotationPlan` in disconnected mode.
- [ ] Re-run rotation tests; expect PASS.
- [ ] Commit with `git commit -m "Support local rotation persistence"`.

## Task 6: Verification And Deployment

- [ ] Run `npm test`; expect all tests PASS with no unhandled errors.
- [ ] Run `npm run build`; expect TypeScript and Vite PASS.
- [ ] Run `git diff --check`; expect no whitespace errors.
- [ ] Verify manually that the toggle defaults connected, stays manually selected after refresh, and displays `Local mode` when off.
- [ ] With Supabase unavailable, verify PDF import, local schedule loading, lists, manual additions, assignments, rotations, and callouts survive refresh.
- [ ] Turn connected mode back on and verify existing database behavior returns without deleting local data.
- [ ] Verify the Admin menu remains on screen at mobile width.
- [ ] Commit final fixes with `git commit -m "Add disconnected browser storage mode"`.
- [ ] Run `git push`; expect branch `feature/netchex-schedule-app` to update and trigger Netlify.
