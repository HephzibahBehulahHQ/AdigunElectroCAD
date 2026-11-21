import { useRef, type PointerEvent } from "react";
import { componentFootprint } from "../cad/componentGeometry";
import type { ComponentTransform } from "../cad/documentOps";
import type { ComponentInstance } from "../types/electrical";

type HandleKind = ComponentTransform["kind"];
type Point = { x: number; y: number };

export function stepComponentRotation(rotation: number, steps: number): ComponentInstance["rotation"] {
  return (((rotation + steps * 90) % 360 + 360) % 360) as ComponentInstance["rotation"];
}

export function transformFromHandle(kind: HandleKind, component: ComponentInstance, start: Point, end: Point): ComponentTransform {
  const dx = start.x - component.x;
  const dy = start.y - component.y;
  const x = end.x - component.x;
  const y = end.y - component.y;
  if (kind === "rotate") {
    const angle = Math.atan2(dx * y - dy * x, dx * x + dy * y);
    return { kind, rotation: stepComponentRotation(component.rotation, Math.round(angle / (Math.PI / 2))) };
  }
  const initialDistance = Math.hypot(dx, dy);
  const scale = initialDistance ? Math.hypot(x, y) / initialDistance : 1;
  const percent = Math.round((component.size ?? 1) * scale * 20) * 5;
  return { kind, size: Math.max(50, Math.min(200, percent)) / 100 };
}

export function ComponentTransformHandles({ component, onPreview, onCommit }: { component: ComponentInstance; onPreview: (transform: ComponentTransform | null) => void; onCommit: (transform: ComponentTransform) => void }) {
  const gesture = useRef<{ pointerId: number; kind: HandleKind; start: Point; component: ComponentInstance } | null>(null);
  const bounds = componentFootprint(component.x, component.y, component.rotation, component.definitionId, component.size);
  const svgPoint = (event: PointerEvent<SVGCircleElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };
  const reset = () => { gesture.current = null; onPreview(null); };
  const handle = (kind: HandleKind, x: number, y: number) => <circle
    cx={x} cy={y} r={7} fill="#fff" stroke="#e0a526" strokeWidth="2"
    role="button" tabIndex={0} aria-label={`${kind === "resize" ? "Resize" : "Rotate"} ${component.reference}`}
    style={{ cursor: kind === "resize" ? "nwse-resize" : "grab", touchAction: "none" }}
    onClick={(event) => event.stopPropagation()}
    onPointerDown={(event) => {
      if (event.button !== 0 || gesture.current) return;
      const start = svgPoint(event);
      if (!start) return;
      event.stopPropagation();
      gesture.current = { pointerId: event.pointerId, kind, start, component };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      const active = gesture.current;
      if (active?.pointerId !== event.pointerId) return;
      const point = svgPoint(event);
      if (point) onPreview(transformFromHandle(active.kind, active.component, active.start, point));
    }}
    onPointerUp={(event) => {
      const active = gesture.current;
      if (active?.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const point = svgPoint(event);
      reset();
      if (!point) return;
      const moved = Math.hypot(point.x - active.start.x, point.y - active.start.y) > 4;
      if (moved) onCommit(transformFromHandle(active.kind, active.component, active.start, point));
      else if (active.kind === "rotate") onCommit({ kind: "rotate", rotation: stepComponentRotation(active.component.rotation, 1) });
    }}
    onPointerCancel={reset}
    onLostPointerCapture={() => { if (gesture.current) reset(); }}
    onKeyDown={(event) => {
      const step = ["ArrowLeft", "ArrowDown", "-"].includes(event.key) ? -1 : ["ArrowRight", "ArrowUp", "+", "="].includes(event.key) ? 1 : 0;
      const activate = kind === "rotate" && (event.key === "Enter" || event.key === " ");
      if (!step && !activate) return;
      event.preventDefault();
      event.stopPropagation();
      if (kind === "rotate") onCommit({ kind, rotation: stepComponentRotation(component.rotation, step || 1) });
      else onCommit({ kind, size: Math.max(.5, Math.min(2, Math.round((component.size ?? 1) * 100 + step * 5) / 100)) });
    }}
  />;

  return <g data-export-exclude="" aria-label={`Transform ${component.reference}`}>
    <path d={`M ${component.x} ${bounds.top} v -14`} stroke="#e0a526" pointerEvents="none" />
    {handle("rotate", component.x, bounds.top - 14)}
    {handle("resize", bounds.right, bounds.bottom)}
  </g>;
}
