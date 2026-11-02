import { validateCircuit, type TopologyIssue } from "../electrical/topology";
import { executeCircuitModels, type CircuitModelRun } from "../simulation/circuitModels";
import { advanceCircuitClock } from "../simulation/circuitClock";
import type { CircuitDocument, ElectricalComponentDefinition, ComponentInstance } from "../types/electrical";
import type { ProjectTemplate } from "./templateLibrary";

export interface TemplateVerification {
  passed: boolean;
  topologyIssues: TopologyIssue[];
  runs: CircuitModelRun[];
  failedExpectations: string[];
}

export interface CircuitSequenceStep {
  name: string;
  durationSeconds?: number;
  changes: Array<{ reference: string; properties: ComponentInstance["properties"] }>;
  expectations: Array<{ reference: string; label: string; exact?: string; numeric?: number; tolerance?: number }>;
}

export function verifyCircuitSequence(document: CircuitDocument, steps: CircuitSequenceStep[], catalog: Map<string, ElectricalComponentDefinition>) {
  let working = structuredClone(document);
  return steps.map((step) => {
    const failures: string[] = [];
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
  if (template.operatingSequence) {
    for (const step of verifyCircuitSequence(template.document, template.operatingSequence, catalog)) {
      failedExpectations.push(...step.failures.map((failure) => `${step.name}: ${failure}`));
    }
  }
  return { passed: topologyIssues.length === 0 && failedExpectations.length === 0, topologyIssues, runs, failedExpectations };
}
