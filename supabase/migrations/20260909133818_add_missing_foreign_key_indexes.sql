-- Add covering indexes for every foreign key reported as unindexed by the
-- Supabase database advisor on 2026-09-09. These improve joins and parent-row
-- updates/deletes without changing application data or access policies.

create index if not exists idx_admin_role_allowlist_granted_by
  on public.admin_role_allowlist (granted_by);

create index if not exists idx_coach_account_allowlist_created_by
  on public.coach_account_allowlist (created_by);

create index if not exists idx_coach_account_allowlist_disabled_by
  on public.coach_account_allowlist (disabled_by);

create index if not exists idx_coach_account_audit_log_actor_profile
  on public.coach_account_audit_log (actor_profile_id);

create index if not exists idx_coach_account_audit_log_target_profile
  on public.coach_account_audit_log (target_profile_id);

create index if not exists idx_coach_invites_created_by
  on public.coach_invites (created_by);

create index if not exists idx_coach_invites_used_by
  on public.coach_invites (used_by);

create index if not exists idx_coach_session_assignments_admin_reviewer
  on public.coach_session_assignments (admin_reviewed_by);

create index if not exists idx_coach_session_assignments_recommended_substitute
  on public.coach_session_assignments (recommended_substitute_id);

create index if not exists idx_coach_session_assignments_season
  on public.coach_session_assignments (season_id);

create index if not exists idx_coach_session_assignments_substitute_coach
  on public.coach_session_assignments (substitute_coach_id);

create index if not exists idx_coach_session_checkins_corrected_by
  on public.coach_session_checkins (corrected_by);

create index if not exists idx_coach_session_duty_audit_actor_profile
  on public.coach_session_duty_audit_log (actor_profile_id);

create index if not exists idx_coach_students_student
  on public.coach_students (student_id);

create index if not exists idx_feedback_attachments_feedback
  on public.feedback_attachments (feedback_id);

create index if not exists idx_feedback_attachments_student
  on public.feedback_attachments (student_id);

create index if not exists idx_profile_achievements_awarded_by
  on public.profile_achievements (awarded_by);

create index if not exists idx_profile_achievements_badge
  on public.profile_achievements (badge_id);

create index if not exists idx_acceptance_checkins_participant_profile
  on public.site_acceptance_test_checkins (participant_profile_id);

create index if not exists idx_training_feedback_coach
  on public.training_feedback (coach_id);

create index if not exists idx_training_feedback_student
  on public.training_feedback (student_id);

create index if not exists idx_training_feedback_plan
  on public.training_feedback (training_plan_id);

create index if not exists idx_training_plans_coach
  on public.training_plans (coach_id);

create index if not exists idx_training_plans_student
  on public.training_plans (student_id);
