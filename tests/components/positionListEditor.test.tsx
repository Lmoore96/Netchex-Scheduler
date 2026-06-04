import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PositionListEditor } from "../../src/components/PositionListEditor";

describe("PositionListEditor", () => {
  it("lets managers add a single-capacity position before saving", async () => {
    const user = userEvent.setup();
    const onSaveList = vi.fn();
    const positionList = {
      id: "list-1",
      departmentId: "admissions",
      name: "Main list",
      positions: []
    };

    render(
      <PositionListEditor
        departmentName="Admissions"
        positionLists={[positionList]}
        selectedListId="list-1"
        onSaveList={onSaveList}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit list" }));
    await user.type(screen.getByLabelText("New position"), "Tower 1");
    await user.click(screen.getByRole("button", { name: "Add position" }));
    const headerActions = screen.getByLabelText("Header actions");
    await user.click(within(headerActions).getByRole("button", { name: "Save list" }));

    expect(onSaveList).toHaveBeenCalledWith(expect.objectContaining({
      id: "list-1",
      positions: [
        expect.objectContaining({
          label: "Tower 1",
          capacityMode: "single"
        })
      ]
    }));
  });
});
