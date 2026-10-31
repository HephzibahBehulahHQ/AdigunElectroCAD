# Verification manifest

| Item | Evidence | Status |
| --- | --- | --- |
| DOL terminal definitions | `tests/dolSimulator.test.ts` | Automated |
| DOL sequence | `tests/dolSimulator.test.ts` | Automated |
| Invalid wiring detection | `tests/topology.test.ts` | Automated |
| Production base path | `vite.config.ts` | Build validation |
| Local workspace interaction | Breaker, START/holding, Run/Stop, catalog insertion and undo | Manually verified in browser |
| Terminal-click wiring | Compatible terminal-to-terminal connection creates a persisted circuit wire; cross-domain wiring is rejected | Automated + manually verified in browser |
| Placed component movement | 20-unit nudge moves a placed component without changing terminal-level wire topology | Automated + manually verified in browser |
| Responsive workspace | Header/footer readability and no overlap at desktop and 390 px viewport | Manually verified in browser |
| Schematic annotations | Control title and device labels are separated and fully visible | Manually verified in browser |

This manifest only records checks that have been executed. It is not a claim that catalog or project-library release targets have been met.
