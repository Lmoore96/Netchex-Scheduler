import { beforeEach, describe, expect, it } from "vitest";
import type { AssignmentPlanRequest, ParsedScheduleDraft, PositionList, RotationPlanRequest } from "../../src/domain/types";
import {
  addLocalManualShift,
  deleteLocalPositionList,
  deleteLocalSchedule,
  importLocalSchedule,
  listLocalSchedules,
  loadLocalAssignmentPlan,
  loadLocalPositionLists,
  loadLocalRotationPlan,
  loadLocalSchedule,
  loadLocalWorkspace,
  saveLocalAssignmentPlan,
  saveLocalPositionList,
  saveLocalRotationPlan,
  saveLocalWorkspace
} from "../../src/lib/localStorageClient";

const draft: ParsedScheduleDraft = {
  sourceFileName: "schedule.pdf",
  dateRangeStart: "2026-06-08",
  dateRangeEnd: "2026-06-14",
  warnings: [],
  shifts: [{
    temporaryId: "draft-1",
    employeeName: "SMITH, ALEX",
    shiftDate: "2026-06-12",
    startTime: "09:00",
    endTime: "17:00",
    departmentLabel: "Cashier",
    sourceConfidence: "high"
  }]
};

describe("localStorageClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("imports, lists, loads, and deletes a local schedule", () => {
    const saved = importLocalSchedule(draft);

    expect(listLocalSchedules()).toEqual([
      expect.objectContaining({ id: saved.importId, sourceFileName: "schedule.pdf", shiftCount: 1 })
    ]);
    expect(loadLocalSchedule(saved.importId)).toEqual(saved);

    deleteLocalSchedule(saved.importId);
    expect(listLocalSchedules()).toEqual([]);
  });

  it("saves and deletes local position lists", () => {
    const positionList: PositionList = { id: "cashier-main", departmentId: "cashier", name: "Main", positions: [] };

    const list = saveLocalPositionList(positionList);
    expect(loadLocalPositionLists()).toEqual([list]);
    deleteLocalPositionList(list.id);
    expect(loadLocalPositionLists()).toEqual([]);
  });

  it("adds a manual shift to its local schedule", () => {
    const schedule = importLocalSchedule(draft);
    const shift = addLocalManualShift({
      scheduleImportId: schedule.importId,
      employeeName: "JONES, TAYLOR",
      shiftDate: "2026-06-12",
      startTime: "10:00",
      endTime: "18:00",
      departmentLabel: "Cashier"
    });

    expect(loadLocalSchedule(schedule.importId)?.shifts).toContainEqual(shift);
  });

  it("round trips assignment and rotation plans", () => {
    const schedule = importLocalSchedule(draft);
    const assignmentPlan: AssignmentPlanRequest = {
      scheduleImportId: schedule.importId,
      planDate: "2026-06-12",
      departmentLabel: "Cashier",
      positionListId: "cashier-main",
      positionsSnapshot: [],
      assignments: []
    };
    const assignmentQuery = {
      scheduleImportId: schedule.importId,
      planDate: "2026-06-12",
      departmentLabel: "Cashier"
    };

    expect(loadLocalAssignmentPlan(assignmentQuery)).toBeNull();
    const savedAssignmentPlan = saveLocalAssignmentPlan(assignmentPlan);
    expect(loadLocalAssignmentPlan(assignmentQuery)).toEqual(savedAssignmentPlan);

    const rotationPlan: RotationPlanRequest = {
      scheduleImportId: schedule.importId,
      planDate: "2026-06-12",
      rotationTemplates: [],
      assignments: {},
      supportAssignments: { captains: [], slideAttendants: [] }
    };
    const rotationQuery = { scheduleImportId: schedule.importId, planDate: "2026-06-12" };

    expect(loadLocalRotationPlan(rotationQuery)).toBeNull();
    const savedRotationPlan = saveLocalRotationPlan(rotationPlan);
    expect(loadLocalRotationPlan(rotationQuery)).toEqual(savedRotationPlan);
  });

  it("restores the current local workspace and callouts", () => {
    saveLocalWorkspace({ scheduleImportId: "local-1", calloutShiftIds: { "shift-1": true } });

    expect(loadLocalWorkspace()).toEqual({
      scheduleImportId: "local-1",
      calloutShiftIds: { "shift-1": true }
    });
  });
});
