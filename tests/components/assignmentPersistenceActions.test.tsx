import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssignmentPersistenceActions } from "../../src/components/AssignmentPersistenceActions";

function renderWithWorkflowActions(ui: ReactElement) {
  return render(
    <>
      <div id="workflow-actions-root" aria-label="Workflow actions" />
      {ui}
    </>
  );
}

describe("AssignmentPersistenceActions", () => {
  it("calls save and load handlers from the assignment screen", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onLoad = vi.fn();

    renderWithWorkflowActions(
      <AssignmentPersistenceActions
        canUse
        saveState="idle"
        onSave={onSave}
        onLoad={onLoad}
      />
    );

    const workflowActions = screen.getByLabelText("Workflow actions");
    const headerActions = within(workflowActions).getByLabelText("Header actions");
    await user.click(within(headerActions).getByRole("button", { name: "Save assignments" }));
    await user.click(within(headerActions).getByRole("button", { name: "Load saved assignments" }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledOnce();
  });
});
