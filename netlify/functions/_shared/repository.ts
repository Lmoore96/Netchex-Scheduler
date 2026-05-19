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
