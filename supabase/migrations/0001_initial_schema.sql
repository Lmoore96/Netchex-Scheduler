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
