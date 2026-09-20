# English language and typography audit — 2026-09-20

The whole-site audit is still in progress. Passing the checks below does not mean every administrator workflow or live authenticated role has been verified.

## Implemented

- Replaced partial word substitutions with complete-copy translations so unknown sentences do not become mixed-language fragments.
- Public published copy, course registration, notification workflows, coach profiles, and policy pages have English translations.
- English navigation, hero typography, and mobile coach names fit their available space. Mobile profile phone fields give English country labels enough room.
- Student dashboard, profile editing, badges, attendance, and makeup-session controls have English copy. Dates and countdowns follow the selected language.
- Student feedback option values remain unchanged when their displayed labels are translated.
- Coach workspace, registration details, attendance, teaching check-in, leave forms, and calendar have English copy and localized dates. Native cancellation confirmations follow the selected language.
- Finance access, transaction matching, file mapping, confirmations, and read-only states have English copy. The upload button uses website text instead of browser-native text.
- Option-group labels participate in language switching without changing the selected option values. Unsaved-change confirmations follow the selected language.

## Evidence

The role scripts run against a local preview with synthetic accounts. Every business API and external network request is intercepted; no real student, coach, bank, or email record is changed.

| Check | Verified scope |
| --- | --- |
| `audit-english-student.mjs` | 19 states: enrollment gates, populated/empty/error dashboard, settings, feedback submission, profile/badges, profile save, attendance, leave and makeup scheduling; 1440px and 375px |
| `audit-english-coach.mjs` | 28 states: workspace, check-in and leave forms, populated and empty rosters, expanded registration details, attendance save, cancellation/restoration, mobile calendar, and planner initial states |
| `audit-english-finance.mjs` | 18 states: locked/unlocked access, incorrect password, matching results, batch confirmation, CSV column preview, password setup, temporary lock, archived season, read-only access, empty batches, and unauthorized account |
| `verify-language-dom.mjs` | Mutation batches, translated attributes and option-group labels, unchanged option/input values, opt-out text, document titles, and English font stack |
| Unit tests | 158 tests passed, including all runner-profile option labels, badge labels, localized dates/countdowns, and finance count messages |
| Static checks | TypeScript, ESLint, Traditional Chinese check, and production build passed |

Strict mode for the role scripts fails on untranslated visible interface text, option labels, attributes, page errors, unexpected API requests, or horizontal document overflow. Screenshots were also inspected because native browser control text is not represented in DOM text scans.

The earlier public release `930abe5` passed 46 local routes plus a four-route read-only check on the production domain. Those public checks do not prove the new role changes are deployed.

## Still required before whole-site completion

- Administrator overview, student/coach administration, season management, analytics, product editing, content editing, and payment-account editing: cover all forms, dialogs, validations, and confirmation states.
- Product details, cart, checkout, and payment status using synthetic products and orders; the public shop currently has no products to exercise these states with.
- Coach planner editing/saving and alternate leave/substitution states; current coach coverage includes the initial planner state, not every editor action.
- Additional registration cases, API validation failures, and remaining native file controls.
- Recheck the final release on the production domain and record exactly which authenticated flows used real isolated fixtures versus mocked API responses.

Names, user-authored notes, uploaded filenames, and submitted values must not be silently rewritten to eliminate Chinese from audit results. Keep authored content distinct from system interface copy.
