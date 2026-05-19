interface DepartmentOption {
  id: string;
  name: string;
}

interface DayDepartmentPickerProps {
  selectedDate: string;
  departments: DepartmentOption[];
  selectedDepartmentId: string;
  onDateChange: (date: string) => void;
  onDepartmentChange: (departmentId: string) => void;
  disabled?: boolean;
}

export function DayDepartmentPicker({
  selectedDate,
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
        <input
          type="date"
          value={selectedDate}
          disabled={disabled}
          onChange={(event) => onDateChange(event.target.value)}
        />
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
