# Architecture

The initial delivery implements the documented vertical slice: a typed catalog, terminal-aware circuit document, multi-sheet project model, deterministic DOL control model, SVG schematic rendering, local project persistence and export.

## Boundaries

- `src/catalog`: immutable component definitions and terminal data. The 638-entry catalog contains eight DOL entries, 67 component entries with supported simulation behavior, and 563 parameterized IEC engineering entries. The first 520 satisfy the required category distribution; additional project variants and 32 dual-channel safety entries remain executable control, numerical or connectivity abstractions. None is a vendor-certified record.
- `src/projects`: editable circuit documents built from catalog instances.
- `src/projects/starterProject.ts`: multi-sheet project state, including the DOL reference sheet and independent free schematic sheets.
- `src/projects/templateLibrary.ts`: 500 loadable, terminal-topology-validated engineering projects. Every project carries a recorded test sequence, expected component-abstraction outputs, parameterized component state, and is verified by `src/projects/templateVerification.ts`.
- `src/projects/projectSerialization.ts`: bounded local JSON import/recovery validation for project structure, catalog identities, terminal topology and readable label lengths.
- `src/projects/schematicExport.ts`: standalone SVG preparation with embedded drawing styles; the browser canvas path can render it to PNG.
- `src/reports`: derivation of BOM, wire-list and terminal-list data from the active circuit document.
- `src/cad`: placement-grid, collision, rotation, component-parameter, wire-edit and bounded project-history operations used to keep edits recoverable and placed symbols visually separate.
- `src/electrical`: graph validation independent of SVG geometry.
- `src/simulation`: deterministic DOL motor model; PLC boolean/edge/latch/gate/math/comparator and analog instrumentation functions used by the live control laboratory; and industrial-device calculations used by the live Industrial Device Lab.
- `src/simulation/functionalModels.ts`: explicit registry binding every released component model ID to a live per-instance evaluator.
- `src/simulation/circuitModels.ts`: evaluates registered functional models from placed schematic component instances and iteratively propagates unit-compatible boolean/numeric outputs over direct terminal wires.
- `src/components`: workspace presentation and accessible interaction, including category-aware placed-symbol glyphs that preserve an upright fitted reference label.

## Supported model

The DOL motor project is an educational, simplified model. It validates terminal-referenced wiring, models breaker, START/STOP, overload and contactor holding behavior, and calculates a nominal three-phase operating point. It does not establish real-world protection coordination, cable sizing, fault current, or commissioning safety.

## Not in this increment

The 640-entry catalog is not manufacturer certified; the 500 project entries are mostly parameter variants rather than independently engineered projects. A limited scanned PLC interpreter, graphical contact/coil editor and account-scoped Supabase persistence are implemented; their exact verification boundaries are recorded in PLC-PROGRAMS.md and AUTH-RLS-VERIFICATION-2026-11-02.md. Local-rule Adigun Bot analysis uses the current canvas, explicit wire previews and atomic validation; Bot edits pause autosave. A generative Bot service, full IEC PLC execution, advanced reports beyond current sheet lists and measured hardware characteristics remain incomplete. The product uses only the adigunelectrocad schema.
