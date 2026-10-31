# Verification manifest

| Item | Evidence | Status |
| --- | --- | --- |
| DOL terminal definitions | `tests/dolSimulator.test.ts` | Automated |
| DOL sequence | `tests/dolSimulator.test.ts` | Automated |
| Invalid wiring detection | `tests/topology.test.ts` | Automated |
| Production base path | `vite.config.ts` | Build validation |
| Local workspace interaction | Breaker, START/holding, Run/Stop, catalog insertion and undo | Manually verified in browser |

This manifest only records checks that have been executed. It is not a claim that catalog or project-library release targets have been met.
