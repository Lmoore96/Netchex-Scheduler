import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn()
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient
}));

function singleResult(data: unknown) {
  return {
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data, error: null }))
    }))
  };
}

describe("createSupabaseRepository manual shifts", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createClient.mockReset();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    mocks.from.mockImplementation((table: string) => {
      if (table === "employees") {
        return {
          upsert: vi.fn(() => singleResult({ id: "employee-1", display_name: "MORGAN, ALEX" }))
        };
      }

      if (table === "departments") {
        return {
          upsert: vi.fn(() => singleResult({ id: "department-1" }))
        };
      }

      if (table === "shifts") {
        return {
          insert: vi.fn(() => singleResult({
            id: "shift-1",
            schedule_import_id: "import-1",
            employee_id: "employee-1",
            shift_date: "2026-05-31",
            start_time: "09:00:00",
            end_time: "17:00:00",
            department_label: "Cashier",
            normalized_department_id: "department-1",
            source_confidence: "high",
            source_notes: "Manually added"
          }))
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    mocks.createClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
  });

  it("adds manual shifts without requiring a database RPC function", async () => {
    const { createSupabaseRepository } = await import("../netlify/functions/_shared/repository");

    const repository = createSupabaseRepository();
    const shift = await repository.addManualShift({
      scheduleImportId: "import-1",
      employeeName: "MORGAN, ALEX",
      shiftDate: "2026-05-31",
      startTime: "09:00",
      endTime: "17:00",
      departmentLabel: "Cashier"
    });

    expect(mocks.rpc).not.toHaveBeenCalledWith("add_manual_shift", expect.anything());
    expect(mocks.from).toHaveBeenCalledWith("employees");
    expect(mocks.from).toHaveBeenCalledWith("departments");
    expect(mocks.from).toHaveBeenCalledWith("shifts");
    expect(shift).toEqual({
      id: "shift-1",
      scheduleImportId: "import-1",
      employeeId: "employee-1",
      employeeName: "MORGAN, ALEX",
      shiftDate: "2026-05-31",
      startTime: "09:00",
      endTime: "17:00",
      departmentLabel: "Cashier",
      normalizedDepartmentId: "department-1",
      sourceConfidence: "high",
      sourceNotes: "Manually added"
    });
  });
});
