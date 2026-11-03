# Delivery milestones

Updated 2026-11-03. The full master goal remains active. This checklist supplements, rather than replaces, the master request and Bot addenda. A milestone is complete only when all its criteria have evidence. Parameter variants and passing test cases do not count as distinct validated devices or projects.

## Release gates by category

| Gate | Category / milestone | Verifiable completion criteria | Current state / evidence |
| --- | --- | --- | --- |
| M01 | Repository and deployment baseline | Reviewed project-only commits; matching local/remote branch SHA; CI test/build green; configured Pages deployment green; canonical domain renders matching assets. | Complete for PRs #69–75. Latest main `350c255`, Pages run `41587886401` green; executable release `b3486f4` verified in browser. Recheck for every subsequent release. |
| M02 | CAD editing and deliverables | Create/edit multi-sheet circuits, place/rotate/move devices, connect/reconnect/delete wires, Undo/Redo, import/export JSON/SVG/PNG/PDF workflow and BOM/wire/terminal reports; verify round trips and rendered legibility. | Partial. Existing editing/export tests and docs cover subsets; full format and report acceptance remains open. See CAD-INTERACTION.md and PROJECT-IMPORT.md. |
| M03 | Wired controls and power | Actual wired supply/return, START/STOP, holding and reversing interlock contacts drive coils and motor power; broken wires, conflicting commands and restoration have tested outcomes. | Partial. Boolean and power tracing are deployed; real wired holding-control increment is local and not released. |
| M04 | Protection and dynamic machines | Current-driven overload response, reset/cooling, starter sequences and motor transitions use documented models; verify time-step behavior and fault cases against stated assumptions. | Partial. Manual trip, DOL dynamics and starter laboratories exist; thermal overload integration and broader physical coupling remain open. |
| M05 | PLC and instrumentation | Graphical ladder and text programs execute consistently; NO/NC, latch/edges, gates, comparators and math work; sensors/ADC/DAC carry typed signals; errors inhibit outputs without hidden state mutation. | Partial. PLC/analog and fault paths tested, including live PR #74 checks; broader PLC, complete instrumentation models and UI acceptance remain open. See PLC-PROGRAMS.md. |
| M06 | Component library | Every requested item, including categories 11–18, has a distinct legible symbol, terminals, documented parameters, connected runtime behavior and meaningful tests; no generic or placeholder entries counted as complete. | Partial. 67 functional definitions plus DOL, winding and parameter variants; manufacturer validation and fully coupled fluid/HVAC/renewable/cable models are not established. |
| M07 | Industrial project library | At least 500 distinct engineered projects with correct topology, reproducible operating sequences, expected outputs and fault cases; each loadable, runnable and visually reviewed. | Partial. 504 entries currently include 499 variants from five scenario families and five dedicated additions. This gate is not satisfied by those counts. |
| M08 | Identity and project data | Schema isolation, owner RLS, restrictive anonymous INSERT, confirmed email/password and two-step anonymous upgrade; local/cloud save/load and preferences work with refresh and two permanent accounts. | Partial. Existing sign-in, cloud and RLS evidence in AUTH-RLS-VERIFICATION-2026-11-02.md; email upgrade, two-account browser isolation and cross-device preferences remain unverified. |
| M09 | Visual, responsive and language acceptance | Match supplied workstation target; legible branding and labels, no collisions at desktop/mobile sizes; usable keyboard flows, light/dark themes and reviewed English/German/Yoruba/Pidgin. | Partial. Checked header/footer layouts and compact account/status controls; full reference match, all views and translations remain open. See VISUAL-TARGET.md. |
| M10 | Adigun Bot | Floating/resizable/dockable window and persistence; actual canvas-aware assistance, explanations, consented atomic edits, quiet/unread behavior and configured AI capabilities; test all requested addendum flows. | Partial. Rule-based assistance and floating window deployed; generative AI and broader engineering reasoning are not configured or verified. See both retained Bot request TXT files and verification docs. |
| M11 | Full release acceptance | Close every applicable master/addendum criterion with source, test, rendered and live evidence; document all supported limits; fresh full regression, authentication, accessibility and cross-browser checks; clean reviewed release and deployment. | Pending. All preceding gates must be accepted; no whole-product completion claim is justified. |

Only M01 is fully evidenced as a release baseline (1 of 11 broad gates; approximately 10% by gate count, not effort or feature completion). Overall hours cannot yet be estimated responsibly: the remaining component/project breadth and acceptance work are substantial. Estimate each active delivery increment after inspecting its dependencies.

## Completed increment: M03a — Wired holding control

- [x] Inspect existing dry-contact, supply and coil terminals; preserve the reference DOL controller.
- [x] Implement ideal isolated-source supply/return tracing and actual START/STOP/holding contact continuity.
- [x] Test broken return/holding paths, overload interruption, voltage mismatch, short circuit and saved-design immutability (seven focused cases passed).
- [x] Complete application integration and fault-boundary review; 849 tests and production build passed.
- [x] Add an operable example and verify START/release/STOP/fault/recovery in the local browser; production acceptance remains below.
- [x] Review diff; commit/publish only this increment; verify identical local/remote SHA and green PR checks.
- [x] Merge/deploy through configured Pages workflow; verify the actual live behavior and record evidence.

M03a was accepted in PR #76: synchronized head `2ef3fee`, main `484a69f`, successful Pages run `41590245813`, matching live asset `index-DzMtavmO.js`, live holding/STOP/overload recovery and restoration of the original 14-sheet project. This does not complete M03: reversing interlocks and broader coil/protection behavior remain separate increments.

## Active increment: M03b — Wired reversing interlocks

- [x] Add a real NC auxiliary contact path, with no change to the reference DOL controller.
- [ ] Verify forward and reverse holding, opposing-command inhibition, STOP/restart, overload, broken interlock/return wires and simultaneous-command faults.
- [ ] Provide a legible dedicated project; verify actual phase interchange and motor direction in the browser.
- [ ] Run regression/build, review/publish/synchronize, pass CI, deploy and verify production before proceeding.

Current evidence: the 853-test regression suite and build passed, followed by five focused interlock/sequence tests. Forward/reverse holding, opposing commands, simultaneous commands, broken NC series wires, overload recovery and order independence are covered. Browser/layout and final release acceptance remain open. Approximately 45% of this increment is complete; estimate 1–2 hours remaining. Electrical interlocking is not a mechanical or certified safety interlock.

## Per-increment publication rule

Finish its observable behavior and checks, review the exact changed files, commit/push a visible branch, and retain a draft PR until ready. After CI succeeds, merge and deploy using the configured workflow; verify the served build and targeted behavior before starting the next increment. Preserve unfinished work separately. Never include credentials, caches, unrelated files or local test logs. Record failures and unverified boundaries instead of marking gates complete.
