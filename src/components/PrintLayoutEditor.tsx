import { defaultPrintLayout, paperFormats, type PrintLayout } from "../cad/printLayout";

export function PrintLayoutEditor({ layout, millimetres = false, onSave, onRemove }: {
  millimetres?: boolean;
  layout?: PrintLayout;
  onSave: (layout: PrintLayout) => void;
  onRemove: () => void;
}) {
  const saved = layout ?? (millimetres ? { ...defaultPrintLayout, unitsPerMm: 1 } : defaultPrintLayout);
  return <section className="properties-form" aria-label="Print layout">
    <strong>Print layout</strong>
    <form className="properties-form" key={JSON.stringify(saved)} onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const number = (key: string) => Number(data.get(key));
      onSave({
        format: data.get("format") as PrintLayout["format"], orientation: data.get("orientation") as PrintLayout["orientation"],
        customWidthMm: number("customWidthMm"), customHeightMm: number("customHeightMm"), marginMm: number("marginMm"),
        unitsPerMm: number("unitsPerMm"), x: number("x"), y: number("y"), visible: data.get("visible") === "on", title: String(data.get("title") ?? "").trim(),
      });
    }}>
      <label>Paper format<select name="format" defaultValue={saved.format}>{Object.keys(paperFormats).map(format => <option key={format}>{format}</option>)}<option value="custom">Custom</option></select></label>
      <label>Orientation<select name="orientation" defaultValue={saved.orientation}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
      {([
        ["customWidthMm", "Custom width (mm)"], ["customHeightMm", "Custom height (mm)"], ["marginMm", "Margin (mm)"],
        ["unitsPerMm", millimetres ? "Drawing mm per printed mm" : "Drawing units per printed mm"],
        ["x", "Frame origin X (" + (millimetres ? "mm" : "du") + ")"], ["y", "Frame origin Y (" + (millimetres ? "mm" : "du") + ")"],
      ] as const).map(([key, label]) => <label key={key}>{label}<input required name={key} type="number" step="any" defaultValue={saved[key]} /></label>)}
      <label>Title block text<input name="title" maxLength={80} defaultValue={saved.title} /></label>
      <label className="property-checkbox">Show frame on canvas<input name="visible" type="checkbox" defaultChecked={saved.visible} /></label>
      <button type="submit">Apply print layout</button>
    </form>
    {layout && <button type="button" onClick={onRemove}>Remove print layout</button>}
  </section>;
}
