-- Require the product-specific password and email OTP before accessing cloud records.
create policy projects_verified_electrocad_session on adigunelectrocad.projects
as restrictive for all to authenticated
using ((select adigunelectrocad_private.has_verified_session()))
with check ((select adigunelectrocad_private.has_verified_session()));

create policy preferences_verified_electrocad_session on adigunelectrocad.user_preferences
as restrictive for all to authenticated
using ((select adigunelectrocad_private.has_verified_session()))
with check ((select adigunelectrocad_private.has_verified_session()));

create policy bot_layout_verified_electrocad_session on adigunelectrocad.my_data
as restrictive for all to authenticated
using ((select adigunelectrocad_private.has_verified_session()))
with check ((select adigunelectrocad_private.has_verified_session()));
