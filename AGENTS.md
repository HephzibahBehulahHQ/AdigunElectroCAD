# AdigunElectroCAD Project Rules

The user's global Codex operating directive remains active. These project rules add ElectroCAD-specific constraints and do not replace the global directive.

## Locked interface

- Preserve the approved editor, canvas, header, menu, toolbar, dock, footer, dimensions, spacing, colors, and interactions.
- Do not redesign, reposition, resize, or restyle the interface during engineering work. Change the interface only when the user explicitly requests that specific change.
- Add engineering capability inside the existing editor and canvas without turning the canvas into a demo or placeholder.

## Active engineering goal

- Build real, editable electrical components and example projects that can span 10–50 sheets.
- Component definitions must use traceable identities, source-backed ratings where available, correct poles, and real, individually connectable terminal IDs. Do not invent manufacturer specifications or supply dummy components.
- Project-wide nets, cable cores, labels, colors, and cross-sheet continuations must retain stable identities. Show reciprocal source/destination sheet and grid references at page boundaries, and preserve the original source reference through later sheets. Standalone circuits need no artificial continuation markers.
- Editing, drawing, wiring, right-click actions, arrange, and auto-connect features must operate on actual project objects. Auto-connect only from an explicit circuit/template mapping or user-selected terminals; never silently guess an electrical connection.
- Keep laboratory models distinct from the active CAD project unless an explicit copy/import action transfers an actual circuit into an editable project sheet. Label educational simulation limits honestly.

## Delivery

- Work in small, reviewable slices. Run relevant checks, open a small PR, merge it when verification passes, and deploy as progress is made; do not accumulate a large unmerged PR.
- Verify the exact merged commit's production deployment before reporting it as deployed. Keep the user informed of completed changes, verification, blockers, and the next slice.
