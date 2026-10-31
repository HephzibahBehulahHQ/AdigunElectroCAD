# Verification manifest

| Item | Evidence | Status |
| --- | --- | --- |
| DOL terminal definitions | `tests/dolSimulator.test.ts` | Automated |
| Modeled catalog schema | 520 unique entries across 16 categories, each with terminals and standards metadata; generic entries are not manufacturer-certified | Automated |
| Project-template topology | 500 templates use only known component terminals and pass topology validation; they are not all simulations | Automated |
| Project JSON import | Valid project round-trip plus malformed device and overlong-label rejection | Automated |
| Engineering reports | BOM aggregation plus DOL wire-list and terminal-list generation | Automated |
| Placement collision guard | Grid allocation remains clear and occupied-position moves are rejected | Automated |
| Placed-component removal | Connected manual wires are cleaned up and the prior project state remains available through Undo | Automated |
| Reference-label legibility | UI and JSON imports cap references at 12 characters; free-symbol labels are fitted inside the symbol | Automated + build validation |
| DOL sequence | `tests/dolSimulator.test.ts` | Automated |
| Invalid wiring detection | `tests/topology.test.ts` | Automated |
| Production base path | `vite.config.ts` | Build validation |
| Local workspace interaction | Breaker, START/holding, Run/Stop, catalog insertion and undo | Manually verified in browser |
| Terminal-click wiring | Compatible terminal-to-terminal connection creates a persisted circuit wire; cross-domain wiring is rejected | Automated + manually verified in browser |
| Terminal direction validation | Same-direction input/input and output/output joins are rejected | Automated |
| Placed component movement | 20-unit nudge moves a placed component without changing terminal-level wire topology | Automated + manually verified in browser |
| Multi-sheet project model | A free schematic sheet is independent from the DOL reference sheet | Automated |
| Responsive workspace | Header/footer readability and no overlap at desktop and 390 px viewport | Manually verified in browser |
| Schematic annotations | Control title and device labels are separated and fully visible | Manually verified in browser |

This manifest only records checks that have been executed. It is not a claim that catalog or project-library release targets have been met.
