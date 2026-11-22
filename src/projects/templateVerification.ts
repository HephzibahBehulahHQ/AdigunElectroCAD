import { endpointKey } from "../cad/terminalAnchors";
import { removeWire } from "../cad/documentOps";
import { validateCircuit, type TopologyIssue } from "../electrical/topology";
import { executeCircuitModels, type CircuitModelRun } from "../simulation/circuitModels";
import { advanceCircuitClock } from "../simulation/circuitClock";
import type { CircuitDocument, ElectricalComponentDefinition, ComponentInstance, TerminalEndpoint } from "../types/electrical";
import type { ProjectTemplate } from "./templateLibrary";

export interface TemplateVerification {
  passed: boolean;
  topologyIssues: TopologyIssue[];
  runs: CircuitModelRun[];
  failedExpectations: string[];
  sequenceResults: ReturnType<typeof verifyCircuitSequence>;
}

export interface CircuitSequenceStep {
  name: string;
  durationSeconds?: number;
  wireChanges?: Array<{ from: TerminalEndpoint; to: TerminalEndpoint; connected: boolean }>;
  changes: Array<{ reference: string; properties: ComponentInstance["properties"] }>;
  expectations: Array<{ reference: string; label: string; exact?: string; numeric?: number; tolerance?: number }>;
}

export function verifyCircuitSequence(document: CircuitDocument, steps: CircuitSequenceStep[], catalog: Map<string, ElectricalComponentDefinition>) {
  let working = structuredClone(document);
  const savedWires = working.wires;
  const pairKey = (from: TerminalEndpoint, to: TerminalEndpoint) => JSON.stringify([endpointKey(from), endpointKey(to)].sort());
  const savedWireIds = new Map(savedWires.map(({ id, from, to }) => [pairKey(from, to), id]));
  const disconnected = new Set<string>();
  return steps.map((step) => {
    const failures: string[] = [];
    if (step.wireChanges?.length) {
      for (const { from, to, connected } of step.wireChanges) {
        const wireId = savedWireIds.get(pairKey(from, to));
        if (!wireId) { failures.push("Unknown wire " + endpointKey(from) + " to " + endpointKey(to)); continue; }
        if (connected) disconnected.delete(wireId);
        else disconnected.add(wireId);
      }
      working = { ...working, wires: savedWires };
      for (const wireId of disconnected) working = removeWire(working, wireId);
    }
    for (const change of step.changes) {
      const component = working.components.find((item) => item.reference === change.reference);
      if (!component) { failures.push(`Unknown component ${change.reference}`); continue; }
      Object.assign(component.properties, change.properties);
    }
    if (step.durationSeconds !== undefined) {
      if (!Number.isFinite(step.durationSeconds) || step.durationSeconds < 0) failures.push("Invalid step duration");
      else working = advanceCircuitClock(working, catalog, step.durationSeconds);
    }
    const runs = executeCircuitModels(working, catalog);
    const expectedFaults = new Set(runs.flatMap(({ reference, output }) =>
      output.error && step.expectations.some((expected) =>
        expected.reference === reference && expected.label === output.label && expected.exact === output.value,
      ) ? [output.error] : [],
    ));
    for (const { reference, output } of runs) {
      if (output.error && !expectedFaults.has(output.error)) failures.push(`Unexpected fault at ${reference}: ${output.error}`);
    }
    for (const expected of step.expectations) {
      const value = runs.find((run) => run.reference === expected.reference && run.output.label === expected.label)?.output.value;
      const numeric = value === undefined ? NaN : Number.parseFloat(value);
      if (value === undefined || (expected.exact !== undefined && value !== expected.exact) ||
        (expected.numeric !== undefined && (!Number.isFinite(expected.numeric) || !Number.isFinite(expected.tolerance ?? 0) || (expected.tolerance ?? 0) < 0 || !Number.isFinite(numeric) || Math.abs(numeric - expected.numeric) > (expected.tolerance ?? 0))) ||
        (expected.exact === undefined && expected.numeric === undefined)) failures.push(`${expected.reference}: ${expected.label} failed`);
    }
    if (step.expectations.length === 0) failures.push("Step has no expectations");
    return { name: step.name, passed: failures.length === 0, failures, runs };
  });
}

export function verifyProjectTemplate(template: ProjectTemplate, catalog: Map<string, ElectricalComponentDefinition>): TemplateVerification {
  const topologyIssues = validateCircuit(template.document, catalog);
  const runs = executeCircuitModels(template.document, catalog);
  const failedExpectations = template.expectedOutputs.flatMap((expectation) => {
    const run = runs.find((candidate) => candidate.reference === expectation.reference && candidate.output.label === expectation.label);
    return run?.output.value.includes(expectation.valueIncludes) ? [] : [`${expectation.reference}: ${expectation.label} must include ${expectation.valueIncludes}`];
  });
  if (!template.expectedOutputs.length) failedExpectations.push("Project has no baseline output checks");
  for (const { reference, output } of runs) {
    if (output.error) failedExpectations.push(`Unexpected baseline fault at ${reference}: ${output.error}`);
  }
  const sequenceResults = verifyCircuitSequence(template.document, template.operatingSequence ?? [], catalog);
  if (sequenceResults.length === 0) failedExpectations.push("Project has no checked operating sequence");
  for (const step of sequenceResults) {
    failedExpectations.push(...step.failures.map((failure) => step.name + ": " + failure));
  }
  return { passed: topologyIssues.length === 0 && failedExpectations.length === 0, topologyIssues, runs, failedExpectations, sequenceResults };
}
