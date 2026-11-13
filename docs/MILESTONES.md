# Delivery milestones

Updated 2026-11-13. The full master goal remains active. This checklist supplements, rather than replaces, the master request and Bot addenda. A milestone is complete only when all its criteria have evidence. Parameter variants and passing test cases do not count as distinct validated devices or projects.

## Release gates by category

| Gate | Category / milestone | Verifiable completion criteria | Current state / evidence |
| --- | --- | --- | --- |
| M01 | Repository and deployment baseline | Reviewed project-only commits; matching local/remote branch SHA; CI test/build green; configured Pages deployment green; canonical domain renders matching assets. | Complete through PR #77. Latest main `a1210ea`, Pages run `41593296828` green; matching assets and wired reversing controls verified on the canonical domain. Recheck for every subsequent release. |
| M02 | CAD editing and deliverables | Create/edit multi-sheet circuits, place/rotate/move devices, connect/reconnect/delete wires, Undo/Redo, import/export JSON/SVG/PNG/PDF workflow and BOM/wire/terminal reports; verify round trips and rendered legibility. | Partial. Existing editing/export tests and docs cover subsets; full format and report acceptance remains open. See CAD-INTERACTION.md and PROJECT-IMPORT.md. |
| M03 | Wired controls and power | Actual wired supply/return, START/STOP, holding and reversing interlock contacts drive coils and motor power; broken wires, conflicting commands and restoration have tested outcomes. | Partial. Wired holding and reversing control increments are deployed and browser-verified in PRs #76–77. Full gate review remains open. |
| M04 | Protection and dynamic machines | Current-driven overload response, reset/cooling, starter sequences and motor transitions use documented models; verify time-step behavior and fault cases against stated assumptions. | Partial. Current-driven overload now includes wired reversing and star-delta winding current; motor transient dynamics and protection coordination remain open. |
| M05 | PLC and instrumentation | Graphical ladder and text programs execute consistently; NO/NC, latch/edges, gates, comparators and math work; sensors/ADC/DAC carry typed signals; errors inhibit outputs without hidden state mutation. | Partial. Text and graphical ladder programs support independently wired Q0/Q1 outputs; the PLC watch table and scan trace expose Q1; ladder editing now uses the 32-instruction budget instead of four-item stage/contact limits (PRs #198/#200/#202/#204; Verify runs `43395033846`, `43396137515`, `43397110025`, and `43398918853`; Pages runs `43395120169`, `43396299687`, `43397212417`, and `43399020238`). Broader PLC execution, complete instrumentation models, and full UI acceptance remain open. See PLC-PROGRAMS.md. |
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

## Completed increment: M06e — Visible breaker and contactor terminal identities

- [x] Label the reference DOL breaker poles 1/3/5 and 2/4/6 using the model's terminal identities.
- [x] Label the contactor poles 1/L1, 3/L2, 5/L3 and 2/T1, 4/T2, 6/T3.
- [x] Render and review at 85% and 57% Fit zoom; labels remain beside their wires with no visible collisions.
- [x] Pass focused render tests, CI, merge and deployed production verification.

PR #112 merged as `28b1860`. CI runs `43290846303` and `43290838032` passed, and Pages deployment `43290966721` succeeded. The live canvas showed each terminal label on the corresponding breaker/contactor pole at both zoom levels.

## Completed increment: M06f — Visible overload pole terminal identities

- [x] Label the three overload heater inputs and outputs as 1/2, 3/4 and 5/6, aligned to their actual terminal anchors.
- [x] Keep the overload terminal numbers clear of the heater zigzags, trip contacts, output conductors and F1 95–96 control contact.
- [x] Add focused render assertions; inspect production at 85% and 57% Fit zoom.
- [x] Pass CI, merge and deployment verification.

PR #114 merged as `2257f25`. CI runs `43291819172` and `43291810566` passed, and Pages deployment `43292007489` succeeded. The deployed DOL canvas shows F1 inputs 1/3/5 and outputs 2/4/6 alongside their poles at both zoom levels, with no visible overlap.

## Completed increment: M06g — DOL control terminal identities

- [x] Inspect the current reference DOL model and available repository documentation for H1/H2/H3 functions and branches. No lamp definition or authoritative branch mapping is present; ask the client to confirm functions/wiring before implementation.
- [x] Render the existing STOP terminals 21/22 and START terminals 13/14 beside their connected reference anchors.
- [x] Test terminal-to-anchor alignment and inspect normal/fit views for label, conductor and symbol clearance.
- [x] Pass focused tests, CI, merge, deployment and production inspection.

PR #116 merged as `920fb83`. Its verification run `43298345712` and Pages deployment `43293742977` succeeded. Production inspection at 82% canvas zoom and Fit (52%) confirmed STOP 21/22 and START 13/14 remain adjacent to their contact anchors with readable labels and clearance from the conductors. The current production build was subsequently updated by PR #117 and Pages deployment `43300433874`.

Client direction (2026-11-12): keep H1/H2/H3 user-configurable. Do not infer their functions or branches; users choose the colors, terminal labels, wiring, indication text and reference tags.

## Completed increment: M06h — User-configurable indicator placeholders

- [x] Add H1/H2/H3 as unassigned, unconnected indicator symbols in the reference DOL sheet; preserve their generic symbol-only status.
- [x] Let users edit each symbol's color, indication text, terminal labels and reference, and connect its stable terminal IDs to chosen branches using the existing wire editor.
- [x] Verify import/export persistence, editable placement and wireable terminal anchors, with no simulated electrical behavior or invented ratings.
- [x] Pass focused checks, CI, merge, deployment and production visual inspection.

PR #119 merged as `a4047e9`. Verification run `43309716359` and Pages deployment `43309815669` succeeded. Production inspection at 52% Fit showed H1/H2/H3 as unconnected indicator symbols; selecting H1 exposed the color picker, editable indication, terminal labels, and reference tag. The project suite passed (925 tests) and `npm run build` succeeded.

## Completed increment: M06i — Editable schematic text annotations

- [x] Place, select, move, edit, recolor, and remove user-owned text annotations on free schematic sheets.
- [x] Preserve annotations in project JSON with bounded positions, text, colors, annotation counts and unique IDs; keep older projects importable.
- [x] Pass focused render and serialization checks, the complete local suite (928 tests), build and GitHub Verify workflow.
- [x] Merge, deploy and inspect the production Text tool and placement mode.

PR #121 merged as `5312782`. GitHub Verify run `43313996809` succeeded. Production inspection at `https://adigunelectrocad.hephzibahbehulah.com/` confirmed the Text tool is available on a free sheet and activates placement mode. The live project was not modified during this inspection; annotation rendering, chosen color and text persistence were verified by focused tests.

## Completed increment: M06j — Editable free-sheet drawing graphics

- [x] Draw lines, rectangles and ellipses on free schematic sheets; select and move them on the grid.
- [x] Let users edit each graphic's name/tag, color and stroke width, with an on-canvas label.
- [x] Persist bounded geometry in project JSON, retain compatibility with earlier projects, and keep graphics separate from electrical connectivity.
- [x] Pass focused rendering/serialization tests, the full local suite (932 tests), build, GitHub Verify, merge and deployment.

PR #123 merged as `568fab2`. GitHub Verify run `43318329213` and Pages deployment `43318444682` succeeded. Local browser inspection confirmed rectangle drawing and editing the name, palette color and stroke width. The production page and JavaScript bundle returned HTTP 200; the served bundle contains the drawing tool and color palette. No production project data was changed.

## Completed increment: M06k — Fill colors for drafting shapes

- [x] Set custom or palette fill colors for rectangles and ellipses, or clear the fill; keep lines unfilled.
- [x] Preserve optional fill colors in project JSON, validate their format, and accept earlier projects without fill settings.
- [x] Pass the full local suite (933 tests), production build, GitHub Verify, merge, deployment and local browser inspection.

PR #125 merged as `e049920`. Verify runs `43320113513` and `43320106081` passed; Pages deployment `43320223240` succeeded. Local browser inspection confirmed a palette-filled ellipse. Production page and JavaScript bundle returned HTTP 200, with the served bundle containing both the fill palette and no-fill option.

## Increment M06l — Resizeable free-sheet drawing graphics

- [x] Add corner handles to resize rectangles and ellipses, plus endpoint handles to reshape lines on the grid.
- [x] Keep edits within sheet bounds, enforce the 4-unit minimum span, and record them through project history.
- [x] Pass the full local suite (934 tests), production build, GitHub Verify, merge, Pages deployment and local browser interaction.
- [x] Inspect the served custom-domain build after DNS resolution returned; production page and bundle returned HTTP 200 and the bundle includes resize-handle markup.

PR #127 merged as `8bd10b0`. Verify run `43321985037` and Pages deployment `43322087430` succeeded; a Pages artifact was produced for the merged commit. Local browser inspection confirmed resizing a rectangle corner and either line endpoint. After DNS resolution returned during the M06m rollout, the production page and bundle both returned HTTP 200 and the current bundle contained the resize-handle markup.

## Completed increment: M06m — Editable component drafting colors

- [x] Let users set a custom or palette drafting color on placed components and reset to the default.
- [x] Keep drafting color separate from engineering properties and simulation behavior; validate and persist it while accepting older project files.
- [x] Pass focused local checks (19 tests), build, GitHub Verify, merge, Pages deployment and production bundle inspection.

PR #129 merged as `a7f2210`. GitHub Verify runs `43325008843` and `43325040088` and Pages deployment `43325171843` succeeded. The production page and JavaScript bundle returned HTTP 200; the served bundle contains the component color picker, palette/reset control and custom symbol ink rendering.

## Completed increment: M06n — Editable electrical wire colors

- [x] Let users set custom or palette colors for individual electrical wires and reset to the default.
- [x] Keep conductor appearance separate from net names and terminal endpoints; validate and persist optional colors while accepting older projects.
- [x] Pass focused local checks (22 tests), build, GitHub Verify, merge, Pages deployment and production bundle inspection.

PR #131 merged as `a77d4d5`. GitHub Verify runs `43327163305` and `43327187398` and Pages deployment `43327301587` succeeded. Production page and bundle returned HTTP 200; the deployed bundle contains the wire color picker, palette and reset controls.

## Completed increment: M06o — Editable polyline and polygon drafting

- [x] Add point-by-point polyline and polygon tools with double-click or Enter to finish and Escape to cancel.
- [x] Let users move whole paths, edit individual vertices, set stroke color and fill polygons; keep drawing geometry separate from electrical connectivity.
- [x] Persist bounded vertices, validate path length and polygon area, and accept older projects without path data.
- [x] Pass focused local checks (25 tests), build, GitHub Verify and Pages deployment.
- [ ] Verify the served custom-domain bundle after DNS resolution returns.

PR #133 merged as `633c7f9`. Verify runs `43329733302` and `43329763671` and Pages deployment `43329864660` succeeded. A live custom-domain request could not resolve its hostname in this environment; production bundle inspection remains pending.

## Completed increment: M06p — Edit polyline and polygon vertices

- [x] Insert a snapped vertex by double-clicking a path edge; remove a selected vertex with right-click.
- [x] Enforce bounds, minimum vertex counts, duplicate-point checks, and non-collapsed polygon area while keeping graphic paths separate from electrical connectivity.
- [x] Pass 29 focused tests, production build, both GitHub Verify runs, merge, and Pages deployment.
- [ ] Verify the served custom-domain bundle after DNS resolution returns.

PR #135 merged as `90c9016`. Verify runs `43333087233` and `43333096028` succeeded. Pages deployment `43333187689` succeeded; custom-domain bundle inspection remains pending after the hostname failed to resolve in this environment.


## Completed increment: M06q — User-defined component data

- [x] Add, rename, edit, and remove up to 20 custom fields on movable component instances.
- [x] Persist custom field names and values separately from catalog parameters; preserve older project files and reject invalid imported fields.
- [x] Keep custom data descriptive only so it cannot change electrical simulation behavior.
- [x] Pass 26 focused local tests, production build, both GitHub Verify workflows, merge, and Pages deployment.
- [ ] Verify the served custom-domain bundle after DNS resolution returns.

PR #137 merged as `15bed16`. Verify runs `43336032081` and `43336039728` succeeded. Pages deployment `43336144882` succeeded; the custom domain remained inaccessible through the available browser route.


## Completed increment: M06r — Duplicate drafting graphics

- [x] Duplicate any free-sheet drafting graphic, including a polyline or polygon, from its properties panel.
- [x] Preserve appearance and path data, assign a new identity and copy tag, and offset the duplicate within the sheet bounds.
- [x] Pass 7 focused graphic tests, production build, both GitHub Verify workflows, merge, and Pages deployment.
- [ ] Verify the served custom-domain bundle after DNS resolution returns.

PR #139 merged as `658ee94`. Verify runs `43337243565` and `43337249564` succeeded. Pages deployment `43337370770` succeeded; the custom domain remains inaccessible through the available browser route.


## Completed increment: M06s — Duplicate placed components

- [x] Duplicate a placed component on editable free sheets, preserve its catalog parameters, custom fields, drafting color, size and orientation, and assign a unique reference and clear position.
- [x] Give the copy independent editable metadata and leave wires unconnected so users choose the desired branches and terminals.
- [x] Pass 13 focused local tests, production build, both GitHub Verify workflows, merge, and Pages deployment.
- [ ] Verify the served custom-domain bundle after DNS resolution returns.

PR #141 merged as `c63aa86`. Verify runs `43339962834` and `43339970398` and Pages deployment `43340083622` succeeded; custom-domain bundle inspection remains pending.

## Completed increment: M06t — Editable component instance names

- [x] Let users name a placed component independently of its catalog definition and reference tag; show that name beside its indication/type label.
- [x] Preserve the descriptive name in project JSON and copied components without changing simulation behavior; accept older projects without a name.
- [x] Pass 47 focused local tests, production build, both GitHub Verify workflows, merge, and Pages deployment.
- [ ] Verify the served custom-domain bundle after DNS resolution returns.

PR #143 merged as `4f0dae5`. Verify runs `43345427176` and `43345460442` succeeded. Pages deployment `43345569530` succeeded; custom-domain bundle inspection remains pending.

## Completed increment: M06u — Editable terminal display labels

- [x] Let users set per-instance display labels for catalog terminals while preserving stable terminal IDs and all existing electrical connections.
- [x] Show overrides on schematic symbols, persist only valid catalog terminal labels, and copy overrides independently with duplicated components.
- [x] Pass 50 focused local tests, production build, both GitHub Verify workflows, merge, and Pages deployment.
- [ ] Verify the served custom-domain bundle after DNS resolution returns.

PR #145 merged as `7ee71b7`. Verify runs `43347489294` and `43347511612` succeeded. Pages deployment `43347617648` succeeded; custom-domain bundle inspection remains pending.

## Completed increment: M06v — Editable annotation text size

- [x] Let users set a visual annotation size from 8 to 48 SVG units in Properties; existing annotations keep the 18-unit default.
- [x] Render the selected size and scale its selection outline; validate and persist the optional size without changing electrical semantics.
- [x] Verify serialization for sized and older annotations, reject out-of-range values, and render the chosen size.

PR #147 merged as `02a8ce3`. Verify run `43349223442` and Pages deployment `43349348475` succeeded; custom-domain bundle inspection remains pending.

## Completed increment: M06w — Editable annotation rotation

- [x] Let users rotate free-sheet text annotations from 0° to 359° around their placement anchor; rotate the selection outline with the annotation.
- [x] Persist the optional visual rotation, validate its range, and accept older projects without rotation metadata.
- [x] Verify rendering, serialization, and out-of-range rejection; pass local build, GitHub Verify, merge, and Pages deployment.

PR #149 merged as `48ed3ce`. GitHub Verify and Pages deployment `43350902383` succeeded; custom-domain bundle inspection remains pending.

## Completed increment: M06x — Editable annotation alignment

- [x] Let users choose left, center, or right alignment for free-sheet text annotations and align the selection outline to the text anchor.
- [x] Persist the optional alignment, validate its supported values, and keep older annotations left-aligned by default.
- [x] Verify rendering and serialization, pass focused tests/build and GitHub Verify, merge, and deploy.

PR #151 merged as `6386c68`. Verify runs `43351518960` and `43351537821` and Pages deployment `43351639242` succeeded; direct custom-domain bundle inspection remains pending.

## Completed increment: M06y — Editable annotation text weight

- [x] Let users choose standard (400), semi-bold (600), or bold (700) weight for free-sheet text annotations.
- [x] Persist and validate the optional visual weight while retaining the existing semi-bold appearance for older projects.
- [x] Verify rendering, serialization, invalid-weight rejection, local build, GitHub Verify, merge, and Pages deployment.

PR #153 merged as `c9d9411`. GitHub Verify and Pages deployment `43352293155` succeeded; direct custom-domain inspection remains pending.

## Completed increment: M06z — Multiline schematic annotations

- [x] Edit free-sheet annotations in a multiline field and render each line with consistent spacing and aligned text anchors.
- [x] Size the selection outline to the longest line and full text height; persist up to 8 lines, each at most 160 characters.
- [x] Verify multiline rendering, persistence and limits; pass focused tests, build, GitHub Verify, merge and Pages deployment.

PR #155 merged as `7fdb8af`. GitHub Verify and Pages deployment `43353082631` succeeded; direct custom-domain inspection remains pending.

## Completed increment: M06aa — Editable annotation line spacing

- [x] Let users set multiline annotation spacing from 1.0× to 3.0× and apply it to each rendered text line and selection bounds.
- [x] Persist and validate optional spacing while keeping 1.2× as the default for older notes.
- [x] Verify rendering, serialization, range rejection, focused tests, build, GitHub Verify, merge, and Pages deployment.

PR #157 merged as `ea06396`. Verify runs `43353550169` and `43353566034` and Pages deployment `43353660824` succeeded; direct custom-domain inspection remains pending.

## Completed increment: M06ab — Editable annotation italic style

- [x] Let users choose normal or italic text style for free-sheet annotations.
- [x] Persist the optional visual style, retain normal as the default for older notes, and reject unsupported imported values.
- [x] Verify rendering and serialization; pass focused tests, build, GitHub Verify, merge, and Pages deployment.

PR #159 merged as `67db649`. Verify runs `43354328192` and `43354348944` and Pages deployment `43354457393` succeeded; direct custom-domain inspection remains pending.

## Completed increment: M06ac — Editable annotation background fills

- [x] Let users set custom or palette background colors for free-sheet text annotations and clear the fill to restore transparency.
- [x] Draw the fill behind the text at the multiline annotation bounds; validate and persist the optional color while accepting older notes.
- [x] Verify rendering, serialization, invalid-color rejection, focused tests, build, GitHub Verify, merge, and Pages deployment.

PR #161 merged as `454844a`. Verify runs `43355568307` and `43355585024` and Pages deployment `43355692072` succeeded; direct custom-domain inspection remains pending.

## Completed increment: M06ad — Component multi-selection and group movement

- [x] Let users Shift+Click multiple components on editable sheets and show every selected component.
- [x] Move a selected group together on the 20-unit grid; reject collisions atomically and preserve wire topology.
- [x] Pass 25 targeted tests, production build, GitHub Verify, merge, and Pages deployment.

PR #163 merged as `5c4ed14`. GitHub Verify run `43358060417` and Pages deployment run #161 succeeded; direct custom-domain interaction verification remains pending.

## Completed increment: M06ae — Drag-box component selection

- [x] Select placed component footprints with a drag box in either direction; Shift-drag adds to the current group.
- [x] Keep the selection box out of wiring, annotation, and drawing gestures.
- [x] Pass 26 targeted tests, production build, GitHub Verify, merge, and Pages deployment.

PR #166 merged as `b7f42a9`. GitHub Verify run `43359574264` and Pages deployment run #164 succeeded.

## Completed increment: M06af — Terminal-based wire branching

- [x] Let users Shift-click compatible target terminals to create multiple branches from a chosen source terminal.
- [x] Keep the source selected between branch connections and allocate unique wire IDs and net names.
- [x] Pass 34 targeted tests, production build, GitHub Verify, merge, and Pages deployment.

PR #168 merged as `3a6879c`. GitHub Verify run `43360518718` and Pages deployment run #166 succeeded.

## Completed increment: M06ag — Editable mid-wire branch attachments

- [x] Click a free-sheet wire route to save a branch attachment and connect it to a compatible catalog terminal.
- [x] Persist parent wire, source endpoint, and relative route position; redraw the attachment when parent endpoints move.
- [x] Validate branch references and cascade parent deletion through dependent branches. Electrical topology continues to represent terminal-to-terminal connections; the tap is a drawing attachment, not a standalone equipotential junction node.
- [x] Pass 62 focused tests, production build, GitHub Verify, merge, and Pages deployment; verify the served bundle includes branch interaction and validation strings.

PR #170 merged as `6a49cd0`. GitHub Verify run #691 and Pages deployment run #168 succeeded. The deployed application returned HTTP 200 and served `assets/index-C4vExyHh.js` with the new branch UI and topology validation.

## Completed increment: M06ah — Direct orthogonal wire route editing

- [x] Add route points to editable free-sheet wires and show draggable handles while route editing is enabled.
- [x] Move handles by drag or keyboard, remove them by right-click/Delete, and restore automatic routing.
- [x] Keep branch routes derived from their parent route so attached taps follow parent edits.
- [x] Pass 30 focused tests, production build, GitHub Verify, merge, Pages deployment, and verify the served route-editing bundle.

PR #172 merged as `a101aad`. GitHub Verify run #694 and Pages deployment run #170 succeeded. The deployed application returned HTTP 200 and served `assets/index-iQ0bsLJB.js` with the route editor controls and handle markup.

## Completed increment: M06ai — Direct route-point placement

- [x] Click an editable wire segment in route-edit mode to insert a waypoint at the nearest path position.
- [x] Preserve bend order and snap along the segment while keeping the new waypoint on the wire axis; expose it as a normal route handle.
- [x] Pass 31 focused tests, production build, GitHub Verify, merge, Pages deployment, and live-bundle verification.

PR #174 merged as `51dc8ac`. GitHub Verify run #698 and Pages deployment run #172 succeeded. The live site returned HTTP 200 and served `assets/index-DVJyR4kI.js` with the route-click insertion prompt and wide route hit target.

## Completed increment: M06aj — Exact drafting geometry

- [x] Add numeric X1/Y1/X2/Y2 properties for line, rectangle, and ellipse drafting graphics.
- [x] Enforce sheet bounds and minimum drawable spans; keep polyline and polygon editing on vertex handles.
- [x] Pass 11 focused tests, production build, GitHub Verify, merge, Pages deployment, and live-bundle verification.

PR #176 merged as `c405de3`. GitHub Verify run #702 and Pages deployment run #174 succeeded. The live site returned HTTP 200 and served `assets/index-BuUQ8_Sp.js` with the exact geometry fields and bounds validation.

## Completed increment: M06ak — Live wire move preview

- [x] Preview moved component groups, connected wire routes, and dependent branch taps together during drag.
- [x] Keep the preview transient; accepted drops update the document, while rejected or cancelled moves restore the prior drawing and topology.
- [x] Pass 17 focused tests, production build, GitHub Verify, merge, Pages deployment, and exact live-bundle hash verification.

PR #178 merged as `3c0c6a7`. GitHub Verify succeeded; Pages deployment run #176 succeeded. Production returned HTTP 200 and served `assets/index-tsg_k633.js`, whose SHA-256 matched the local build.

## Completed increment: M06al — User-configured symbol terminals

- [x] Configure generic user symbols with 2–8 terminal anchors, editable display labels, terminal kinds, and directions; preserve stable T1/T2 identities and prevent removing connected added pins.
- [x] Preserve terminal configuration through project import/export and component duplication; keep the indicator symbol-only with no assumed voltage, wiring, manufacturer, or simulated lamp behavior.
- [x] Pass 48 focused tests, production build, GitHub Verify, merge, and Pages deployment.

PR #180 merged as `3ca2b5c`. GitHub Verify runs #716/#717 and Pages deployment run #178 succeeded. Direct production URL and bundle verification could not be completed from this environment because the custom domain did not resolve.

## Completed increment: M06am — User-positioned terminal anchors

- [x] Let users position added symbol terminals with local X/Y offsets; rotate and scale the anchors with their component and render wires and terminal labels at the chosen points.
- [x] Persist offsets, preserve independent copies when duplicating, remove offsets with their terminal, and reject imported values outside the -60..60-unit bounds.
- [x] Pass 66 focused tests plus 9 schematic-anchor tests, production build, GitHub Verify, merge, and Pages deployment.

PR #182 merged as `d6377f9`. GitHub Verify runs #720/#721 and Pages deployment run #180 succeeded.

## Completed increment: M06an — Convert drafted geometry into a user symbol

- [x] Convert a selected drafted graphic into a generic user symbol, centered and fitted to the symbol body; retain vector geometry and editable color.
- [x] Keep component naming, configurable/connectable terminals, project persistence, and duplication; bound imported graphic geometry.
- [x] Pass 72 focused tests, production build, GitHub Verify, merge, and Pages deployment.

PR #184 merged as `f58dbf0`. GitHub Verify run #725 and Pages deployment run #182 succeeded. Its authoring workflow is documented in PR #186, merged as `72187e5`; Verify run #729 and Pages deployment run #183 succeeded.

## Completed increment: M06ao — Combine drafted shapes into user symbols

- [x] Shift-click multiple drafted graphics and convert the composition into one user-defined symbol.
- [x] Center and fit the composition while retaining each shape’s color, fill, and stroke; keep component naming and terminal editing available.
- [x] Pass 54 focused tests, production build, GitHub Verify, merge, and Pages deployment.

PR #188 merged as `7300c26`. GitHub Verify run #733 and Pages deployment run #184 succeeded. The selection workflow is documented in PR #190, merged as `6e38810`; Verify run #736 and Pages deployment run #185 succeeded.

## Completed increment: M06ap — Reorder graphical ladder rungs

- [x] Add bounded Move Up/Move Down controls so users can change rung order in the graphical ladder editor.
- [x] Compile rungs in the displayed order, preserving later-rung priority and leaving the draft unchanged when a move is invalid.
- [x] Pass 93 focused ladder/PLC tests, production build, GitHub Verify, merge, and Pages deployment.

PR #192 merged as `a3a4c2b`. GitHub Verify run #743 and Pages deployment run #187 succeeded.

## Completed increment: M06aq — Duplicate graphical PLC rungs

- [x] Add an adjacent duplicate action for graphical ladder rungs, preserving independent contact and coil settings and the four-rung cap.
- [x] Pass 94 focused ladder/PLC tests, production build, GitHub Verify, merge, and Pages deployment.

PR #194 merged as `0a2d31c`. GitHub Verify run #749 and Pages deployment run #189 succeeded.

## Completed increment: M06ar — Editable freehand drafting paths

- [x] Add a Freehand tool on free sheets that saves user sketches as editable polyline geometry.
- [x] Let users edit path vertices, name, color, and stroke width; bound the stored path to 1,200 sampled points.
- [x] Pass 8 focused tests, production build, GitHub Verify, merge, Pages deployment, and live toolbar visibility check.

PR #196 merged as `2bad6fc`. GitHub Verify run #755 and Pages deployment run #191 succeeded. The live free-sheet editor displayed the Freehand tool; drawing into the locally saved browser project was not exercised.

## Per-increment publication rule

Finish its observable behavior and checks, review the exact changed files, commit/push a visible branch, and retain a draft PR until ready. After CI succeeds, merge and deploy using the configured workflow; verify the served build and targeted behavior before starting the next increment. Preserve unfinished work separately. Never include credentials, caches, unrelated files or local test logs. Record failures and unverified boundaries instead of marking gates complete.




## Completed increment: M06as — Independently wired PLC Q1 output

- [x] Add a separately retained Q1 Boolean output with OUT/SET/RESET and Q1 feedback in text programs.
- [x] Expose a Q1 terminal and independent Boolean signal so users choose the connected component and branch.
- [x] Preserve Q0-only output result compatibility; keep Q1 out of legacy status text unless it is used.
- [x] Pass GitHub Verify run `43395033846`, merge PR #198 as `441cb9e`, and complete Pages deployment run `43395120169`.

The output is a logic-level CAD abstraction. It does not assert physical output voltage, load suitability or safety behavior. Graphical Q1 coil authoring was added in the following increment.


## Completed increment: M06at — Graphical PLC Q1 coils

- [x] Add OUT, SET and RESET Q1 choices to each ladder rung.
- [x] Accept Q1 feedback contacts and preserve Q1 independently in ladder preview and text round trips.
- [x] Pass GitHub Verify run `43396137515`, merge PR #200 as `5287b64`, and complete Pages deployment run `43396299687`.

Q1 remains a user-defined Boolean output. The ladder editor does not assign it a device role, electrical rating or safety function.


## Completed increment: M06au — PLC Q1 watch and scan trace

- [x] Show live Q1 state in the PLC watch table and scan trace.
- [x] Accept older trace rows that predate Q1 without losing the rest of the trace.
- [x] Pass GitHub Verify run `43397110025`, merge PR #202 as `f68b7c5`, and complete Pages deployment run `43397212417`.

Q1 is a Boolean logic signal in this model. The watch table and scan history make the user-authored state observable; they do not imply physical output ratings.


## Completed increment: M06av — Graphical ladder uses the PLC scan budget

- [x] Expand the editor to 16 rungs and remove the fixed four-stage/four-contact caps.
- [x] Keep the 32-instruction interpreter limit and show the available scan budget in the editor.
- [x] Pass GitHub Verify run `43398918853`, merge PR #204 as `1f519d5`, and complete Pages deployment run `43399020238`.

The ladder remains a bounded educational editor with a 32-instruction scan limit; this does not establish full IEC language compatibility.
