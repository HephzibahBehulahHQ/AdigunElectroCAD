import { useEffect, useState } from "react";
import { initialReversingState, transitionReversing, type ReversingAction } from "../simulation/reversingStarter";
import { applyReversingState, createReversingCircuit } from "../projects/reversingCircuit";
import type { CircuitDocument } from "../types/electrical";

export function ReversingLab({ onLoadCircuit }: { onLoadCircuit: (document: CircuitDocument) => void }) {
  const [state, setState] = useState(initialReversingState);
  const [running, setRunning] = useState(false);
  const act = (action: ReversingAction) => setState((previous) => transitionReversing(previous, action));
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setState((previous) => transitionReversing(previous, "tick", 100)), 100);
    return () => window.clearInterval(interval);
  }, [running]);
  return <section className="console-section reversing-lab" aria-label="Reversing motor starter laboratory" style={{ gridColumn: "1 / -1", minWidth: 0 }}>
    <strong>Forward / Reverse Motor Starter</strong>
    <p>Interlocked educational control model · stop and wait for coast-down before changing direction.</p>
    <svg viewBox="0 0 640 280" role="img" aria-label="Forward and reverse contactors with phase interchange feeding one motor" style={{ width: "100%", maxWidth: 640, background: "#f4f8fc", borderRadius: 6 }}>
      <g fill="none" stroke="#24456b" strokeWidth="3">
        <path d="M100 55H540M200 55V90M440 55V90" />
        <rect x="145" y="90" width="110" height="58" stroke={state.contactor === "forward" ? "#15803d" : "#24456b"} />
        <rect x="385" y="90" width="110" height="58" stroke={state.contactor === "reverse" ? "#15803d" : "#24456b"} />
        <path d="M200 148V195H320M440 148V195H320V220" />
        <path d="M255 119H385" strokeDasharray="6 5" />
        <circle cx="320" cy="245" r="23" />
      </g>
      <g fill="#102a43" textAnchor="middle" fontSize="14" fontWeight="700">
        <text x="320" y="24">Q1 {state.breakerClosed ? "CLOSED" : "OPEN"} · F1 {state.overloadTripped ? "TRIPPED" : "HEALTHY"}</text>
        <text x="200" y="112">KM1 Forward</text><text x="200" y="133">L1 · L2 · L3</text>
        <text x="440" y="112">KM2 Reverse</text><text x="440" y="133">L3 · L2 · L1</text>
        <text x="320" y="174">Mutual interlock</text><text x="320" y="250">M</text>
      </g>
    </svg>
    <div className="auth-actions">
      <button onClick={() => onLoadCircuit(applyReversingState(createReversingCircuit(), state))}>Copy power circuit to new editable sheet</button>
      <button onClick={() => act(state.breakerClosed ? "open-breaker" : "close-breaker")}>{state.breakerClosed ? "Open Q1" : "Close Q1"}</button>
      <button onClick={() => act("start-forward")}>START Forward</button>
      <button onClick={() => act("start-reverse")}>START Reverse</button>
      <button onClick={() => act("stop")}>STOP Motor</button>
      <button onClick={() => setRunning((value) => !value)}>{running ? "Pause clock" : "Run clock"}</button>
      <button onClick={() => act("trip-overload")}>Trip overload</button>
      <button onClick={() => act("reset-overload")}>Reset overload</button>
    </div>
    <p aria-live="polite">{state.notice}</p>
    <p>The copied sheet is independent and includes Boolean commands through the overload NC permit. Physical coil-voltage, holding/interlock wiring and overload power poles remain incomplete.</p>
    <p>KM1: {state.contactor === "forward" ? "ON" : "OFF"} · KM2: {state.contactor === "reverse" ? "ON" : "OFF"} · Speed: {state.speedRpm.toFixed(0)} rpm · Time: {(state.elapsedMs / 1000).toFixed(1)} s</p>
  </section>;
}
