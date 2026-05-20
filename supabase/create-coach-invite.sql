-- Create one test coach invite.
-- Change the code before inviting people outside the small test group.

insert into public.coach_invites (code, expires_at)
values ('GOODLUCK-COACH-2026', now() + interval '90 days')
on conflict (code) do update
set
  used_by = null,
  used_at = null,
  expires_at = excluded.expires_at;
