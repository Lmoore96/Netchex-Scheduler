import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AssignmentPersistenceActions } from "../../src/components/AssignmentPersistenceActions";

describe("AssignmentPersistenceActions", () => {
  it("calls save and load handlers from the assignment screen", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onLoad = vi.fn();

    render(
      <AssignmentPersistenceActions
        canUse
        saveState="idle"
        onSave={onSave}
        onLoad={onLoad}
      />
    );

    const headerActions = screen.getByLabelText("Header actions");
    await user.click(within(headerActions).getByRole("button", { name: "Save assignments" }));
    await user.click(within(headerActions).getByRole("button", { name: "Load saved assignments" }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledOnce();
  });
});
