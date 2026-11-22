# Local project recovery

The editor starts with a blank canvas. Use **File → Save locally** to store the current drawing, then **File → Load local save** to reopen it later. Unsaved changes trigger the browser’s exit warning. Leaving the page or returning to it through browser history clears the transient workspace. Exit leaves the last saved copy intact.

Local Save validates the project before writing it. Before replacing a valid current save, the application retains that record as the previous save. Load local save reads the current record first, then the previous record if the current one is missing or invalid. The status line identifies the recovered copy. A later save retains invalid current data separately and preserves the valid previous copy. The editor keeps one previous save and one rejected record.

A failed local save leaves the drawing in memory and reports the failure. **Export JSON** can retain that drawing as a file. Local browser storage, cloud save, Undo, and JSON export remain separate. Saving accepted Bot edits requires a permanent account.

## Verification

On 2026-11-22, headless Chrome created two routed wires and edited their terminal positions. Browser storage retained the earlier drawing until **Save locally** was clicked. A dispatched `beforeunload` event was canceled while edits were unsaved. After explicit save, a dispatched `pagehide` cleared the canvas and **Load local save** restored the saved routes. This check exercised the editor’s event handling and local storage in Chrome. Browser-managed confirmation dialogs and abrupt process termination were outside the run.
