import { useEffect, useState } from "react";
import type { ManualShiftInput } from "../domain/types";

interface ManualShiftFormProps {
  dates: string[];
  departments: string[];
  defaultDate: string;
  defaultDepartment: string;
  isSaving: boolean;
  onAdd: (shift: ManualShiftInput) => void | Promise<void>;
}

export function ManualShiftForm({
  dates,
  departments,
  defaultDate,
  defaultDepartment,
  isSaving,
  onAdd
}: ManualShiftFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [shiftDate, setShiftDate] = useState(defaultDate);
  const [departmentLabel, setDepartmentLabel] = useState(defaultDepartment);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState("");

  useEffect(() => {
    if ((!shiftDate || !dates.includes(shiftDate)) && defaultDate) setShiftDate(defaultDate);
  }, [dates, defaultDate, shiftDate]);

  useEffect(() => {
    if ((!departmentLabel || !departments.includes(departmentLabel)) && defaultDepartment) setDepartmentLabel(defaultDepartment);
  }, [defaultDepartment, departmentLabel, departments]);

  async function submitManualShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = employeeName.trim();
    if (!trimmedName || !shiftDate || !departmentLabel || !startTime || !endTime) {
      setError("Name, date, department, start time, and end time are required.");
      return;
    }

    setError("");
    await onAdd({
      employeeName: trimmedName,
      shiftDate,
      departmentLabel,
      startTime,
      endTime
    });
    setEmployeeName("");
    setIsOpen(false);
  }

  const canAdd = dates.length > 0 && departments.length > 0;

  return (
    <section className="manual-shift no-print">
      <button type="button" disabled={!canAdd || isSaving} onClick={() => setIsOpen((current) => !current)}>
        Add person
      </button>

      {isOpen ? (
        <form className="manual-shift__form" onSubmit={(event) => void submitManualShift(event)}>
          <label>
            <span>Name</span>
            <input
              aria-label="Name"
              value={employeeName}
              onChange={(event) => setEmployeeName(event.target.value)}
              placeholder="LAST, FIRST"
            />
          </label>
          <label>
            <span>Date</span>
            <select aria-label="Date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)}>
              {dates.map((date) => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Department</span>
            <select aria-label="Department" value={departmentLabel} onChange={(event) => setDepartmentLabel(event.target.value)}>
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Start time</span>
            <input aria-label="Start time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label>
            <span>End time</span>
            <input aria-label="End time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </label>
          <div className="manual-shift__actions">
            <button type="submit" disabled={isSaving}>Save person</button>
            <button type="button" disabled={isSaving} onClick={() => setIsOpen(false)}>Cancel</button>
          </div>
          {error ? <p role="alert">{error}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
