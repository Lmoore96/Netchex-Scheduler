import { createClient } from "@supabase/supabase-js";
import type {
  Assignment,
  AssignmentPlanRequest,
  ParsedScheduleDraft,
  PositionDefinition,
  ManualShiftRequest,
  RotationPlanRequest
} from "../../../src/domain/types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function dbDate(value: unknown) {
  return String(value).slice(0, 10);
}

function dbTime(value: unknown) {
  return String(value).slice(0, 5);
}

export function createSupabaseRepository() {
  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  return {
    async confirmImport(draft: ParsedScheduleDraft) {
      const { data, error } = await supabase.rpc("confirm_schedule_import", { draft });

      if (error) throw error;
      return { id: data };
    },

    async listSavedSchedules() {
      const { data, error } = await supabase.rpc("list_saved_schedule_imports");

      if (error) throw error;
      return data ?? [];
    },

    async loadSavedSchedule(importId: string) {
      const { data, error } = await supabase.rpc("load_saved_schedule_import", { import_id: importId });

      if (error) throw error;
      if (!data) throw new Error("Saved schedule was not found");
      return data;
    },

    async deleteSavedSchedule(importId: string) {
      const { error } = await supabase
        .from("schedule_imports")
        .delete()
        .eq("id", importId);

      if (error) throw error;
      return { deleted: true };
    },

    async addManualShift(shift: ManualShiftRequest) {
      const employeeName = shift.employeeName.trim();
      const departmentLabel = shift.departmentLabel.trim();

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .upsert({ display_name: employeeName }, { onConflict: "display_name" })
        .select("id, display_name")
        .single();

      if (employeeError) throw employeeError;

      const { data: department, error: departmentError } = await supabase
        .from("departments")
        .upsert({ name: departmentLabel }, { onConflict: "name" })
        .select("id")
        .single();

      if (departmentError) throw departmentError;

      const { data: savedShift, error: shiftError } = await supabase
        .from("shifts")
        .insert({
          schedule_import_id: shift.scheduleImportId,
          employee_id: employee.id,
          shift_date: shift.shiftDate,
          start_time: shift.startTime,
          end_time: shift.endTime,
          department_label: departmentLabel,
          normalized_department_id: department.id,
          source_confidence: "high",
          source_notes: "Manually added"
        })
        .select("id, schedule_import_id, employee_id, shift_date, start_time, end_time, department_label, normalized_department_id, source_confidence, source_notes")
        .single();

      if (shiftError) throw shiftError;

      return {
        id: String(savedShift.id),
        scheduleImportId: String(savedShift.schedule_import_id),
        employeeId: String(savedShift.employee_id),
        employeeName: String(employee.display_name),
        shiftDate: dbDate(savedShift.shift_date),
        startTime: dbTime(savedShift.start_time),
        endTime: dbTime(savedShift.end_time),
        departmentLabel: String(savedShift.department_label),
        normalizedDepartmentId: savedShift.normalized_department_id ? String(savedShift.normalized_department_id) : undefined,
        sourceConfidence: savedShift.source_confidence,
        sourceNotes: savedShift.source_notes ?? undefined
      };
    },

    async listPositionLists() {
      const { data, error } = await supabase
        .from("position_lists")
        .select("id, department_id, name, positions")
        .order("department_id", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },

    async savePositionList(departmentId: string, name: string, positions: PositionDefinition[]) {
      const { data: existingRows, error: findError } = await supabase
        .from("position_lists")
        .select("id")
        .eq("department_id", departmentId)
        .eq("name", name)
        .limit(1);

      if (findError) throw findError;

      const existingId = existingRows?.[0]?.id;
      if (existingId) {
        const { data, error } = await supabase
          .from("position_lists")
          .update({ positions })
          .eq("id", existingId)
          .select("id, department_id, name, positions")
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("position_lists")
        .insert({ department_id: departmentId, name, positions })
        .select("id, department_id, name, positions")
        .single();

      if (error) throw error;
      return data;
    },

    async deletePositionList(id: string) {
      const { error } = await supabase
        .from("position_lists")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { deleted: true };
    },

    async saveAssignments(
      dailyPositionPlanId: string,
      assignments: Array<Pick<Assignment, "shiftId" | "positionKey" | "sortOrder" | "notes">>
    ) {
      const { data, error } = await supabase.rpc("replace_assignments", {
        plan_id: dailyPositionPlanId,
        assignment_rows: assignments
      });

      if (error) throw error;
      return { saved: true, count: data ?? 0 };
    },

    async saveAssignmentPlan(plan: AssignmentPlanRequest) {
      const { data, error } = await supabase.rpc("save_assignment_plan", { plan });

      if (error) throw error;
      return data;
    },

    async loadAssignmentPlan(scheduleImportId: string, planDate: string, departmentLabel: string) {
      const { data, error } = await supabase.rpc("load_assignment_plan", {
        import_id: scheduleImportId,
        target_date: planDate,
        target_department: departmentLabel
      });

      if (error) throw error;
      return data;
    },

    async saveRotationPlan(plan: RotationPlanRequest) {
      const { data, error } = await supabase.rpc("save_rotation_plan", { plan });

      if (error) throw error;
      return data;
    },

    async loadRotationPlan(scheduleImportId: string, planDate: string) {
      const { data, error } = await supabase.rpc("load_rotation_plan", {
        import_id: scheduleImportId,
        target_date: planDate
      });

      if (error) throw error;
      return data;
    }
  };
}
