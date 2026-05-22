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
    }
  };
}
