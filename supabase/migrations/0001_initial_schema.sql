create extension if not exists "pgcrypto";

create table schedule_imports (
  id uuid primary key default gen_random_uuid(),
  source_file_name text not null,
  date_range_start date not null,
  date_range_end date not null,
  imported_at timestamptz not null default now(),
  status text not null check (status in ('draft', 'confirmed', 'failed')),
  raw_file_path text
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  initials text
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_color text,
  aliases text[] not null default '{}'
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  schedule_import_id uuid not null references schedule_imports(id) on delete cascade,
  employee_id uuid not null references employees(id),
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  department_label text not null,
  normalized_department_id uuid references departments(id),
  source_confidence text not null check (source_confidence in ('high', 'medium', 'low')),
  source_notes text
);

create table position_lists (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  name text not null,
  positions jsonb not null,
  unique (department_id, name)
);

create table daily_position_plans (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  plan_date date not null,
  position_list_id uuid not null references position_lists(id),
  positions_snapshot jsonb not null,
  unique (department_id, plan_date)
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  daily_position_plan_id uuid not null references daily_position_plans(id) on delete cascade,
  shift_id uuid not null references shifts(id) on delete cascade,
  position_key text not null,
  sort_order integer not null default 0,
  notes text,
  unique (daily_position_plan_id, shift_id)
);

alter table schedule_imports enable row level security;
alter table employees enable row level security;
alter table departments enable row level security;
alter table shifts enable row level security;
alter table position_lists enable row level security;
alter table daily_position_plans enable row level security;
alter table assignments enable row level security;

create or replace function confirm_schedule_import(draft jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  import_id uuid;
  shift_record jsonb;
  employee_id uuid;
  department_id uuid;
begin
  insert into schedule_imports (
    source_file_name,
    date_range_start,
    date_range_end,
    status
  )
  values (
    draft->>'sourceFileName',
    (draft->>'dateRangeStart')::date,
    (draft->>'dateRangeEnd')::date,
    'confirmed'
  )
  returning id into import_id;

  for shift_record in
    select value
    from jsonb_array_elements(coalesce(draft->'shifts', '[]'::jsonb))
  loop
    continue when coalesce((shift_record->>'ignored')::boolean, false);

    insert into employees (display_name)
    values (shift_record->>'employeeName')
    on conflict (display_name) do update
      set display_name = excluded.display_name
    returning id into employee_id;

    insert into departments (name)
    values (shift_record->>'departmentLabel')
    on conflict (name) do update
      set name = excluded.name
    returning id into department_id;

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
      import_id,
      employee_id,
      (shift_record->>'shiftDate')::date,
      (shift_record->>'startTime')::time,
      (shift_record->>'endTime')::time,
      shift_record->>'departmentLabel',
      department_id,
      shift_record->>'sourceConfidence',
      shift_record->>'sourceNotes'
    );
  end loop;

  return import_id;
end;
$$;

revoke all on function confirm_schedule_import(jsonb) from public;
revoke all on function confirm_schedule_import(jsonb) from anon;
revoke all on function confirm_schedule_import(jsonb) from authenticated;
grant execute on function confirm_schedule_import(jsonb) to service_role;

create or replace function replace_assignments(plan_id uuid, assignment_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_record jsonb;
  saved_count integer := 0;
begin
  delete from assignments
  where daily_position_plan_id = plan_id;

  for assignment_record in
    select value
    from jsonb_array_elements(coalesce(assignment_rows, '[]'::jsonb))
  loop
    insert into assignments (
      daily_position_plan_id,
      shift_id,
      position_key,
      sort_order,
      notes
    )
    values (
      plan_id,
      (assignment_record->>'shiftId')::uuid,
      assignment_record->>'positionKey',
      (assignment_record->>'sortOrder')::integer,
      assignment_record->>'notes'
    );

    saved_count := saved_count + 1;
  end loop;

  return saved_count;
end;
$$;

revoke all on function replace_assignments(uuid, jsonb) from public;
revoke all on function replace_assignments(uuid, jsonb) from anon;
revoke all on function replace_assignments(uuid, jsonb) from authenticated;
grant execute on function replace_assignments(uuid, jsonb) to service_role;
