import type { CircuitModelRun } from "../simulation/circuitModels";

export function ModelRunSummary({ runs }: { runs: readonly CircuitModelRun[] }) {
  if (!runs.length) return null;
  const plcs = runs.filter(run => run.modelId === "catalog-plc-digital-io");
  const plcWatch = (run: CircuitModelRun) => {
    const p = run.evaluatedProperties;
    const io = [
      ["I0", p.inputA === true ? "ON" : "OFF"],
      ["I1", p.inputB === true ? "ON" : "OFF"],
      ...(String(p.program ?? "").toUpperCase().includes("AI0") ? [["AI0", String(p.analogInput0 ?? 0)] as string[]] : []),
      ["Q0", p.runtimeQ0 === true ? "ON" : "OFF"],
      ...Array.from({ length: 8 }, (_, index) => [`D${index}`, String(p[`runtimeD${index}`] ?? 0)]),
    ];
    return <section className="plc-watch" aria-label={`${run.reference} PLC watch table`} key={run.componentId}>
      <strong>{run.reference} · Current PLC watch</strong>
      <table><tbody>{io.map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value}</td></tr>)}</tbody></table>
      <p className="muted">Current runtime values; no scan history is recorded.</p>
    </section>;
  };
  const faults = runs.filter(run => run.output.error);
  if (faults.length) return <div role="alert">
    <p className="issue">{faults.length} of {runs.length} placed models reported errors.</p>
    {faults.map(run => <div key={run.componentId}><p className="issue">{run.reference}: {run.output.error}</p>{run.modelId === "catalog-plc-digital-io" && <p className="muted">{run.output.label}: {run.output.value}</p>}</div>)}
    {plcs.map(plcWatch)}
  </div>;
  return <><p className="pass">✓ {runs.length} placed model{runs.length === 1 ? "" : "s"} executed: {runs.slice(0, 2).map(run => `${run.reference} ${run.output.value}`).join(" · ")}{runs.length > 2 ? " …" : ""}</p>{plcs.map(plcWatch)}</>;
}

