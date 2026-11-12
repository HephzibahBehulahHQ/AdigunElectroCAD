export type LadderAddress = "I0" | "I1" | "Q0";
export interface LadderContact { address: LadderAddress; inverted: boolean; edge?: "positive" | "negative"; }
export interface LadderRung { stages: LadderContact[][]; coil: "OUT" | "SET" | "RESET"; }
export const defaultLadder = (): LadderRung[] => [{ stages: [[{ address: "I0", inverted: false }]], coil: "OUT" }];
export interface LadderPreviewInputs { input0: boolean; input1: boolean; q0: boolean; previousInput0: boolean; previousInput1: boolean; }
export interface LadderPreview { rungEnergized: boolean[]; contactEnergized: boolean[][][]; output: boolean; }

/** Preview the next scan's rung conditions from the latest PLC I/O and retained state. */
export function previewLadder(rungs: readonly LadderRung[], inputs: LadderPreviewInputs): LadderPreview {
  let output = inputs.q0;
  const rungEnergized: boolean[] = [];
  const contactEnergized: boolean[][][] = [];
  for (const rung of rungs) {
    let precedingStages = true;
    const poweredStages: boolean[][] = [];
    for (const contacts of rung.stages) {
      const conditions = contacts.map((contact) => {
        const value = contact.address === "I0" ? inputs.input0 : contact.address === "I1" ? inputs.input1 : output;
        if (contact.edge === "positive") return value && !(contact.address === "I0" ? inputs.previousInput0 : inputs.previousInput1);
        if (contact.edge === "negative") return !value && (contact.address === "I0" ? inputs.previousInput0 : inputs.previousInput1);
        return contact.inverted ? !value : value;
      });
      poweredStages.push(conditions.map((condition) => precedingStages && condition));
      precedingStages = precedingStages && conditions.some(Boolean);
    }
    rungEnergized.push(precedingStages);
    contactEnergized.push(poweredStages);
    if (rung.coil === "OUT") output = precedingStages;
    else if (rung.coil === "SET" && precedingStages) output = true;
    else if (rung.coil === "RESET" && precedingStages) output = false;
  }
  return { rungEnergized, contactEnergized, output };
}


/** Each stage is an OR of parallel contacts; stages are connected in series. */
export function compileLadder(rungs: readonly LadderRung[]): string {
  if (!rungs.length || rungs.length > 4) throw new Error("Use one to four rungs.");
  const instructions: string[] = [];
  for (const rung of rungs) {
    if (!rung.stages.length || rung.stages.length > 4 || !["OUT", "SET", "RESET"].includes(rung.coil)) throw new Error("Use one to four stages and a defined Q0 coil.");
    rung.stages.forEach((contacts, stageIndex) => {
      if (!contacts.length || contacts.length > 4 || contacts.some((contact) => !["I0", "I1", "Q0"].includes(contact.address) || typeof contact.inverted !== "boolean" || (contact.edge !== undefined && (!["positive", "negative"].includes(contact.edge) || contact.inverted || contact.address === "Q0")))) throw new Error("Use one to four valid contacts per stage; edge contacts require I0/I1 and cannot be inverted.");
      const branch = stageIndex > 0 && contacts.length > 1;
      if (branch) instructions.push("PUSH");
      contacts.forEach((contact, contactIndex) => {
        const operation = contactIndex ? "OR" : stageIndex && !branch ? "AND" : "LD";
        instructions.push(`${operation}${contact.edge === "positive" ? "P" : contact.edge === "negative" ? "F" : contact.inverted ? "N" : ""} ${contact.address}`);
      });
      if (branch) instructions.push("ANDPOP");
    });
    instructions.push(`${rung.coil} Q0`);
  }
  if (instructions.length > 32) throw new Error("This ladder exceeds the PLC limit of 32 instructions. Reduce its rungs or branches.");
  return instructions.join("; ");
}

/** Accept only the ladder subset, so opening arithmetic or XOR never rewrites it. */
export function parseLadder(program: string): LadderRung[] | null {
  const instructions = program.split(/[;\n]/).map((line) => line.trim().toUpperCase()).filter(Boolean);
  if (!instructions.length) return null;
  const rungs: LadderRung[] = [];
  let stages: LadderContact[][] = [];
  let branch = false;
  for (const instruction of instructions) {
    const [operation, address, extra] = instruction.split(/\s+/);
    if (operation === "PUSH" && !address && stages.length && !branch) { branch = true; stages.push([]); continue; }
    if (operation === "ANDPOP" && !address && branch && stages.at(-1)!.length) { branch = false; continue; }
    if (["OUT", "SET", "RESET"].includes(operation)) {
      if (address !== "Q0" || extra || !stages.length || branch) return null;
      rungs.push({ stages, coil: operation as LadderRung["coil"] }); stages = []; continue;
    }
    if (extra || !["I0", "I1", "Q0"].includes(address)) return null;
    const contact: LadderContact = { address: address as LadderAddress, inverted: operation.endsWith("N"), ...(/[PF]$/.test(operation) ? { edge: operation.endsWith("P") ? "positive" as const : "negative" as const } : {}) };
    if (["LD", "LDN", "LDP", "LDF"].includes(operation)) {
      if (!stages.length) stages.push([contact]);
      else if (branch && !stages.at(-1)!.length) stages.at(-1)!.push(contact);
      else return null;
    } else if (["OR", "ORN", "ORP", "ORF"].includes(operation)) {
      if (!stages.at(-1)?.length) return null;
      stages.at(-1)!.push(contact);
    } else if (["AND", "ANDN", "ANDP", "ANDF"].includes(operation)) {
      if (!stages.length || branch) return null;
      stages.push([contact]);
    } else return null;
  }
  if (stages.length || branch) return null;
  try {
    const canonical = compileLadder(rungs);
    return canonical === instructions.map((line) => line.split(/\s+/).join(" ")).join("; ") ? rungs : null;
  } catch { return null; }
}
