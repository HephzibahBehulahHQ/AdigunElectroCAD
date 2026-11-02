# Local project recovery

Autosave and manual local Save validate the project before writing it. Before replacing a valid current save, the application retains that record as the previous save. Startup and Open Local Save try the current record first, then the previous record if the current one is missing or invalid. Recovery reports which copy was loaded and does not immediately overwrite the damaged record.

When later saving valid work over an invalid current record, the invalid text is retained separately and the valid previous copy is preserved. The application keeps one previous save and one rejected record, not unlimited revision history.

Storage failures leave the saved current record intact. Manual Save reports failure and keeps the work marked unsaved; use JSON export to retain the in-memory project. This mechanism depends on browser storage availability and is separate from cloud save, Undo, and downloaded JSON backups.
