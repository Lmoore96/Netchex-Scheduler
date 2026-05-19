import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PositionListEditor } from "../../src/components/PositionListEditor";

describe("PositionListEditor", () => {
  it("lets managers add a single-capacity position before saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <PositionListEditor
        departmentName="Admissions"
        initialPositions={[]}
        onSave={onSave}
      />
    );

    await user.type(screen.getByLabelText("New position"), "Tower 1");
    await user.click(screen.getByRole("button", { name: "Add position" }));
    await user.click(screen.getByRole("button", { name: "Save list" }));

    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({
        label: "Tower 1",
        capacityMode: "single"
      })
    ]);
  });
});
