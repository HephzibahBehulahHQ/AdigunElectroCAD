# Architecture

The initial delivery implements the documented vertical slice: a typed catalog, terminal-aware circuit document, multi-sheet project model, deterministic DOL control model, SVG schematic rendering, local project persistence and export.

## Boundaries

- `src/catalog`: immutable component definitions and terminal data.
- `src/projects`: editable circuit documents built from catalog instances.
- `src/projects/starterProject.ts`: multi-sheet project state, including the DOL reference sheet and independent free schematic sheets.
- `src/electrical`: graph validation independent of SVG geometry.
- `src/simulation`: deterministic component-state and motor model.
- `src/components`: workspace presentation and accessible interaction.

## Supported model

The DOL motor project is an educational, simplified model. It validates terminal-referenced wiring, models breaker, START/STOP, overload and contactor holding behavior, and calculates a nominal three-phase operating point. It does not establish real-world protection coordination, cable sizing, fault current, or commissioning safety.

## Not in this increment

The 520-entry catalog, 500 runnable projects, cloud accounts, PLC/Ladder integration, reports, measured hardware characteristics and Adigun BOT service are intentionally not advertised as present. No Supabase project has been provisioned for this product.
