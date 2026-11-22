import type { CircuitDocument, ElectricalComponentDefinition } from "../types/electrical";
import { isControlTransformerPrimary } from "../electrical/topology";

export interface WiredCoilState { energized: boolean; voltageV: number; error?: string; }

/** Ideal isolated AC/DC control supplies and dry contacts; no impedance or pickup curve. */
export function evaluateWiredControl(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): Map<string, WiredCoilState> {
  const model = (id: string) => catalog.get(document.components.find(c => c.id === id)?.definitionId ?? "")?.simulationModelId;
  const props = (id: string) => {
    const c = document.components.find(c => c.id === id)!;
    return { ...catalog.get(c.definitionId)?.propertiesSchema, ...c.properties };
  };
  const isContactor = (id: string) => ["contactor-dol-v1", "catalog-motor-starter"].includes(model(id) ?? "");
  const contactors = document.components.filter(c => isContactor(c.id) && document.wires.some(wire =>
    (wire.from.componentId === c.id && ["a1", "a2"].includes(wire.from.terminalId)) ||
    (wire.to.componentId === c.id && ["a1", "a2"].includes(wire.to.terminalId))));
  const timers = document.components.filter(c => model(c.id) === "catalog-on-delay-timer" && typeof props(c.id).coilVoltageV === "number");
  const indicators = document.components.filter((c) => model(c.id) === "indicator-lamp-v1");
  const acSources = document.components.filter(c => model(c.id) === "control-supply-v1");
  const dcSources = document.components.filter(c => model(c.id) === "catalog-dc-control-supply");
  const transformers = document.components.filter(c => model(c.id) === "catalog-control-transformer");
  const sources = [...acSources, ...dcSources, ...transformers];
  const relays = sources.length ? document.components.filter((component) => model(component.id) === "catalog-interface-relay" && document.wires.some(({ from, to }) =>
    [from, to].some((endpoint) => endpoint.componentId === component.id && ["a1", "a2"].includes(endpoint.terminalId)))) : [];
  const relayIds = new Set(relays.map(({ id }) => id));
  const coils = [...contactors, ...timers, ...relays];
  const loads = [...coils, ...indicators];
  if (!loads.length) return new Map();
  let state = new Map(coils.map(c => [c.id, props(c.id).runtimeCoilEnergized === true || (model(c.id) === "catalog-on-delay-timer" && props(c.id).energized === true)]));
  const relayFallback = (id: string) => relayIds.has(id) && props(id).energized === true;
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
      return (c?.customTerminals ?? catalog.get(c?.definitionId ?? "")?.terminals)?.some(t => t.id === terminal && t.kind === "control");
    };
    const supportsControl = (id: string, terminal: string) => isControl(id, terminal) || isControlTransformerPrimary(model(id), terminal);
    for (const wire of document.wires) if (supportsControl(wire.from.componentId, wire.from.terminalId) && supportsControl(wire.to.componentId, wire.to.terminalId)) {
      link(key(wire.from.componentId, wire.from.terminalId), key(wire.to.componentId, wire.to.terminalId));
    }
    for (const c of document.components) {
      const p = props(c.id);
      const m = model(c.id);
      if (m === "catalog-feed-through-terminal" && p.continuityClosed === true && isControl(c.id, "1") && isControl(c.id, "2")) {
        link(key(c.id, "1"), key(c.id, "2"));
      }
      if (m === "pushbutton-start-v1" && p.pressed === true) link(key(c.id, "13"), key(c.id, "14"));
      if (m === "pushbutton-stop-v1" && p.pressed !== true) link(key(c.id, "21"), key(c.id, "22"));
      if (m === "thermal-overload-dol-v1" && p.tripped !== true && !(p.thermalEnabled === true && p.runtimeThermalTripped === true)) link(key(c.id, "aux-95"), key(c.id, "aux-96"));
      if (isContactor(c.id) && state.get(c.id)) link(key(c.id, "aux-13"), key(c.id, "aux-14"));
      if (isContactor(c.id) && !state.get(c.id) && isControl(c.id, "aux-21") && isControl(c.id, "aux-22")) link(key(c.id, "aux-21"), key(c.id, "aux-22"));
      if (m === "catalog-interface-relay") {
        const energized = state.get(c.id) ?? p.energized === true;
        for (const pole of [1, 2, 3]) {
          const common = pole + "1", switched = pole + (energized ? "4" : "2");
          if (isControl(c.id, common) && isControl(c.id, switched)) link(key(c.id, common), key(c.id, switched));
        }
      }
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
    const transformerVoltage = new Map<string, number>();
    for (const transformer of transformers) {
      const p = props(transformer.id);
      const a = reachable(key(transformer.id, "p1"));
      const b = reachable(key(transformer.id, "p2"));
      const candidates = acSources.filter(source => [a, b].some(net => net.has(key(source.id, "line")) || net.has(key(source.id, "neutral"))));
      if (candidates.length !== 1 || a.has(key(transformer.id, "p2"))) continue;
      const input = props(candidates[0].id);
      const line = key(candidates[0].id, "line"), neutral = key(candidates[0].id, "neutral");
      if (input.outputEnabled === false || !((a.has(line) && b.has(neutral)) || (b.has(line) && a.has(neutral)))) continue;
      if ([a, b].some(net => sources.some(source => transformer.id !== source.id && !acSources.includes(source) &&
        ["s1", "s2", "plus-out", "zero-out"].some(terminal => net.has(key(source.id, terminal)))))) continue;
      if ([a, b].some(net => net.has(key(transformer.id, "s1")) || net.has(key(transformer.id, "s2")))) continue;
      const primary = Number(p.primaryVoltageV), secondary = Number(p.secondaryVoltageV), applied = Number(input.voltageV);
      const loadPercent = Number(p.loadPercent ?? 0);
      if (![primary, secondary, applied].every(value => Number.isFinite(value) && value > 0) || !Number.isFinite(loadPercent) || loadPercent < 0 || loadPercent > 100) continue;
      const voltage = applied * (secondary / primary) * (1 - loadPercent / 2000);
      if (Number.isFinite(voltage) && voltage > 0) transformerVoltage.set(transformer.id, voltage);
    }
    const supplyPorts = (supplyId: string) => {
      const supplyModel = model(supplyId);
      if (supplyModel === "catalog-dc-control-supply") return { live: "plus-out", return: "zero-out", voltage: props(supplyId).nominalVoltageV, dc: true };
      if (supplyModel === "catalog-control-transformer") return { live: "s1", return: "s2", voltage: transformerVoltage.get(supplyId), dc: false };
      return { live: "line", return: "neutral", voltage: props(supplyId).voltageV, dc: false };
    };
    const supplyError = (supplyId: string): string | undefined => {
      const p = props(supplyId);
      if (p.outputEnabled === false) return "Control supply output is disabled.";
      if (model(supplyId) !== "catalog-dc-control-supply") return undefined;
      const input = document.components.find(c => acSources.some(source => source.id === c.id &&
        ((reachable(key(source.id, "line")).has(key(supplyId, "line-in")) && reachable(key(source.id, "neutral")).has(key(supplyId, "neutral-in"))) ||
         (reachable(key(source.id, "line")).has(key(supplyId, "neutral-in")) && reachable(key(source.id, "neutral")).has(key(supplyId, "line-in"))))));
      if (!input) return "24 V DC supply has no connected 230 V AC input.";
      if (props(input.id).outputEnabled === false) return "24 V DC supply input source is disabled.";
      if (reachable(key(input.id, "line")).has(key(input.id, "neutral"))) return "24 V DC supply input line and neutral are shorted.";
      if (Math.abs(Number(props(input.id).voltageV) - Number(p.inputVoltageV)) > Number(p.inputVoltageV) * 1e-6) return "24 V DC supply input voltage does not match its rating.";
      return undefined;
    };
    const result = new Map<string, WiredCoilState>();
    for (const load of loads) {
      const indicator = model(load.id) === "indicator-lamp-v1";
      const a = reachable(key(load.id, indicator ? "t1" : "a1"));
      const b = reachable(key(load.id, indicator ? "t2" : "a2"));
      const device = indicator ? "indicator" : "coil";
      const attached = sources.filter(s => {
        const ports = supplyPorts(s.id);
        return [a, b].some(net => net.has(key(s.id, ports.live)) || net.has(key(s.id, ports.return)));
      });
      let value: WiredCoilState = { energized: false, voltageV: 0 };
      if (attached.length > 1) value.error = `Multiple control supplies reach this ${device}; isolated-source calculation is required.`;
      else if (attached.length === 1) {
        const supply = attached[0];
        const ports = supplyPorts(supply.id);
        const live = key(supply.id, ports.live), neutral = key(supply.id, ports.return);
        const disabled = supplyError(supply.id);
        if (model(supply.id) === "catalog-control-transformer" && ports.voltage === undefined) {
          result.set(load.id, value);
          continue;
        }
        if (disabled) value.error = disabled;
        else if (reachable(live).has(neutral)) value.error = "Control supply output terminals are shorted.";
        else if (indicator && ports.dc && a.has(neutral) && b.has(live)) value.error = "Indicator DC polarity is reversed; T1 requires the positive supply.";
        else if ((a.has(live) && b.has(neutral)) || (!ports.dc && a.has(neutral) && b.has(live))) {
          const voltage = ports.voltage;
          const properties = props(load.id);
          const rating = indicator ? properties.ratedVoltageV : properties.coilVoltageV ?? properties.nominalVoltageV;
          const dc = indicator ? properties.dc : properties.coilDc;
          if (typeof voltage !== "number" || !Number.isFinite(voltage) || voltage <= 0 || typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) value.error = `Supply and ${device} voltage ratings must be finite positive numbers.`;
          else if (typeof dc === "boolean" && dc !== ports.dc) value.error = `Applied control supply type (AC/DC) differs from the ${device} rating.`;
          else {
            value.voltageV = voltage;
            value.energized = Math.abs(voltage - rating) <= rating * 1e-6;
            if (!value.energized) value.error = indicator ? "Applied voltage differs from the indicator rating." : "Applied control voltage differs from the coil rating; pickup behavior is not modeled.";
          }
        }
      }
      if (attached.length || !relayIds.has(load.id)) result.set(load.id, value);
    }
    const nextState = new Map(coils.map(({ id }) => [id, result.get(id)?.energized ?? relayFallback(id)]));
    if (coils.every(({ id }) => nextState.get(id) === state.get(id))) return result;
    state = nextState;
  }
  return new Map(loads.map(c => [c.id, { energized: false, voltageV: 0, error: "Control contacts did not settle; all evaluated loads are inhibited." }]));
}

