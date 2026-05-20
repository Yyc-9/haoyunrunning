# Supabase setup

## 1. Environment variables

Create `.env.local` in the project root and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
```

Do not commit `.env.local`.

## 2. Database schema

Open Supabase dashboard:

1. Project > SQL Editor
2. New query
3. Paste `supabase/schema.sql`
4. Run

This creates:

- `profiles`
- `coach_students`
- `training_plans`
- `training_feedback`
- `feedback_attachments`
- `coach_invites`
- private Storage bucket `training-feedback`
- Row Level Security policies

## 3. Product flow

- New users are students by default.
- Coach permission is granted later by invite/admin flow.
- Students can read their own plans and submit feedback.
- Coaches can read assigned students, plans, and feedback.
- Admins can manage role assignment and coach/student relations.

## 4. Coach invite test flow

If the initial schema has already been run, also run:

1. `supabase/coach-binding-policies.sql`
2. `supabase/create-coach-invite.sql`

Then log in on `/coach`, enter `GOODLUCK-COACH-2026`, and bind a registered student by email.
