import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReviewImport } from "../../src/components/ReviewImport";
import type { ParsedScheduleDraft } from "../../src/domain/types";

const draft: ParsedScheduleDraft = {
  sourceFileName: "Netchex Scheduler.pdf",
  dateRangeStart: "2026-05-18",
  dateRangeEnd: "2026-05-24",
  warnings: [],
  shifts: [
    {
      temporaryId: "one",
      employeeName: "AL-RAJAI, MAI",
      shiftDate: "2026-05-22",
      startTime: "10:00",
      endTime: "18:00",
      departmentLabel: "Splash Crew",
      sourceConfidence: "medium"
    }
  ]
};

describe("ReviewImport", () => {
  it("lets managers edit a department before confirming", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ReviewImport draft={draft} onConfirm={onConfirm} onBack={() => undefined} />);

    await user.clear(screen.getByLabelText("Department for AL-RAJAI, MAI"));
    await user.type(screen.getByLabelText("Department for AL-RAJAI, MAI"), "Splash Team");
    await user.click(screen.getByRole("button", { name: "Confirm import" }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        shifts: [expect.objectContaining({ departmentLabel: "Splash Team" })]
      })
    );
  });
});
