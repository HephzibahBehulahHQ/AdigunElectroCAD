# Requirements audit — 2026-11-02

The master goal remains incomplete. Passing the current tests does not establish the full requested application.

## Live Adigun Bot addendum

The active goal also includes the full floating-window request, retained verbatim in `ADIGUN-BOT-FLOATING-WINDOW-REQUEST.txt`. Its window behavior, persistence, unread badge, accessibility/mobile checks and HELP deliverables remain pending. The new floating placement replaces the earlier fixed-column placement requirement; existing user-consent, quiet-time and no-autosave rules still apply. The user authorized Cloudflare and Supabase work for this addition; existing project/schema isolation requirements remain in force.

The active goal also includes the user's full live co-pilot request, retained verbatim in `ADIGUN-BOT-LIVE-COPILOT-REQUEST.txt`. A local-rule foundation now implements canvas observation, selected-component explanations, supported wiring findings, preview/atomic acceptance, quiet-time controls and session goals/dismissals. Bot changes pause autosave and require a permanent account for explicit local/cloud saving. See `HELP.md`. Unit tests cover findings, ambiguity, branch-input selection, stale/invalid-preview rollback, activity suppression and rate limiting. Production checks verified a real missing-wire offer, one-wire acceptance, Undo/Redo, lack of automatic persistence, stale-preview rejection, actual connection explanation and disabling offers; see `COPILOT-VERIFICATION-2026-11-02.md` for pending guest/timing/layout checks. Generative AI, broader goal-dependent planning, missing physical power/ground analysis, and general multi-component completion remain incomplete. The addendum does not replace the existing CAD, simulation, library, authentication, visual or deployment requirements.

## Project library

`src/projects/templateLibrary.ts` contains 502 entries: 499 parameter variants from five scenario families, one dedicated analog level/ADC/PLC project and two dedicated wired pneumatic motion projects with separate operating sequences. This is not 502 independently engineered industrial projects. The pneumatic addition models command flow and constant-rate motion, not pressure/flow networks; see `PNEUMATIC-MOTION.md`. Separate forward/reverse and star-delta laboratories provide stateful sequences and editable power circuits. Multi-motor sequences and broader industrial circuits still require dedicated topology, operating sequences, and fault tests.

`verifyProjectTemplate` checks topology, configured model snapshots and operating steps. The five families cover motor isolation/start/stop, drive frequency changes, a scanned PLC holding program, elapsed timer behavior and safety reset/channel sequences. PLC examples execute START, release, STOP and release-without-restart rather than assigning Q0 manually. Safety examples require a fresh reset after either channel opens and reject held reset on recovery. These remain five parameterized scenario families; they do not establish 500 independently engineered projects. See `SAFETY-RESET-MODEL.md` for unmodeled safety-device behavior.

## Authentication and persistence

Unit tests cover the email/password upgrade calls and confirmation guard. A rejected frontend API key was replaced and deployed with the project's active publishable key. Real anonymous sign-ins and ten ownership/INSERT-restriction checks passed; test project rows were removed. Production browser guest sign-in, the existing-email upgrade fallback, permanent-account sign-in and project creation/load were verified, including retained authentication and cloud load after refresh. See `AUTH-RLS-VERIFICATION-2026-11-02.md` for the interrupted harness-cleanup boundary. Email confirmation/upgrade and browser switching between two permanent accounts remain unverified.

## Visual verification

Production desktop and 390px mobile checks verified readable header/footer branding and no page-level horizontal overflow for the checked release. Six-terminal motor glyph changes still require a fresh production rendered check. This is not exhaustive coverage of all views, themes, languages, or labels.

## Control wiring boundaries

Editable reversing circuits now propagate Boolean command signals through an overload NC contact and AND blocks into contactor A1 commands before motor power tracing. Tests verify that an independently tripped contact opens both contactors while Q1 remains closed. These are Boolean control models: physical coil voltage, return wiring, wired holding/interlock contacts, and overload thermal integration remain incomplete. Star-delta copies contain only their own power topology and do not inherit reversing control commands.

## Next implementation priorities

1. Complete graphical ladder programming and broader PLC execution. PLC digital I/O supports two Boolean inputs, one retained output, one ADC raw input (AI0), eight retained numeric registers and MOV/ADD/SUB/MUL/DIV with GT/LT/EQ comparisons. Wired analog scaling through the PLC to an output coil is covered by automated tests and production checks at 0/50/100 percent, including a division fault. See `PLC-PROGRAMS.md` for exact limits. On-delay timers, logic memory, edge pulses and educational dual-channel reset behavior advance through the runtime clock; these features do not establish a complete PLC implementation or certified safety controller.
2. Complete wired holding/interlock and protection circuits beyond the existing forward/reverse and star-delta state controllers.
3. Replace generated catalog-count claims with coverage backed by distinct, validated behavior.
4. Complete live authentication, isolation, and responsive-layout verification.
