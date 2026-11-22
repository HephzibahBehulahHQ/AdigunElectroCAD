# AdigunElectroCAD

Professional Electrical CAD & Industrial Circuit Simulator by HB Elektroniker.

## Current verified increment

- Typed IEC-oriented DOL component definitions with terminals.
- 69 executable PLC, instrumentation, pneumatic, hydraulic, HVAC, renewable, safety, panel and cable definitions with editable input parameters and per-instance live model output.
- Placed executable components are evaluated from the active schematic document; unit-compatible functional terminal outputs propagate over direct wires, including level-sensor 4–20 mA → ADC, PT100 → comparator, and NO-contact → AND-gate → output-coil paths.
- 564 parameterized, IEC-oriented engineering entries: 520 across the required catalog distribution, with additional variants needed by the supplied projects and 32 dual-channel safety entries. Each has terminals, editable engineering assumptions and an executable control, numerical or connectivity abstraction; none is manufacturer-certified.
- Terminal-aware reference circuit with topology validation.
- Selectable terminal-to-terminal wires with bounded net names, target reconnection and safe deletion; wire geometry remains separate from terminal topology.
- A typed multi-sheet project model with free-form schematic sheets.
- 29 selectable, authored engineering examples with editable component state, recorded test steps, and automatic topology and output checks. The CT loop example verifies conversion from secondary amperes to 4–20 mA, then PLC inhibition on wire and span faults. The CT metering example verifies secondary metering, high-current indication, and invalid calibration. The weigh-station example verifies an acceptance window, overload inhibition, and recovery. The cold-room example verifies a freeze alarm with thermostat hysteresis and a wired maintenance permit. The ventilation example verifies wired humidity demand, damper travel, and position proof. The tank-fill example verifies retained fill demand, a wired permit, and an independent high-high alarm. The analog loopback example verifies a DAC/ADC channel against an independent PLC target. The pulse flow example detects a one-sided difference between inlet and outlet signals. The PT100 examples cover window alarms and a calibrated transmitter feeding a PLC. The Type K example shows how changing the reference junction affects a wired high-EMF alarm. The indexed conveyor example verifies the encoder count, inspection enable, overshoot indication, and encoder wire loss and recovery. The pilot indicator example demonstrates a switched line and return path.
- Live PLC Control & Analog Lab covering NO/NC contacts, output and set/reset coils, edges, six logic gates, comparators, four math blocks, and a level-sensor → 4–20 mA → ADC → PLC/DAC signal path.
- Live Industrial Device Lab for pneumatic/hydraulic actuation, HVAC thermal control, renewable energy, safety monitoring and three-phase cable calculations; these models are intentionally not represented as runnable catalog items until their symbol-level circuit integration is complete.
- Deterministic breaker, START/STOP, overload, contactor holding-contact and simplified three-phase motor model.
- SVG schematic workspace, explicit local save and recovery, JSON/SVG/PNG export and print stylesheet, English/German UI and light/dark themes.
- Validated JSON project import that rejects malformed, unknown-device, invalid-topology and label-overflow input.
- Validated local save restoration for multi-sheet projects.
- Supabase-backed authenticated project save/load and synchronized user preferences, scoped exclusively to the `adigunelectrocad` schema. Anonymous previews are an informational UX path; their data permissions are enforced by RLS, with inserts restricted to confirmed accounts.
- On-demand BOM, wire-list and terminal-list reports for the active sheet.
- CSV export for BOM, wire-list and terminal-list reports.
- Collision-safe component placement and movement that preserve clear, non-overlapping symbols.
- Safe removal for placed components, including connected-wire cleanup and project Undo recovery.
- Bounded project Undo/Redo across schematic edits, sheet creation, template loading, imports and local-save restoration.
- Bounded component references fitted inside free-sheet symbols to keep labels legible.
- Right-angle rotation for placed components, including rotated terminal anchors and upright reference labels.
- Schema-bounded editable parameters for placed components; fixed DOL reference parameters remain read-only so the supported simulation stays consistent.
- Category-aware schematic glyphs for placed catalog components, with uncluttered fitted reference labels positioned below the marks.
- Configurable wired pilot indicators. Users choose the color, terminal labels, voltage rating, AC/DC mode, and branch wiring. The lamp lights when a matching control supply reaches both terminals.

The internal catalog also includes parameterized definitions used by existing projects and model tests. Selectable library entries and authored projects are the basis for editor acceptance. Project checks execute documented component abstractions. Manufacturer certification and final production acceptance remain outside the current verification. See [architecture](docs/ARCHITECTURE.md) and the [verification manifest](docs/VERIFICATION.md) for supported-model limits and executed checks.

Cloud configuration is loaded before the app from [`public/runtime-config.js`](public/runtime-config.js). The matching schema migration, including ownership and permanent-user insert policies, is in [`supabase/migrations/202611020001_adigunelectrocad_cloud_projects.sql`](supabase/migrations/202611020001_adigunelectrocad_cloud_projects.sql).

## Development

```bash
npm ci
npm test
npm run build
```

Production target: [adigunelectrocad.hephzibahbehulah.com](https://adigunelectrocad.hephzibahbehulah.com/). Builds use root-domain asset paths.
