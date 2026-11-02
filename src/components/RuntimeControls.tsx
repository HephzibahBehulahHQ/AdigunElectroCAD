import type { ComponentInstance, ElectricalComponentDefinition } from "../types/electrical";

export function RuntimeControls({ component, definition, runtime, onChange, onLevelChange }: {
  component: ComponentInstance;
  definition: ElectricalComponentDefinition;
  runtime?: ComponentInstance;
  onChange: (property: string, value: boolean) => void;
  onLevelChange: (value: number) => void;
}) {
  const configured = { ...definition.propertiesSchema, ...component.properties };
  const active = { ...configured, ...runtime?.properties };
  const booleans = Object.entries(configured).filter(([property, value]) => typeof value === "boolean" && !property.startsWith("runtime") && property !== "scanOutput");
  const levelSensor = definition.simulationModelId === "sensor-level-4-20";
  if (!booleans.length && !levelSensor) return null;
  return <section className="component-parameters" aria-label="Live simulation controls">
    <strong>Operate {component.reference}</strong>
    <p>Live inputs retain scan memory. Wired commands take priority. These changes are not saved; Stop restores the design.</p>
    {levelSensor && <label>Live Level Percent ({Number(active.levelPercent)}%)<input type="range" min="0" max="100" step="1" value={Number(active.levelPercent)} onChange={(event) => onLevelChange(Number(event.target.value))} /></label>}
    {booleans.map(([property]) => <label className="property-checkbox" key={property}>
      Live {property.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}
      <input type="checkbox" checked={active[property] === true} onChange={(event) => onChange(property, event.target.checked)} />
    </label>)}
  </section>;
}
