# Workstation browser verification — 2026-11-02

Checked production release `fc77eeed37c27f52d769e857e1896faea4c8e246` against the workstation reference.

- At 1672 × 941, component browser, schematic, properties and project library occupy separate columns. Five project cards render. Page scroll width was 1657, within the 1672px viewport.
- At 390 × 844, panels stack; page scroll width was 375, within the 390px viewport. Component category labels and counts remain separate. Toolbar and schematic tabs scroll within their containers.
- Project pagination moved from entries 1–5 to 6–10. Selecting Expert reset pagination and returned 100 entries. Adding Analog Instrumentation returned the one dedicated analog project.
- Selecting that project displayed its description, passing model-check result and load action. Matching search returned the project; an unmatched search displayed an explicit empty state.
- The desktop rendering exposed breaker, contactor and overload labels crossing the PE conductor. Their reference and description positions were moved from x=425 to x=475 in the following fix; production rendered verification of that fix remains pending.

This check does not prove full visual-reference alignment, every theme/language, all component labels, or the newer explicit corporate-name header. Those remain separate verification work.

## Follow-up releases

The explicit corporate header in `b9473dfce3b286d878b3de0e3b80e3d5aef1d910` was checked at 1672 × 941 and 390 × 844. Logo, corporate name and product name occupy separate rectangles; the mobile product lockup wraps to its own row. Neither checked view had page-level horizontal overflow.

Release `def456a3ff5c6450d8fa84144ccb45fba12bc2ca` was checked at 1672 × 941. Q1, KM1 and F1 references and descriptions render to the right of the PE conductor, with x=475 versus PE x=445. The screenshot confirms clear spacing.

Zoom/Fit/Grid controls introduced after these checks still require separate rendered verification.
