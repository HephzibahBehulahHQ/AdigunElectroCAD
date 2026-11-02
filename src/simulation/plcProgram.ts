export const PLC_REGISTER_COUNT = 8;
export type PlcScanResult = { ok: true; output: boolean; registers?: number[] } | { ok: false; output: false; error: string };

/** Educational instruction-list scan with Boolean I/O and eight numeric registers. */
export function scanPlcProgram(program: string, inputA: boolean, inputB: boolean, previousOutput: boolean, analogInput0 = 0, previousRegisters?: readonly number[]): PlcScanResult {
  const instructions = program.split(/[;\n]/).map((line) => line.trim().toUpperCase()).filter(Boolean);
  const fail = (error: string): PlcScanResult => ({ ok: false, output: false, error });
  if (!instructions.length || instructions.length > 32) return fail("Program requires 1–32 instructions.");
  let accumulator: boolean | undefined;
  let output = previousOutput;
  let assigned = false;
  const registers = Array.from({ length: PLC_REGISTER_COUNT }, (_, index) => previousRegisters?.[index] ?? 0);
  let usesRegisters = previousRegisters !== undefined;
  const validNumber = (value: number) => Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
  const registerIndex = (address: string) => /^D[0-7]$/.test(address) ? Number(address.slice(1)) : -1;
  const readNumber = (operand: string): number => {
    const index = registerIndex(operand);
    if (index >= 0) { usesRegisters = true; return registers[index]; }
    if (operand === "AI0") return Number.isInteger(analogInput0) && analogInput0 >= 0 && analogInput0 <= 27648 ? analogInput0 : NaN;
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(operand) ? Number(operand) : NaN;
  };
  if (!registers.every(validNumber)) return fail("Register state must contain finite numbers within the safe numeric range.");
  for (const instruction of instructions) {
    const parts = instruction.split(/\s+/);
    const [operation, address] = parts;
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
    if (parts.length !== 2) return fail(`Expected operation and address: ${instruction}`);
    if (["OUT", "SET", "RESET"].includes(operation)) {
      if (address !== "Q0" || accumulator === undefined) return fail("Output instructions require Q0 and a preceding LD/LDN.");
      output = operation === "OUT" ? accumulator : operation === "SET" ? output || accumulator : output && !accumulator;
      assigned = true;
      continue;
    }
    if (!["LD", "LDN", "AND", "ANDN", "OR", "ORN", "XOR"].includes(operation)) return fail(`Unsupported operation: ${operation}`);
    if (!["I0", "I1", "Q0"].includes(address)) return fail(`Unsupported address: ${address}`);
    const value = address === "I0" ? inputA : address === "I1" ? inputB : output;
    if (operation === "LD" || operation === "LDN") accumulator = operation === "LD" ? value : !value;
    else {
      if (accumulator === undefined) return fail("Logic instructions require a preceding LD/LDN.");
      if (operation === "AND") accumulator = accumulator && value;
      if (operation === "ANDN") accumulator = accumulator && !value;
      if (operation === "OR") accumulator = accumulator || value;
      if (operation === "ORN") accumulator = accumulator || !value;
      if (operation === "XOR") accumulator = accumulator !== value;
    }
  }
  return assigned ? { ok: true, output, ...(usesRegisters ? { registers } : {}) } : fail("Program must assign Q0.");
}
