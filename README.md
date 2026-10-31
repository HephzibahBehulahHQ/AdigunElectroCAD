# AdigunElectroCAD

Professional Electrical CAD & Industrial Circuit Simulator by HB Elektroniker.

## Current verified increment

- Typed IEC-oriented DOL component definitions with terminals.
- Terminal-aware reference circuit with topology validation.
- Deterministic breaker, START/STOP, overload, contactor holding-contact and simplified three-phase motor model.
- SVG schematic workspace, local save, JSON export, English/German UI and light/dark themes.

The current catalog contains eight verified DOL-model definitions. It does not claim the 520-component catalog or 500-project release targets. See [architecture](docs/ARCHITECTURE.md) and the [verification manifest](docs/VERIFICATION.md) for supported-model limits and executed checks.

## Development

```bash
npm ci
npm test
npm run build
```

GitHub Pages builds with `/AdigunElectroCAD/` as the required base path.
