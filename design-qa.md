**Design QA**

- Source visual truth: user-provided `Safari瀏覽器 Appshot 2026-07-19T05-28-25.983Z.png` in the current task.
- Desktop implementation screenshot: `/private/tmp/haoyun-courses-table-desktop.png`.
- Mobile implementation screenshot: `/private/tmp/haoyun-courses-table-mobile.png`.
- Viewports: desktop 1440 × 1000; mobile 390 × 844.
- State: `/courses`, default filters, course schedule visible.

**Full-view comparison evidence**

- The source shows the existing course-table grid with mixed blue, green, and gray course cards. The implementation preserves the same grid, black weekday header, card dimensions, typography, spacing, icons, copy, links, and filtering structure while applying one shared gray card treatment.
- Desktop and mobile renders retain the existing information hierarchy and responsive structure. No horizontal overflow was detected.

**Focused region comparison evidence**

- The schedule-card region was inspected at both breakpoints. Every visible course card resolves to `rgb(241, 245, 249)` with border `rgb(226, 232, 240)`.
- The black weekday headers and black selected-filter states remain unchanged, matching the requested scope.

**Required fidelity surfaces**

- Fonts and typography: unchanged from the existing course table; weight, size, line height, and wrapping remain consistent.
- Spacing and layout rhythm: unchanged; grid tracks, card padding, gaps, borders, and radii remain aligned.
- Colors and visual tokens: mixed semantic card colors were replaced by a single slate-gray treatment; contrast remains readable.
- Image quality and asset fidelity: no image assets are used in the course cards; existing icons remain from the project's icon library.
- Copy and content: unchanged.

**Findings**

- No actionable P0, P1, or P2 findings.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Use one shared course-card color on desktop.
- [x] Use the same shared color on mobile.
- [x] Preserve weekday headers, filters, links, and hover/active behavior.
- [x] Confirm no horizontal overflow or browser console errors.

**Comparison history**

- Pass 1: no P0/P1/P2 mismatches after the unified gray token was applied; no corrective visual iteration was required.

final result: passed
