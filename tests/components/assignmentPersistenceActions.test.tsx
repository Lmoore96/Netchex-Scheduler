import { render, screen } from "@testing-library/react";
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

    await user.click(screen.getByRole("button", { name: "Save assignments" }));
    await user.click(screen.getByRole("button", { name: "Load saved assignments" }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledOnce();
  });
});
