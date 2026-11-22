import type { TerminalDefinition } from "../types/electrical";

export function numberedBreakerPoles(poles: number) {
  const branches = Array.from({ length: poles }, (_, index) => ["l" + (index + 1) + "-in", "l" + (index + 1) + "-out"]);
  const terminals = branches.flatMap(([line, load], index): TerminalDefinition[] => {
    const x = (index - (poles - 1) / 2) * 24;
    return [
      { id: line, label: String(index * 2 + 1), kind: "power", direction: "bidirectional", position: { x, y: -27, vertical: true } },
      { id: load, label: String(index * 2 + 2), kind: "power", direction: "bidirectional", position: { x, y: 27, vertical: true } },
    ];
  });
  return { branches, terminals };
}
