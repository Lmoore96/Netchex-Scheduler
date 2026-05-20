interface DepartmentOption {
  id: string;
  name: string;
}

interface DayDepartmentPickerProps {
  selectedDate: string;
  availableDates?: string[];
  departments: DepartmentOption[];
  selectedDepartmentId: string;
  onDateChange: (date: string) => void;
  onDepartmentChange: (departmentId: string) => void;
  disabled?: boolean;
}

export function DayDepartmentPicker({
  selectedDate,
  availableDates = [],
  departments,
  selectedDepartmentId,
  onDateChange,
  onDepartmentChange,
  disabled = false
}: DayDepartmentPickerProps) {
  return (
    <section className="day-department-picker" aria-label="Schedule filters">
      <label>
        <span>Day</span>
        {availableDates.length > 0 ? (
          <select
            value={selectedDate}
            disabled={disabled}
            onChange={(event) => onDateChange(event.target.value)}
          >
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="date"
            value={selectedDate}
            disabled={disabled}
            onChange={(event) => onDateChange(event.target.value)}
          />
        )}
      </label>

      <label>
        <span>Department</span>
        <select
          value={selectedDepartmentId}
          disabled={disabled}
          onChange={(event) => onDepartmentChange(event.target.value)}
        >
          <option value="">Choose department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
