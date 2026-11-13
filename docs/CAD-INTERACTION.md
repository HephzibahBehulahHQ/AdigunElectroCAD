# CAD interaction

Free-sheet components can be selected individually or added/toggled with Shift+Click. Dragging a selected component moves the whole selected group together on the 20-unit grid. The group drop is rejected atomically if any symbol or upright label leaves the drawing area or overlaps a stationary component. Connected wires reroute after an accepted drop while terminal endpoints and wire topology remain unchanged. Arrow controls move the selected group with one undoable edit.

Arrow movement and rotation use the same sheet-boundary and label-clearance rules. A rotation near the lower edge may be rejected because its taller body and upright labels would leave the sheet; move the component upward first.

Dragging is disabled in Wiring mode and for the fixed DOL reference sheet. During a drag, the component previews its snapped position; wires retain their previous drawing paths until the drop is accepted. Design edits reset runtime simulation state.

Zoom changes display scale from 25% to 200% without changing drawing coordinates. Fit sizes the sheet to its viewport. Menu and toolbar Grid controls share one visibility state. Scroll within the schematic viewport to inspect enlarged drawings.

This does not yet provide a drag-selection rectangle, snapping to arbitrary wire segments, live wire rerouting during drag, or a full orthogonal routing editor.
