-- Trigger functions are internal; browsers must not receive direct execution grants.
revoke all on function public.complete_verified_makeup() from public, anon, authenticated;
revoke all on function public.guard_checked_in_makeup() from public, anon, authenticated;
revoke all on function public.guard_leave_after_checkin() from public, anon, authenticated;
