import type { CircuitModelRun } from "../simulation/circuitModels";

export function ModelRunSummary({ runs }: { runs: readonly CircuitModelRun[] }) {
  if (!runs.length) return null;
  const plcs = runs.filter(run => run.modelId === "catalog-plc-digital-io");
  const plcWatch = (run: CircuitModelRun) => {
    const p = run.evaluatedProperties;
    let trace: Array<{ scan: number; elapsedSeconds: number; input0: boolean; input1: boolean; analogInput0: number; analogInput1?: number; output: boolean; output1?: boolean; registers: number[]; status: string; message?: string }> = [];
    try {
      const parsed: unknown = JSON.parse(String(p.runtimeScanTrace ?? "[]"));
      if (Array.isArray(parsed)) trace = parsed.filter((item): item is typeof trace[number] => {
        if (!item || typeof item !== "object") return false;
        const entry = item as typeof trace[number];
        return Number.isInteger(entry.scan) && Number.isFinite(entry.elapsedSeconds) && typeof entry.input0 === "boolean" && typeof entry.input1 === "boolean" && Number.isFinite(entry.analogInput0) && (entry.analogInput1 === undefined || Number.isFinite(entry.analogInput1)) && typeof entry.output === "boolean" && (entry.output1 === undefined || typeof entry.output1 === "boolean") && Array.isArray(entry.registers) && entry.registers.every(Number.isFinite) && ["ok", "error", "inhibited"].includes(entry.status);
      });
    } catch { /* Ignore malformed runtime trace data. */ }
    const io = [
      ["I0", p.inputA === true ? "ON" : "OFF"],
      ["I1", p.inputB === true ? "ON" : "OFF"],
      ...(String(p.program ?? "").toUpperCase().includes("AI0") ? [["AI0", String(p.analogInput0 ?? 0)] as string[]] : []),
      ...(String(p.program ?? "").toUpperCase().includes("AI1") ? [["AI1", String(p.analogInput1 ?? 0)] as string[]] : []),
      ["Q0", p.runtimeQ0 === true ? "ON" : "OFF"],
      ["Q1", (String(p.program ?? "").trim() ? p.runtimeQ1 === true : p.output1 === true) ? "ON" : "OFF"],
      ...Array.from({ length: 8 }, (_, index) => [`D${index}`, String(p[`runtimeD${index}`] ?? 0)]),
      ...Array.from({ length: 8 }, (_, index) => index).filter((index) => new RegExp(`\\bM${index}\\b`).test(String(p.program ?? "").toUpperCase())).map((index) => [`M${index}`, p[`runtimeM${index}`] === true ? "ON" : "OFF"]),
      ...[0, 1, 2, 3].filter((index) => new RegExp(`\\bT${index}\\b`).test(String(p.program ?? "").toUpperCase())).flatMap((index) => [[`T${index}.Q`, p[`runtimeT${index}Done`] === true ? "ON" : "OFF"], [`T${index}.ET`, `${Number(p[`runtimeT${index}Elapsed`] ?? 0).toFixed(1)} s`]]),
    ];
    return <section className="plc-watch" aria-label={`${run.reference} PLC watch table`} key={run.componentId}>
      <strong>{run.reference} · Current PLC watch</strong>
      <table><tbody>{io.map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value}</td></tr>)}</tbody></table>
      {trace.length > 0 && <><strong>Recent scan trace · {trace.length} of 25 retained</strong>
        <table aria-label={`${run.reference} recent PLC scan trace`}><thead><tr><th>Scan</th><th>Time (s)</th><th>I0/I1</th><th>AI0 / AI1 raw</th><th>Q0</th><th>Q1</th><th>D0–D7</th><th>Result</th></tr></thead><tbody>
          {trace.slice(-10).reverse().map(entry => <tr key={entry.scan}><td>{entry.scan}</td><td>{entry.elapsedSeconds.toFixed(1)}</td><td>{entry.input0 ? "ON" : "OFF"}/{entry.input1 ? "ON" : "OFF"}</td><td>{entry.analogInput0}{entry.analogInput1 === undefined ? "" : ` / ${entry.analogInput1}`}</td><td>{entry.output ? "ON" : "OFF"}</td><td>{entry.output1 === true ? "ON" : "OFF"}</td><td>{entry.registers.map((value, index) => `D${index}:${Number(value.toPrecision(6))}`).join(" · ")}</td><td title={entry.message}>{entry.status}{entry.message ? ` · ${entry.message}` : ""}</td></tr>)}
        </tbody></table><p className="muted">Trace rows are PLC scan attempts; the most recent 10 are shown.</p>
      </>}
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


