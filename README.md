# AdigunElectroCAD

Professional Electrical CAD & Industrial Circuit Simulator by HB Elektroniker.

## Current verified increment

- Typed IEC-oriented DOL component definitions with terminals.
- 520 schema-validated, IEC-oriented generic symbol templates across 16 categories; these are explicitly distinct from manufacturer-certified records.
- Terminal-aware reference circuit with topology validation.
- A typed multi-sheet project model with free-form schematic sheets.
- Deterministic breaker, START/STOP, overload, contactor holding-contact and simplified three-phase motor model.
- SVG schematic workspace, local save, JSON export, English/German UI and light/dark themes.

The catalog contains eight supported DOL simulation definitions plus 512 generic symbol templates. It does not claim manufacturer certification, the 500-project release target, or final production acceptance. See [architecture](docs/ARCHITECTURE.md) and the [verification manifest](docs/VERIFICATION.md) for supported-model limits and executed checks.

## Development

```bash
npm ci
npm test
npm run build
```

GitHub Pages builds with `/AdigunElectroCAD/` as the required base path.
