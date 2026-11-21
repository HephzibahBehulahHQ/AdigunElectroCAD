import type { DrawingGuide } from "../types/electrical";

export function DrawingGuideEditor({ guides, onAdd, onChange, onRemove }: {
  guides: readonly DrawingGuide[];
  onAdd: (axis: DrawingGuide["axis"], coordinate: number) => void;
  onChange: (id: string, patch: Partial<Pick<DrawingGuide, "coordinate" | "locked" | "hidden">>) => void;
  onRemove: (id: string) => void;
}) {
  return <section className="properties-form" aria-label="Drawing guides">
    <strong>Drawing guides</strong>
    <form onSubmit={event => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const coordinate = String(values.get("coordinate") ?? "").trim();
      if (coordinate) onAdd(values.get("axis") === "y" ? "y" : "x", Number(coordinate));
    }}>
      <label>Guide direction<select name="axis"><option value="x">Vertical (X)</option><option value="y">Horizontal (Y)</option></select></label>
      <label>Guide position (du)<input name="coordinate" type="number" step="any" required /></label>
      <button type="submit">Add guide</button>
    </form>
    {guides.map((guide, index) => <fieldset key={guide.id}>
      <legend>{guide.axis.toUpperCase()} guide {index + 1}</legend>
      <label>Position (du)<input key={guide.coordinate} type="number" step="any" defaultValue={guide.coordinate} disabled={guide.locked} onBlur={event => {
        const raw = event.currentTarget.value.trim();
        if (!raw || !Number.isFinite(Number(raw))) event.currentTarget.value = String(guide.coordinate);
        else onChange(guide.id, { coordinate: Number(raw) });
      }} /></label>
      <label className="property-checkbox">Lock<input type="checkbox" checked={guide.locked} onChange={event => onChange(guide.id, { locked: event.currentTarget.checked })} /></label>
      <label className="property-checkbox">Hide<input type="checkbox" checked={guide.hidden} onChange={event => onChange(guide.id, { hidden: event.currentTarget.checked })} /></label>
      <button type="button" aria-label={`Remove guide ${index + 1}`} disabled={guide.locked} onClick={() => onRemove(guide.id)}>Remove guide</button>
    </fieldset>)}
  </section>;
}
