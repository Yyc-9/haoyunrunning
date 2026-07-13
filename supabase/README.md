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

`schema.sql` is retained only as the original project baseline. Do not paste it
into an existing production project. All new database changes belong in
`supabase/migrations/` and must be applied in timestamp order.

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

## 4. Seasonal course flow

- `course_seasons` keeps each quarter independent.
- `course_season_courses` stores the course copy and capacity for that quarter.
- Course registrations reference both the season and its course offering.
- Create the next quarter from Admin > Seasonal Management, edit it as a draft,
  then activate it when the public site should switch enrollment.
- Historical registrations remain attached to the original season.

## 5. Coach invite flow

Coach invite codes are generated in the admin dashboard. They are single-use and
expire automatically; there is no shared hard-coded invite code.
