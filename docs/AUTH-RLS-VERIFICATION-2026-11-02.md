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

This proves the listed anonymous-session and ownership cases, not permanent-account INSERT, email delivery/confirmation, anonymous upgrade/password completion, or browser cloud save/reload. Those remain pending. The [Supabase anonymous sign-in guide](https://supabase.com/docs/guides/auth/auth-anonymous) documents the authenticated role and is_anonymous claim used by these policies.
