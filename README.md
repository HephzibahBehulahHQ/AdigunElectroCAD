# AdigunElectroCAD

Professional Electrical CAD & Industrial Circuit Simulator by HB Elektroniker.

## Current verified increment

- Typed IEC-oriented DOL component definitions with terminals.
- 520 schema-validated, IEC-oriented generic symbol templates across 16 categories; these are explicitly distinct from manufacturer-certified records.
- Terminal-aware reference circuit with topology validation.
- A typed multi-sheet project model with free-form schematic sheets.
- 500 loadable, topology-validated project templates; only the DOL project currently has a supported simulation model.
- Deterministic breaker, START/STOP, overload, contactor holding-contact and simplified three-phase motor model.
- SVG schematic workspace, local save, JSON export, English/German UI and light/dark themes.
- Validated JSON project import that rejects malformed, unknown-device, invalid-topology and label-overflow input.
- On-demand BOM, wire-list and terminal-list reports for the active sheet.

The catalog contains eight supported DOL simulation definitions plus 512 generic symbol templates, alongside 500 topology-validated templates. It does not claim manufacturer certification, 500 runnable simulations, or final production acceptance. See [architecture](docs/ARCHITECTURE.md) and the [verification manifest](docs/VERIFICATION.md) for supported-model limits and executed checks.

## Development

```bash
npm ci
npm test
npm run build
```

GitHub Pages builds with `/AdigunElectroCAD/` as the required base path.
