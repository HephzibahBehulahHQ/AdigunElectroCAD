# Workstation browser verification — 2026-11-02

Checked production release `fc77eeed37c27f52d769e857e1896faea4c8e246` against the workstation reference.

- At 1672 × 941, component browser, schematic, properties and project library occupy separate columns. Five project cards render. Page scroll width was 1657, within the 1672px viewport.
- At 390 × 844, panels stack; page scroll width was 375, within the 390px viewport. Component category labels and counts remain separate. Toolbar and schematic tabs scroll within their containers.
- Project pagination moved from entries 1–5 to 6–10. Selecting Expert reset pagination and returned 100 entries. Adding Analog Instrumentation returned the one dedicated analog project.
- Selecting that project displayed its description, passing model-check result and load action. Matching search returned the project; an unmatched search displayed an explicit empty state.
- The desktop rendering exposed breaker, contactor and overload labels crossing the PE conductor. Their reference and description positions were moved from x=425 to x=475 in the following fix; production rendered verification of that fix remains pending.

This check does not prove full visual-reference alignment, every theme/language, all component labels, or the newer explicit corporate-name header. Those remain separate verification work.
