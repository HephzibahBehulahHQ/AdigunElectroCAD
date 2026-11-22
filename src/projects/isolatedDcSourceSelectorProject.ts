import type { TerminalEndpoint, Wire } from "../types/electrical";
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createIsolatedDcSourceSelectorProject(): ProjectTemplate {
  const id = "isolated-dc-source-selector";
  const name = "Isolated 24 V DC source selector";
  const description = "A two-pole changeover relay transfers both conductors of a 24 V DC pilot circuit between separate supplies. The operating sequence checks selected and unselected supply failures with ideal settled contacts.";
  const endpoint = (componentId: string, terminalId: string): TerminalEndpoint => ({ componentId, terminalId });
  const wire = (id: string, netName: string, from: TerminalEndpoint, to: TerminalEndpoint): Wire => ({ id, netName, from, to, points: [] });
  const coilReturn = { from: endpoint("relay", "a2"), to: endpoint("primary", "zero-out") };
  const sample = (name: string, pressed: boolean, standbyEnabled: boolean, energized: boolean, lit: boolean): CircuitSequenceStep => ({
    name,
    changes: [
      { reference: "S1", properties: { pressed } },
      { reference: "T2", properties: { outputEnabled: standbyEnabled } },
    ],
    expectations: [
      { reference: "K1", label: "Relay contacts", exact: energized ? "ENERGIZED · 2 CO" : "DE-ENERGIZED" },
      lit
        ? { reference: "H1", label: "Indicator lamp", exact: "LIT · 24 V DC" }
        : { reference: "H1", label: "Signal fault", exact: "ERROR: Control supply output is disabled." },
    ],
  });
  const operatingSequence = [
    sample("Release S1. Both normally closed paths carry the standby supply to H1.", false, true, false, true),
    sample("Press S1. Both poles transfer H1 to the primary supply.", true, true, true, true),
    sample("Disable the standby supply while holding S1. H1 stays lit.", true, false, true, true),
    sample("Release S1 with standby disabled. H1 goes dark and reports the disabled supply.", false, false, false, false),
    sample("Restore the standby supply. H1 lights again through both normally closed paths.", false, true, false, true),
    {
      ...sample("Hold S1 and open the coil return. K1 stays released and H1 stays on standby.", true, true, false, true),
      wireChanges: [{ ...coilReturn, connected: false }],
    },
    {
      ...sample("Restore the coil return with S1 held. K1 transfers H1 back to primary.", true, true, true, true),
      wireChanges: [{ ...coilReturn, connected: true }],
    },
  ];
  return {
    id, name, description, category: "Control & Signalling", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "ac", definitionId: "supply.control", reference: "X1", x: 115, y: 350, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
        { id: "primary", definitionId: "iec.dc-control-supply.01", reference: "T1", x: 310, y: 210, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, ratedCurrentA: 4, outputEnabled: true } },
        { id: "standby", definitionId: "iec.dc-control-supply.01", reference: "T2", x: 310, y: 520, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, ratedCurrentA: 4, outputEnabled: true } },
        { id: "command", definitionId: "pushbutton.start-no", reference: "S1", x: 510, y: 160, rotation: 0, properties: { pressed: false } },
        { id: "relay", definitionId: "iec.interface-relay.02", reference: "K1", x: 675, y: 350, rotation: 0, properties: { coilVoltageV: 24, coilDc: true, changeoverContacts: 2, energized: false } },
        { id: "pilot", definitionId: "user.indicator-lamp", reference: "H1", x: 930, y: 350, rotation: 0, properties: { ratedVoltageV: 24, dc: true, color: "#15803d", indication: "Selected DC supply" } },
      ],
      wires: [
        wire("primary-line", "L", endpoint("ac", "line"), endpoint("primary", "line-in")),
        wire("primary-neutral", "N", endpoint("ac", "neutral"), endpoint("primary", "neutral-in")),
        wire("standby-line", "L", endpoint("ac", "line"), endpoint("standby", "line-in")),
        wire("standby-neutral", "N", endpoint("ac", "neutral"), endpoint("standby", "neutral-in")),
        wire("command-feed", "PRIMARY_PLUS", endpoint("primary", "plus-out"), endpoint("command", "13")),
        wire("coil-feed", "COIL_PLUS", endpoint("command", "14"), endpoint("relay", "a1")),
        wire("coil-return", "PRIMARY_RETURN", coilReturn.from, coilReturn.to),
        wire("primary-plus", "PRIMARY_PLUS", endpoint("primary", "plus-out"), endpoint("relay", "14")),
        wire("primary-return", "PRIMARY_RETURN", endpoint("primary", "zero-out"), endpoint("relay", "24")),
        wire("standby-plus", "STANDBY_PLUS", endpoint("standby", "plus-out"), endpoint("relay", "12")),
        wire("standby-return", "STANDBY_RETURN", endpoint("standby", "zero-out"), endpoint("relay", "22")),
        wire("pilot-plus", "SELECTED_PLUS", endpoint("relay", "11"), endpoint("pilot", "t1")),
        wire("pilot-return", "SELECTED_RETURN", endpoint("relay", "21"), endpoint("pilot", "t2")),
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "T1", label: "Control DC supply", valueIncludes: "24 V DC" },
      { reference: "T2", label: "Control DC supply", valueIncludes: "24 V DC" },
      { reference: "K1", label: "Relay contacts", valueIncludes: "DE-ENERGIZED" },
      { reference: "H1", label: "Indicator lamp", valueIncludes: "LIT · 24 V DC" },
    ],
  };
}
