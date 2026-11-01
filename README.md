# AdigunElectroCAD

Professional Electrical CAD & Industrial Circuit Simulator by HB Elektroniker.

## Current verified increment

- Typed IEC-oriented DOL component definitions with terminals.
- 67 executable PLC, instrumentation, pneumatic, hydraulic, HVAC, renewable, safety, panel and cable definitions with editable input parameters and per-instance live model output.
- Placed executable components are evaluated from the active schematic document; unit-compatible functional terminal outputs propagate over direct wires, including level-sensor 4–20 mA → ADC, PT100 → comparator, and NO-contact → AND-gate → output-coil paths.
- 520 schema-validated, IEC-oriented generic symbol templates across 16 categories; these are explicitly distinct from manufacturer-certified records.
- Terminal-aware reference circuit with topology validation.
- Selectable terminal-to-terminal wires with bounded net names, target reconnection and safe deletion; wire geometry remains separate from terminal topology.
- A typed multi-sheet project model with free-form schematic sheets.
- 500 loadable, topology-validated project templates; the DOL project and a live PLC control/analog laboratory have supported simulation models.
- Live PLC Control & Analog Lab covering NO/NC contacts, output and set/reset coils, edges, six logic gates, comparators, four math blocks, and a level-sensor → 4–20 mA → ADC → PLC/DAC signal path.
- Live Industrial Device Lab for pneumatic/hydraulic actuation, HVAC thermal control, renewable energy, safety monitoring and three-phase cable calculations; these models are intentionally not represented as runnable catalog items until their symbol-level circuit integration is complete.
- Deterministic breaker, START/STOP, overload, contactor holding-contact and simplified three-phase motor model.
- SVG schematic workspace, debounced local autosave and recovery, JSON/SVG/PNG export and print stylesheet, English/German UI and light/dark themes.
- Validated JSON project import that rejects malformed, unknown-device, invalid-topology and label-overflow input.
- Validated local save restoration for multi-sheet projects.
- On-demand BOM, wire-list and terminal-list reports for the active sheet.
- CSV export for BOM, wire-list and terminal-list reports.
- Collision-safe component placement and movement that preserve clear, non-overlapping symbols.
- Safe removal for placed components, including connected-wire cleanup and project Undo recovery.
- Bounded project Undo/Redo across schematic edits, sheet creation, template loading, imports and local-save restoration.
- Bounded component references fitted inside free-sheet symbols to keep labels legible.
- Right-angle rotation for placed components, including rotated terminal anchors and upright reference labels.
- Schema-bounded editable parameters for placed components; fixed DOL reference parameters remain read-only so the supported simulation stays consistent.
- Category-aware schematic glyphs for placed catalog components, with uncluttered fitted reference labels positioned below the marks.

The catalog contains eight supported DOL simulation definitions, 67 executable component definitions and 512 generic symbol templates, alongside 500 topology-validated templates. It does not claim manufacturer certification, 500 runnable simulations, or final production acceptance. See [architecture](docs/ARCHITECTURE.md) and the [verification manifest](docs/VERIFICATION.md) for supported-model limits and executed checks.

## Development

```bash
npm ci
npm test
npm run build
```

GitHub Pages builds with `/AdigunElectroCAD/` as the required base path.
