# Authentication and ownership verification — 2026-11-02

The configured frontend API key returned HTTP 401 / Invalid API key. The runtime config was corrected to the project's active publishable key obtained through the Supabase connector. The existing `supabaseAnonKey` configuration field is retained for compatibility; its value is a frontend publishable key. Client initialization remains restricted to `adigunelectrocad`.

Two real anonymous sessions were created through the installed Supabase JavaScript SDK, with session persistence disabled and tokens kept in process memory. Two disposable project rows were seeded through the connector to test access independently of the anonymous INSERT restriction.

All ten live checks returned true:

- Each session could read only its own test project.
- The anonymous owner could update its project.
- A cross-owner update affected no rows.
- Transferring ownership was rejected with RLS error 42501.
- Anonymous INSERT into projects was rejected with RLS error 42501.
- Anonymous INSERT into user_preferences was rejected with RLS error 42501.
- A cross-owner delete affected no rows.
- The other owner's row remained unchanged.
- The anonymous owner could delete its own project.

The terminal run stalled while reporting/finishing cleanup and was interrupted after its all-passed result was generated. The remaining fixture was removed through the connector; a subsequent database query confirmed zero remaining test projects. Two anonymous Auth identities were created; server-side session revocation was not verified after interruption. Tokens were not written to disk. The harness now uses non-interactive line parsing, separate SDK storage keys and bounded HTTP requests; those harness changes are syntax-checked but have not had another full live run.

Read-only inspection confirmed RLS enabled on my_data, projects and user_preferences. The tested new-table owner policies contain both USING and WITH CHECK, with restrictive non-anonymous INSERT policies. The existing my_data policy was retained.

Production browser verification after deployment of PR #49 confirmed that Start preview establishes a guest account. The account panel states that preview access is not time-limited and only new inserts are blocked. Sending an upgrade request for the authorized test mailbox returned the existing-account case and displayed the sign-in fallback. No confirmation email was sent in that case. This verifies the browser fallback, not email delivery or a successful upgrade.

The existing-account path now has its own form with an Existing password field using current-password autocomplete. It submits on Enter or its explicit sign-in button, and does not reuse the new-password upgrade field. Detecting an existing email opens this form. Switching between the forms and successful authentication clear the password held in component state. A browser session still reporting Guest preview is not counted as successful permanent-account sign-in.

Production verification after PR #52 confirmed a permanent-account sign-in completed by the user in the visible Codex browser. Save to cloud succeeded for the user's existing 14-sheet project. Read-only inspection in adigunelectrocad.projects confirmed a newly created row with 14 sheets and revision 52 during that browser operation. Load cloud project succeeded, and both the authenticated session and cloud-load command worked after a page refresh. The user's saved cloud project was restored after separate arithmetic testing and saved locally again. A subsequent cloud save updated that same row: its creation timestamp, revision and sheet count stayed unchanged while its update timestamp advanced.

These checks prove the listed anonymous ownership cases and permanent-account cloud creation/load in the checked browser. Email delivery/confirmation, successful anonymous upgrade/password completion, and browser switching between two permanent accounts remain pending. The [Supabase anonymous sign-in guide](https://supabase.com/docs/guides/auth/auth-anonymous) documents the authenticated role and is_anonymous claim used by these policies.
