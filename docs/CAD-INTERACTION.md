# CAD interaction

## Existing commands and document effects

| Surface | Command and effect |
| --- | --- |
| File | Restore or import replaces the project through the edit history. Local and cloud save/load use project JSON. JSON, SVG and PNG export and Print read the current project or drawing. |
| Edit and toolbar Undo/Redo | Restore a previous or subsequent project snapshot. |
| View and toolbar Zoom, Fit, Grid | Change canvas scale, framing or grid visibility. Entity coordinates stay in sheet units. |
| Insert menu and toolbar Insert | Place the selected catalog definition as a real component instance with collision checks and stable terminal IDs. |
| Electrical and toolbar Wiring | Validate topology, create or extend a continuation, or connect selected compatible terminals. |
| Draw toolbar | Place text and geometric primitives in the sheet document. |
| Simulation menu and toolbar | Run, Pause and Stop the runtime. Design and runtime state have separate lifecycles. |
| Reports, Help, Projects and Laboratory | Generate reports from the current document, open documentation, load an editable template, or open the independent lab. |
| Canvas, sheet tabs, and Properties | Select entities, move components and terminal routes, edit sheet and entity data, and invoke the existing geometry and stacking commands. |

On free sheets, select one or more components and use **Drafting order** in Properties. These commands save a `zIndex` per component and preserve the selected group’s relative order. Symbols and wire hit targets render in that order. Old projects without a stacking index keep their component array order, and new unranked components render above ranked components. A stack edit is one Undo step and leaves terminal IDs, wire links, collision rules, and simulation traversal order intact. This operates within the existing component layer.

Free-sheet components can be selected individually, added/toggled with Shift+Click, or selected by dragging a box across empty canvas. Box selection uses component and upright-label footprints in either drag direction; Shift-drag adds to the current group, and clicking blank canvas clears selection. Dragging a selected component moves the whole selected group together on the 20-unit grid. During the drag preview, connected wires and dependent branch taps follow the group. The group drop is rejected atomically if any symbol or upright label leaves the drawing area or overlaps a stationary component; rejected or cancelled moves restore the original drawing. Accepted drops preserve terminal endpoints and wire topology. Arrow controls move the selected group with one undoable edit.

Arrow movement and rotation use the same sheet-boundary and label-clearance rules. A rotation near the lower edge may be rejected because its taller body and upright labels would leave the sheet; move the component upward first.

Select one component on a free sheet to show its resize and rotation handles. Drag the lower-right handle to scale the symbol uniformly around its center in 5% steps, from 50% to 200%. Drag the upper handle to snap rotation to a right angle, or click it to turn 90° clockwise. With either handle focused, arrow keys step the transform. Properties offers the existing size field and Rotate 90° button, plus an exact rotation selector. During an accepted preview, terminal markers, labels, and connected routes follow the transformed symbol. Releasing the pointer commits one undoable edit if the proposed transform clears the sheet edges and neighboring symbols.

Dragging is disabled in Wiring mode and for the fixed DOL reference sheet. During a drag, the component previews its snapped position; wires retain their previous drawing paths until the drop is accepted. Design edits reset runtime simulation state.

Zoom changes display scale from 25% to 200% without changing drawing coordinates. Fit sizes the sheet to its viewport. Menu and toolbar Grid controls share one visibility state. Scroll within the schematic viewport to inspect enlarged drawings.

In Wiring mode, select a source terminal and then compatible targets. Shift-clicking a target keeps the source active so users can add more terminal branches. To branch from a wire on a free sheet, click near its visible route and then choose a compatible terminal. Shift-click targets to add more branches at that attachment. The saved branch records its parent wire, source endpoint, and relative route position, so moving the parent endpoints moves the displayed tap. The tap is a drawing attachment; the electrical model still connects the new wire to the selected parent endpoint rather than creating a separate junction node. Removing the parent wire also removes its dependent branches.

This does not yet provide snapping to arbitrary wire segments, live wire rerouting during drag, or a full orthogonal routing editor.

For a selected editable wire on a free sheet, use Edit route points in Properties and Add route point. While route editing is active, click a visible wire segment to insert a waypoint at the nearest position; its coordinate along the wire axis snaps to the 20-unit grid, and it appears as a draggable handle. Drag a handle or focus it and use arrow keys to reshape the orthogonal path; hold Shift with an arrow key to move by 100 units. Right-click a handle or focus it and press Delete to remove the point. Reset to automatic route clears saved route points. Branch wires follow their parent route; edit the parent to reposition its attached branches.

For selected line, rectangle, or ellipse drafting geometry, edit X1, Y1, X2, and Y2 numerically in Properties for exact placement and sizing. Coordinates stay within the 1100 × 780 sheet and the shape must span at least 4 units. Polyline and polygon geometry remains editable by its vertex handles.
Use Freehand to sketch an unfilled path by dragging on a free sheet. The path is stored as editable polyline geometry, so users can rename it, choose its color and stroke width, and move or edit individual vertices later. Freehand drawings are visual drafting marks and do not create electrical connections.
On a selected graphic, choose Make component symbol to turn that one drafted shape into a generic, named user symbol. The shape is centered and fitted inside its symbol body; the original is removed only when placement succeeds. Properties lets users change its name, color, terminal labels, kinds, directions, and added terminal anchor positions. Duplicate the component to reuse the authored shape. The symbol is a drawing and connectable terminal set only; it does not imply a voltage or simulated behavior.
Shift-click additional drafted graphics to select a composition, then choose Make symbol from N graphics in Properties. The shapes are centered and fitted together while preserving each shape’s color, fill, and stroke; the active graphic stays individually editable until conversion.
On a custom pilot indicator, set the rated voltage and AC/DC mode in Properties, then wire its control terminals T1 and T2. For DC, connect positive to T1 and return to T2. The lamp lights only with a complete matching supply path. A rating of zero leaves an older indicator unrated until configured. Alternate terminal labels keep the original physical identities. Extra terminals remain available for drafting and wiring and do not drive the lamp. The model uses ideal continuity and voltage matching, with no modeled current draw or inrush.
For added terminals on the generic user symbol, edit the local X/Y anchor offsets in Properties. Offsets are bounded to -60..60 units, follow component scale and rotation, and move the wire connection point and terminal label together. Built-in T1/T2 pin endpoints stay aligned with the indicator glyph.

