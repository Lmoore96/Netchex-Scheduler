import { useEffect, useMemo, useState } from "react";
import type { Shift } from "../domain/types";
import { formatShiftRange } from "../lib/time";
import "./RotationBuilder.css";

type RotationKind = "special" | "shallow";
type RotationTone = "orange" | "cyan" | "green";

interface RotationDefinition {
  id: string;
  title: string;
  subtitle: string;
  kind: RotationKind;
  tone: RotationTone;
  positions: string[];
}

interface RotationBuilderProps {
  shifts: Shift[];
}

const rotations: RotationDefinition[] = [
  {
    id: "special-facilities",
    title: "Special Facilities",
    subtitle: "Red Shorts",
    kind: "special",
    tone: "orange",
    positions: [
      "Top of Blaster",
      "Top of Camille",
      "Wave 3",
      "Wave Beach",
      "Break",
      "Top of Racer",
      "Top of Shipwreck",
      "Top of Beacon",
      "Wave 1",
      "Break"
    ]
  },
  {
    id: "shallow-one",
    title: "Shallow Rotation 1",
    subtitle: "Blue/Red",
    kind: "shallow",
    tone: "cyan",
    positions: [
      "Bottom of Blaster",
      "Bottom of Camille",
      "Splashpads by Blaster",
      "Ground Queue Blaster",
      "River 6",
      "Break",
      "Long Beach",
      "River 7",
      "River 8",
      "Bottom of Shipwreck",
      "Ground Queue Beacon",
      "Break"
    ]
  },
  {
    id: "shallow-two",
    title: "Shallow Rotation 2",
    subtitle: "Blue/Red",
    kind: "shallow",
    tone: "green",
    positions: [
      "Bottom of Racer",
      "River 4",
      "Ground Queue Racer",
      "Kids Beach",
      "River 3",
      "Break",
      "B. Beacon",
      "Pads",
      "River 5",
      "River 2",
      "River 1",
      "Break"
    ]
  }
];

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function isSpecialFacilitiesShift(shift: Shift) {
  return shift.departmentLabel.toLowerCase().includes("special facilit");
}

function isShallowShift(shift: Shift) {
  return shift.departmentLabel.toLowerCase().includes("shallow");
}

function assignmentKey(rotationId: string, positionIndex: number) {
  return `${rotationId}:${positionIndex}`;
}

function employeeOptionLabel(shift: Shift) {
  return `${shift.employeeName} (${formatShiftRange(shift.startTime, shift.endTime)})`;
}

function eligibleShifts(rotation: RotationDefinition, shifts: Shift[]) {
  if (rotation.kind === "special") {
    return shifts.filter(isSpecialFacilitiesShift);
  }

  return shifts.filter((shift) => isSpecialFacilitiesShift(shift) || isShallowShift(shift));
}

export function RotationBuilder({ shifts }: RotationBuilderProps) {
  const dates = useMemo(() => uniqueSorted(shifts.map((shift) => shift.shiftDate)), [shifts]);
  const [selectedDate, setSelectedDate] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedDate && dates[0]) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  const currentDate = selectedDate || dates[0] || "";
  const dateShifts = useMemo(
    () => shifts.filter((shift) => shift.shiftDate === currentDate),
    [currentDate, shifts]
  );
  const assignedShiftIds = useMemo(
    () => new Set(Object.values(assignments).filter(Boolean)),
    [assignments]
  );
  const unassignedShifts = dateShifts.filter((shift) => !assignedShiftIds.has(shift.id));
  const specialCount = dateShifts.filter(isSpecialFacilitiesShift).length;
  const shallowCount = dateShifts.filter(isShallowShift).length;

  function selectDate(date: string) {
    setSelectedDate(date);
    setAssignments({});
  }

  function selectAssignment(key: string, shiftId: string) {
    setAssignments((current) => ({ ...current, [key]: shiftId }));
  }

  return (
    <section className="panel rotation-builder">
      <div className="section-heading rotation-builder__heading">
        <div>
          <h2>Lifeguard Rotations</h2>
          <p>Special Facilities can fill any rotation. Shallow lifeguards stay on shallow rotations.</p>
        </div>
        <div className="rotation-builder__toolbar no-print">
          <label>
            <span>Date</span>
            <select value={currentDate} onChange={(event) => selectDate(event.target.value)}>
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => window.print()} disabled={dateShifts.length === 0}>
            Print rotations
          </button>
        </div>
      </div>

      {dateShifts.length === 0 ? (
        <p className="app-alert" role="alert">
          No Special Facilities or Shallow Lifeguard shifts were found for this date.
        </p>
      ) : (
        <>
          <div className="rotation-builder__counts" aria-label="Scheduled lifeguard counts">
            <span>{specialCount} Special Facilities</span>
            <span>{shallowCount} Shallow</span>
            <span>{unassignedShifts.length} On deck</span>
          </div>

          <div className="rotation-builder__grid">
            {rotations.map((rotation) => (
              <section key={rotation.id} className={`rotation-card rotation-card--${rotation.tone}`}>
                <header className="rotation-card__header">
                  <div>
                    <h3>{rotation.title}</h3>
                    <p>{rotation.subtitle}</p>
                  </div>
                  <span>Opening Positions</span>
                </header>

                <div className="rotation-card__rows">
                  {rotation.positions.map((position, index) => {
                    const key = assignmentKey(rotation.id, index);
                    const currentShiftId = assignments[key] || "";
                    const options = eligibleShifts(rotation, dateShifts).filter(
                      (shift) => !assignedShiftIds.has(shift.id) || shift.id === currentShiftId
                    );

                    return (
                      <label key={key} className="rotation-row">
                        <span className="rotation-row__position">{position}</span>
                        <select value={currentShiftId} onChange={(event) => selectAssignment(key, event.target.value)}>
                          <option value="">Open</option>
                          {options.map((shift) => (
                            <option key={shift.id} value={shift.id}>
                              {employeeOptionLabel(shift)}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <section className="rotation-builder__extras">
            <div>
              <h3>On Deck / Extras</h3>
              <p>Anyone not assigned above stays here automatically.</p>
            </div>
            {unassignedShifts.length > 0 ? (
              <ul>
                {unassignedShifts.map((shift) => (
                  <li key={shift.id}>
                    <strong>{shift.employeeName}</strong>
                    <span>{shift.departmentLabel}</span>
                    <span>{formatShiftRange(shift.startTime, shift.endTime)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Everyone scheduled for this rotation group has been assigned.</p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
