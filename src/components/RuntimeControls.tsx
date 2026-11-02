import type { ComponentInstance, ElectricalComponentDefinition } from "../types/electrical";

export function RuntimeControls({ component, definition, runtime, onChange }: {
  component: ComponentInstance;
  definition: ElectricalComponentDefinition;
  runtime?: ComponentInstance;
  onChange: (property: string, value: boolean) => void;
}) {
  const configured = { ...definition.propertiesSchema, ...component.properties };
  const active = { ...configured, ...runtime?.properties };
  const booleans = Object.entries(configured).filter(([property, value]) => typeof value === "boolean" && !property.startsWith("runtime") && property !== "scanOutput");
  if (!booleans.length) return null;
  return <section className="component-parameters" aria-label="Live simulation controls">
    <strong>Operate {component.reference}</strong>
    <p>Live Boolean parameters retain scan memory. Wired commands take priority. These changes are not saved; Stop restores the design.</p>
    {booleans.map(([property]) => <label className="property-checkbox" key={property}>
      Live {property.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}
      <input type="checkbox" checked={active[property] === true} onChange={(event) => onChange(property, event.target.checked)} />
    </label>)}
  </section>;
}
