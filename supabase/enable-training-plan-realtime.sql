-- Allow open student dashboards to refresh as soon as a coach saves a plan.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'training_plans'
  ) then
    alter publication supabase_realtime add table public.training_plans;
  end if;
end $$;
