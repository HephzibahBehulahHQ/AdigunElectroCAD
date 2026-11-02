# Project JSON validation

Imports validate project/sheet structure, limits, catalog definitions, component references, finite coordinates, rotations, property types and terminal topology. Known simulated signal-unit mismatches are rejected. Sheet IDs must be unique after whitespace normalization so selection and edits identify one sheet.

Reference-DOL sheets must use the supported reference drawing document ID; free sheets cannot claim that ID. This prevents the editor from showing a fixed reference drawing while treating the same sheet as a free-form runtime circuit. Valid projects containing reference and free sheets continue to round-trip.

This does not establish complete physical-design validity. Imported geometry is not automatically rearranged, and a full imported-layout overlap audit remains unfinished. Movement/rotation enforce the editor's sheet bounds and label-clearance rules.
