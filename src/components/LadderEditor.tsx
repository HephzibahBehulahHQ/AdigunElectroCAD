import { useEffect, useState } from "react";
import { compileLadder, defaultLadder, parseLadder, previewLadder, type LadderAddress, type LadderComparisonContact, type LadderPreviewInputs, type LadderRung } from "../simulation/ladderProgram";

export function LadderEditor({ program, onApply, previewInputs }: { program: string; onApply: (program: string) => void; previewInputs?: LadderPreviewInputs }) {
  const [rungs, setRungs] = useState<LadderRung[] | null>(() => parseLadder(program));
  useEffect(() => { setRungs(parseLadder(program)); }, [program]);
  let compiled = "", error = "";
  if (rungs) { try { compiled = compileLadder(rungs); } catch (failure) { error = (failure as Error).message; } }
  const preview = rungs && previewInputs && !error ? previewLadder(rungs, previewInputs) : null;
  const edit = (change: (draft: LadderRung[]) => void) => setRungs((current) => { const draft = structuredClone(current ?? defaultLadder()); change(draft); return draft; });
  return <section className="ladder-editor" aria-label="Graphical PLC ladder editor">
    <strong>Graphical ladder · Q0 / TON</strong>
    <p>Parallel contacts use OR; series stages use AND. NO/NC and rising/falling contacts keep their existing behavior; T0–T3 contacts read timer done state. TON coils accumulate scan time while enabled and reset when false. Apply commits one program edit. Run executes it.</p>
    {!rungs ? <><p>The current text program is outside this editor's contact/coil subset. It stays unchanged until you explicitly apply a new ladder.</p><button onClick={() => setRungs(defaultLadder())}>Create ladder draft</button></> : <>
      <div className="ladder-preview"><LadderDiagram rungs={rungs} contactEnergized={preview?.contactEnergized} /></div>
      {preview && <p className="muted" aria-live="polite">Next-scan logic preview: green contact paths conduct under the latest PLC inputs. This is a logic preview, not electrical power flow.</p>}
      {rungs.map((rung, rungIndex) => <fieldset key={rungIndex}><legend>Rung {rungIndex + 1}</legend>
        {rung.stages.map((contacts, stageIndex) => <div className="ladder-stage" key={stageIndex}><strong>Series stage {stageIndex + 1}</strong>
          {contacts.map((contact, contactIndex) => <div className="ladder-contact" key={contactIndex}>
            <label>Contact kind<select value={"comparison" in contact ? "comparison" : "boolean"} onChange={(event) => edit((draft) => { draft[rungIndex].stages[stageIndex][contactIndex] = event.target.value === "comparison" ? { comparison: "GT", left: "AI0", right: "13824" } : { address: "I0", inverted: false }; })}><option value="boolean">Boolean contact</option><option value="comparison">Numeric comparison</option></select></label>
            {"comparison" in contact ? <>
              <label>Compare<select value={contact.comparison} onChange={(event) => edit((draft) => { const target = draft[rungIndex].stages[stageIndex][contactIndex]; if ("comparison" in target) target.comparison = event.target.value as LadderComparisonContact["comparison"]; })}><option>GT</option><option>LT</option><option>EQ</option></select></label>
              <label>Left value<select value={contact.left} onChange={(event) => edit((draft) => { const target = draft[rungIndex].stages[stageIndex][contactIndex]; if ("comparison" in target) target.left = event.target.value as LadderComparisonContact["left"]; })}>{["AI0", ...Array.from({ length: 8 }, (_, index) => `D${index}`)].map((value) => <option key={value}>{value}</option>)}</select></label>
              <label>Right value<input value={contact.right} aria-label={`R${rungIndex + 1} S${stageIndex + 1} comparison right value`} onChange={(event) => edit((draft) => { const target = draft[rungIndex].stages[stageIndex][contactIndex]; if ("comparison" in target) target.right = event.target.value.toUpperCase(); })} /></label>
            </> : <>
              <label>Address<select value={contact.address} onChange={(event) => edit((draft) => { const target = draft[rungIndex].stages[stageIndex][contactIndex]; if (!("comparison" in target)) target.address = event.target.value as LadderAddress; })}>{["I0", "I1", "Q0", "T0", "T1", "T2", "T3"].map((address) => <option key={address} disabled={address.startsWith("T") && !!contact.edge}>{address}</option>)}</select></label>
              <label>Contact type<select value={contact.edge ?? (contact.inverted ? "NC" : "NO")} onChange={(event) => edit((draft) => { const target = draft[rungIndex].stages[stageIndex][contactIndex]; if (!("comparison" in target)) { const kind = event.target.value; target.inverted = kind === "NC"; if (kind === "positive" || kind === "negative") { target.edge = kind; if (target.address === "Q0") target.address = "I0"; } else delete target.edge; } })}><option>NO</option><option>NC</option><option value="positive">Rising edge</option><option value="negative">Falling edge</option></select></label>
            </>}
            <button disabled={contacts.length === 1} aria-label={`Remove R${rungIndex + 1} S${stageIndex + 1} contact ${contactIndex + 1}`} onClick={() => edit((draft) => { draft[rungIndex].stages[stageIndex].splice(contactIndex, 1); })}>Remove</button>
          </div>)}
          <div className="ladder-actions"><button disabled={contacts.length >= 4} onClick={() => edit((draft) => { draft[rungIndex].stages[stageIndex].push({ address: "I1", inverted: false }); })}>Add parallel contact · R{rungIndex + 1} S{stageIndex + 1}</button><button disabled={rung.stages.length === 1} onClick={() => edit((draft) => { draft[rungIndex].stages.splice(stageIndex, 1); })}>Remove stage · R{rungIndex + 1} S{stageIndex + 1}</button></div>
        </div>)}
        <div className="ladder-actions"><button disabled={rung.stages.length >= 4} onClick={() => edit((draft) => { draft[rungIndex].stages.push([{ address: "I1", inverted: false }]); })}>Add series stage · R{rungIndex + 1}</button><button disabled={rungs.length === 1} onClick={() => edit((draft) => { draft.splice(rungIndex, 1); })}>Remove rung {rungIndex + 1}</button></div>
        <label>Rung {rungIndex + 1} coil<select value={typeof rung.coil === "object" ? "TON" : rung.coil} onChange={(event) => edit((draft) => { draft[rungIndex].coil = event.target.value === "TON" ? { type: "TON", timer: "T0", presetSeconds: 0.2 } : event.target.value as "OUT" | "SET" | "RESET"; })}><option value="OUT">Output Q0</option><option value="SET">Set Q0</option><option value="RESET">Reset Q0</option><option value="TON">On-delay timer</option></select></label>
        {typeof rung.coil === "object" && <div className="ladder-contact"><label>Timer<select value={rung.coil.timer} onChange={(event) => edit((draft) => { if (typeof draft[rungIndex].coil === "object") draft[rungIndex].coil.timer = event.target.value as `T${0 | 1 | 2 | 3}`; })}>{["T0", "T1", "T2", "T3"].map((timer) => <option key={timer}>{timer}</option>)}</select></label><label>Preset (seconds)<input type="number" min="0" step="0.1" value={rung.coil.presetSeconds} onChange={(event) => edit((draft) => { if (typeof draft[rungIndex].coil === "object") draft[rungIndex].coil.presetSeconds = Number(event.target.value); })} /></label></div>}
      </fieldset>)}
      <div className="ladder-actions"><button disabled={rungs.length >= 4} onClick={() => edit((draft) => { draft.push(defaultLadder()[0]); })}>Add rung</button><button disabled={!!error} onClick={() => onApply(compiled)}>Apply ladder program</button><button onClick={() => setRungs(parseLadder(program))}>Discard ladder draft</button></div>
      {error ? <p role="alert">{error}</p> : <pre aria-label="Compiled ladder program">{compiled}</pre>}
    </>}
  </section>;
}

function LadderDiagram({ rungs, contactEnergized }: { rungs: LadderRung[]; contactEnergized?: boolean[][][] }) {
  const width = 150 + Math.max(...rungs.map((rung) => rung.stages.length)) * 110;
  const heights = rungs.map((rung) => 70 + Math.max(...rung.stages.map((contacts) => contacts.length - 1)) * 40);
  const height = heights.reduce((sum, value) => sum + value, 20);
  let top = 10;
  return <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: width }} role="img" aria-label="Ladder contact and coil diagram">
    <path d={`M 15 5 V ${height - 5} M ${width - 15} 5 V ${height - 5}`} />
    {rungs.map((rung, index) => {
      const y = top + heights[index] / 2; top += heights[index];
      return <g key={index}><text x="18" y={y - heights[index] / 2 + 14}>R{index + 1}</text><path d={`M 15 ${y} H 35 M ${35 + rung.stages.length * 110} ${y} H ${width - 88} M ${width - 52} ${y} H ${width - 15}`} />
        {rung.stages.map((contacts, stageIndex) => {
          const left = 35 + stageIndex * 110, right = left + 110;
          const firstY = y - (contacts.length - 1) * 20, lastY = y + (contacts.length - 1) * 20;
          return <g key={stageIndex}><path d={`M ${left} ${firstY} V ${lastY} M ${right} ${firstY} V ${lastY}`} />{contacts.map((contact, contactIndex) => {
            const cy = firstY + contactIndex * 40, center = left + 55;
          const label = "comparison" in contact ? `${contact.comparison} ${contact.left} ${contact.right}` : contact.address;
          return <g key={contactIndex} className={contactEnergized?.[index]?.[stageIndex]?.[contactIndex] ? "ladder-powered" : undefined}><text x={center} y={cy - 12} textAnchor="middle">{label}</text><path d={`M ${left} ${cy} H ${center - 8} M ${center - 8} ${cy - 7} V ${cy + 7} M ${center + 8} ${cy - 7} V ${cy + 7} M ${center + 8} ${cy} H ${right}${"comparison" in contact ? ` M ${center - 14} ${cy} H ${center + 14}` : contact.inverted ? ` M ${center - 12} ${cy + 10} L ${center + 12} ${cy - 10}` : ""}`} />{!("comparison" in contact) && contact.edge && <text x={center} y={cy + 4} textAnchor="middle" aria-label={contact.edge === "positive" ? "Rising edge" : "Falling edge"}>{contact.edge === "positive" ? "↑" : "↓"}</text>}</g>;
          })}</g>;
        })}<text x={width - 70} y={y - 15} textAnchor="middle">{typeof rung.coil === "object" ? `${rung.coil.timer} TON` : "Q0"}</text><path d={`M ${width - 77} ${y - 10} Q ${width - 90} ${y} ${width - 77} ${y + 10} M ${width - 63} ${y - 10} Q ${width - 50} ${y} ${width - 63} ${y + 10}`} /><text x={width - 70} y={y + 4} textAnchor="middle">{typeof rung.coil === "object" ? rung.coil.presetSeconds : rung.coil === "OUT" ? "" : rung.coil === "SET" ? "S" : "R"}</text></g>;
    })}
  </svg>;
}


