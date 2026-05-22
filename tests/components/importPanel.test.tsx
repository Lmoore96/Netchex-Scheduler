import { render, screen } from "@testing-library/react";
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
  it("lets managers load a saved schedule from the first page", async () => {
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

    await user.click(screen.getByRole("button", { name: "Load saved schedule" }));
    expect(screen.getByLabelText("Saved schedule")).toHaveValue("import-1");

    await user.click(screen.getByRole("button", { name: "Load schedule" }));

    expect(onLoadSavedSchedule).toHaveBeenCalledWith("import-1");
  });

  it("loads saved schedules when the panel is opened", async () => {
    const user = userEvent.setup();
    const onRequestSavedSchedules = vi.fn();

    render(<ImportPanel onDraft={() => undefined} onRequestSavedSchedules={onRequestSavedSchedules} />);

    await user.click(screen.getByRole("button", { name: "Load saved schedule" }));

    expect(onRequestSavedSchedules).toHaveBeenCalledOnce();
  });
});
