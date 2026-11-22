# Project JSON validation

New exports and saved project documents use `schemaVersion: 1`. Unversioned project files and saves load through the same validation and use version 1 when saved again. An unknown schema version is rejected before the editor replaces the open project. The existing `revision` field tracks edits independently.

Imports validate project/sheet structure, limits, catalog definitions, component references, finite coordinates, rotations, property types and terminal topology. Known simulated signal-unit mismatches are rejected. Sheet IDs must be unique after whitespace normalization so selection and edits identify one sheet.

Reference-DOL sheets must use the supported reference drawing document ID; free sheets cannot claim that ID. This prevents the editor from showing a fixed reference drawing while treating the same sheet as a free-form runtime circuit. Valid projects containing reference and free sheets continue to round-trip.

Sheet creation skips IDs already present in the project, including imported numbering gaps or renamed reference IDs. Both creation and import share a 100-sheet limit. New-sheet, reference-template loading and laboratory-copy actions stop at that limit with a message rather than modifying the last existing sheet or creating an unreloadable project.

This does not establish complete physical-design validity. Imports preserve geometry. Overlapping component clearances generate an import notice and sheet-scoped report warnings. The warnings use the same clearances as component placement and identify at least one conflict for each affected component added to the report. Movement/rotation enforce the editor's sheet bounds and label-clearance rules.

Production browser verification on release `c3ba26c` edited the M1 feeder breaker instance name and exported the ten-sheet workbook with all 36 continuations. Importing it while simulation and Wiring were active stopped the simulation, cleared Wiring, and reopened the supply sheet. Sheet 2 retained the edited instance name and the L1 continuation from S1 · G17 to S2 · S10. Undo removed the temporary project edits.

Select a user-drawn symbol or custom indicator and choose **File → Export custom component**. On a free sheet, **File → Import custom component** places it in open drawing space under a fresh reference. The file carries the symbol, terminal definitions and labels, rotation, size, and properties. Wires, placement coordinates, and the source sheet layer stay with the project. The imported component can be edited and wired like any other placed instance.
