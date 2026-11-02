# CAD interaction

Free-sheet components can be selected and dragged with the pointer. Drop positions snap to the 20-unit grid. A drop is rejected if the symbol or its upright labels leave the drawing area or overlap another component's reserved space. Connected wires reroute after an accepted drop; their terminal endpoints remain unchanged. Each accepted move creates one undo entry. The arrow controls remain available for keyboard-accessible movement.

Dragging is disabled in Wiring mode and for the fixed DOL reference sheet. During a drag, the component previews its snapped position; wires retain their previous drawing paths until the drop is accepted. Design edits reset runtime simulation state.

Zoom changes display scale from 25% to 200% without changing drawing coordinates. Fit sizes the sheet to its viewport. Menu and toolbar Grid controls share one visibility state. Scroll within the schematic viewport to inspect enlarged drawings.

This does not yet provide multi-selection, drag selection, snapping to arbitrary wire segments, live wire rerouting during drag, or a full orthogonal routing editor.
