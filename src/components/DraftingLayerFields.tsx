import { useState } from "react";
import { draftingLineTypes } from "../cad/draftingLayers";
import type { DraftingEntity, DraftingLayer, DraftingLineType, DraftingStyle } from "../types/electrical";

export function DraftingLayerFields({ entity, layers, onChange, onCreateLayer, onLayerChange }: {
  entity: DraftingEntity;
  layers: DraftingLayer[];
  onChange: (patch: Partial<DraftingEntity>) => boolean;
  onCreateLayer: (name: string) => boolean;
  onLayerChange: (id: string, patch: DraftingStyle) => boolean;
}) {
  const [name, setName] = useState("");
  const layer = layers.find((item) => item.id === entity.layerId);
  return <fieldset className="properties-form graphic-geometry">
    <legend>Layer and stroke</legend>
    <label>Drafting layer<select value={entity.layerId ?? ""} onChange={(event) => onChange({ layerId: event.target.value || undefined })}>
      <option value="">Unassigned</option>
      {layers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <label>New layer name<input value={name} maxLength={64} onChange={(event) => setName(event.target.value)} /></label>
    <button type="button" disabled={!name.trim()} onClick={() => { if (onCreateLayer(name)) setName(""); }}>Create and assign layer</button>
    {layer && <fieldset className="graphic-geometry" key={layer.id}>
      <legend>{layer.name} defaults</legend>
      <label>Layer color<input type="color" value={layer.draftingColor ?? "#68788b"} onInput={(event) => onLayerChange(layer.id, { draftingColor: event.currentTarget.value })} /></label>
      {layer.draftingColor && <button type="button" onClick={() => onLayerChange(layer.id, { draftingColor: undefined })}>Reset layer color</button>}
      <StrokeFields prefix="Layer" style={layer} onChange={(patch) => onLayerChange(layer.id, patch)} />
    </fieldset>}
    <StrokeFields prefix="Entity" style={entity} onChange={onChange} />
  </fieldset>;
}

function StrokeFields({ prefix, style, onChange }: { prefix: "Layer" | "Entity"; style: DraftingStyle; onChange: (patch: DraftingStyle) => boolean }) {
  return <>
    <label>{prefix} lineweight<input key={style.lineWeight ?? ""} type="number" min=".5" max="12" step="any" placeholder="Inherit" defaultValue={style.lineWeight ?? ""} onBlur={(event) => {
      const input = event.currentTarget;
      if (!input.validity.valid || !onChange({ lineWeight: input.value === "" ? undefined : Number(input.value) })) input.value = String(style.lineWeight ?? "");
    }} /></label>
    <label>{prefix} line type<select value={style.lineType ?? ""} onChange={(event) => onChange({ lineType: (event.target.value || undefined) as DraftingLineType | undefined })}>
      <option value="">Inherit</option>
      {draftingLineTypes.map((type) => <option key={type} value={type}>{type}</option>)}
    </select></label>
  </>;
}
