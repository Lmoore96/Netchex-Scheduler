import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RotationBuilder } from "../../src/components/RotationBuilder";
import type { Shift } from "../../src/domain/types";

function renderWithWorkflowActions(ui: ReactElement) {
  return render(
    <>
      <div id="workflow-actions-root" aria-label="Workflow actions" />
      {ui}
    </>
  );
}

const shifts: Shift[] = [
  {
    id: "shift-special",
    scheduleImportId: "import-1",
    employeeId: "employee-1",
    employeeName: "SMITH, ALEX",
    shiftDate: "2026-05-22",
    startTime: "09:00",
    endTime: "17:00",
    departmentLabel: "Special Facilities Lifeguard",
    sourceConfidence: "medium"
  },
  {
    id: "shift-shallow",
    scheduleImportId: "import-1",
    employeeId: "employee-2",
    employeeName: "JONES, TAYLOR",
    shiftDate: "2026-05-22",
    startTime: "09:00",
    endTime: "17:00",
    departmentLabel: "Shallow Lifeguard",
    sourceConfidence: "medium"
  },
  {
    id: "shift-special-morgan",
    scheduleImportId: "import-1",
    employeeId: "employee-3",
    employeeName: "BROWN, MORGAN",
    shiftDate: "2026-05-22",
    startTime: "09:00",
    endTime: "17:00",
    departmentLabel: "Special Facilities Lifeguard",
    sourceConfidence: "medium"
  },
  {
    id: "shift-slide-attendant",
    scheduleImportId: "import-1",
    employeeId: "employee-4",
    employeeName: "GREEN, CASEY",
    shiftDate: "2026-05-22",
    startTime: "09:00",
    endTime: "17:00",
    departmentLabel: "Aquatics",
    sourceNotes: "AQ Slide Attendant",
    sourceConfidence: "medium"
  }
];

describe("RotationBuilder persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const href = String(url);
      if (href.includes("rotation-plans") && init?.method === "POST") {
        return new Response(JSON.stringify({
          plan: {
            id: "plan-1",
            scheduleImportId: "import-1",
            planDate: "2026-05-22",
            rotationTemplates: [],
            assignments: {},
            supportAssignments: { captains: [], slideAttendants: [], groundCrew: [] },
            savedAt: "2026-05-22T12:00:00Z"
          }
        }), { status: 200 });
      }
      if (href.includes("rotation-plans")) {
        return new Response(JSON.stringify({ plan: null }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }));
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });


  it("prints a rotation handout without employee names", async () => {
    const user = userEvent.setup();
    renderWithWorkflowActions(<RotationBuilder shifts={shifts} />);

    await user.selectOptions(screen.getByLabelText("Print layout"), "handout");

    expect(screen.getByRole("region", { name: "Daily rotation handout" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Special Facilities (Red Shorts)" })).toBeInTheDocument();
    expect(screen.getByText("Top of Blaster")).toBeInTheDocument();
    expect(screen.queryByText("ALEX SMITH")).not.toBeInTheDocument();
    expect(screen.queryByText("TAYLOR JONES")).not.toBeInTheDocument();
  });

  it("prints a break sheet with employee names and starting positions", async () => {
    const user = userEvent.setup();
    renderWithWorkflowActions(<RotationBuilder shifts={shifts} />);

    await user.selectOptions(screen.getByLabelText("Top of Blaster"), "shift-special");
    await user.selectOptions(screen.getByLabelText("Print layout"), "break-sheet");

    expect(screen.getByRole("table", { name: "Lifeguard break sheet" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Employee Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Loc B4 Break 1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Brk 3 End Time" })).toBeInTheDocument();

    const rows = within(screen.getByRole("table", { name: "Lifeguard break sheet" })).getAllByRole("row");
    expect(rows).toHaveLength(shifts.length + 1 + 8);
    expect(rows[1]).toHaveTextContent("ALEX SMITH");
    expect(rows[2]).toHaveTextContent("CASEY GREEN");
    expect(rows[3]).toHaveTextContent("MORGAN BROWN");
    expect(rows[4]).toHaveTextContent("TAYLOR JONES");
    expect(rows[1]).toHaveTextContent("Top of Blaster");
  });

  it("autofills scheduled slide attendants into preferred top-of-slide positions", async () => {
    const user = userEvent.setup();
    renderWithWorkflowActions(
      <RotationBuilder
        shifts={[
          ...shifts,
          {
            id: "shift-slide-attendant-two",
            scheduleImportId: "import-1",
            employeeId: "employee-5",
            employeeName: "WHITE, RILEY",
            shiftDate: "2026-05-22",
            startTime: "09:00",
            endTime: "17:00",
            departmentLabel: "Aquatics",
            sourceNotes: "AQ Slide Attendant",
            sourceConfidence: "medium"
          }
        ]}
      />
    );

    const supportSection = screen.getByRole("heading", { name: "Captains, Slide Attendants & Ground Crew" }).closest("section");
    expect(supportSection).toBeTruthy();
    expect(within(supportSection as HTMLElement).getByText("CASEY GREEN")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("RILEY WHITE")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Autofill" }));

    const rotationGrid = document.querySelector(".rotation-builder__grid");
    expect(rotationGrid).toBeTruthy();
    expect(within(rotationGrid as HTMLElement).queryByLabelText("Top of Beacon")).not.toBeInTheDocument();
    expect(within(rotationGrid as HTMLElement).queryByLabelText("Top of Blaster")).not.toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("CASEY GREEN")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("Top of Beacon")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("RILEY WHITE")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("Top of Blaster")).toBeInTheDocument();
  });

  it("routes ground crew to ground positions and lets extra slide attendants cover ground positions", async () => {
    const user = userEvent.setup();
    renderWithWorkflowActions(
      <RotationBuilder
        shifts={[
          ...shifts,
          {
            id: "shift-slide-attendant-two",
            scheduleImportId: "import-1",
            employeeId: "employee-5",
            employeeName: "WHITE, RILEY",
            shiftDate: "2026-05-22",
            startTime: "09:00",
            endTime: "17:00",
            departmentLabel: "Aquatics",
            sourceNotes: "AQ Slide Attendant",
            sourceConfidence: "medium"
          },
          {
            id: "shift-slide-attendant-three",
            scheduleImportId: "import-1",
            employeeId: "employee-6",
            employeeName: "BLACK, JORDAN",
            shiftDate: "2026-05-22",
            startTime: "09:00",
            endTime: "17:00",
            departmentLabel: "Aquatics",
            sourceNotes: "AQ Slide Attendant",
            sourceConfidence: "medium"
          },
          {
            id: "shift-slide-attendant-four",
            scheduleImportId: "import-1",
            employeeId: "employee-7",
            employeeName: "GRAY, AVERY",
            shiftDate: "2026-05-22",
            startTime: "09:00",
            endTime: "17:00",
            departmentLabel: "Aquatics",
            sourceNotes: "AQ Slide Attendant",
            sourceConfidence: "medium"
          },
          {
            id: "shift-slide-attendant-five",
            scheduleImportId: "import-1",
            employeeId: "employee-8",
            employeeName: "YOUNG, PARKER",
            shiftDate: "2026-05-22",
            startTime: "09:00",
            endTime: "17:00",
            departmentLabel: "Aquatics",
            sourceNotes: "AQ Slide Attendant",
            sourceConfidence: "medium"
          },
          {
            id: "shift-ground-crew",
            scheduleImportId: "import-1",
            employeeId: "employee-9",
            employeeName: "STONE, JAMIE",
            shiftDate: "2026-05-22",
            startTime: "09:00",
            endTime: "17:00",
            departmentLabel: "Aquatics",
            sourceNotes: "AQ Ground Crew",
            sourceConfidence: "medium"
          },
          {
            id: "shift-ground-queue",
            scheduleImportId: "import-1",
            employeeId: "employee-10",
            employeeName: "GALLARDO, RYAN",
            shiftDate: "2026-05-22",
            startTime: "09:00",
            endTime: "17:00",
            departmentLabel: "Aquatics",
            sourceNotes: "AQ Ground Queue",
            sourceConfidence: "medium"
          }
        ]}
      />
    );

    const supportSection = screen.getByRole("heading", { name: "Captains, Slide Attendants & Ground Crew" }).closest("section");
    expect(supportSection).toBeTruthy();
    expect(within(supportSection as HTMLElement).getByText("JAMIE STONE")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("RYAN GALLARDO")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Autofill" }));

    const rotationGrid = document.querySelector(".rotation-builder__grid");
    expect(rotationGrid).toBeTruthy();
    expect(within(rotationGrid as HTMLElement).queryByLabelText("Ground Queue Blaster")).not.toBeInTheDocument();
    expect(within(rotationGrid as HTMLElement).queryByLabelText("Ground Queue Beacon")).not.toBeInTheDocument();
    expect(within(rotationGrid as HTMLElement).queryByLabelText("Ground Queue Racer")).not.toBeInTheDocument();
    expect(within(rotationGrid as HTMLElement).queryByLabelText("Top of Beacon")).not.toBeInTheDocument();
    expect(within(rotationGrid as HTMLElement).queryByLabelText("Top of Racer")).not.toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("JAMIE STONE")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("Ground Queue Blaster")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("RYAN GALLARDO")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("Ground Queue Beacon")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("PARKER YOUNG")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("Ground Queue Racer")).toBeInTheDocument();
  });

  it("lets managers manually assign support staff only to eligible rotation positions", () => {
    renderWithWorkflowActions(
      <RotationBuilder
        shifts={[
          ...shifts,
          {
            id: "shift-ground-crew",
            scheduleImportId: "import-1",
            employeeId: "employee-9",
            employeeName: "STONE, JAMIE",
            shiftDate: "2026-05-22",
            startTime: "09:00",
            endTime: "17:00",
            departmentLabel: "Aquatics",
            sourceNotes: "AQ Ground Crew",
            sourceConfidence: "medium"
          }
        ]}
      />
    );

    const topOfBeacon = screen.getByLabelText("Top of Beacon");
    const groundQueueBlaster = screen.getByLabelText("Ground Queue Blaster");
    const riverSix = screen.getByLabelText("River 6");

    expect(within(topOfBeacon).getByRole("option", { name: "CASEY GREEN" })).toBeInTheDocument();
    expect(within(topOfBeacon).queryByRole("option", { name: "JAMIE STONE" })).not.toBeInTheDocument();
    expect(within(groundQueueBlaster).getByRole("option", { name: "CASEY GREEN" })).toBeInTheDocument();
    expect(within(groundQueueBlaster).getByRole("option", { name: "JAMIE STONE" })).toBeInTheDocument();
    expect(within(riverSix).queryByRole("option", { name: "CASEY GREEN" })).not.toBeInTheDocument();
    expect(within(riverSix).queryByRole("option", { name: "JAMIE STONE" })).not.toBeInTheDocument();
  });

  it("moves manually assigned support positions out of the lifeguard rotation grid", async () => {
    const user = userEvent.setup();
    renderWithWorkflowActions(<RotationBuilder shifts={shifts} />);

    await user.selectOptions(screen.getByLabelText("Top of Beacon"), "shift-slide-attendant");

    const supportSection = screen.getByRole("heading", { name: "Captains, Slide Attendants & Ground Crew" }).closest("section");
    const rotationGrid = document.querySelector(".rotation-builder__grid");
    expect(supportSection).toBeTruthy();
    expect(rotationGrid).toBeTruthy();
    expect(within(rotationGrid as HTMLElement).queryByLabelText("Top of Beacon")).not.toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("CASEY GREEN")).toBeInTheDocument();
    expect(within(supportSection as HTMLElement).getByText("Top of Beacon")).toBeInTheDocument();
  });

  it("saves the current rotation plan", async () => {
    const user = userEvent.setup();
    renderWithWorkflowActions(<RotationBuilder shifts={shifts} />);

    const workflowActions = screen.getByLabelText("Workflow actions");
    const headerActions = within(workflowActions).getByLabelText("Header actions");
    await user.click(within(headerActions).getByRole("button", { name: "Save rotations" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/.netlify/functions/rotation-plans",
      expect.objectContaining({ method: "POST" })
    ));
  });
});
