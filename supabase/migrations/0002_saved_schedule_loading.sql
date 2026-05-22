create or replace function list_saved_schedule_imports()
returns table (
  id uuid,
  source_file_name text,
  date_range_start date,
  date_range_end date,
  imported_at timestamptz,
  shift_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    schedule_imports.id,
    schedule_imports.source_file_name,
    schedule_imports.date_range_start,
    schedule_imports.date_range_end,
    schedule_imports.imported_at,
    count(shifts.id) as shift_count
  from schedule_imports
  left join shifts on shifts.schedule_import_id = schedule_imports.id
  where schedule_imports.status = 'confirmed'
  group by
    schedule_imports.id,
    schedule_imports.source_file_name,
    schedule_imports.date_range_start,
    schedule_imports.date_range_end,
    schedule_imports.imported_at
  order by schedule_imports.imported_at desc
  limit 75;
$$;

revoke all on function list_saved_schedule_imports() from public;
revoke all on function list_saved_schedule_imports() from anon;
revoke all on function list_saved_schedule_imports() from authenticated;
grant execute on function list_saved_schedule_imports() to service_role;

create or replace function load_saved_schedule_import(import_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'importId', schedule_imports.id::text,
    'sourceFileName', schedule_imports.source_file_name,
    'dateRangeStart', to_char(schedule_imports.date_range_start, 'YYYY-MM-DD'),
    'dateRangeEnd', to_char(schedule_imports.date_range_end, 'YYYY-MM-DD'),
    'warnings', '[]'::jsonb,
    'shifts', coalesce(
      jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'id', shifts.id::text,
          'scheduleImportId', shifts.schedule_import_id::text,
          'employeeId', shifts.employee_id::text,
          'employeeName', employees.display_name,
          'shiftDate', to_char(shifts.shift_date, 'YYYY-MM-DD'),
          'startTime', to_char(shifts.start_time, 'HH24:MI'),
          'endTime', to_char(shifts.end_time, 'HH24:MI'),
          'departmentLabel', shifts.department_label,
          'normalizedDepartmentId', shifts.normalized_department_id::text,
          'sourceConfidence', shifts.source_confidence,
          'sourceNotes', shifts.source_notes
        ))
        order by shifts.shift_date, shifts.department_label, employees.display_name, shifts.start_time
      ) filter (where shifts.id is not null),
      '[]'::jsonb
    )
  )
  from schedule_imports
  left join shifts on shifts.schedule_import_id = schedule_imports.id
  left join employees on employees.id = shifts.employee_id
  where schedule_imports.id = import_id
    and schedule_imports.status = 'confirmed'
  group by
    schedule_imports.id,
    schedule_imports.source_file_name,
    schedule_imports.date_range_start,
    schedule_imports.date_range_end;
$$;

revoke all on function load_saved_schedule_import(uuid) from public;
revoke all on function load_saved_schedule_import(uuid) from anon;
revoke all on function load_saved_schedule_import(uuid) from authenticated;
grant execute on function load_saved_schedule_import(uuid) to service_role;
