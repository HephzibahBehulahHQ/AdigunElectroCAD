export const PLC_REGISTER_COUNT = 8;
export const PLC_MEMORY_COUNT = 8;
export type PlcMemoryState = boolean[];
export type PlcTimerState = { elapsedSeconds: number; done: boolean };
export type PlcTimerStates = Record<`T${0 | 1 | 2 | 3}`, PlcTimerState>;
export type PlcScanResult = { ok: true; output: boolean; output1?: boolean; registers?: number[]; memory?: PlcMemoryState; timers?: PlcTimerStates } | { ok: false; output: false; error: string };

/** Educational instruction-list scan with Boolean I/O, eight registers and eight internal memory relays. */
export function scanPlcProgram(program: string, inputA: boolean, inputB: boolean, previousOutput: boolean, analogInput0 = 0, previousRegisters?: readonly number[], previousInputs: readonly boolean[] = [], previousTimers?: Partial<PlcTimerStates>, deltaSeconds = 0.1, previousMemory?: readonly boolean[], previousOutput1 = false): PlcScanResult {
  const instructions = program.split(/[;\n]/).map((line) => line.trim().toUpperCase()).filter(Boolean);
  const fail = (error: string): PlcScanResult => ({ ok: false, output: false, error });
  if (!instructions.length || instructions.length > 32) return fail("Program requires 1–32 instructions.");
  let accumulator: boolean | undefined;
  let output = previousOutput;
  let output1 = previousOutput1;
  let assigned = false;
  let assignedOutput1 = false;
  const stack: boolean[] = [];
  const registers = Array.from({ length: PLC_REGISTER_COUNT }, (_, index) => previousRegisters?.[index] ?? 0);
  const memory = Array.from({ length: PLC_MEMORY_COUNT }, (_, index) => previousMemory?.[index] ?? false);
  let usesRegisters = previousRegisters !== undefined;
  let usesMemory = previousMemory !== undefined;
  let usesTimers = previousTimers !== undefined;
  const timers = Object.fromEntries([0, 1, 2, 3].map((index) => {
    const timer = previousTimers?.[`T${index}` as keyof PlcTimerStates];
    return [`T${index}`, { elapsedSeconds: timer?.elapsedSeconds ?? 0, done: timer?.done ?? false }];
  })) as PlcTimerStates;
  const usedTimerCoils = new Set<string>();
  const validNumber = (value: number) => Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
  const registerIndex = (address: string) => /^D[0-7]$/.test(address) ? Number(address.slice(1)) : -1;
  const readNumber = (operand: string): number => {
    const index = registerIndex(operand);
    if (index >= 0) { usesRegisters = true; return registers[index]; }
    if (operand === "AI0") return Number.isInteger(analogInput0) && analogInput0 >= 0 && analogInput0 <= 27648 ? analogInput0 : NaN;
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(operand) ? Number(operand) : NaN;
  };
  if (!registers.every(validNumber)) return fail("Register state must contain finite numbers within the safe numeric range.");
  if ((previousMemory && (previousMemory.length !== PLC_MEMORY_COUNT || previousMemory.some((value) => typeof value !== "boolean"))) || !memory.every((value) => typeof value === "boolean")) return fail("Memory state must contain eight Boolean values.");
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0 || Object.values(timers).some((timer) => !validNumber(timer.elapsedSeconds) || timer.elapsedSeconds < 0 || typeof timer.done !== "boolean")) return fail("Timer state and scan time step must be finite and non-negative.");
  for (const instruction of instructions) {
    const parts = instruction.split(/\s+/);
    const [operation, address] = parts;
    if (["PUSH", "ANDPOP", "ORPOP", "XORPOP"].includes(operation)) {
      if (parts.length !== 1 || accumulator === undefined) return fail("Branch instructions require a Boolean accumulator and no operands.");
      if (operation === "PUSH") {
        if (stack.length >= 8) return fail("Boolean branch nesting exceeds eight levels.");
        stack.push(accumulator);
      } else {
        const saved = stack.pop();
        if (saved === undefined) return fail("Boolean branch stack is empty.");
        accumulator = operation === "ANDPOP" ? saved && accumulator : operation === "ORPOP" ? saved || accumulator : saved !== accumulator;
      }
      continue;
    }
    if (["MOV", "ADD", "SUB", "MUL", "DIV"].includes(operation)) {
      const move = operation === "MOV";
      const destination = registerIndex(parts[move ? 2 : 3] ?? "");
      if (parts.length !== (move ? 3 : 4) || destination < 0) return fail("Numeric instructions require MOV source D0–D7 or ADD/SUB/MUL/DIV left right D0–D7.");
      const left = readNumber(address);
      const right = move ? 0 : readNumber(parts[2]);
      if (!validNumber(left) || !validNumber(right) || (operation === "DIV" && right === 0)) return fail("Invalid numeric operand or division by zero.");
      const value = move ? left : operation === "ADD" ? left + right : operation === "SUB" ? left - right : operation === "MUL" ? left * right : left / right;
      if (!validNumber(value)) return fail("Numeric result exceeds the safe numeric range.");
      registers[destination] = value;
      usesRegisters = true;
      continue;
    }
    if (["GT", "LT", "EQ"].includes(operation)) {
      const left = readNumber(address);
      const right = readNumber(parts[2] ?? "");
      const directRawThreshold = address === "AI0" && registerIndex(parts[2] ?? "") < 0;
      if (parts.length !== 3 || (address !== "AI0" && registerIndex(address) < 0) || !validNumber(left) || !validNumber(right) || (directRawThreshold && (!Number.isInteger(right) || right < 0 || right > 27648))) return fail("Comparisons require AI0 or D0–D7 and a numeric operand; direct AI0 thresholds must be integer raw values in 0–27648.");
      accumulator = operation === "GT" ? left > right : operation === "LT" ? left < right : left === right;
      continue;
    }
    if (operation === "TON") {
      const preset = Number(parts[2]);
      if (parts.length !== 3 || !/^T[0-3]$/.test(address ?? "") || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(parts[2] ?? "") || !validNumber(preset) || preset < 0 || accumulator === undefined || usedTimerCoils.has(address)) return fail("TON requires an initialized Boolean condition, a unique T0–T3 timer, and a non-negative preset in seconds.");
      usesTimers = true;
      usedTimerCoils.add(address);
      const previous = timers[address as keyof PlcTimerStates].elapsedSeconds;
      const elapsedSeconds = accumulator ? Math.round((previous + deltaSeconds) * 1e9) / 1e9 : 0;
      if (!validNumber(elapsedSeconds)) return fail("Timer elapsed time exceeds the safe numeric range.");
      timers[address as keyof PlcTimerStates] = { elapsedSeconds, done: accumulator && elapsedSeconds >= preset };
      continue;
    }
    if (parts.length !== 2) return fail(`Expected operation and address: ${instruction}`);
    if (["LDP", "LDF", "ANDP", "ANDF", "ORP", "ORF", "XORP", "XORF"].includes(operation)) {
      if (!["I0", "I1"].includes(address)) return fail("Edge contacts require I0 or I1.");
      const current = address === "I0" ? inputA : inputB;
      const previous = previousInputs[address === "I0" ? 0 : 1] === true;
      const pulse = operation.endsWith("P") ? current && !previous : previous && !current;
      if (operation.startsWith("LD")) accumulator = pulse;
      else {
        if (accumulator === undefined) return fail("Logic instructions require a preceding LD/LDN.");
        accumulator = operation.startsWith("AND") ? accumulator && pulse : operation.startsWith("OR") ? accumulator || pulse : accumulator !== pulse;
      }
      continue;
    }
    if (["OUT", "SET", "RESET"].includes(operation)) {
      if (accumulator === undefined || (!["Q0", "Q1"].includes(address) && !/^M[0-7]$/.test(address ?? ""))) return fail("Output instructions require Q0, Q1 or M0–M7 and a preceding LD/LDN.");
      if (address === "Q0" || address === "Q1") {
        if (address === "Q0") { output = operation === "OUT" ? accumulator : operation === "SET" ? output || accumulator : output && !accumulator; assigned = true; }
        else { output1 = operation === "OUT" ? accumulator : operation === "SET" ? output1 || accumulator : output1 && !accumulator; assignedOutput1 = true; }
      } else {
        const index = Number(address.slice(1));
        memory[index] = operation === "OUT" ? accumulator : operation === "SET" ? memory[index] || accumulator : memory[index] && !accumulator;
        usesMemory = true;
      }
      continue;
    }
    if (!["LD", "LDN", "AND", "ANDN", "OR", "ORN", "XOR", "XORN"].includes(operation)) return fail(`Unsupported operation: ${operation}`);
    if (!["I0", "I1", "Q0", "Q1", "T0", "T1", "T2", "T3"].includes(address) && !/^M[0-7]$/.test(address ?? "")) return fail(`Unsupported address: ${address}`);
    const value = address === "I0" ? inputA : address === "I1" ? inputB : address === "Q0" ? output : address === "Q1" ? output1 : address?.startsWith("T") ? timers[address as keyof PlcTimerStates].done : memory[Number(address?.slice(1))];
    if (address?.startsWith("T")) usesTimers = true;
    if (address?.startsWith("M")) usesMemory = true;
    if (operation === "LD" || operation === "LDN") accumulator = operation === "LD" ? value : !value;
    else {
      if (accumulator === undefined) return fail("Logic instructions require a preceding LD/LDN.");
      if (operation === "AND") accumulator = accumulator && value;
      if (operation === "ANDN") accumulator = accumulator && !value;
      if (operation === "OR") accumulator = accumulator || value;
      if (operation === "ORN") accumulator = accumulator || !value;
      if (operation === "XOR") accumulator = accumulator !== value;
      if (operation === "XORN") accumulator = accumulator !== !value;
    }
  }
  if (stack.length) return fail("Boolean branch stack is not balanced.");
  return assigned || assignedOutput1 ? { ok: true, output, ...(assignedOutput1 ? { output1 } : {}), ...(usesRegisters ? { registers } : {}), ...(usesMemory ? { memory } : {}), ...(usesTimers ? { timers } : {}) } : fail("Program must assign Q0 or Q1.");
}

