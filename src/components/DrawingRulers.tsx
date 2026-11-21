import { drawingRulerTicks } from "../cad/drawingCamera";
import { useState, type PointerEvent } from "react";

export function DrawingRulers({ bounds, zoom, onAddGuide }: {
  bounds: { x: number; y: number; width: number; height: number };
  zoom: number;
  onAddGuide?: (axis: "x" | "y", coordinate: number) => void;
}) {
  const [preview, setPreview] = useState<{ axis: "x" | "y"; offset: number } | null>(null);
  const pointerOffset = (event: PointerEvent<HTMLDivElement>, axis: "x" | "y") => {
    const rect = event.currentTarget.parentElement!.getBoundingClientRect();
    return axis === "x" ? (event.clientX - rect.left) / rect.width : (event.clientY - rect.top) / rect.height;
  };
  const axes = [
    { id: "x", start: bounds.x, span: bounds.width, style: "left" },
    { id: "y", start: bounds.y, span: bounds.height, style: "top" },
  ] as const;
  return <div className="drawing-rulers" aria-hidden="true" data-export-exclude="">
    {axes.map(({ id, start, span, style }) => <div className={`drawing-ruler drawing-ruler-${id}`} key={id} onPointerDown={event => {
      if (!onAddGuide || event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const axis = id === "x" ? "y" : "x";
      setPreview({ axis, offset: pointerOffset(event, axis) });
    }} onPointerMove={event => {
      if (!preview || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
      setPreview({ axis: preview.axis, offset: pointerOffset(event, preview.axis) });
    }} onPointerUp={event => {
      if (!preview || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const offset = pointerOffset(event, preview.axis);
      const min = preview.axis === "x" ? bounds.x : bounds.y;
      const length = preview.axis === "x" ? bounds.width : bounds.height;
      const rulerEdge = (preview.axis === "x" ? 55 : 21) / (length * zoom);
      if (offset > rulerEdge && offset < 1) onAddGuide?.(preview.axis, Math.round((min + offset * length) * 100) / 100);
      setPreview(null);
    }} onLostPointerCapture={() => setPreview(null)}>
      {drawingRulerTicks(start, span, zoom).map(value => <span key={value} style={{ [style]: `${(value - start) / span * 100}%` }}>{value}</span>)}
    </div>)}
    <span className="drawing-ruler-units" title="Drawing units">du</span>
    {preview && <i className={`drawing-guide-preview drawing-guide-preview-${preview.axis}`} style={{ [preview.axis === "x" ? "left" : "top"]: `${preview.offset * 100}%` }} />}
  </div>;
}
