import { useEffect, useState } from "react";
import { compileLadder, defaultLadder, parseLadder, previewLadder, type LadderAddress, type LadderPreviewInputs, type LadderRung } from "../simulation/ladderProgram";

export function LadderEditor({ program, onApply, previewInputs }: { program: string; onApply: (program: string) => void; previewInputs?: LadderPreviewInputs }) {
  const [rungs, setRungs] = useState<LadderRung[] | null>(() => parseLadder(program));
  useEffect(() => { setRungs(parseLadder(program)); }, [program]);
  let compiled = "", error = "";
  if (rungs) { try { compiled = compileLadder(rungs); } catch (failure) { error = (failure as Error).message; } }
  const preview = rungs && previewInputs && !error ? previewLadder(rungs, previewInputs) : null;
  const edit = (change: (draft: LadderRung[]) => void) => setRungs((current) => { const draft = structuredClone(current ?? defaultLadder()); change(draft); return draft; });
  return <section className="ladder-editor" aria-label="Graphical PLC ladder editor">
    <strong>Graphical ladder · Q0</strong>
    <p>Parallel contacts use OR; series stages use AND. NO closes when true; NC closes when false. Rising/falling contacts pulse for one scan on an I0/I1 transition. Apply commits one program edit. Run executes it.</p>
    {!rungs ? <><p>The current text program is outside this editor's contact/coil subset. It stays unchanged until you explicitly apply a new ladder.</p><button onClick={() => setRungs(defaultLadder())}>Create ladder draft</button></> : <>
      <div className="ladder-preview"><LadderDiagram rungs={rungs} contactEnergized={preview?.contactEnergized} /></div>
      {preview && <p className="muted" aria-live="polite">Next-scan logic preview: green contact paths conduct under the latest PLC inputs. This is a logic preview, not electrical power flow.</p>}
      {rungs.map((rung, rungIndex) => <fieldset key={rungIndex}><legend>Rung {rungIndex + 1}</legend>
        {rung.stages.map((contacts, stageIndex) => <div className="ladder-stage" key={stageIndex}><strong>Series stage {stageIndex + 1}</strong>
          {contacts.map((contact, contactIndex) => <div className="ladder-contact" key={contactIndex}>
            <label>R{rungIndex + 1} S{stageIndex + 1} contact {contactIndex + 1}<select value={contact.address} onChange={(event) => edit((draft) => { draft[rungIndex].stages[stageIndex][contactIndex].address = event.target.value as LadderAddress; })}>{["I0", "I1", "Q0"].map((address) => <option key={address} disabled={address === "Q0" && !!contact.edge}>{address}</option>)}</select></label>
            <label>Contact type<select value={contact.edge ?? (contact.inverted ? "NC" : "NO")} onChange={(event) => edit((draft) => { const target = draft[rungIndex].stages[stageIndex][contactIndex], kind = event.target.value; target.inverted = kind === "NC"; if (kind === "positive" || kind === "negative") { target.edge = kind; if (target.address === "Q0") target.address = "I0"; } else delete target.edge; })}><option>NO</option><option>NC</option><option value="positive">Rising edge</option><option value="negative">Falling edge</option></select></label>
            <button disabled={contacts.length === 1} aria-label={`Remove R${rungIndex + 1} S${stageIndex + 1} contact ${contactIndex + 1}`} onClick={() => edit((draft) => { draft[rungIndex].stages[stageIndex].splice(contactIndex, 1); })}>Remove</button>
          </div>)}
          <div className="ladder-actions"><button disabled={contacts.length >= 4} onClick={() => edit((draft) => { draft[rungIndex].stages[stageIndex].push({ address: "I1", inverted: false }); })}>Add parallel contact · R{rungIndex + 1} S{stageIndex + 1}</button><button disabled={rung.stages.length === 1} onClick={() => edit((draft) => { draft[rungIndex].stages.splice(stageIndex, 1); })}>Remove stage · R{rungIndex + 1} S{stageIndex + 1}</button></div>
        </div>)}
        <div className="ladder-actions"><button disabled={rung.stages.length >= 4} onClick={() => edit((draft) => { draft[rungIndex].stages.push([{ address: "I1", inverted: false }]); })}>Add series stage · R{rungIndex + 1}</button><button disabled={rungs.length === 1} onClick={() => edit((draft) => { draft.splice(rungIndex, 1); })}>Remove rung {rungIndex + 1}</button></div>
        <label>Rung {rungIndex + 1} coil<select value={rung.coil} onChange={(event) => edit((draft) => { draft[rungIndex].coil = event.target.value as LadderRung["coil"]; })}><option value="OUT">Output Q0</option><option value="SET">Set Q0</option><option value="RESET">Reset Q0</option></select></label>
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
            return <g key={contactIndex} className={contactEnergized?.[index]?.[stageIndex]?.[contactIndex] ? "ladder-powered" : undefined}><text x={center} y={cy - 12} textAnchor="middle">{contact.address}</text><path d={`M ${left} ${cy} H ${center - 8} M ${center - 8} ${cy - 7} V ${cy + 7} M ${center + 8} ${cy - 7} V ${cy + 7} M ${center + 8} ${cy} H ${right}${contact.inverted ? ` M ${center - 12} ${cy + 10} L ${center + 12} ${cy - 10}` : ""}`} />{contact.edge && <text x={center} y={cy + 4} textAnchor="middle" aria-label={contact.edge === "positive" ? "Rising edge" : "Falling edge"}>{contact.edge === "positive" ? "↑" : "↓"}</text>}</g>;
          })}</g>;
        })}<text x={width - 70} y={y - 15} textAnchor="middle">Q0</text><path d={`M ${width - 77} ${y - 10} Q ${width - 90} ${y} ${width - 77} ${y + 10} M ${width - 63} ${y - 10} Q ${width - 50} ${y} ${width - 63} ${y + 10}`} /><text x={width - 70} y={y + 4} textAnchor="middle">{rung.coil === "OUT" ? "" : rung.coil === "SET" ? "S" : "R"}</text></g>;
    })}
  </svg>;
}
