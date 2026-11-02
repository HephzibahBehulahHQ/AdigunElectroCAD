# Cloud project selection

The selected cloud project ID is stored per authenticated user. Switching accounts cannot reuse another account's selected ID. The old unscoped storage entry is ignored because its owner is unknown; load a cloud project to select it again.

Cloud save/load responses are checked against the current authenticated user before updating the editor or selected ID. A response from a previous account is ignored locally. This does not cancel a write already accepted by the server. Database ownership remains enforced by RLS.

Storage failures leave the current selection in memory. Tests cover two independent accounts, stale selection rejection, legacy-key isolation and unavailable storage. Browser account-switch and permanent-account save/reload verification remain pending.

