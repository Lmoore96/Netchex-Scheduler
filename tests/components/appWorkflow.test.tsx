import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../../src/App";

describe("App workflow", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("netchex-database-connected-v1", "false");
  });

  it("combines position editing into the assign tab", async () => {
    const user = userEvent.setup();
    const file = new File([
      `"Shift ID","Schedule ID","Employee Number","Position ID","Position Name","Category","Shift Description","Date","Start Time","End Time","Duration","Day Of Week","Employee Name"\n` +
      `706421028,706073206,,706082022,"CA Foods Cashier",,,6/16/2026,10:45 AM,06:00 PM,   7.25,1,"Jones, Taylor"\n`
    ], "EXPORT.CSV", { type: "text/csv" });

    render(<App />);

    await user.upload(screen.getByLabelText("Import PDF or CSV"), file);

    await waitFor(() => expect(screen.getByRole("button", { name: "Assign" })).toHaveClass("is-active"));
    expect(screen.queryByRole("button", { name: "Positions" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit positions" }));

    expect(screen.getByRole("heading", { name: "Cashiers positions" })).toBeInTheDocument();
    const selectedList = screen.getByLabelText("Cashiers position list");
    expect(within(selectedList).getByText("Season Pass")).toBeInTheDocument();
    expect(within(selectedList).getByText("Breaker")).toBeInTheDocument();
  });
});
