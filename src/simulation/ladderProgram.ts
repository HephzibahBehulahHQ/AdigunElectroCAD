export type LadderAddress = "I0" | "I1" | "Q0" | "Q1" | `T${0 | 1 | 2 | 3}` | `M${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`;
export type LadderMemoryAddress = `M${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`;
export interface LadderBooleanContact { address: LadderAddress; inverted: boolean; edge?: "positive" | "negative"; }
export interface LadderComparisonContact { comparison: "GT" | "LT" | "EQ"; left: "AI0" | `D${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`; right: string; }
export type LadderContact = LadderBooleanContact | LadderComparisonContact;
export type LadderCoil = "OUT" | "SET" | "RESET" | { type: "OUTPUT"; address: "Q0" | "Q1"; operation: "OUT" | "SET" | "RESET" } | { type: "TON"; timer: `T${0 | 1 | 2 | 3}`; presetSeconds: number } | { type: "MEMORY"; address: LadderMemoryAddress; operation: "OUT" | "SET" | "RESET" };
export type LadderStageOperator = "OR" | "XOR";
export interface LadderRung { stages: LadderContact[][]; stageOperators?: LadderStageOperator[]; coil: LadderCoil; }
export const defaultLadder = (): LadderRung[] => [{ stages: [[{ address: "I0", inverted: false }]], coil: "OUT" }];

/** Duplicate a rung beside its source, with a bounded independent copy. */
export function duplicateLadderRung(rungs: readonly LadderRung[], index: number): LadderRung[] | null {
  if (!Number.isInteger(index) || index < 0 || index >= rungs.length || rungs.length >= 16) return null;
  const copy = rungs.map((rung) => ({
    stages: rung.stages.map((stage) => stage.map((contact) => ({ ...contact }))),
    ...(rung.stageOperators ? { stageOperators: [...rung.stageOperators] } : {}),
    coil: typeof rung.coil === "object" ? { ...rung.coil } : rung.coil,
  }));
  const source = rungs[index];
  copy.splice(index + 1, 0, {
    stages: source.stages.map((stage) => stage.map((contact) => ({ ...contact }))),
    ...(source.stageOperators ? { stageOperators: [...source.stageOperators] } : {}),
    coil: typeof source.coil === "object" ? { ...source.coil } : source.coil,
  });
  return copy;
}

/** Return an independent ladder with one rung moved to another valid position. */
export function moveLadderRung(rungs: readonly LadderRung[], fromIndex: number, toIndex: number): LadderRung[] | null {
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex < 0 || fromIndex >= rungs.length || toIndex < 0 || toIndex >= rungs.length) return null;
  const copy = rungs.map((rung) => ({
    stages: rung.stages.map((stage) => stage.map((contact) => ({ ...contact }))),
    ...(rung.stageOperators ? { stageOperators: [...rung.stageOperators] } : {}),
    coil: typeof rung.coil === "object" ? { ...rung.coil } : rung.coil,
  }));
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

export interface LadderPreviewInputs { input0: boolean; input1: boolean; q0: boolean; q1?: boolean; previousInput0: boolean; previousInput1: boolean; analogInput0: number; registers: readonly number[]; timers?: Partial<Record<`T${0 | 1 | 2 | 3}`, { elapsedSeconds: number; done: boolean }>>; memory?: readonly boolean[]; deltaSeconds?: number; }
export interface LadderPreview { rungEnergized: boolean[]; contactEnergized: boolean[][][]; output: boolean; output1: boolean; memory: boolean[]; }

/** Preview the next scan's rung conditions from the latest PLC I/O and retained state. */
export function previewLadder(rungs: readonly LadderRung[], inputs: LadderPreviewInputs): LadderPreview {
  let output = inputs.q0;
  let output1 = inputs.q1 === true;
  const memory = Array.from({ length: 8 }, (_, index) => inputs.memory?.[index] === true);
  const timers = Object.fromEntries([0, 1, 2, 3].map((index) => { const timer = inputs.timers?.[`T${index}` as `T${0 | 1 | 2 | 3}`]; return [`T${index}`, { elapsedSeconds: timer?.elapsedSeconds ?? 0, done: timer?.done ?? false }]; })) as Record<`T${0 | 1 | 2 | 3}`, { elapsedSeconds: number; done: boolean }>;
  const rungEnergized: boolean[] = [];
  const contactEnergized: boolean[][][] = [];
  for (const rung of rungs) {
    let precedingStages = true;
    const poweredStages: boolean[][] = [];
    for (let stageIndex = 0; stageIndex < rung.stages.length; stageIndex++) {
      const contacts = rung.stages[stageIndex];
      const operation = rung.stageOperators?.[stageIndex] ?? "OR";
      const conditions = contacts.map((contact) => {
        if ("comparison" in contact) {
          const read = (operand: string) => operand === "AI0" ? inputs.analogInput0 : /^D[0-7]$/.test(operand) ? inputs.registers[Number(operand.slice(1))] ?? 0 : Number(operand);
          const left = read(contact.left), right = read(contact.right);
          return contact.comparison === "GT" ? left > right : contact.comparison === "LT" ? left < right : left === right;
        }
        const value = contact.address === "I0" ? inputs.input0 : contact.address === "I1" ? inputs.input1 : contact.address === "Q0" ? output : contact.address === "Q1" ? output1 : contact.address.startsWith("T") ? timers[contact.address as `T${0 | 1 | 2 | 3}`]?.done === true : memory[Number(contact.address.slice(1))];
        if (contact.edge === "positive") return value && !(contact.address === "I0" ? inputs.previousInput0 : inputs.previousInput1);
        if (contact.edge === "negative") return !value && (contact.address === "I0" ? inputs.previousInput0 : inputs.previousInput1);
        return contact.inverted ? !value : value;
      });
      const stageCondition = operation === "XOR" ? conditions.filter(Boolean).length % 2 === 1 : conditions.some(Boolean);
      poweredStages.push(conditions.map((condition) => precedingStages && condition && (operation !== "XOR" || stageCondition)));
      precedingStages = precedingStages && stageCondition;
    }
    rungEnergized.push(precedingStages);
    contactEnergized.push(poweredStages);
    if (typeof rung.coil === "string") {
      if (rung.coil === "OUT") output = precedingStages;
      else if (rung.coil === "SET" && precedingStages) output = true;
      else if (rung.coil === "RESET" && precedingStages) output = false;
    } else if (rung.coil.type === "OUTPUT") {
      const current = rung.coil.address === "Q0" ? output : output1;
      const next = rung.coil.operation === "OUT" ? precedingStages : rung.coil.operation === "SET" ? current || precedingStages : current && !precedingStages;
      if (rung.coil.address === "Q0") output = next; else output1 = next;
    } else if (rung.coil.type === "MEMORY") {
      const index = Number(rung.coil.address.slice(1));
      if (rung.coil.operation === "OUT") memory[index] = precedingStages;
      else if (precedingStages) memory[index] = rung.coil.operation === "SET" ? true : false;
    } else {
      const timer = timers[rung.coil.timer];
      timer.elapsedSeconds = precedingStages ? Math.round((timer.elapsedSeconds + (inputs.deltaSeconds ?? 0.1)) * 1e9) / 1e9 : 0;
      timer.done = precedingStages && timer.elapsedSeconds >= rung.coil.presetSeconds;
    }
  }
  return { rungEnergized, contactEnergized, output, output1, memory };
}

/** Parallel contacts use OR or XOR within each stage; stages are connected in series. */
export function compileLadder(rungs: readonly LadderRung[]): string {
  if (!rungs.length || rungs.length > 16) throw new Error("Use one to sixteen rungs.");
  const instructions: string[] = [];
  const numericSource = (value: string) => value === "AI0" || /^D[0-7]$/.test(value);
  const numericOperand = (value: string) => numericSource(value) || /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= Number.MAX_SAFE_INTEGER;
  const isComparison = (contact: LadderContact): contact is LadderComparisonContact => "comparison" in contact;
  const validContact = (contact: LadderContact) => isComparison(contact)
    ? ["GT", "LT", "EQ"].includes(contact.comparison) && numericSource(contact.left) && numericOperand(contact.right) && !(contact.left === "AI0" && contact.right !== "AI0" && !/^D[0-7]$/.test(contact.right) && (!Number.isInteger(Number(contact.right)) || Number(contact.right) < 0 || Number(contact.right) > 27648))
    : (["I0", "I1", "Q0", "Q1", "T0", "T1", "T2", "T3"].includes(contact.address) || /^M[0-7]$/.test(contact.address)) && typeof contact.inverted === "boolean" && (contact.edge === undefined || (["positive", "negative"].includes(contact.edge) && !contact.inverted && ["I0", "I1"].includes(contact.address)));
  const booleanInstruction = (contact: LadderBooleanContact, operation: "LD" | "AND" | "OR" | "XOR") => `${operation}${contact.edge === "positive" ? "P" : contact.edge === "negative" ? "F" : contact.inverted ? "N" : ""} ${contact.address}`;
  const loadContact = (contact: LadderContact) => isComparison(contact) ? `${contact.comparison} ${contact.left} ${contact.right}` : booleanInstruction(contact, "LD");
  const combineContact = (contact: LadderContact, operation: "OR" | "XOR") => isComparison(contact) ? ["PUSH", loadContact(contact), `${operation}POP`] : [booleanInstruction(contact, operation)];
  for (const rung of rungs) {
    const invalidCoil = typeof rung.coil === "string" ? !["OUT", "SET", "RESET"].includes(rung.coil) : rung.coil.type === "TON" ? !/^T[0-3]$/.test(rung.coil.timer) || !Number.isFinite(rung.coil.presetSeconds) || rung.coil.presetSeconds < 0 : rung.coil.type === "OUTPUT" ? !["Q0", "Q1"].includes(rung.coil.address) || !["OUT", "SET", "RESET"].includes(rung.coil.operation) : !/^M[0-7]$/.test(rung.coil.address) || !["OUT", "SET", "RESET"].includes(rung.coil.operation);
    if (!rung.stages.length || invalidCoil || (rung.stageOperators && (rung.stageOperators.length !== rung.stages.length || rung.stageOperators.some((operation) => operation !== "OR" && operation !== "XOR")))) throw new Error("Each rung needs stages and a defined Q0/Q1, memory or TON coil.");
    rung.stages.forEach((contacts, stageIndex) => {
      const operation = rung.stageOperators?.[stageIndex] ?? "OR";
      if (!contacts.length || contacts.some((contact) => !validContact(contact)) || false) throw new Error("Each stage needs valid Boolean or numeric comparison contacts; edge contacts require I0/I1.");
      const branchContact = (contact: LadderContact) => combineContact(contact, operation);
      if (stageIndex === 0) {
        instructions.push(loadContact(contacts[0]));
        for (const contact of contacts.slice(1)) instructions.push(...branchContact(contact));
      } else if (contacts.length === 1 && !isComparison(contacts[0])) {
        instructions.push(booleanInstruction(contacts[0], "AND"));
      } else {
        instructions.push("PUSH", loadContact(contacts[0]));
        for (const contact of contacts.slice(1)) instructions.push(...branchContact(contact));
        instructions.push("ANDPOP");
      }
    });
    instructions.push(typeof rung.coil === "string" ? `${rung.coil} Q0` : rung.coil.type === "TON" ? `TON ${rung.coil.timer} ${rung.coil.presetSeconds}` : `${rung.coil.operation} ${rung.coil.address}`);
  }
  if (!rungs.some((rung) => typeof rung.coil === "string" || (typeof rung.coil === "object" && rung.coil.type === "OUTPUT"))) throw new Error("A valid ladder program must assign Q0 or Q1 with an output, set or reset coil.");
  const timerCoils = rungs.filter((rung) => typeof rung.coil === "object" && rung.coil.type === "TON").map((rung) => typeof rung.coil === "object" && rung.coil.type === "TON" ? rung.coil.timer : "");
  if (new Set(timerCoils).size !== timerCoils.length) throw new Error("Use each TON timer coil at most once per scan.");
  if (instructions.length > 32) throw new Error("This ladder exceeds the PLC limit of 32 instructions. Reduce its rungs or branches.");
  return instructions.join("; ");
}

/** Accept only the editable ladder instruction subset and preserve OR/XOR branch groups. */
export function parseLadder(program: string): LadderRung[] | null {
  const instructions = program.split(/[;\\n]/).map((line) => line.trim().toUpperCase()).filter(Boolean);
  if (!instructions.length) return null;
  const rungs: LadderRung[] = [];
  type Expr = { contact: LadderContact } | { operation: "AND" | "OR" | "XOR"; left: Expr; right: Expr };
  const combine = (operation: "AND" | "OR" | "XOR", left: Expr, right: Expr): Expr => ({ operation, left, right });
  let accumulator: Expr | undefined;
  const stack: Expr[] = [];
  const flatten = (expression: Expr, operation: "AND" | "OR" | "XOR"): Expr[] => "operation" in expression && expression.operation === operation ? [...flatten(expression.left, operation), ...flatten(expression.right, operation)] : [expression];
  const toStages = (expression: Expr): { stages: LadderContact[][]; stageOperators?: LadderStageOperator[] } | null => {
    const stages = flatten(expression, "AND");
    const contacts: LadderContact[][] = [];
    const operators: LadderStageOperator[] = [];
    for (const stage of stages) {
      const xor = "operation" in stage && stage.operation === "XOR";
      const operation = xor ? "XOR" : "OR";
      const terms = flatten(stage, operation);
      if (terms.some((term) => !("contact" in term))) return null;
      contacts.push(terms.map((term) => (term as { contact: LadderContact }).contact));
      operators.push(operation);
    }
    return { stages: contacts, ...(operators.some((operation) => operation === "XOR") ? { stageOperators: operators } : {}) };
  };
  for (const instruction of instructions) {
    const [operation, address, extra] = instruction.split(/\\s+/);
    if (operation === "PUSH" && !address && accumulator) { stack.push(accumulator); continue; }
    if (["ANDPOP", "ORPOP", "XORPOP"].includes(operation) && !address && accumulator && stack.length) {
      accumulator = combine(operation === "ANDPOP" ? "AND" : operation === "ORPOP" ? "OR" : "XOR", stack.pop()!, accumulator); continue;
    }
    if (["OUT", "SET", "RESET"].includes(operation)) {
      if ((address !== "Q0" && address !== "Q1" && !/^M[0-7]$/.test(address ?? "")) || extra || !accumulator || stack.length) return null;
      const parsed = toStages(accumulator); if (!parsed) return null;
      rungs.push({ ...parsed, coil: address === "Q0" ? operation as "OUT" | "SET" | "RESET" : address === "Q1" ? { type: "OUTPUT", address: "Q1" as const, operation: operation as "OUT" | "SET" | "RESET" } : { type: "MEMORY", address: address as LadderMemoryAddress, operation: operation as "OUT" | "SET" | "RESET" } }); accumulator = undefined; continue;
    }
    if (operation === "TON") {
      const presetSeconds = Number(extra);
      if (!/^T[0-3]$/.test(address ?? "") || !extra || instruction.split(/\\s+/).length !== 3 || !Number.isFinite(presetSeconds) || presetSeconds < 0 || !accumulator || stack.length) return null;
      const parsed = toStages(accumulator); if (!parsed) return null;
      rungs.push({ ...parsed, coil: { type: "TON", timer: address as `T${0 | 1 | 2 | 3}`, presetSeconds } }); accumulator = undefined; continue;
    }
    if (["GT", "LT", "EQ"].includes(operation)) {
      if (!extra || instruction.split(/\\s+/).length !== 3) return null;
      accumulator = { contact: { comparison: operation as LadderComparisonContact["comparison"], left: address as LadderComparisonContact["left"], right: extra } }; continue;
    }
    if (instruction.split(/\\s+/).length !== 2 || (!["I0", "I1", "Q0", "Q1", "T0", "T1", "T2", "T3"].includes(address) && !/^M[0-7]$/.test(address ?? ""))) return null;
    const contact: LadderBooleanContact = { address: address as LadderAddress, inverted: operation.endsWith("N"), ...(/[PF]$/.test(operation) ? { edge: operation.endsWith("P") ? "positive" as const : "negative" as const } : {}) };
    if (contact.edge && !["I0", "I1"].includes(address)) return null;
    if (["LD", "LDN", "LDP", "LDF"].includes(operation)) accumulator = { contact };
    else if (["OR", "ORN", "ORP", "ORF", "XOR", "XORN", "XORP", "XORF"].includes(operation)) {
      if (!accumulator) return null;
      accumulator = combine(operation.startsWith("OR") ? "OR" : "XOR", accumulator, { contact });
    } else if (["AND", "ANDN", "ANDP", "ANDF"].includes(operation)) {
      if (!accumulator) return null;
      accumulator = combine("AND", accumulator, { contact });
    } else return null;
  }
  if (accumulator || stack.length) return null;
  try {
    const canonical = compileLadder(rungs);
    return canonical === instructions.map((line) => line.split(/\\s+/).join(" ")).join("; ") ? rungs : null;
  } catch { return null; }
}
