export const INDICATOR_COLOR_SWATCHES = ["#c62828", "#f9a825", "#2e7d32", "#1565c0", "#7b1fa2", "#ffffff", "#000000"] as const;

export function IndicatorColorPalette({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return <div className="annotation-palette indicator-color-palette" aria-label="Indicator color palette">
    {INDICATOR_COLOR_SWATCHES.map((color) => <button key={color} type="button" aria-label={`Set indicator color ${color}`} title={color} aria-pressed={value.toLowerCase() === color} style={{ backgroundColor: color }} onClick={() => onChange(color)} />)}
  </div>;
}
