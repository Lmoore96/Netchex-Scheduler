import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImportPanel } from "../../src/components/ImportPanel";
import type { SavedScheduleSummary } from "../../src/domain/types";

const savedSchedules: SavedScheduleSummary[] = [
  {
    id: "import-1",
    sourceFileName: "Netchex Scheduler.pdf",
    dateRangeStart: "2026-05-18",
    dateRangeEnd: "2026-05-24",
    importedAt: "2026-05-22T12:00:00Z",
    shiftCount: 42
  }
];

describe("ImportPanel", () => {
  it("lets managers load a saved schedule from the load tab", async () => {
    const user = userEvent.setup();
    const onLoadSavedSchedule = vi.fn();

    render(
      <ImportPanel
        onDraft={() => undefined}
        savedSchedules={savedSchedules}
        onRequestSavedSchedules={() => undefined}
        onLoadSavedSchedule={onLoadSavedSchedule}
      />
    );

    expect(screen.getByLabelText("Import PDF or CSV")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Load Saved" }));
    expect(screen.getByLabelText("Saved schedule")).toHaveValue("import-1");
    expect(screen.queryByLabelText("Import PDF or CSV")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load schedule" }));

    expect(onLoadSavedSchedule).toHaveBeenCalledWith("import-1");
  });

  it("loads saved schedules when the panel is opened", async () => {
    const user = userEvent.setup();
    const onRequestSavedSchedules = vi.fn();

    render(<ImportPanel onDraft={() => undefined} onRequestSavedSchedules={onRequestSavedSchedules} />);

    await user.click(screen.getByRole("tab", { name: "Load Saved" }));

    expect(onRequestSavedSchedules).toHaveBeenCalledOnce();
  });

  it("imports a WhenToWork CSV file", async () => {
    const user = userEvent.setup();
    const onDraft = vi.fn();
    const file = new File([
      `"Shift ID","Schedule ID","Employee Number","Position ID","Position Name","Category","Shift Description","Date","Start Time","End Time","Duration","Day Of Week","Employee Name"\n` +
      `706420785,706073206,,706072528,"GS Guest Services",,,6/16/2026,09:40 AM,01:00 PM,   3.33,1,"Smith, Alex"\n`
    ], "EXPORT.CSV", { type: "text/csv" });

    render(<ImportPanel onDraft={onDraft} />);

    await user.upload(screen.getByLabelText("Import PDF or CSV"), file);

    await waitFor(() => expect(onDraft).toHaveBeenCalledWith(expect.objectContaining({
      sourceFileName: "EXPORT.CSV",
      shifts: [expect.objectContaining({ employeeName: "Smith, Alex", departmentLabel: "GS Guest Services" })]
    })));
  });

  it("labels saved schedules as local when the database is disconnected", async () => {
    const user = userEvent.setup();

    render(
      <ImportPanel
        onDraft={() => undefined}
        databaseConnected={false}
        savedSchedules={savedSchedules}
        onRequestSavedSchedules={() => undefined}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Load Local" }));

    expect(screen.getByLabelText("Saved on this device")).toHaveValue("import-1");
    expect(screen.getByText("Local schedules are available only in this browser.")).toBeInTheDocument();
  });

  it("lets managers delete the selected saved schedule", async () => {
    const user = userEvent.setup();
    const onDeleteSavedSchedule = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <ImportPanel
        onDraft={() => undefined}
        savedSchedules={savedSchedules}
        onRequestSavedSchedules={() => undefined}
        onDeleteSavedSchedule={onDeleteSavedSchedule}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Load Saved" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledWith("Delete this saved schedule? This cannot be undone.");
    expect(onDeleteSavedSchedule).toHaveBeenCalledWith("import-1");

    confirmSpy.mockRestore();
  });
});
