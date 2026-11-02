# Floating Bot window verification

Local preview: http://127.0.0.1:5190/. Draft PR #62; not deployed.

- Opening focused the question input and rendered a non-modal dialog.
- Drag changed position to (560, 130); reload restored it.
- Resize changed dimensions to 520 × 650; reload restored them.
- Maximize produced viewport margins of 16px; Restore returned exactly to (560, 130), 520 × 650.
- Minimize produced a 56px title bar. Selecting KM1 on the canvas still worked.
- Enter submitted a question and displayed both user and actual component explanation in the conversation log.
- Escape closed the window and returned focus to the launcher. Reload kept it closed.
- A real missing-wire suggestion appeared as a badge/toast with zero visible dialogs; it did not auto-open the window.
- At 390 × 844, the window occupied the full viewport, had no page overflow and closed successfully. Header controls were separate 28px squares.
- Keyboard Enter opened/reopened the window; opening focused the input. Title-bar arrow movement and Tab navigation to Minimize worked. Enter minimized; Escape closed; Enter reopened.

226 unit tests and production build passed. Geometry tests cover viewport limits, saved state, per-user isolation, maximize/restore, minimized movement, corrupt storage and storage failures. Account-query tests cover namespacing, ownership filters, unrelated-row protection and error handling. Draft CI passed for the implementation commit.

Account lookup now escapes literal underscores in the namespace LIKE pattern. A read-only SQL expression check proved the unescaped pattern also matched a hyphenated non-layout string, whereas the escaped pattern rejected it and still matched the actual layout prefix. The existing returned-row guard already prevented unrelated-row updates. No account data, schema or policies were changed by this check.

Remaining: authenticated account persistence against the real service, touch-device gestures, broader browser coverage and production verification. Account storage uses the inspected existing adigunelectrocad.my_data content column with a dedicated prefix. No schema or policy changes were made. Generative AI remains unconfigured. UI layout persistence does not save project edits.
