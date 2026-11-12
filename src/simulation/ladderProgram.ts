export type LadderAddress = "I0" | "I1" | "Q0" | `T${0 | 1 | 2 | 3}`;
export interface LadderBooleanContact { address: LadderAddress; inverted: boolean; edge?: "positive" | "negative"; }
export interface LadderComparisonContact { comparison: "GT" | "LT" | "EQ"; left: "AI0" | `D${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`; right: string; }
export type LadderContact = LadderBooleanContact | LadderComparisonContact;
export type LadderCoil = "OUT" | "SET" | "RESET" | { type: "TON"; timer: `T${0 | 1 | 2 | 3}`; presetSeconds: number };
export interface LadderRung { stages: LadderContact[][]; coil: LadderCoil; }
export const defaultLadder = (): LadderRung[] => [{ stages: [[{ address: "I0", inverted: false }]], coil: "OUT" }];

export interface LadderPreviewInputs { input0: boolean; input1: boolean; q0: boolean; previousInput0: boolean; previousInput1: boolean; analogInput0: number; registers: readonly number[]; timers?: Partial<Record<`T${0 | 1 | 2 | 3}`, { elapsedSeconds: number; done: boolean }>>; deltaSeconds?: number; }
export interface LadderPreview { rungEnergized: boolean[]; contactEnergized: boolean[][][]; output: boolean; }

/** Preview the next scan's rung conditions from the latest PLC I/O and retained state. */
export function previewLadder(rungs: readonly LadderRung[], inputs: LadderPreviewInputs): LadderPreview {
  let output = inputs.q0;
  const timers = Object.fromEntries([0, 1, 2, 3].map((index) => { const timer = inputs.timers?.[`T${index}` as `T${0 | 1 | 2 | 3}`]; return [`T${index}`, { elapsedSeconds: timer?.elapsedSeconds ?? 0, done: timer?.done ?? false }]; })) as Record<`T${0 | 1 | 2 | 3}`, { elapsedSeconds: number; done: boolean }>;
  const rungEnergized: boolean[] = [];
  const contactEnergized: boolean[][][] = [];
  for (const rung of rungs) {
    let precedingStages = true;
    const poweredStages: boolean[][] = [];
    for (const contacts of rung.stages) {
      const conditions = contacts.map((contact) => {
        if ("comparison" in contact) {
          const read = (operand: string) => operand === "AI0" ? inputs.analogInput0 : /^D[0-7]$/.test(operand) ? inputs.registers[Number(operand.slice(1))] ?? 0 : Number(operand);
          const left = read(contact.left), right = read(contact.right);
          return contact.comparison === "GT" ? left > right : contact.comparison === "LT" ? left < right : left === right;
        }
        const value = contact.address === "I0" ? inputs.input0 : contact.address === "I1" ? inputs.input1 : contact.address === "Q0" ? output : timers[contact.address]?.done === true;
        if (contact.edge === "positive") return value && !(contact.address === "I0" ? inputs.previousInput0 : inputs.previousInput1);
        if (contact.edge === "negative") return !value && (contact.address === "I0" ? inputs.previousInput0 : inputs.previousInput1);
        return contact.inverted ? !value : value;
      });
      poweredStages.push(conditions.map((condition) => precedingStages && condition));
      precedingStages = precedingStages && conditions.some(Boolean);
    }
    rungEnergized.push(precedingStages);
    contactEnergized.push(poweredStages);
    if (typeof rung.coil !== "object") {
      if (rung.coil === "OUT") output = precedingStages;
      else if (rung.coil === "SET" && precedingStages) output = true;
      else if (rung.coil === "RESET" && precedingStages) output = false;
    } else {
      const timer = timers[rung.coil.timer];
      timer.elapsedSeconds = precedingStages ? Math.round((timer.elapsedSeconds + (inputs.deltaSeconds ?? 0.1)) * 1e9) / 1e9 : 0;
      timer.done = precedingStages && timer.elapsedSeconds >= rung.coil.presetSeconds;
    }
  }
  return { rungEnergized, contactEnergized, output };
}

/** Each stage is an OR of parallel contacts; stages are connected in series. */
export function compileLadder(rungs: readonly LadderRung[]): string {
  if (!rungs.length || rungs.length > 4) throw new Error("Use one to four rungs.");
  const instructions: string[] = [];
  const numericSource = (value: string) => value === "AI0" || /^D[0-7]$/.test(value);
  const numericOperand = (value: string) => numericSource(value) || /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= Number.MAX_SAFE_INTEGER;
  const isComparison = (contact: LadderContact): contact is LadderComparisonContact => "comparison" in contact;
  const validContact = (contact: LadderContact) => isComparison(contact)
    ? ["GT", "LT", "EQ"].includes(contact.comparison) && numericSource(contact.left) && numericOperand(contact.right) && !(contact.left === "AI0" && contact.right !== "AI0" && !/^D[0-7]$/.test(contact.right) && (!Number.isInteger(Number(contact.right)) || Number(contact.right) < 0 || Number(contact.right) > 27648))
    : ["I0", "I1", "Q0", "T0", "T1", "T2", "T3"].includes(contact.address) && typeof contact.inverted === "boolean" && (contact.edge === undefined || (["positive", "negative"].includes(contact.edge) && !contact.inverted && ["I0", "I1"].includes(contact.address)));
  const booleanInstruction = (contact: LadderBooleanContact, operation: "LD" | "AND" | "OR") => `${operation}${contact.edge === "positive" ? "P" : contact.edge === "negative" ? "F" : contact.inverted ? "N" : ""} ${contact.address}`;
  const loadContact = (contact: LadderContact) => isComparison(contact) ? `${contact.comparison} ${contact.left} ${contact.right}` : booleanInstruction(contact, "LD");
  const orContact = (contact: LadderContact) => isComparison(contact) ? ["PUSH", loadContact(contact), "ORPOP"] : [booleanInstruction(contact, "OR")];
  for (const rung of rungs) {
    if (!rung.stages.length || rung.stages.length > 4 || (typeof rung.coil === "object" ? !/^T[0-3]$/.test(rung.coil.timer) || !Number.isFinite(rung.coil.presetSeconds) || rung.coil.presetSeconds < 0 : !["OUT", "SET", "RESET"].includes(rung.coil))) throw new Error("Use one to four stages and a defined Q0 or TON coil.");
    rung.stages.forEach((contacts, stageIndex) => {
      if (!contacts.length || contacts.length > 4 || contacts.some((contact) => !validContact(contact))) throw new Error("Use one to four valid Boolean or numeric comparison contacts per stage; edge contacts require I0/I1 and cannot be inverted.");
      if (stageIndex === 0) {
        instructions.push(loadContact(contacts[0]));
        for (const contact of contacts.slice(1)) instructions.push(...orContact(contact));
      } else if (contacts.length === 1 && !isComparison(contacts[0])) {
        instructions.push(booleanInstruction(contacts[0], "AND"));
      } else {
        instructions.push("PUSH", loadContact(contacts[0]));
        for (const contact of contacts.slice(1)) instructions.push(...orContact(contact));
        instructions.push("ANDPOP");
      }
    });
    instructions.push(typeof rung.coil === "object" ? `TON ${rung.coil.timer} ${rung.coil.presetSeconds}` : `${rung.coil} Q0`);
  }
  if (!rungs.some((rung) => typeof rung.coil !== "object")) throw new Error("A valid ladder program must assign Q0 with an output, set or reset coil.");
  const timerCoils = rungs.filter((rung) => typeof rung.coil === "object").map((rung) => typeof rung.coil === "object" ? rung.coil.timer : "");
  if (new Set(timerCoils).size !== timerCoils.length) throw new Error("Use each TON timer coil at most once per scan.");
  if (instructions.length > 32) throw new Error("This ladder exceeds the PLC limit of 32 instructions. Reduce its rungs or branches.");
  return instructions.join("; ");
}

/** Accept only the ladder subset, so opening arithmetic or XOR never rewrites it. */
export function parseLadder(program: string): LadderRung[] | null {
  const instructions = program.split(/[;\n]/).map((line) => line.trim().toUpperCase()).filter(Boolean);
  if (!instructions.length) return null;
  const rungs: LadderRung[] = [];
  type Expr = { contact: LadderContact } | { operation: "AND" | "OR"; left: Expr; right: Expr };
  const combine = (operation: "AND" | "OR", left: Expr, right: Expr): Expr => ({ operation, left, right });
  let accumulator: Expr | undefined;
  const stack: Expr[] = [];
  const flatten = (expression: Expr, operation: "AND" | "OR"): Expr[] => "operation" in expression && expression.operation === operation ? [...flatten(expression.left, operation), ...flatten(expression.right, operation)] : [expression];
  for (const instruction of instructions) {
    const [operation, address, extra] = instruction.split(/\s+/);
    if (operation === "PUSH" && !address && accumulator) { stack.push(accumulator); continue; }
    if ((operation === "ANDPOP" || operation === "ORPOP") && !address && accumulator && stack.length) { accumulator = combine(operation === "ANDPOP" ? "AND" : "OR", stack.pop()!, accumulator); continue; }
    if (["OUT", "SET", "RESET"].includes(operation)) {
      if (address !== "Q0" || extra || !accumulator || stack.length) return null;
      const stages = flatten(accumulator, "AND").map((stage) => flatten(stage, "OR").map((term) => "contact" in term ? term.contact : null));
      if (stages.some((stage) => !stage.length || stage.some((contact) => contact === null))) return null;
      rungs.push({ stages: stages as LadderContact[][], coil: operation as LadderRung["coil"] }); accumulator = undefined; continue;
    }
    if (operation === "TON") {
      const presetSeconds = Number(extra);
      if (!/^T[0-3]$/.test(address ?? "") || !extra || instruction.split(/\s+/).length !== 3 || !Number.isFinite(presetSeconds) || presetSeconds < 0 || !accumulator || stack.length) return null;
      const stages = flatten(accumulator, "AND").map((stage) => flatten(stage, "OR").map((term) => "contact" in term ? term.contact : null));
      if (stages.some((stage) => !stage.length || stage.some((contact) => contact === null))) return null;
      rungs.push({ stages: stages as LadderContact[][], coil: { type: "TON", timer: address as `T${0 | 1 | 2 | 3}`, presetSeconds } }); accumulator = undefined; continue;
    }
    if (["GT", "LT", "EQ"].includes(operation)) {
      if (!extra || instruction.split(/\s+/).length !== 3) return null;
      accumulator = { contact: { comparison: operation as LadderComparisonContact["comparison"], left: address as LadderComparisonContact["left"], right: extra } };
      continue;
    }
    if (instruction.split(/\s+/).length !== 2 || !["I0", "I1", "Q0", "T0", "T1", "T2", "T3"].includes(address)) return null;
    const contact: LadderBooleanContact = { address: address as LadderAddress, inverted: operation.endsWith("N"), ...(/[PF]$/.test(operation) ? { edge: operation.endsWith("P") ? "positive" as const : "negative" as const } : {}) };
    if (contact.edge && !["I0", "I1"].includes(address)) return null;
    if (["LD", "LDN", "LDP", "LDF"].includes(operation)) {
      accumulator = { contact };
    } else if (["OR", "ORN", "ORP", "ORF"].includes(operation)) {
      if (!accumulator) return null;
      accumulator = combine("OR", accumulator, { contact });
    } else if (["AND", "ANDN", "ANDP", "ANDF"].includes(operation)) {
      if (!accumulator) return null;
      accumulator = combine("AND", accumulator, { contact });
    } else return null;
  }
  if (accumulator || stack.length) return null;
  try {
    const canonical = compileLadder(rungs);
    return canonical === instructions.map((line) => line.split(/\s+/).join(" ")).join("; ") ? rungs : null;
  } catch { return null; }
}


