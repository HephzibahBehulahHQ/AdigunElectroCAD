# Local project recovery

Autosave and manual local Save validate the project before writing it. Before replacing a valid current save, the application retains that record as the previous save. Startup and Open Local Save try the current record first, then the previous record if the current one is missing or invalid. Recovery reports which copy was loaded and does not immediately overwrite the damaged record.

When later saving valid work over an invalid current record, the invalid text is retained separately and the valid previous copy is preserved. The application keeps one previous save and one rejected record, not unlimited revision history.

Storage failures leave the saved current record intact. Manual Save reports failure and keeps the work marked unsaved; use JSON export to retain the in-memory project. This mechanism depends on browser storage availability and is separate from cloud save, Undo, and downloaded JSON backups.

Normal page exit now flushes a pending eligible design edit synchronously through the same validated local-save path, including an Undo result that has not reached the 650ms autosave timer. The handler reads the latest project and save policy rather than a snapshot from startup. Accepted Bot edits still pause every automatic project save, including exit saving, until explicitly saved. An imported project marked clean also retains its existing explicit-save requirement. Listener cleanup removes the exit handler.

This is best-effort recovery for normal page exits. Browser crashes, process termination, or unavailable/quota-limited storage can still prevent persistence. Automated tests cover latest pending edits, immediate Undo, Bot/clean-state suppression, failed storage and listener cleanup.

Local browser verification on 2026-11-03 saved a temporary third sheet, then clicked Undo and requested reload 467ms after that click, before the normal 650ms debounce. The reloaded project retained the two-sheet Undo result. Another reload was requested while the header still reported unsaved changes and also retained Undo. A real accepted Bot wire fix changed the analog sheet from two wires to three, displayed its autosave-paused notice, and was discarded on reload: the saved sheet still had two wires. Temporary test sheets were removed and the original project remained in local storage. The local workspace's 250 tests and production build passed; it also includes separate drafts #62/#63. Production and actual process-termination recovery are unverified.
