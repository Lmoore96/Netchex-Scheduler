create table if not exists assignment_plans (
  id uuid primary key default gen_random_uuid(),
  schedule_import_id uuid not null references schedule_imports(id) on delete cascade,
  plan_date date not null,
  department_label text not null,
  position_list_id text not null,
  positions_snapshot jsonb not null,
  assignments jsonb not null,
  saved_at timestamptz not null default now(),
  unique (schedule_import_id, plan_date, department_label)
);

create table if not exists rotation_plans (
  id uuid primary key default gen_random_uuid(),
  schedule_import_id uuid not null references schedule_imports(id) on delete cascade,
  plan_date date not null,
  rotation_templates jsonb not null,
  assignments jsonb not null,
  support_assignments jsonb not null,
  saved_at timestamptz not null default now(),
  unique (schedule_import_id, plan_date)
);

alter table assignment_plans enable row level security;
alter table rotation_plans enable row level security;

create or replace function save_assignment_plan(plan jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved assignment_plans;
begin
  insert into assignment_plans (
    schedule_import_id,
    plan_date,
    department_label,
    position_list_id,
    positions_snapshot,
    assignments,
    saved_at
  )
  values (
    (plan->>'scheduleImportId')::uuid,
    (plan->>'planDate')::date,
    plan->>'departmentLabel',
    coalesce(plan->>'positionListId', ''),
    coalesce(plan->'positionsSnapshot', '[]'::jsonb),
    coalesce(plan->'assignments', '[]'::jsonb),
    now()
  )
  on conflict (schedule_import_id, plan_date, department_label)
  do update set
    position_list_id = excluded.position_list_id,
    positions_snapshot = excluded.positions_snapshot,
    assignments = excluded.assignments,
    saved_at = now()
  returning * into saved;

  return jsonb_build_object(
    'id', saved.id::text,
    'scheduleImportId', saved.schedule_import_id::text,
    'planDate', to_char(saved.plan_date, 'YYYY-MM-DD'),
    'departmentLabel', saved.department_label,
    'positionListId', saved.position_list_id,
    'positionsSnapshot', saved.positions_snapshot,
    'assignments', saved.assignments,
    'savedAt', saved.saved_at
  );
end;
$$;

create or replace function load_assignment_plan(import_id uuid, target_date date, target_department text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', assignment_plans.id::text,
    'scheduleImportId', assignment_plans.schedule_import_id::text,
    'planDate', to_char(assignment_plans.plan_date, 'YYYY-MM-DD'),
    'departmentLabel', assignment_plans.department_label,
    'positionListId', assignment_plans.position_list_id,
    'positionsSnapshot', assignment_plans.positions_snapshot,
    'assignments', assignment_plans.assignments,
    'savedAt', assignment_plans.saved_at
  )
  from assignment_plans
  where assignment_plans.schedule_import_id = import_id
    and assignment_plans.plan_date = target_date
    and assignment_plans.department_label = target_department
  limit 1;
$$;

create or replace function save_rotation_plan(plan jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved rotation_plans;
begin
  insert into rotation_plans (
    schedule_import_id,
    plan_date,
    rotation_templates,
    assignments,
    support_assignments,
    saved_at
  )
  values (
    (plan->>'scheduleImportId')::uuid,
    (plan->>'planDate')::date,
    coalesce(plan->'rotationTemplates', '[]'::jsonb),
    coalesce(plan->'assignments', '{}'::jsonb),
    coalesce(plan->'supportAssignments', '{"captains": [], "slideAttendants": []}'::jsonb),
    now()
  )
  on conflict (schedule_import_id, plan_date)
  do update set
    rotation_templates = excluded.rotation_templates,
    assignments = excluded.assignments,
    support_assignments = excluded.support_assignments,
    saved_at = now()
  returning * into saved;

  return jsonb_build_object(
    'id', saved.id::text,
    'scheduleImportId', saved.schedule_import_id::text,
    'planDate', to_char(saved.plan_date, 'YYYY-MM-DD'),
    'rotationTemplates', saved.rotation_templates,
    'assignments', saved.assignments,
    'supportAssignments', saved.support_assignments,
    'savedAt', saved.saved_at
  );
end;
$$;

create or replace function load_rotation_plan(import_id uuid, target_date date)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', rotation_plans.id::text,
    'scheduleImportId', rotation_plans.schedule_import_id::text,
    'planDate', to_char(rotation_plans.plan_date, 'YYYY-MM-DD'),
    'rotationTemplates', rotation_plans.rotation_templates,
    'assignments', rotation_plans.assignments,
    'supportAssignments', rotation_plans.support_assignments,
    'savedAt', rotation_plans.saved_at
  )
  from rotation_plans
  where rotation_plans.schedule_import_id = import_id
    and rotation_plans.plan_date = target_date
  limit 1;
$$;

revoke all on function save_assignment_plan(jsonb) from public;
revoke all on function save_assignment_plan(jsonb) from anon;
revoke all on function save_assignment_plan(jsonb) from authenticated;
grant execute on function save_assignment_plan(jsonb) to service_role;

revoke all on function load_assignment_plan(uuid, date, text) from public;
revoke all on function load_assignment_plan(uuid, date, text) from anon;
revoke all on function load_assignment_plan(uuid, date, text) from authenticated;
grant execute on function load_assignment_plan(uuid, date, text) to service_role;

revoke all on function save_rotation_plan(jsonb) from public;
revoke all on function save_rotation_plan(jsonb) from anon;
revoke all on function save_rotation_plan(jsonb) from authenticated;
grant execute on function save_rotation_plan(jsonb) to service_role;

revoke all on function load_rotation_plan(uuid, date) from public;
revoke all on function load_rotation_plan(uuid, date) from anon;
revoke all on function load_rotation_plan(uuid, date) from authenticated;
grant execute on function load_rotation_plan(uuid, date) to service_role;
