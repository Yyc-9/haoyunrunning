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
- Administrator navigation, season overview, student/coach account management, and payment-account forms now have English interface copy and locale-aware dates.
- Enrollment review includes English statistics, sync notices, registration/order details, billing exceptions, and native payment/delete confirmations. CSV headers and filenames follow the selected language; authored notes and identifying values remain intact.
- Administrator coach-duty details, leave review, substitute assignment, emergency coverage, and manual attendance correction have English labels, dates, and validation messages. Authored leave reasons and audit notes remain unchanged.
- Shop search matches displayed English names; product details, cart, checkout, payment status and error messages follow the selected language. Stored specification values, cart identifiers and customer notes remain unchanged.
- Product administration includes English fields, validation, image cropping, unsaved-change confirmations and delete dialogs.
- Content and season editors have English field labels, help text, media controls, validation, statuses and native confirmations. Coach/photo and badge labels translate their interface wording without rewriting form values.
- Content navigation descriptions wrap instead of clipping. Milestone image fields have enough space for previews and controls. A failed slideshow image upload keeps the crop dialog open with an error and allows retry.

## Evidence

The role scripts run against a local preview with synthetic accounts. Every business API and external network request is intercepted; no real student, coach, bank, or email record is changed.

| Check | Verified scope |
| --- | --- |
| `audit-english-student.mjs` | 19 states: enrollment gates, populated/empty/error dashboard, settings, feedback submission, profile/badges, profile save, attendance, leave and makeup scheduling; 1440px and 375px |
| `audit-english-coach.mjs` | 28 states: workspace, check-in and leave forms, populated and empty rosters, expanded registration details, attendance save, cancellation/restoration, mobile calendar, and planner initial states |
| `audit-english-finance.mjs` | 18 states: locked/unlocked access, incorrect password, matching results, batch confirmation, CSV column preview, password setup, temporary lock, archived season, read-only access, empty batches, and unauthorized account |
| `verify-language-dom.mjs` | Mutation batches, translated attributes and option-group labels, unchanged option/input values, opt-out text, document titles, and English font stack |
| `audit-english-admin.mjs` | 53 checks: desktop/mobile workspaces, coach-duty details and action dialogs, required reasons, attendance correction, registration and shop-order details, payment validation/confirmation, billing resolution, synchronization dialog, CSV headers, mobile student tabs/coach assignment and payment-account validation |
| `audit-english-shop.mjs` | 40 states at 1440px and 375px, including five product details, English search, cart, checkout error/success, payment states, stale specifications, empty and failed loads; strict mode passed |
| `LANGUAGE_ADMIN_PRODUCTS=1 audit-english-admin.mjs` | 28 desktop/mobile states: product editing, specification validation, image crop/upload, save/discard, create/delete and custom sizes; no untranslated interface text or horizontal overflow |
| `LANGUAGE_ADMIN_CONTENT=1 audit-english-admin.mjs` | 102 strict desktop/mobile states: every content section, draft/restore/save, coach profile, hero/avatar cropping, image failure/retry and video upload failure, season settings, native delete/activate/discard confirmations, course pricing validation/save, new-course validation, draft/archived/empty seasons; no untranslated interface text, page errors, unexpected APIs or overflow |
| Unit tests | 160 tests passed, including unchanged specification values, cart identifiers and backend validation under English display |
| Static checks | TypeScript, ESLint, Traditional Chinese check, and production build passed |

Strict mode for the role scripts fails on untranslated visible interface text, option labels, attributes, page errors, unexpected API requests, or horizontal document overflow. Screenshots were also inspected because native browser control text is not represented in DOM text scans.

The earlier public release `930abe5` passed 46 local routes plus a four-route read-only check on the production domain. Those public checks do not prove the new role changes are deployed.

The student, coach, and finance checkpoint `935cbe9` and subsequent administrator/shop release `c0d54df` were pushed; their production deployments reached Ready with the formal domain assigned and homepage HTTP 200. The newer content/season editor changes remain local until separately released. Their isolated production build, TypeScript, ESLint, Traditional Chinese checks and 160 unit tests passed. The existing 53-check administrator audit and 31-state registration/notification/public-coach interaction audit passed again. A CSV regression verifies translated fixed headers while retaining authored Chinese notes and leading zeroes in phone numbers and transfer codes.

Content save checks compare the synthetic payload before and after saving in English, including unrelated sections and original Chinese copy. Course saves retain Chinese weekday values and Taiwan time. Screenshots wait for finite entrance animations and capture their finished state; content panels must be visible during text inspection. Desktop content, mobile course fields and avatar cropping were visually inspected.

## Still required before whole-site completion

- Extend season-editor checks to completed create/duplicate/activate/delete operations and their server failures. The current audit exercises all content sections, content/coach/course saving, pricing validation, native confirmations and archived/empty states, but does not mutate those season actions.
- Extend administrator coverage to alternative coach-duty states, archived/empty/error states, coach account mutations, payment-account publication and account creation results. Current audit covers populated workspaces, primary review dialogs, native confirmations, and selected validations/actions.
- Shop and product-editor checks above use synthetic products and intercepted APIs; live authenticated workflows still require separate verification.
- Coach planner editing/saving and alternate leave/substitution states; current coach coverage includes the initial planner state, not every editor action.
- Additional registration cases, API validation failures, and remaining native file controls.
- Recheck the final release on the production domain and record exactly which authenticated flows used real isolated fixtures versus mocked API responses.

Names, user-authored notes, uploaded filenames, and submitted values must not be silently rewritten to eliminate Chinese from audit results. Keep authored content distinct from system interface copy.
