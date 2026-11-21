# AdigunElectroCAD

Professional Electrical CAD & Industrial Circuit Simulator by HB Elektroniker.

## Current verified increment

- Typed IEC-oriented DOL component definitions with terminals.
- 68 executable PLC, instrumentation, pneumatic, hydraulic, HVAC, renewable, safety, panel and cable definitions with editable input parameters and per-instance live model output.
- Placed executable components are evaluated from the active schematic document; unit-compatible functional terminal outputs propagate over direct wires, including level-sensor 4–20 mA → ADC, PT100 → comparator, and NO-contact → AND-gate → output-coil paths.
- 563 parameterized, IEC-oriented engineering entries: 520 across the required catalog distribution, with additional variants needed by the supplied projects and 32 dual-channel safety entries. Each has terminals, editable engineering assumptions and an executable control, numerical or connectivity abstraction; none is manufacturer-certified.
- Terminal-aware reference circuit with topology validation.
- Selectable terminal-to-terminal wires with bounded net names, target reconnection and safe deletion; wire geometry remains separate from terminal topology.
- A typed multi-sheet project model with free-form schematic sheets.
- 14 selectable, authored engineering examples with editable component state, recorded test steps, and automatic topology and output checks. The PT100 examples cover independent window alarms and a calibrated 4–20 mA transmitter feeding a PLC.
- Live PLC Control & Analog Lab covering NO/NC contacts, output and set/reset coils, edges, six logic gates, comparators, four math blocks, and a level-sensor → 4–20 mA → ADC → PLC/DAC signal path.
- Live Industrial Device Lab for pneumatic/hydraulic actuation, HVAC thermal control, renewable energy, safety monitoring and three-phase cable calculations; these models are intentionally not represented as runnable catalog items until their symbol-level circuit integration is complete.
- Deterministic breaker, START/STOP, overload, contactor holding-contact and simplified three-phase motor model.
- SVG schematic workspace, debounced local autosave and recovery, JSON/SVG/PNG export and print stylesheet, English/German UI and light/dark themes.
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
- User-configurable indicator placeholders on the reference DOL sheet. Their colors, indication labels, terminal display labels and reference tags are editable; branch wiring is user-assigned and the generic symbols do not simulate lamp behavior.

The internal catalog also includes parameterized definitions used by existing projects and model tests. Selectable library entries and authored projects are the basis for editor acceptance. Project checks execute documented component abstractions. Manufacturer certification and final production acceptance remain outside the current verification. See [architecture](docs/ARCHITECTURE.md) and the [verification manifest](docs/VERIFICATION.md) for supported-model limits and executed checks.

Cloud configuration is loaded before the app from [`public/runtime-config.js`](public/runtime-config.js). The matching schema migration, including ownership and permanent-user insert policies, is in [`supabase/migrations/202611020001_adigunelectrocad_cloud_projects.sql`](supabase/migrations/202611020001_adigunelectrocad_cloud_projects.sql).

## Development

```bash
npm ci
npm test
npm run build
```

Production target: [adigunelectrocad.hephzibahbehulah.com](https://adigunelectrocad.hephzibahbehulah.com/). Builds use root-domain asset paths.
