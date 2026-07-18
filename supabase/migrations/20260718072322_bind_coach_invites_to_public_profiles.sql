alter table public.coach_invites
  add column if not exists coach_key text;

-- Generic codes cannot be safely matched to a public coach identity.
delete from public.coach_invites
where coach_key is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'coach_invites_coach_key_fkey'
      and conrelid = 'public.coach_invites'::regclass
  ) then
    alter table public.coach_invites
      add constraint coach_invites_coach_key_fkey
      foreign key (coach_key)
      references public.coach_public_profiles(coach_key)
      on delete cascade;
  end if;
end
$$;

create unique index if not exists coach_invites_coach_key_key
  on public.coach_invites (coach_key);

alter table public.coach_invites
  alter column coach_key set not null;

comment on column public.coach_invites.coach_key is
  'The single public coach identity this one-time invite is allowed to claim.';

insert into public.coach_invites (code, coach_key, expires_at)
select
  'HYCOACH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  profile.coach_key,
  now() + interval '30 days'
from public.coach_public_profiles profile
where profile.owner_profile_id is null
on conflict (coach_key) do nothing;
