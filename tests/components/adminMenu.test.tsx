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
});
