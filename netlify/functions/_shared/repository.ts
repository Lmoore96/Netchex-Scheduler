import { createClient } from "@supabase/supabase-js";
import type { Assignment, ParsedScheduleDraft, PositionDefinition } from "../../../src/domain/types";

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
      const { data, error } = await supabase.rpc("confirm_schedule_import", { draft });

      if (error) throw error;
      return { id: data };
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
    },

    async saveAssignments(
      dailyPositionPlanId: string,
      assignments: Array<Pick<Assignment, "shiftId" | "positionKey" | "sortOrder" | "notes">>
    ) {
      const { error: deleteError } = await supabase
        .from("assignments")
        .delete()
        .eq("daily_position_plan_id", dailyPositionPlanId);

      if (deleteError) throw deleteError;

      if (assignments.length === 0) {
        return { saved: true, count: 0 };
      }

      const rows = assignments.map((assignment) => ({
        daily_position_plan_id: dailyPositionPlanId,
        shift_id: assignment.shiftId,
        position_key: assignment.positionKey,
        sort_order: assignment.sortOrder,
        notes: assignment.notes
      }));

      const { error: insertError } = await supabase.from("assignments").insert(rows);

      if (insertError) throw insertError;
      return { saved: true, count: rows.length };
    }
  };
}
