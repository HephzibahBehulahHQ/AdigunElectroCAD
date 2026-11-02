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

The following view-control check covers the reference sheet; free-sheet and zoom-limit rendered checks remain separate work.

Release `cf39250740e0a02bf6ed46a8938d0d9b30575f7f` was checked for reference-sheet view controls. Zoom increased from 85% / 935px sheet width to 95% / 1045px, with the 1100 × 780 viewBox unchanged. Fit produced a 628 × 445px sheet inside a 659 × 504px viewport. Toolbar Grid removed the grid rectangle and updated the menu pressed state; the menu restored it.

Release `0f59ef07dca61d574dc52fe968830b0e75048a64` was checked with a fresh analog project at 85% zoom. A pointer drag moved B1 from (140, 300) to snapped (180, 380). Its connected wire path changed from `M 172 285 H 240 V 285 H 308` to `M 212 365 H 260 V 285 H 308`. One Undo restored both the original component position and wire path. Rotating B1 to 90° kept its reference upright at y=375 and kind label at y=392, below the rotated body; the screenshot showed clear spacing.

This does not establish pointer behavior at every zoom, touch-device interaction, rejected-drop rendering, or live checks of the subsequent shared arrow/rotation bounds change.

Release `be24e11b2fe811920b428fd428896d8ad38000ce` was checked on a fresh analog project. Repeated left-arrow moves stopped B1 at X=80 and displayed the bounds/clearance rejection. Moving the unrotated component to Y=680 remained valid; Rotate 90° was then rejected, leaving R=0° and displaying the rotation bounds message. These checks cover arrow/rotation rejection, not every pointer-drop case.
