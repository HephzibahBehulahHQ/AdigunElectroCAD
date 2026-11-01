# Architecture

The initial delivery implements the documented vertical slice: a typed catalog, terminal-aware circuit document, multi-sheet project model, deterministic DOL control model, SVG schematic rendering, local project persistence and export.

## Boundaries

- `src/catalog`: immutable component definitions and terminal data. Eight DOL entries and 30 PLC/instrumentation entries have supported simulation behavior; the 512 additional entries are schema-validated generic IEC-oriented symbol templates, not vendor-certified records.
- `src/projects`: editable circuit documents built from catalog instances.
- `src/projects/starterProject.ts`: multi-sheet project state, including the DOL reference sheet and independent free schematic sheets.
- `src/projects/templateLibrary.ts`: 500 loadable, terminal-topology-validated generic starter templates. These templates are not process-simulation projects.
- `src/projects/projectSerialization.ts`: bounded local JSON import/recovery validation for project structure, catalog identities, terminal topology and readable label lengths.
- `src/projects/schematicExport.ts`: standalone SVG preparation with embedded drawing styles; the browser canvas path can render it to PNG.
- `src/reports`: derivation of BOM, wire-list and terminal-list data from the active circuit document.
- `src/cad`: placement-grid, collision, rotation, component-parameter, wire-edit and bounded project-history operations used to keep edits recoverable and placed symbols visually separate.
- `src/electrical`: graph validation independent of SVG geometry.
- `src/simulation`: deterministic DOL motor model; PLC boolean/edge/latch/gate/math/comparator and analog instrumentation functions used by the live control laboratory; and industrial-device calculations used by the live Industrial Device Lab.
- `src/simulation/functionalModels.ts`: explicit registry binding every released PLC/instrumentation catalog model ID to a live per-instance evaluator.
- `src/components`: workspace presentation and accessible interaction, including category-aware placed-symbol glyphs that preserve an upright fitted reference label.

## Supported model

The DOL motor project is an educational, simplified model. It validates terminal-referenced wiring, models breaker, START/STOP, overload and contactor holding behavior, and calculates a nominal three-phase operating point. It does not establish real-world protection coordination, cable sizing, fault current, or commissioning safety.

## Not in this increment

The 520-entry catalog is not presented as manufacturer certified; the 500 templates are not presented as runnable simulations. PLC/Ladder integration, cloud accounts, advanced reports beyond the current sheet BOM/wire/terminal lists, measured hardware characteristics and an Adigun BOT service are not present. No Supabase project has been provisioned for this product.
