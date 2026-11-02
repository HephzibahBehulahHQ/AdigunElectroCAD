# Requirements audit — 2026-11-02

The master goal remains incomplete. Passing the current tests does not establish the full requested application.

## Project library

`src/projects/templateLibrary.ts` contains 499 parameter variants from five scenario families and one dedicated analog level/ADC/PLC project. This is not 500 independently engineered projects. Separate forward/reverse and star-delta laboratories provide stateful sequences and editable power circuits. Multi-motor sequences and broader industrial circuits still require dedicated topology, operating sequences, and fault tests.

`verifyProjectTemplate` checks topology, configured model snapshots and operating steps. The five families cover motor isolation/start/stop, drive frequency changes, a scanned PLC holding program, elapsed timer behavior and safety reset/channel sequences. PLC examples execute START, release, STOP and release-without-restart rather than assigning Q0 manually. Safety examples require a fresh reset after either channel opens and reject held reset on recovery. These remain five parameterized scenario families; they do not establish 500 independently engineered projects. See `SAFETY-RESET-MODEL.md` for unmodeled safety-device behavior.

## Authentication and persistence

Unit tests cover the email/password upgrade calls and confirmation guard. A rejected frontend API key was replaced and deployed with the project's active publishable key. Real anonymous sign-ins and ten ownership/INSERT-restriction checks passed; test project rows were removed. Production browser guest sign-in and the existing-email upgrade fallback were verified. See `AUTH-RLS-VERIFICATION-2026-11-02.md` for the interrupted harness-cleanup boundary. Permanent-account INSERT, email confirmation/upgrade, and browser cloud save/reload remain unverified. Deployment success does not prove those flows.

## Visual verification

Production desktop and 390px mobile checks verified readable header/footer branding and no page-level horizontal overflow for the checked release. Six-terminal motor glyph changes still require a fresh production rendered check. This is not exhaustive coverage of all views, themes, languages, or labels.

## Control wiring boundaries

Editable reversing circuits now propagate Boolean command signals through an overload NC contact and AND blocks into contactor A1 commands before motor power tracing. Tests verify that an independently tripped contact opens both contactors while Q1 remains closed. These are Boolean control models: physical coil voltage, return wiring, wired holding/interlock contacts, and overload thermal integration remain incomplete. Star-delta copies contain only their own power topology and do not inherit reversing control commands.

## Next implementation priorities

1. Complete graphical ladder programming and broader PLC execution. PLC digital I/O supports two Boolean inputs, one retained output, one ADC raw input (AI0), eight retained numeric registers and MOV/ADD/SUB/MUL/DIV with GT/LT/EQ comparisons. Wired analog scaling through the PLC to an output coil is covered by automated tests; production arithmetic interaction remains unverified. See `PLC-PROGRAMS.md` for exact limits. On-delay timers, logic memory, edge pulses and educational dual-channel reset behavior advance through the runtime clock; these features do not establish a complete PLC implementation or certified safety controller.
2. Complete wired holding/interlock and protection circuits beyond the existing forward/reverse and star-delta state controllers.
3. Replace generated catalog-count claims with coverage backed by distinct, validated behavior.
4. Complete live authentication, isolation, and responsive-layout verification.
