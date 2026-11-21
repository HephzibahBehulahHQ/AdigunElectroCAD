import { drawingRulerTicks } from "../cad/drawingCamera";

export function DrawingRulers({ bounds, zoom }: {
  bounds: { x: number; y: number; width: number; height: number };
  zoom: number;
}) {
  const axes = [
    { id: "x", start: bounds.x, span: bounds.width, style: "left" },
    { id: "y", start: bounds.y, span: bounds.height, style: "top" },
  ] as const;
  return <div className="drawing-rulers" aria-hidden="true" data-export-exclude="">
    {axes.map(({ id, start, span, style }) => <div className={`drawing-ruler drawing-ruler-${id}`} key={id}>
      {drawingRulerTicks(start, span, zoom).map(value => <span key={value} style={{ [style]: `${(value - start) / span * 100}%` }}>{value}</span>)}
    </div>)}
    <span className="drawing-ruler-units" title="Drawing units">du</span>
  </div>;
}
