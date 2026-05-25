import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ManualShiftForm } from "../../src/components/ManualShiftForm";

const dates = ["2026-05-25", "2026-05-26"];
const departments = ["Splash Crew", "Special Facility..."];

describe("ManualShiftForm", () => {
  it("collects a manual shift without importing a new PDF", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(
      <ManualShiftForm
        dates={dates}
        departments={departments}
        defaultDate="2026-05-25"
        defaultDepartment="Splash Crew"
        isSaving={false}
        onAdd={onAdd}
      />
    );

    await user.click(screen.getByRole("button", { name: "Add person" }));
    await user.type(screen.getByLabelText("Name"), "MORGAN, ALEX");
    await user.selectOptions(screen.getByLabelText("Date"), "2026-05-26");
    await user.selectOptions(screen.getByLabelText("Department"), "Special Facility...");
    await user.clear(screen.getByLabelText("Start time"));
    await user.type(screen.getByLabelText("Start time"), "09:40");
    await user.clear(screen.getByLabelText("End time"));
    await user.type(screen.getByLabelText("End time"), "18:30");
    await user.click(screen.getByRole("button", { name: "Save person" }));

    expect(onAdd).toHaveBeenCalledWith({
      employeeName: "MORGAN, ALEX",
      shiftDate: "2026-05-26",
      departmentLabel: "Special Facility...",
      startTime: "09:40",
      endTime: "18:30"
    });
  });
});
