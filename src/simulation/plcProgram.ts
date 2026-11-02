export type PlcScanResult = { ok: true; output: boolean } | { ok: false; output: false; error: string };

/** Small Boolean instruction-list interpreter: two inputs and one retained output. */
export function scanPlcProgram(program: string, inputA: boolean, inputB: boolean, previousOutput: boolean): PlcScanResult {
  const instructions = program.split(/[;\n]/).map((line) => line.trim().toUpperCase()).filter(Boolean);
  const fail = (error: string): PlcScanResult => ({ ok: false, output: false, error });
  if (!instructions.length || instructions.length > 32) return fail("Program requires 1–32 instructions.");
  let accumulator: boolean | undefined;
  let output = previousOutput;
  let assigned = false;
  for (const instruction of instructions) {
    const parts = instruction.split(/\s+/);
    const [operation, address] = parts;
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
  return assigned ? { ok: true, output } : fail("Program must assign Q0.");
}
