export type DrawingUnits = "du" | "mm";

export interface DrawingGrid {
  units?: DrawingUnits;
  displaySpacing: number;
  snapSpacing: number;
  snapEnabled: boolean;
}

export const defaultDrawingGrid: DrawingGrid = { displaySpacing: 20, snapSpacing: 20, snapEnabled: true };

export function validDrawingGrid(grid: DrawingGrid): boolean {
  return [grid.displaySpacing, grid.snapSpacing].every(value => Number.isFinite(value) && value >= .1 && value <= 10000)
    && typeof grid.snapEnabled === "boolean"
    && (grid.units === undefined || grid.units === "du" || grid.units === "mm");
}

export function snapDrawingCoordinate(value: number, spacing: number | null = 20): number {
  return spacing === null ? Math.round(value * 100) / 100 : Number((Math.round(value / spacing) * spacing).toFixed(8));
}

export function visibleGridSpacing(spacing: number, zoom: number): number {
  const exponent = Math.max(0, Math.ceil(Math.log2(12 / (spacing * zoom))));
  return spacing * 2 ** exponent;
}
