create or replace function add_manual_shift(shift_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_shift shifts;
  saved_employee_id uuid;
  saved_department_id uuid;
  saved_employee_name text;
begin
  insert into employees (display_name)
  values (btrim(shift_data->>'employeeName'))
  on conflict (display_name) do update
    set display_name = excluded.display_name
  returning id, display_name into saved_employee_id, saved_employee_name;

  insert into departments (name)
  values (btrim(shift_data->>'departmentLabel'))
  on conflict (name) do update
    set name = excluded.name
  returning id into saved_department_id;

  insert into shifts (
    schedule_import_id,
    employee_id,
    shift_date,
    start_time,
    end_time,
    department_label,
    normalized_department_id,
    source_confidence,
    source_notes
  )
  values (
    (shift_data->>'scheduleImportId')::uuid,
    saved_employee_id,
    (shift_data->>'shiftDate')::date,
    (shift_data->>'startTime')::time,
    (shift_data->>'endTime')::time,
    btrim(shift_data->>'departmentLabel'),
    saved_department_id,
    'high',
    'Manually added'
  )
  returning * into saved_shift;

  return jsonb_build_object(
    'id', saved_shift.id::text,
    'scheduleImportId', saved_shift.schedule_import_id::text,
    'employeeId', saved_shift.employee_id::text,
    'employeeName', saved_employee_name,
    'shiftDate', to_char(saved_shift.shift_date, 'YYYY-MM-DD'),
    'startTime', to_char(saved_shift.start_time, 'HH24:MI'),
    'endTime', to_char(saved_shift.end_time, 'HH24:MI'),
    'departmentLabel', saved_shift.department_label,
    'normalizedDepartmentId', saved_shift.normalized_department_id::text,
    'sourceConfidence', saved_shift.source_confidence,
    'sourceNotes', saved_shift.source_notes
  );
end;
$$;

revoke all on function add_manual_shift(jsonb) from public;
revoke all on function add_manual_shift(jsonb) from anon;
revoke all on function add_manual_shift(jsonb) from authenticated;
grant execute on function add_manual_shift(jsonb) to service_role;
