export type LadderAddress = "I0" | "I1" | "Q0";
export interface LadderContact { address: LadderAddress; inverted: boolean; edge?: "positive" | "negative"; }
export interface LadderRung { stages: LadderContact[][]; coil: "OUT" | "SET" | "RESET"; }
export const defaultLadder = (): LadderRung[] => [{ stages: [[{ address: "I0", inverted: false }]], coil: "OUT" }];

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
