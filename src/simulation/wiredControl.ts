import type { CircuitDocument, ElectricalComponentDefinition } from "../types/electrical";

export interface WiredCoilState { energized: boolean; voltageV: number; error?: string; }

/** Ideal isolated AC control supplies and dry contacts; no impedance or pickup curve. */
export function evaluateWiredControl(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): Map<string, WiredCoilState> {
  const model = (id: string) => catalog.get(document.components.find(c => c.id === id)?.definitionId ?? "")?.simulationModelId;
  const props = (id: string) => {
    const c = document.components.find(c => c.id === id)!;
    return { ...catalog.get(c.definitionId)?.propertiesSchema, ...c.properties };
  };
  const contactors = document.components.filter(c => model(c.id) === "contactor-dol-v1");
  const timers = document.components.filter(c => model(c.id) === "catalog-on-delay-timer" && typeof props(c.id).coilVoltageV === "number");
  const coils = [...contactors, ...timers];
  const sources = document.components.filter(c => model(c.id) === "control-supply-v1");
  if (!coils.length) return new Map();
  let state = new Map(coils.map(c => [c.id, props(c.id).runtimeCoilEnergized === true || (model(c.id) === "catalog-on-delay-timer" && props(c.id).energized === true)]));
  const seen = new Set<string>();
  const key = (id: string, terminal: string) => `${id}.${terminal}`;
  for (let iteration = 0; iteration <= coils.length * 2 + 2; iteration++) {
    const signature = coils.map(c => state.get(c.id) ? "1" : "0").join("");
    if (seen.has(signature)) break;
    seen.add(signature);
    const graph = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      graph.set(a, new Set([...(graph.get(a) ?? []), b]));
      graph.set(b, new Set([...(graph.get(b) ?? []), a]));
    };
    const isControl = (id: string, terminal: string) => {
      const c = document.components.find(c => c.id === id);
      return catalog.get(c?.definitionId ?? "")?.terminals.some(t => t.id === terminal && t.kind === "control");
    };
    for (const wire of document.wires) if (isControl(wire.from.componentId, wire.from.terminalId) && isControl(wire.to.componentId, wire.to.terminalId)) {
      link(key(wire.from.componentId, wire.from.terminalId), key(wire.to.componentId, wire.to.terminalId));
    }
    for (const c of document.components) {
      const p = props(c.id);
      const m = model(c.id);
      if (m === "pushbutton-start-v1" && p.pressed === true) link(key(c.id, "13"), key(c.id, "14"));
      if (m === "pushbutton-stop-v1" && p.pressed !== true) link(key(c.id, "21"), key(c.id, "22"));
      if (m === "thermal-overload-dol-v1" && p.tripped !== true && !(p.thermalEnabled === true && p.runtimeThermalTripped === true)) link(key(c.id, "aux-95"), key(c.id, "aux-96"));
      if (m === "contactor-dol-v1" && state.get(c.id)) link(key(c.id, "aux-13"), key(c.id, "aux-14"));
      if (m === "contactor-dol-v1" && !state.get(c.id) && isControl(c.id, "aux-21") && isControl(c.id, "aux-22")) link(key(c.id, "aux-21"), key(c.id, "aux-22"));
      if (m === "catalog-on-delay-timer") {
        const done = state.get(c.id) === true && Number(p.elapsedSeconds) >= Number(p.delaySeconds);
        link(key(c.id, "15"), key(c.id, done ? "18" : "16"));
      }
    }
    const reachable = (start: string) => {
      const visited = new Set<string>([start]);
      const queue = [start];
      for (let n = 0; n < queue.length; n++) for (const next of graph.get(queue[n]) ?? []) if (!visited.has(next)) { visited.add(next); queue.push(next); }
      return visited;
    };
    const result = new Map<string, WiredCoilState>();
    for (const coil of coils) {
      const a = reachable(key(coil.id, "a1"));
      const b = reachable(key(coil.id, "a2"));
      const attached = sources.filter(s => [a, b].some(net => net.has(key(s.id, "line")) || net.has(key(s.id, "neutral"))));
      let value: WiredCoilState = { energized: false, voltageV: 0 };
      if (attached.length > 1) value.error = "Multiple control supplies reach this coil; isolated-source calculation is required.";
      else if (attached.length === 1) {
        const supply = attached[0];
        const line = key(supply.id, "line"), neutral = key(supply.id, "neutral");
        if (reachable(line).has(neutral)) value.error = "Control supply line and neutral are shorted.";
        else if ((a.has(line) && b.has(neutral)) || (a.has(neutral) && b.has(line))) {
          const voltage = props(supply.id).voltageV;
          const coilProperties = props(coil.id);
          const rating = coilProperties.coilVoltageV ?? coilProperties.nominalVoltageV;
          if (typeof voltage !== "number" || !Number.isFinite(voltage) || voltage <= 0 || typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) value.error = "Supply and coil voltage ratings must be finite positive numbers.";
          else {
            value.voltageV = voltage;
            value.energized = Math.abs(voltage - rating) <= rating * 1e-6;
            if (!value.energized) value.error = "Applied control voltage differs from the coil rating; pickup behavior is not modeled.";
          }
        }
      }
      result.set(coil.id, value);
    }
    if (coils.every(c => result.get(c.id)!.energized === state.get(c.id))) return result;
    state = new Map([...result].map(([id, value]) => [id, value.energized]));
  }
  return new Map(coils.map(c => [c.id, { energized: false, voltageV: 0, error: "Control contacts did not settle; all evaluated coils are inhibited." }]));
}

