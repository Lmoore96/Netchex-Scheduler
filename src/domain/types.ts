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


export interface ManualShiftInput {
  employeeName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  departmentLabel: string;
}

export interface ManualShiftRequest extends ManualShiftInput {
  scheduleImportId: string;
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

export interface SavedScheduleSummary {
  id: string;
  sourceFileName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  importedAt: string;
  shiftCount: number;
}

export interface LoadedSchedule {
  importId: string;
  sourceFileName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  shifts: Shift[];
  warnings: string[];
}


export interface AssignmentPlanRequest {
  scheduleImportId: string;
  planDate: string;
  departmentLabel: string;
  positionListId: string;
  positionsSnapshot: PositionDefinition[];
  assignments: Assignment[];
}

export interface SavedAssignmentPlan extends AssignmentPlanRequest {
  id: string;
  savedAt: string;
}

export interface RotationPlanPosition {
  id: string;
  label: string;
}

export interface RotationPlanTemplate {
  id: string;
  title: string;
  subtitle: string;
  kind: string;
  tone: string;
  positions: RotationPlanPosition[];
}

export interface RotationPlanSupportAssignments {
  captains: string[];
  slideAttendants: string[];
  groundCrew: string[];
}

export interface RotationPlanRequest {
  scheduleImportId: string;
  planDate: string;
  rotationTemplates: RotationPlanTemplate[];
  assignments: Record<string, string>;
  supportAssignments: RotationPlanSupportAssignments;
}

export interface SavedRotationPlan extends RotationPlanRequest {
  id: string;
  savedAt: string;
}
