import type { CircuitModelRun } from "../simulation/circuitModels";

export function ModelRunSummary({ runs }: { runs: readonly CircuitModelRun[] }) {
  if (!runs.length) return null;
  const faults = runs.filter(run => run.output.error);
  if (faults.length) return <div role="alert">
    <p className="issue">{faults.length} of {runs.length} placed models reported errors.</p>
    {faults.map(run => <div key={run.componentId}><p className="issue">{run.reference}: {run.output.error}</p>{run.modelId === "catalog-plc-digital-io" && <p className="muted">{run.output.label}: {run.output.value}</p>}</div>)}
  </div>;
  return <p className="pass">✓ {runs.length} placed model{runs.length === 1 ? "" : "s"} executed: {runs.slice(0, 2).map(run => `${run.reference} ${run.output.value}`).join(" · ")}{runs.length > 2 ? " …" : ""}</p>;
}
