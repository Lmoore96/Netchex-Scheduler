import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminMenu } from "../../src/components/AdminMenu";

describe("AdminMenu", () => {
  it("lets an administrator disconnect the database", async () => {
    const user = userEvent.setup();
    const onDatabaseConnectedChange = vi.fn();

    render(<AdminMenu databaseConnected onDatabaseConnectedChange={onDatabaseConnectedChange} />);

    await user.click(screen.getByRole("button", { name: "Admin" }));
    expect(screen.getByText("Database connected")).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Database connected" }));

    expect(onDatabaseConnectedChange).toHaveBeenCalledWith(false);
  });

  it("explains local mode when the database is disconnected", async () => {
    const user = userEvent.setup();

    render(<AdminMenu databaseConnected={false} onDatabaseConnectedChange={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Admin" }));

    expect(screen.getByText("Local mode: data stays on this device")).toBeInTheDocument();
  });

  it("keeps admin tools organized behind simple expandable sections", async () => {
    const user = userEvent.setup();
    const onRefreshSavedSchedules = vi.fn();
    const onDeleteSavedSchedule = vi.fn();
    const onDeleteSchedulesOlderThan = vi.fn();
    const onClearCurrentDayCallouts = vi.fn();
    const onClearCurrentDepartmentCallouts = vi.fn();
    const onRestoreAllCallouts = vi.fn();
    const onClearCurrentAssignments = vi.fn();
    const onClearDayAssignments = vi.fn();

    render(
      <AdminMenu
        databaseConnected={false}
        onDatabaseConnectedChange={() => undefined}
        status={{
          currentScheduleLabel: "EXPORT.CSV · 2026-06-16 to 2026-06-16",
          savedScheduleCount: 2,
          activeCalloutCount: 3,
          visibleAssignmentCount: 4,
          dayAssignmentCount: 8
        }}
        savedSchedules={[
          {
            id: "schedule-1",
            sourceFileName: "old.csv",
            dateRangeStart: "2026-06-01",
            dateRangeEnd: "2026-06-07",
            importedAt: "2026-06-01T12:00:00Z",
            shiftCount: 12
          }
        ]}
        onRefreshSavedSchedules={onRefreshSavedSchedules}
        onDeleteSavedSchedule={onDeleteSavedSchedule}
        onDeleteSchedulesOlderThan={onDeleteSchedulesOlderThan}
        onClearCurrentDayCallouts={onClearCurrentDayCallouts}
        onClearCurrentDepartmentCallouts={onClearCurrentDepartmentCallouts}
        onRestoreAllCallouts={onRestoreAllCallouts}
        onClearCurrentAssignments={onClearCurrentAssignments}
        onClearDayAssignments={onClearDayAssignments}
      />
    );

    await user.click(screen.getByRole("button", { name: "Admin" }));

    expect(screen.getByText("EXPORT.CSV · 2026-06-16 to 2026-06-16")).toBeInTheDocument();
    expect(screen.getByText("2 saved schedules")).toBeInTheDocument();
    expect(screen.getByText("3 active callouts")).toBeInTheDocument();
    expect(screen.getByText("4 current assignments")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Schedules/ }));

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefreshSavedSchedules).toHaveBeenCalledOnce();

    await user.selectOptions(screen.getByLabelText("Saved schedule"), "schedule-1");
    await user.click(screen.getByRole("button", { name: "Delete selected" }));
    expect(onDeleteSavedSchedule).toHaveBeenCalledWith("schedule-1");

    await user.type(screen.getByLabelText("Ending before"), "2026-06-10");
    await user.click(screen.getByRole("button", { name: "Delete old" }));
    expect(onDeleteSchedulesOlderThan).toHaveBeenCalledWith("2026-06-10");

    await user.click(screen.getByRole("button", { name: /Callouts/ }));
    expect(screen.queryByRole("button", { name: "Delete selected" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear day" }));
    await user.click(screen.getByRole("button", { name: "Clear department" }));
    await user.click(screen.getByRole("button", { name: "Restore all" }));
    expect(onClearCurrentDayCallouts).toHaveBeenCalledOnce();
    expect(onClearCurrentDepartmentCallouts).toHaveBeenCalledOnce();
    expect(onRestoreAllCallouts).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /Assignments/ }));
    await user.click(screen.getByRole("button", { name: "Clear current" }));
    await user.click(screen.getByRole("button", { name: "Clear day" }));
    expect(onClearCurrentAssignments).toHaveBeenCalledOnce();
    expect(onClearDayAssignments).toHaveBeenCalledOnce();
  });
});
