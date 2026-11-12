import { useEffect, useState } from "react";
import { createWiredStarDeltaCircuit } from "../projects/wiredStarDeltaCircuit";
import type { CircuitDocument } from "../types/electrical";
import { initialStarDeltaState, starDeltaContacts, starDeltaWindingPoint, transitionStarDelta, type StarDeltaAction } from "../simulation/starDeltaStarter";
import { inductionMotorOperatingPoint, type InductionMotorEquivalentCircuit } from "../simulation/inductionMotor";

export function StarDeltaLab({ onLoadCircuit }: { onLoadCircuit: (document: CircuitDocument) => void }) {
  const [state, setState] = useState(initialStarDeltaState);
  const [running, setRunning] = useState(false);
  const [voltage, setVoltage] = useState("400");
  const [resistance, setResistance] = useState("10");
  const [reactance, setReactance] = useState("10");
  const [motorInput, setMotorInput] = useState({
    statorResistanceOhm: "", statorReactanceOhm: "", rotorResistanceOhm: "",
    rotorReactanceOhm: "", magnetizingReactanceOhm: "", frequencyHz: "",
    polePairs: "", slip: "",
  });
  const values = [voltage, resistance, reactance].map(Number);
  const valid = [voltage, resistance, reactance].every((value) => value.trim() !== "") && values.every(Number.isFinite) && values[0] >= 0 && values[1] > 0 && values[2] >= 0;
  const winding = valid ? starDeltaWindingPoint(state, values[0], values[1], values[2]) : null;
  const contacts = starDeltaContacts(state);
  const motorRaw = Object.values(motorInput);
  const motorNumbers = motorRaw.map(Number);
  const motorInputStarted = motorRaw.some((value) => value.trim() !== "");
  const motorInputValid = motorRaw.every((value) => value.trim() !== "") && motorNumbers.every(Number.isFinite)
    && motorNumbers[0] > 0 && motorNumbers[1] >= 0 && motorNumbers[2] > 0 && motorNumbers[3] >= 0
    && motorNumbers[4] >= 0 && motorNumbers[5] > 0 && Number.isInteger(motorNumbers[6]) && motorNumbers[6] >= 1
    && motorNumbers[7] > 0 && motorNumbers[7] <= 1 && values[0] > 0;
  const motorConnection = contacts.star ? "star" : contacts.delta ? "delta" : null;
  const equivalentCircuit: InductionMotorEquivalentCircuit = {
    statorResistanceOhm: motorNumbers[0], statorReactanceOhm: motorNumbers[1],
    rotorResistanceOhm: motorNumbers[2], rotorReactanceOhm: motorNumbers[3],
    magnetizingReactanceOhm: motorNumbers[4], frequencyHz: motorNumbers[5], polePairs: motorNumbers[6],
  };
  const motorPoint = motorInputValid && motorConnection
    ? inductionMotorOperatingPoint(equivalentCircuit, values[0], motorNumbers[7], motorConnection)
    : null;
  const act = (action: StarDeltaAction) => setState((previous) => transitionStarDelta(previous, action));
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setState((previous) => transitionStarDelta(previous, "tick", 100)), 100);
    return () => window.clearInterval(interval);
  }, [running]);
  return <section className="console-section" aria-label="Star delta starter laboratory" style={{ gridColumn: "1 / -1", minWidth: 0 }}>
    <strong>Star–Delta Starter · Open Transition</strong>
    <p>5 s star period · 200 ms break before delta · educational switching model.</p>
    <div className="auth-fields">
      <label>Line voltage (V)<input type="number" min="0" value={voltage} onChange={(event) => setVoltage(event.target.value)} /></label>
      <label>Resistance per winding (Ω)<input type="number" min="0.001" step="0.1" value={resistance} onChange={(event) => setResistance(event.target.value)} /></label>
      <label>Reactance per winding (Ω)<input type="number" min="0" step="0.1" value={reactance} onChange={(event) => setReactance(event.target.value)} /></label>
    </div>
    <details open>
      <summary>Induction motor equivalent-circuit operating point</summary>
      <p>Enter traceable per-phase motor equivalent-circuit data. This balanced steady-state calculation uses the starter's current star/delta stage and entered positive slip; it does not supply assumed motor constants.</p>
      <div className="auth-fields">
        {([
          ["statorResistanceOhm", "Stator resistance R₁ (Ω)"],
          ["statorReactanceOhm", "Stator reactance X₁ (Ω)"],
          ["rotorResistanceOhm", "Rotor resistance R₂′ (Ω)"],
          ["rotorReactanceOhm", "Rotor reactance X₂′ (Ω)"],
          ["magnetizingReactanceOhm", "Magnetizing reactance Xₘ (Ω)"],
          ["frequencyHz", "Frequency (Hz)"],
          ["polePairs", "Pole pairs"],
          ["slip", "Slip (0–1)"],
        ] as const).map(([key, label]) => <label key={key}>{label}<input type="number" min="0" step="any" value={motorInput[key]} onChange={(event) => setMotorInput((previous) => ({ ...previous, [key]: event.target.value }))} /></label>)}
      </div>
      {motorPoint ? <p role="status" aria-live="polite">{motorConnection!.toUpperCase()} at {(motorPoint.slip * 100).toFixed(2)}% slip · Line current {motorPoint.lineCurrentA.toFixed(2)} A · Phase current {motorPoint.phaseCurrentA.toFixed(2)} A · Electromagnetic torque {motorPoint.electromagneticTorqueNm.toFixed(2)} N·m · Synchronous speed {motorPoint.synchronousSpeedRpm.toFixed(0)} rpm</p>
        : motorInputStarted && !motorInputValid ? <p role="alert">Complete all motor values. Resistances and frequency must be positive; reactances must be non-negative; pole pairs must be a positive integer; slip must be greater than 0 and no more than 1.</p>
        : state.stage === "transition" ? <p role="status">No winding is energized during the open-transition interval.</p>
        : <p role="status">Enter all motor values, close Q1 and start the sequence to calculate the selected winding stage.</p>}
    </details>
    {winding ? <p>Winding voltage: {winding.windingVoltageV.toFixed(2)} V · Winding current: {winding.windingCurrentA.toFixed(2)} A · Line current: {winding.lineCurrentA.toFixed(2)} A · Real power: {(winding.realPowerW / 1000).toFixed(2)} kW</p> : <p role="alert">Enter finite values: voltage and reactance ≥ 0; winding resistance &gt; 0.</p>}
    <svg viewBox="0 0 600 300" role="img" aria-label={`Motor winding connections: ${state.stage}`} style={{ width: "100%", maxWidth: 600, background: "#f4f8fc", borderRadius: 6 }}>
      <g stroke="#24456b" strokeWidth="3" fill="none">
        {[150, 300, 450].map((x) => <g key={x}><path d={`M${x} 50V100M${x} 175V220`} stroke={contacts.main ? "#15803d" : "#64748b"} /><rect x={x - 15} y="100" width="30" height="75" /></g>)}
        {contacts.star && <path d="M150 220V250H450V220M300 220V250" stroke="#15803d" />}
        {contacts.delta && <g stroke="#b45309"><path d="M150 220H90V70H450M300 220H240V80H150M450 220H510V90H300" /></g>}
      </g>
      <g fill="#102a43" fontSize="14" textAnchor="middle" fontWeight="700">
        <text x="150" y="30">L1 / U1</text><text x="300" y="30">L2 / V1</text><text x="450" y="30">L3 / W1</text>
        <text x="175" y="215">U2</text><text x="325" y="215">V2</text><text x="475" y="215">W2</text>
        <text x="300" y="283">{contacts.star ? "U2–V2–W2 joined" : contacts.delta ? "U2–W1 · V2–U1 · W2–V1" : "Star and delta connections open"}</text>
      </g>
    </svg>
    <div className="auth-actions">
      <button onClick={() => {
        const circuit = createWiredStarDeltaCircuit();
        circuit.components.find((component) => component.id === "supply")!.properties.nominalVoltageV = values[0];
        const motor = circuit.components.find((component) => component.id === "motor")!;
        Object.assign(motor.properties, { resistanceOhm: values[1], reactanceOhm: values[2] });
        if (motorInputValid) {
          circuit.components.find((component) => component.id === "supply")!.properties.frequencyHz = motorNumbers[5];
          Object.assign(motor.properties, { equivalentCircuitEnabled: true, ...equivalentCircuit, slip: motorNumbers[7] });
        }
        onLoadCircuit(circuit);
      }} disabled={!valid}>Copy wired starter and overload to new editable sheet</button>
      <button onClick={() => act(state.breakerClosed ? "open-breaker" : "close-breaker")}>{state.breakerClosed ? "Open Q1" : "Close Q1"}</button>
      <button onClick={() => act("start")}>START Star–Delta</button>
      <button onClick={() => act("stop")}>STOP Star–Delta</button>
      <button onClick={() => setRunning((value) => !value)}>{running ? "Pause sequence clock" : "Run sequence clock"}</button>
      <button onClick={() => act("trip-overload")}>Trip starter overload</button>
      <button onClick={() => act("reset-overload")}>Reset starter overload</button>
    </div>
    <p aria-live="polite">Stage: {state.stage} · Main KM1: {contacts.main ? "ON" : "OFF"} · Star KM2: {contacts.star ? "ON" : "OFF"} · Delta KM3: {contacts.delta ? "ON" : "OFF"}</p>
    <p>The copied sheet contains the wired START/STOP, star-delta contactors and F1 thermal overload. Its controls and runtime are independent of this lab's switching snapshot.</p>
    <p>Sequence time: {(state.sequenceMs / 1000).toFixed(1)} s · Overload: {state.overloadTripped ? "TRIPPED" : "healthy"}. When valid equivalent-circuit parameters are entered, they are copied into the motor model and its line current feeds F1; the specified slip remains fixed, so acceleration and flux transients are not modeled.</p>
  </section>;
}

