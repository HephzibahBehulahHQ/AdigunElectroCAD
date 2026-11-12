# Delivery milestones

Updated 2026-11-03. The full master goal remains active. This checklist supplements, rather than replaces, the master request and Bot addenda. A milestone is complete only when all its criteria have evidence. Parameter variants and passing test cases do not count as distinct validated devices or projects.

## Release gates by category

| Gate | Category / milestone | Verifiable completion criteria | Current state / evidence |
| --- | --- | --- | --- |
| M01 | Repository and deployment baseline | Reviewed project-only commits; matching local/remote branch SHA; CI test/build green; configured Pages deployment green; canonical domain renders matching assets. | Complete through PR #77. Latest main `a1210ea`, Pages run `41593296828` green; matching assets and wired reversing controls verified on the canonical domain. Recheck for every subsequent release. |
| M02 | CAD editing and deliverables | Create/edit multi-sheet circuits, place/rotate/move devices, connect/reconnect/delete wires, Undo/Redo, import/export JSON/SVG/PNG/PDF workflow and BOM/wire/terminal reports; verify round trips and rendered legibility. | Partial. Existing editing/export tests and docs cover subsets; full format and report acceptance remains open. See CAD-INTERACTION.md and PROJECT-IMPORT.md. |
| M03 | Wired controls and power | Actual wired supply/return, START/STOP, holding and reversing interlock contacts drive coils and motor power; broken wires, conflicting commands and restoration have tested outcomes. | Partial. Wired holding and reversing control increments are deployed and browser-verified in PRs #76–77. Full gate review remains open. |
| M04 | Protection and dynamic machines | Current-driven overload response, reset/cooling, starter sequences and motor transitions use documented models; verify time-step behavior and fault cases against stated assumptions. | Partial. Current-driven overload now includes wired reversing and star-delta winding current; motor transient dynamics and protection coordination remain open. |
| M05 | PLC and instrumentation | Graphical ladder and text programs execute consistently; NO/NC, latch/edges, gates, comparators and math work; sensors/ADC/DAC carry typed signals; errors inhibit outputs without hidden state mutation. | Partial. PLC/analog and fault paths tested, including live PR #74 checks; broader PLC, complete instrumentation models and UI acceptance remain open. See PLC-PROGRAMS.md. |
| M06 | Component library | Every requested item, including categories 11–18, has a distinct legible symbol, terminals, documented parameters, connected runtime behavior and meaningful tests; no generic or placeholder entries counted as complete. | Partial. 67 functional definitions plus DOL, winding and parameter variants; manufacturer validation and fully coupled fluid/HVAC/renewable/cable models are not established. |
| M07 | Industrial project library | At least 500 distinct engineered projects with correct topology, reproducible operating sequences, expected outputs and fault cases; each loadable, runnable and visually reviewed. | Partial. 508 entries currently include 499 variants from five scenario families and nine dedicated additions. This gate is not satisfied by those counts. |
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

## Completed increment: M03b — Wired reversing interlocks

- [x] Add a real NC auxiliary contact path, with no change to the reference DOL controller.
- [x] Verify forward and reverse holding, opposing-command inhibition, STOP/restart, overload, broken interlock/return wires and simultaneous-command faults.
- [x] Provide a legible dedicated project; verify actual phase interchange and motor direction in the browser.
- [x] Run regression/build, review/publish/synchronize, pass CI, deploy and verify production before proceeding.

Acceptance: PR #77, synchronized branch `77fae21`, merge `a1210ea`, successful Pages run `41593296828`, matching live assets `index-Bu23w5mA.js` and `index-BUIzYmxF.css`. All 859 tests and the production build passed. Canonical-domain browser checks verified forward +1440 rpm with KM2 off under an opposing command; STOP left STANDBY; reverse -1440 rpm with KM1 off under an opposing command; overload trip/reset left STANDBY. Undo/reload restored the original 14-sheet project without cloud writes. M03b is complete; electrical interlocking is not a mechanical or certified safety interlock.

## Active increment: M04a — Current-driven thermal overload

- [x] Inspect existing load-current tracing, DOL thermal behavior and runtime-state/reset boundaries.
- [x] Specify a documented educational thermal model and wire current-driven trip into the existing power/control circuit.
- [x] Verify cold/hot trip, cooling/reset, time-step consistency, current interruption and saved-design immutability.
- [x] Add observable runtime state and meaningful local browser acceptance.
- [x] Publish/synchronize, pass CI, and deploy.
- [ ] Verify the same behavior on production.

PR #79 merged as `d8d28e6`, and Pages run `41614492416` succeeded. Production interactive acceptance remains pending. See THERMAL-OVERLOAD.md for supported current paths and limits.

## Active increment: M04b — Thermal protection on wired reversing

- [x] Reuse the existing reversing power topology, wired 230 V coil returns, holding contacts and opposing NC interlocks.
- [x] Add a separate current-driven overload example with reverse-direction trip, cool reset and no automatic restart.
- [x] Verify the operating sequence, topology and reverse contactor interruption with focused automated checks.
- [x] Publish, pass CI, merge and verify the Pages deployment and production project behavior.

PR #96 merged as `de532b2`; CI run `43259145997` passed, and Pages run `43259252819` completed successfully. The live project library shows 507 entries, the new project’s reverse-trip/cool-reset sequence, and a passed topology/recorded-model check. The live check selected the project card only; no sheet was loaded or saved.

## Active increment: M03c — Wired star-delta control

- [x] Use actual KM1/KM2/KM3 power poles and NO holding/NC interlock contacts in an editable six-terminal circuit.
- [x] Add hardwired STOP, START, manual overload interruption, A2 returns, a 5 s star timer and a 200 ms open-transition timer.
- [x] Verify topology, star/open/delta outputs, contactor exclusion during transition, overload stop/reset and broken delta-interlock behavior.
- [x] Publish, pass CI, merge and verify the deployed project behavior.

PR #98 merged as `8506cb2`; CI run `43265109935` and Pages run `43265267348` succeeded. The live library shows 508 entries, the wired star-delta template, and passed topology/recorded-model checks. The check selected the project card only; no sheet was loaded or saved.

The six-terminal balanced winding model still does not feed the retained thermal overload runtime; that is tracked separately under M04.

## Active increment: M04c — Winding-derived overload current

- [x] Derive three phase currents from powered six-terminal winding topology and actual contactor states in star and delta.
- [x] Route winding current through the wired F1 poles and preserve unsupported/bypassed-path fault reporting.
- [x] Verify star/delta line current, thermal trip, coil interruption, cool reset and no automatic restart.
- [x] Enable thermal mode in the dedicated template and record an automatic delta-current trip, cool-down and manual reset sequence.
- [x] Publish, pass CI, merge and verify production behavior.

The winding model uses balanced fixed impedance and actual topology. It does not model motor transients, torque, acceleration, standardized relay curves or mechanical interlocking.

PR #100 merged as `27ece71`; CI run `43268432156` and Pages run `43268563768` passed. PR #101 merged as `9efbabb`; CI run `43269642739` and Pages run `43269766766` passed. Production verification shows the 508-entry library, wired star-delta record, automatic delta-current thermal trip/cool-reset sequence and passed topology/model checks. The project card was selected for verification; no sheet was loaded or saved.

## Active increment: M04d — Parameterized induction-motor operating point

- [x] Add a balanced per-phase T-equivalent-circuit calculation using explicit stator/rotor resistances and reactances, magnetizing reactance, frequency, pole pairs, supply voltage, winding connection and positive slip.
- [x] Derive phase/line current, rotor current, synchronous speed and electromagnetic torque without introducing assumed motor constants.
- [x] Verify star/delta voltage/current relations, voltage-square torque scaling and invalid parameter rejection (three focused tests).
- [x] Keep unsupported limits explicit: this operating point does not yet simulate flux transients, mechanical acceleration/load dynamics, saturation, harmonics, unbalance or protective-device curves.
- [x] Run focused tests and production build; publish branch for review.
- [ ] Merge only after CI succeeds; deploy through configured Pages workflow and verify production.

Model structure follows the balanced induction-motor T-equivalent circuit and Thevenin method described in [IET Electric Power Applications](https://ietresearch.onlinelibrary.wiley.com/doi/10.1049/iet-epa.2019.0822). The explicit circuit inputs are required motor data; the unit-test values are synthetic and are not presented as a real motor.

## Completed increment: M04e — Star-delta lab motor operating point

The balanced steady-state motor operating point is exposed in the star-delta lab with blank-by-default, explicit equivalent-circuit inputs. The active star/delta stage reports phase current, line current, electromagnetic torque and synchronous speed at the entered positive slip. PR #104 merged as `64ac699`; CI and Pages run `43273844996` succeeded. Production inspection confirmed all eight inputs and the open-transition message. The model was not coupled to the copied sheet or overload in that release; this is completed separately in M04f below.

## Active increment: M04f — Equivalent-circuit current through wired overload

- [x] Copy the lab into a wired starter circuit with actual START/STOP, star/delta contactors and F1 thermal overload.
- [x] Preserve explicit equivalent-circuit parameters in the copied motor and use the powered star/delta topology and supply frequency for its operating point.
- [x] Route balanced line current through all three actual F1 power poles; invalid enabled model data faults and trips instead of falling back to fixed impedance.
- [x] Verify star current, delta line-current ratio, F1 current tracking, thermal trip, coil drop and displayed torque/current.
- [x] Pass remote CI, merge, deploy and verify the operating interface in production.

PR #105 merged as `893e114`; CI run `43276387254` passed. The live site exposes the copied wired starter, F1 overload, and traceable motor equivalent-circuit inputs. Focused local validation: 41 tests across five files passed; production build passed with the existing chunk-size warning.

## Completed increment: M06a — Six-terminal motor canvas symbol

- [x] Replace the six winding bars with an IEC-style three-phase motor symbol and six named, connectable winding pins.
- [x] Extend placement and collision bounds for the terminal callouts so adjacent components remain clear.
- [x] Verify pin coordinates, placement clearance, related circuit behavior, and production build.
- [x] Pass remote CI, merge and deploy; inspect the locally rendered motor sheet and verify the deployed production bundle contains the symbol.

PR #106 merged as `3a3e1ad`; CI run `43280182375` and Pages run `43280299800` succeeded. Local rendered review confirmed the U1/V1/W1 and U2/V2/W2 pin callouts. The motor's PE endpoint lacked a visible pin and is tracked in M06b below. The symbol adds no motor ratings or manufacturer-specific geometry.

## Completed increment: M06b — Visible protective-earth motor terminal

- [x] Draw a visible PE pin, protective-earth lead and label on the six-terminal motor symbol.
- [x] Verify the PE drawing matches the model's connectable PE anchor.
- [x] Pass remote CI, merge, deploy and inspect the rendered symbol in production.

PR #107 merged as `3715043`; CI run `43281398034` and Pages run `43281618846` succeeded. The deployed bundle includes the green PE lead, terminal marker and label; the symbol PE pin matches the connectable model endpoint.

## Completed increment: M06c — Three-pole breaker and thermal-overload symbols

- [x] Draw dedicated three-pole breaker poles and overload heater paths instead of generic diagonal marks.
- [x] Align model-backed phase terminals to their matching drawn poles without requiring a placement flag.
- [x] Reflect the modeled breaker open/closed and overload healthy/tripped state in symbol accessibility and appearance.
- [x] Pass focused and full tests, build, remote CI, merge and deployment verification.

PR #108 merged as `be8368e`; both remote verification runs `43285335212` and `43285343988` passed, and Pages deployment `43285458375` succeeded. Production returned HTTP 200 for the app and `/assets/index-CC9f58ll.js`; the served bundle includes breaker open/closed and overload healthy/tripped labels. Local validation passed all 919 tests and the production build. The existing bundle-size warning remains.

## Completed increment: M06d — Rendered canvas clearance and overload state

- [x] Inspect the rendered power/control schematic at 85% canvas zoom and 57% fit against the supplied motor-starter reference.
- [x] Review breaker, contactor, overload, motor pins, labels, wires and toolbar controls for visible collisions. No overlaps were observed; at 85% the sheet scrolls within the viewport, and Fit shows the complete sheet.
- [x] Replace the reference sheet’s hollow overload blocks with three connected heater paths and normally-closed trip contacts; show all three outputs open on trip and align output anchors to the drawn contacts.
- [x] Pass focused render checks, full CI and production build; merge, deploy and inspect the live drawing.

PR #110 merged as `4966118`. CI runs `43289702910` and `43289692073` passed, and Pages deployment `43289863977` passed. Production inspection confirmed the three heater paths and trip contacts at 85% zoom; the full sheet was clear at 57% Fit. Visual review found no menu/icon, component or wire overlaps. This schematic remains an educational abstraction and does not claim manufacturer-specific overload geometry.

## Active increment: M06e — Visible breaker and contactor terminal identities

- [ ] Label the reference DOL breaker poles 1/3/5 and 2/4/6 using the model's terminal identities.
- [ ] Label the contactor poles 1/L1, 3/L2, 5/L3 and 2/T1, 4/T2, 6/T3.
- [ ] Render and review at normal and fit zoom for label-to-wire and label-to-symbol clearance.
- [ ] Pass focused render tests, CI, merge and deployed production verification.

## Per-increment publication rule

Finish its observable behavior and checks, review the exact changed files, commit/push a visible branch, and retain a draft PR until ready. After CI succeeds, merge and deploy using the configured workflow; verify the served build and targeted behavior before starting the next increment. Preserve unfinished work separately. Never include credentials, caches, unrelated files or local test logs. Record failures and unverified boundaries instead of marking gates complete.


