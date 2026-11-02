import { useEffect, useRef, useState } from "react";
import { acceptCopilotPreview, analyzeCanvas, describeCanvasChange, nextCopilotFinding, previewCopilotConnection, type CopilotFinding, type CopilotPreview } from "../copilot/canvasAnalysis";
import type { CircuitDocument, ElectricalComponentDefinition } from "../types/electrical";
import { observeUnconnectedTimers } from "../copilot/timerObservation";

export function LiveCopilot({ canvas, projectId, catalog, selectedId, simulationState, liveOutput, open, onOpen, onApply, editable }: {
  canvas: CircuitDocument; projectId: string; catalog: Map<string, ElectricalComponentDefinition>; selectedId: string;
  simulationState: string; liveOutput?: { label: string; value: string }; open: boolean; onOpen: (open: boolean) => void;
  onApply: (document: CircuitDocument) => void; editable: boolean;
}) {
  const [enabled, setEnabled] = useState(true);
  const [goal, setGoal] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [offer, setOffer] = useState<CopilotFinding | null>(null);
  const [preview, setPreview] = useState<CopilotPreview | null>(null);
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [lastChange, setLastChange] = useState("");
  const previousCanvas = useRef<CircuitDocument | null>(null);
  const goals = useRef(new Map<string, string>());
  const dismissed = useRef(new Set<string>());
  const lastPublishedAt = useRef<number | null>(null);
  const currentOffer = useRef<CopilotFinding | null>(null);
  const activity = useRef({ dragging: false, typing: false, lastInteractionAt: Date.now() });
  const unconnectedSince = useRef(new Map<string, number>());
  const analyzeAfter = useRef(Date.now() + 700);
  const latest = useRef({ canvas, goal, catalog, editable });
  latest.current = { canvas, goal, catalog, editable };

  useEffect(() => { const saved = goals.current.get(projectId) ?? ""; setGoal(saved); setGoalDraft(saved); dismissed.current.clear(); currentOffer.current = null; setOffer(null); setPreview(null); }, [projectId]);
  useEffect(() => { analyzeAfter.current = Date.now() + 700; }, [canvas, goal]);
  useEffect(() => { setLastChange(describeCanvasChange(previousCanvas.current, canvas)); previousCanvas.current = canvas; }, [canvas]);
  useEffect(() => { currentOffer.current = null; setOffer(null); setPreview(null); unconnectedSince.current.clear(); }, [canvas.id]);
  useEffect(() => { unconnectedSince.current = observeUnconnectedTimers(canvas, catalog, unconnectedSince.current, Date.now(), enabled).since; }, [canvas, catalog, enabled]);
  useEffect(() => {
    const touch = () => { activity.current.lastInteractionAt = Date.now(); };
    const down = () => { touch(); activity.current.dragging = true; };
    const up = () => { touch(); activity.current.dragging = false; };
    const focus = () => { activity.current.typing = !!document.activeElement?.matches("input, textarea, select, [contenteditable='true']"); touch(); };
    window.addEventListener("pointerdown", down, true); window.addEventListener("pointerup", up, true); window.addEventListener("pointercancel", up, true);
    window.addEventListener("blur", up); document.addEventListener("input", touch, true); document.addEventListener("keydown", touch, true);
    document.addEventListener("focusin", focus, true); document.addEventListener("focusout", focus, true);
    return () => { window.removeEventListener("pointerdown", down, true); window.removeEventListener("pointerup", up, true); window.removeEventListener("pointercancel", up, true); window.removeEventListener("blur", up); document.removeEventListener("input", touch, true); document.removeEventListener("keydown", touch, true); document.removeEventListener("focusin", focus, true); document.removeEventListener("focusout", focus, true); };
  }, []);

  const findings = (now: number) => {
    const state = latest.current;
    const observed = observeUnconnectedTimers(state.canvas, state.catalog, unconnectedSince.current, now, enabled);
    unconnectedSince.current = observed.since;
    return analyzeCanvas(state.canvas, state.catalog, state.goal, observed.elapsed).map((finding) => ({ ...finding, id: `${state.canvas.id}:${finding.id}` }));
  };
  const show = (finding: CopilotFinding) => {
    currentOffer.current = finding; setOffer(finding); setMore(false); setMessage(""); setPreview(null);
    if (finding.connection && latest.current.editable) {
      try { setPreview(previewCopilotConnection(latest.current.canvas, latest.current.catalog, finding)); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Cannot prepare this fix."); }
    }
  };
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!enabled || Date.now() < analyzeAfter.current) return;
      const now = Date.now(), list = findings(now);
      if (currentOffer.current && !list.some((item) => item.id === currentOffer.current!.id)) { currentOffer.current = null; setOffer(null); setPreview(null); }
      if (currentOffer.current) return;
      const next = nextCopilotFinding(list, { lastPublishedAt: lastPublishedAt.current, dismissed: dismissed.current }, now, activity.current);
      if (next) { lastPublishedAt.current = now; show(next); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  const dismiss = () => { if (offer) dismissed.current.add(offer.id); currentOffer.current = null; setOffer(null); setPreview(null); setMore(false); };
  const inspect = () => { const next = findings(Date.now()).find((item) => !dismissed.current.has(item.id)); if (next) show(next); else setMessage("No supported local finding on the current sheet. This is not a physical safety certification."); };
  const explain = () => {
    const component = canvas.components.find((item) => item.id === selectedId);
    if (!component) { setMessage("Select a component so I can explain its actual connections and live result."); return; }
    const definition = catalog.get(component.definitionId);
    const wires = canvas.wires.filter((wire) => wire.from.componentId === component.id || wire.to.componentId === component.id).map((wire) => {
      const other = wire.from.componentId === component.id ? wire.to : wire.from;
      return `${canvas.components.find((item) => item.id === other.componentId)?.reference ?? other.componentId}.${other.terminalId}`;
    });
    setMessage(`${component.reference}: ${definition?.description ?? "Catalog definition unavailable."} Connected to ${wires.length ? wires.join(", ") : "no other terminals"}. Simulation: ${simulationState}.${liveOutput ? ` ${liveOutput.label}: ${liveOutput.value}.` : " No live model result is available for this selection."}`);
  };
  const accept = () => {
    if (!preview) return;
    const result = acceptCopilotPreview(canvas, catalog, preview);
    if (!result.ok) { setMessage(result.error); return; }
    try { onApply(result.document); dismiss(); setMessage("Wire applied to the canvas only. Undo rolls it back. Autosave is paused; sign in and explicitly save to keep Bot edits."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The fix could not be committed; the original sheet was retained."); }
  };

  return <section className="copilot-panel" aria-label="Adigun Bot live co-pilot">
    {!open ? <>{offer && enabled && <div className="copilot-peek"><span>{offer.explanation}</span><button onClick={() => onOpen(true)}>Open Adigun Bot</button><button onClick={dismiss}>Dismiss</button></div>}</> : <>
      <div className="copilot-heading"><strong>Adigun BOT · live canvas analysis</strong><button onClick={() => onOpen(false)}>Close Bot panel</button></div>
      <label className="property-checkbox">Live co-pilot<input type="checkbox" checked={enabled} onChange={(event) => { setEnabled(event.target.checked); if (!event.target.checked) dismiss(); }} /></label>
      <p>Local rules inspect this sheet as you edit. No generative AI service is configured. Suggestions are offers, not safety certification. Bot edits never auto-save.</p>
      <p>{canvas.components.length} components · {canvas.wires.length} wires · simulation {simulationState}</p>
      <p>Latest edit: {lastChange}</p>
      {selectedId && <p>Selected {canvas.components.find((component) => component.id === selectedId)?.reference ?? "component"}{liveOutput ? ` · ${liveOutput.label}: ${liveOutput.value}` : " · no live model result"}</p>}
      <form onSubmit={(event) => { event.preventDefault(); const answer = goalDraft.trim(); goals.current.set(projectId, answer); setGoal(answer); setMessage(answer ? "Project goal remembered for this session." : "Project goal cleared."); }}><label>Project goal<input value={goalDraft} maxLength={240} onChange={(event) => setGoalDraft(event.target.value)} /></label><button type="submit">Remember project goal</button></form>
      <div className="copilot-actions"><button onClick={inspect}>Inspect current sheet</button><button onClick={explain}>What does this do?</button></div>
      {offer && <article className="copilot-offer"><strong>{offer.kind === "problem" ? "Canvas finding" : offer.kind === "question" ? "Project question" : "Suggested next step"}</strong><p>{offer.explanation}</p>
        {preview && <p>Preview: add one signal wire. Components and existing wires stay unchanged. The edit is undoable and stays unsaved.</p>}
        <div className="copilot-actions">{preview && <button disabled={!editable} onClick={accept}>Accept wire fix</button>}<button onClick={dismiss}>Dismiss</button><button onClick={() => setMore((value) => !value)}>Tell me more</button><button onClick={() => { const fresh = findings(Date.now()).find((item) => item.id === offer.id); if (fresh) show(fresh); else dismiss(); }}>Refresh preview</button></div>{more && <p>{offer.detail}</p>}
      </article>}
      <form onSubmit={(event) => { event.preventDefault(); if (/what|explain|connect|wired|off|on|do/i.test(question)) explain(); else { setMessage("I can explain the selected component, inspect this sheet and preview supported wire fixes. Broader natural-language tasks require a configured secure AI service."); } }}><label>Ask about this canvas<input value={question} maxLength={240} onChange={(event) => setQuestion(event.target.value)} /></label><button type="submit">Ask Adigun Bot</button></form>
      {message && <p role="status">{message}</p>}
    </>}
  </section>;
}
