export type DrawingPoint = { x: number; y: number };
export type DrawingViewport = { width: number; height: number };
export type DrawingCamera = { center: DrawingPoint; zoom: number };

export function cameraBounds(camera: DrawingCamera, viewport: DrawingViewport) {
  const width = viewport.width / camera.zoom;
  const height = viewport.height / camera.zoom;
  return { x: camera.center.x - width / 2, y: camera.center.y - height / 2, width, height };
}

export function viewportToDrawing(camera: DrawingCamera, viewport: DrawingViewport, point: DrawingPoint): DrawingPoint {
  const bounds = cameraBounds(camera, viewport);
  return { x: bounds.x + point.x / camera.zoom, y: bounds.y + point.y / camera.zoom };
}

export function zoomDrawingAt(camera: DrawingCamera, viewport: DrawingViewport, pointer: DrawingPoint, zoom: number): DrawingCamera {
  const world = viewportToDrawing(camera, viewport, pointer);
  return {
    zoom,
    center: { x: world.x - (pointer.x - viewport.width / 2) / zoom, y: world.y - (pointer.y - viewport.height / 2) / zoom },
  };
}

export function drawingRulerTicks(start: number, span: number, zoom: number): number[] {
  const minimumStep = 72 / zoom;
  const decade = 10 ** Math.floor(Math.log10(minimumStep));
  const step = [1, 2, 5, 10].map(factor => factor * decade).find(value => value >= minimumStep)!;
  const first = Math.ceil(start / step);
  const last = Math.floor((start + span) / step);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, offset) => (first + offset) * step);
}
