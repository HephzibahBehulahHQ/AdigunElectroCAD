# CAD interaction

Free-sheet components can be selected individually, added/toggled with Shift+Click, or selected by dragging a box across empty canvas. Box selection uses component and upright-label footprints in either drag direction; Shift-drag adds to the current group, and clicking blank canvas clears selection. Dragging a selected component moves the whole selected group together on the 20-unit grid. The group drop is rejected atomically if any symbol or upright label leaves the drawing area or overlaps a stationary component. Connected wires reroute after an accepted drop while terminal endpoints and wire topology remain unchanged. Arrow controls move the selected group with one undoable edit.

Arrow movement and rotation use the same sheet-boundary and label-clearance rules. A rotation near the lower edge may be rejected because its taller body and upright labels would leave the sheet; move the component upward first.

Dragging is disabled in Wiring mode and for the fixed DOL reference sheet. During a drag, the component previews its snapped position; wires retain their previous drawing paths until the drop is accepted. Design edits reset runtime simulation state.

Zoom changes display scale from 25% to 200% without changing drawing coordinates. Fit sizes the sheet to its viewport. Menu and toolbar Grid controls share one visibility state. Scroll within the schematic viewport to inspect enlarged drawings.

In Wiring mode, select a source terminal and then compatible targets. Shift-clicking a target keeps the source active so users can add more terminal branches. To branch from a wire on a free sheet, click near its visible route and then choose a compatible terminal. Shift-click targets to add more branches at that attachment. The saved branch records its parent wire, source endpoint, and relative route position, so moving the parent endpoints moves the displayed tap. The tap is a drawing attachment; the electrical model still connects the new wire to the selected parent endpoint rather than creating a separate junction node. Removing the parent wire also removes its dependent branches.

This does not yet provide snapping to arbitrary wire segments, live wire rerouting during drag, or a full orthogonal routing editor.
