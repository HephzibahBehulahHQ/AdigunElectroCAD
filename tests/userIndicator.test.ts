import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { FunctionalSymbol } from "../src/components/functionalSymbols";
import { IndicatorColorPalette } from "../src/components/IndicatorColorPalette";
import { Schematic, terminalAnchors } from "../src/components/Schematic";
import { canConnectTerminals, validateCircuit } from "../src/electrical/topology";
import { createBlankProject } from "../src/projects/starterProject";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { createPilotIndicatorProject } from "../src/projects/pilotIndicatorProject";
import { initialDolState } from "../src/simulation/dolSimulator";

it("keeps an unrated legacy indicator dark and preserves its original terminals", () => {
  const { document } = createPilotIndicatorProject();
  const lamp = document.components.find((item) => item.id === "indicator")!;
  lamp.properties = { color: "#64748b", indication: "Unassigned", terminalLabel1: "T1", terminalLabel2: "T2" };
  document.wires = [];
  expect(executeCircuitModels(document, catalogById).find((run) => run.componentId === lamp.id)?.output.value).toBe("OFF");
  const terminals = terminalAnchors(document).filter((anchor) => anchor.endpoint.componentId === lamp.id);
  expect(terminals.map((anchor) => [anchor.endpoint.terminalId, anchor.x - lamp.x, anchor.y - lamp.y])).toEqual([["t1", -32, -13], ["t2", 32, -13]]);
  expect(canConnectTerminals(document, catalogById, { componentId: "start", terminalId: "14" }, { componentId: "indicator", terminalId: "t1" }).ok).toBe(true);
});

it("lights a rated indicator from its actual branch and stays dark on an open or mismatched circuit", () => {
  const { document } = createPilotIndicatorProject();
  document.components.find((item) => item.id === "start")!.properties.pressed = true;
  const status = (design: typeof document) => executeCircuitModels(design, catalogById).find((run) => run.componentId === "indicator")!;
  const original = JSON.stringify(document);
  expect(validateCircuit(document, catalogById)).toEqual([]);
  expect(status(document).output.value).toBe("LIT · 230 V AC");
  const svg = renderToStaticMarkup(createElement(Schematic, {
    document, litIndicatorIds: new Set(["indicator"]), selectedComponentId: "", selectedWireId: "",
    wireMode: false, wireStart: null, simulation: initialDolState(), onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(svg).toContain('aria-label="Indicator lamp lit"');
  expect(svg).toContain('fill="#15803d" fill-opacity="1"');
  expect(status({ ...document, wires: document.wires.filter((wire) => wire.id !== "lamp-return") }).output.value).toBe("OFF");
  for (const [change, error] of [
    [{ ratedVoltageV: 24 }, "differs from the indicator rating"],
    [{ dc: true }, "differs from the indicator rating"],
    [{ ratedVoltageV: 0 }, "finite positive"],
  ] as const) {
    const wrong = { ...document, components: document.components.map((item) => item.id === "indicator" ? { ...item, properties: { ...item.properties, ...change } } : item) };
    expect(status(wrong).output.error).toContain(error);
    expect(status(wrong).evaluatedProperties.runtimeLampLit).toBe(false);
  }
  expect(JSON.stringify(document)).toBe(original);
});

it("requires the configured DC polarity across the indicator terminals", () => {
  const { document } = createPilotIndicatorProject();
  document.components = document.components.filter((item) => ["ac", "indicator"].includes(item.id));
  document.components.push({ id: "dc", definitionId: "iec.dc-control-supply.01", reference: "T1", x: 430, y: 380, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, outputEnabled: true } });
  const indicator = document.components.find((item) => item.id === "indicator")!;
  indicator.properties = { ...indicator.properties, ratedVoltageV: 24, dc: true };
  document.wires = [
    { id: "ac-l", from: { componentId: "ac", terminalId: "line" }, to: { componentId: "dc", terminalId: "line-in" }, points: [] },
    { id: "ac-n", from: { componentId: "ac", terminalId: "neutral" }, to: { componentId: "dc", terminalId: "neutral-in" }, points: [] },
    { id: "plus", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "indicator", terminalId: "t1" }, points: [] },
    { id: "zero", from: { componentId: "dc", terminalId: "zero-out" }, to: { componentId: "indicator", terminalId: "t2" }, points: [] },
  ];
  const status = () => executeCircuitModels(document, catalogById).find((run) => run.componentId === "indicator")!;
  expect(validateCircuit(document, catalogById)).toEqual([]);
  expect(status().output.value).toBe("LIT · 24 V DC");
  [document.wires[2].to, document.wires[3].to] = [document.wires[3].to, document.wires[2].to];
  expect(status().output.error).toContain("polarity is reversed");
  expect(status().evaluatedProperties.runtimeLampLit).toBe(false);
});

it("renders the chosen color and per-instance terminal display labels", () => {
  const markup = renderToStaticMarkup(createElement(FunctionalSymbol, {
    symbolId: "user-indicator-lamp", x: 100, y: 100,
    properties: { color: "#14b8a6", terminalLabel1: "READY", terminalLabel2: "RETURN" },
  }));
  expect(markup).toContain('fill="#14b8a6"');
  expect(markup).toContain(">READY</text>");
  expect(markup).toContain(">RETURN</text>");
});

function pilotProject() {
  const project = createBlankProject();
  project.sheets[0].document = createPilotIndicatorProject().document;
  return project;
}

it("round-trips user-selected indicator color, indication and terminal labels", () => {
  const project = pilotProject();
  const lamp = project.sheets[0].document.components.find((component) => component.id === "indicator")!;
  lamp.properties = { ...lamp.properties, color: "#ff00aa", indication: "Machine ready", terminalLabel1: "L+", terminalLabel2: "N", ratedVoltageV: 24, dc: true };
  const restored = parseProjectJson(JSON.stringify(project));
  expect(restored.sheets[0].document.components.find((component) => component.id === "indicator")?.properties).toMatchObject({
    color: "#ff00aa", indication: "Machine ready", terminalLabel1: "L+", terminalLabel2: "N", ratedVoltageV: 24, dc: true,
  });
});


it("persists user-configured terminals and creates connectable anchor locations", () => {
  const project = pilotProject();
  const lamp = project.sheets[0].document.components.find((component) => component.id === "indicator")!;
  lamp.customTerminals = [
    { id: "t1", label: "T1", kind: "control", direction: "bidirectional" },
    { id: "t2", label: "T2", kind: "control", direction: "bidirectional" },
    { id: "t3", label: "FRAME", kind: "protective-earth", direction: "input" },
  ];
  lamp.terminalLabels = { t3: "PE" };
  lamp.customTerminalOffsets = { t3: { x: 44, y: -24 } };
  const restored = parseProjectJson(JSON.stringify(project));
  const restoredLamp = restored.sheets[0].document.components.find((component) => component.id === lamp.id)!;
  expect(restoredLamp.customTerminals).toEqual(lamp.customTerminals);
  expect(restoredLamp.terminalLabels).toEqual({ t3: "PE" });
  expect(restoredLamp.customTerminalOffsets).toEqual({ t3: { x: 44, y: -24 } });
  expect(terminalAnchors(restored.sheets[0].document).find((anchor) => anchor.endpoint.componentId === lamp.id && anchor.endpoint.terminalId === "t3")).toMatchObject({ x: lamp.x + 44, y: lamp.y - 24 });
  expect(canConnectTerminals(restored.sheets[0].document, catalogById, { componentId: lamp.id, terminalId: "t3" }, { componentId: "start", terminalId: "14" }).ok).toBe(false);
});

it("provides quick user-selected lamp colors while retaining the custom color picker", () => {
  const markup = renderToStaticMarkup(createElement(IndicatorColorPalette, { value: "#c62828", onChange: () => undefined }));
  expect(markup).toContain('aria-label="Indicator color palette"');
  expect(markup).toContain('aria-label="Set indicator color #c62828"');
  expect(markup).toContain('aria-pressed="true"');
  expect(markup).toContain('aria-label="Set indicator color #1565c0"');
});
