import { validateCircuit, type TopologyIssue } from "../electrical/topology";
import { executeCircuitModels, type CircuitModelRun } from "../simulation/circuitModels";
import type { ElectricalComponentDefinition } from "../types/electrical";
import type { ProjectTemplate } from "./templateLibrary";

export interface TemplateVerification {
  passed: boolean;
  topologyIssues: TopologyIssue[];
  runs: CircuitModelRun[];
  failedExpectations: string[];
}

export function verifyProjectTemplate(template: ProjectTemplate, catalog: Map<string, ElectricalComponentDefinition>): TemplateVerification {
  const topologyIssues = validateCircuit(template.document, catalog);
  const runs = executeCircuitModels(template.document, catalog);
  const failedExpectations = template.expectedOutputs.flatMap((expectation) => {
    const run = runs.find((candidate) => candidate.reference === expectation.reference && candidate.output.label === expectation.label);
    return run?.output.value.includes(expectation.valueIncludes) ? [] : [`${expectation.reference}: ${expectation.label} must include ${expectation.valueIncludes}`];
  });
  return { passed: topologyIssues.length === 0 && failedExpectations.length === 0, topologyIssues, runs, failedExpectations };
}

