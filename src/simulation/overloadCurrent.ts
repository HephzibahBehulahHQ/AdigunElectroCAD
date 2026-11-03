/** Nominal balanced load current on a directed, ideal conducting power graph. */
export interface NominalCurrentLoad {
  reference: string;
  currentA: number;
  feeds: Array<{ source: string; terminal: string }>;
}
export interface OverloadCurrentPath { id: string; poles: Array<{ input: string; output: string }>; }
export interface OverloadCurrentResult { phaseCurrentsA: number[]; currentA: number; error?: string; }

/**
 * Internal relay edges must be appended after wire edges. Removing the LAST
 * matching edge removes the relay conductor, preserving an explicit bypass wire.
 * A pole gets a load's current only if removing it disconnects that load phase.
 * If it is on a conducting path but not necessary, current division is unknown.
 */
export function traceOverloadCurrents(graph: ReadonlyMap<string, readonly string[]>, overloads: OverloadCurrentPath[], loads: NominalCurrentLoad[], unsupportedTransferNodes: string[] = []): Map<string, OverloadCurrentResult> {
  const reachable = (start: string, omitted?: { input: string; output: string }) => {
    const seen = new Set([start]);
    const queue = [start];
    for (let index = 0; index < queue.length; index++) {
      const node = queue[index], edges = graph.get(node) ?? [];
      const skip = omitted?.input === node ? edges.lastIndexOf(omitted.output) : -1;
      for (let i = 0; i < edges.length; i++) if (i !== skip && !seen.has(edges[i])) { seen.add(edges[i]); queue.push(edges[i]); }
    }
    return seen;
  };
  const reachCache = new Map<string, Set<string>>();
  const reach = (start: string) => {
    if (!reachCache.has(start)) reachCache.set(start, reachable(start));
    return reachCache.get(start)!;
  };
  return new Map(overloads.map(overload => {
    const phaseCurrentsA = overload.poles.map(() => 0);
    const errors = new Set<string>();
    for (const load of loads) for (const feed of load.feeds) {
      const fromSource = reach(feed.source);
      if (!fromSource.has(feed.terminal)) continue;
      overload.poles.forEach((pole, index) => {
        if (!fromSource.has(pole.input) || !reach(pole.output).has(feed.terminal)) return;
        if (!(graph.get(pole.input) ?? []).includes(pole.output)) return;
        if (reachable(feed.source, pole).has(feed.terminal)) {
          errors.add(`Parallel or bypassed power path to ${load.reference}; relay current division is not modeled.`);
        } else if (unsupportedTransferNodes.some(node => fromSource.has(node) && reach(node).has(feed.terminal))) {
          errors.add(`Unsupported power conversion on the feeder to ${load.reference}; nominal relay current is unavailable.`);
        } else if (!Number.isFinite(load.currentA) || load.currentA < 0) {
          errors.add(`Invalid nominal load current at ${load.reference}.`);
        } else {
          phaseCurrentsA[index] += load.currentA;
          if (!Number.isFinite(phaseCurrentsA[index])) errors.add("Summed load current exceeds the supported numerical range.");
        }
      });
    }
    const error = errors.size ? [...errors].sort().join(" ") : undefined;
    // Never present a partial computed sum as a valid measured current.
    return [overload.id, { phaseCurrentsA: error ? [] : phaseCurrentsA, currentA: error ? 0 : Math.max(0, ...phaseCurrentsA), ...(error ? { error } : {}) }];
  }));
}
