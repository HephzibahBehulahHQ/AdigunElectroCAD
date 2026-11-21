import { defaultDrawingGrid, type DrawingGrid } from "../cad/drawingGrid";

export function DrawingGridEditor({ grid = defaultDrawingGrid, onSave }: { grid?: DrawingGrid; onSave: (grid: DrawingGrid) => void }) {
  return <form className="properties-form" aria-label="Drawing grid settings" key={JSON.stringify(grid)} onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({ displaySpacing: Number(data.get("display")), snapSpacing: Number(data.get("snap")), snapEnabled: data.has("enabled") });
  }}>
    <strong>Grid settings</strong>
    <label>Display spacing (du)<input name="display" type="number" min="0.1" max="10000" step="any" defaultValue={grid.displaySpacing} required /></label>
    <label>Snap spacing (du)<input name="snap" type="number" min="0.1" max="10000" step="any" defaultValue={grid.snapSpacing} required /></label>
    <label className="property-checkbox">Enable grid snap<input name="enabled" type="checkbox" defaultChecked={grid.snapEnabled} /></label>
    <button type="submit">Apply grid settings</button>
  </form>;
}
