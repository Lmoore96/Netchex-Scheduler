import { useEffect, useMemo, useState } from "react";
import type { Shift } from "../domain/types";
import { formatShiftRange } from "../lib/time";
import "./CalloutManager.css";

interface CalloutManagerProps {
  shifts: Shift[];
  calloutShiftIds: Record<string, boolean>;
  onToggleCallout: (shiftId: string) => void;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function formatEmployeeName(employeeName: string) {
  const trimmed = employeeName.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(",");

  if (parts.length > 1) {
    const lastName = parts[0].trim();
    const firstName = parts.slice(1).join(",").trim();
    if (firstName && lastName) return `${firstName} ${lastName}`;
  }

  return trimmed;
}

function shiftLabel(shift: Shift) {
  return `${formatEmployeeName(shift.employeeName)} - ${shift.departmentLabel} (${formatShiftRange(shift.startTime, shift.endTime)})`;
}

export function CalloutManager({ shifts, calloutShiftIds, onToggleCallout }: CalloutManagerProps) {
  const dates = useMemo(() => uniqueSorted(shifts.map((shift) => shift.shiftDate)), [shifts]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!selectedDate && dates[0]) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  const currentDate = selectedDate || dates[0] || "";
  const dateShifts = shifts.filter((shift) => shift.shiftDate === currentDate);
  const activeShifts = dateShifts.filter((shift) => !calloutShiftIds[shift.id]);
  const calledOutShifts = dateShifts.filter((shift) => calloutShiftIds[shift.id]);
  const totalCallouts = shifts.filter((shift) => calloutShiftIds[shift.id]).length;

  useEffect(() => {
    if (selectedShiftId && !activeShifts.some((shift) => shift.id === selectedShiftId)) {
      setSelectedShiftId("");
    }
  }, [activeShifts, selectedShiftId]);

  function markSelectedCallout() {
    if (!selectedShiftId) return;
    onToggleCallout(selectedShiftId);
    setSelectedShiftId("");
  }

  return (
    <section className={`callout-manager no-print ${isCollapsed ? "is-collapsed" : ""}`}>
      <header className="callout-manager__header">
        <div>
          <h2>Callouts</h2>
          <p>{totalCallouts > 0 ? `${totalCallouts} removed from today's tools.` : "Remove someone from all tools if they call out."}</p>
        </div>
        <button type="button" onClick={() => setIsCollapsed((current) => !current)}>
          {isCollapsed ? "Show" : "Minimize"}
        </button>
      </header>

      <div className="callout-manager__body">
        <div className="callout-manager__controls">
          <label>
            <span>Date</span>
            <select value={currentDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedShiftId(""); }}>
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Person</span>
            <select value={selectedShiftId} onChange={(event) => setSelectedShiftId(event.target.value)}>
              <option value="">Choose person</option>
              {activeShifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shiftLabel(shift)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={markSelectedCallout} disabled={!selectedShiftId}>
            Mark callout
          </button>
        </div>

        {calledOutShifts.length > 0 ? (
          <ul className="callout-manager__list">
            {calledOutShifts.map((shift) => (
              <li key={shift.id}>
                <div>
                  <strong>{formatEmployeeName(shift.employeeName)}</strong>
                  <span>{shift.departmentLabel} - {formatShiftRange(shift.startTime, shift.endTime)}</span>
                </div>
                <button type="button" onClick={() => onToggleCallout(shift.id)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="callout-manager__empty">No callouts marked for this date.</p>
        )}
      </div>
    </section>
  );
}
