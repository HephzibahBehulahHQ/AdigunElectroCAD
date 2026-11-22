import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const sourceUrl = "https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/circuit-breakers/arc-fault-detection-device/documentation/es/eaton-user-guide-pd-catalog-es-es.pdf";
const terminalDiagrams = "https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/circuit-breakers/faz6-xeffect-miniature-circuit-breaker/eaton-xeffect-faz6-mcb-catalog-ca003029de-de-de.pdf";
// Rated current, pole designation, then Eaton article numbers for curves B, C and D.
const orderRows = [
  [0.5, "1", null, null, 177392],
  [1, "1", 177373, 239030, 177393],
  [2, "1", 177376, 239031, 177484],
  [3, "1", 177378, 239032, 177486],
  [4, "1", 177380, 239033, 177488],
  [6, "1", 239001, 239034, 168061],
  [10, "1", 239006, 239035, 168062],
  [16, "1", 239016, 239037, 168063],
  [20, "1", 239023, 239038, 168064],
  [25, "1", 239024, 239039, 168065],
  [32, "1", 239025, 239040, 168066],
  [40, "1", 239026, 239041, 168067],
  [50, "1", 239027, 239042, 168068],
  [63, "1", 239028, 239043, 168069],
  [0.5, "1N", null, 239054, 177517],
  [1, "1N", 177494, 239055, 177518],
  [2, "1N", 177497, 239056, 177521],
  [3, "1N", 177499, 239057, 177523],
  [4, "1N", 177501, 239058, 177527],
  [6, "1N", 239044, 239059, 177528],
  [10, "1N", 239045, 239060, 177529],
  [16, "1N", 239047, 239066, 177533],
  [20, "1N", 239048, 239071, 177534],
  [25, "1N", 239049, 239076, 177535],
  [32, "1N", 239050, 239081, 177536],
  [40, "1N", 239051, 239082, 177537],
  [50, "1N", 239052, 239083, 177538],
  [63, "1N", 239053, 239084, 177539],
  [0.5, "2", null, 239095, 177563],
  [1, "2", 177540, 239096, 177564],
  [2, "2", 177543, 239097, 177567],
  [3, "2", 177545, 239098, 177596],
  [4, "2", 177547, 239099, 177571],
  [6, "2", 239085, 239100, 168070],
  [10, "2", 239086, 239101, 168071],
  [16, "2", 239088, 239103, 168072],
  [20, "2", 239089, 239104, 168073],
  [25, "2", 239090, 239105, 168074],
  [32, "2", 239091, 239106, 168075],
  [40, "2", 239092, 239107, 168076],
  [50, "2", 239093, 239108, 168077],
  [63, "2", 239094, 239109, null],
  [0.5, "3", null, 239120, 177408],
  [1, "3", 177578, 239121, 177409],
  [2, "3", 177580, 239122, 177436],
  [3, "3", 177582, 239127, 177438],
  [4, "3", 177584, 239132, 177440],
  [6, "3", 239110, 239139, 168079],
  [10, "3", 239111, 239144, 168080],
  [16, "3", 239113, 239148, 168081],
  [20, "3", 239114, 239149, 168082],
  [25, "3", 239115, 239150, 168083],
  [32, "3", 239116, 239151, 168084],
  [40, "3", 239117, 239152, 168085],
  [50, "3", 239118, 239153, 168086],
  [63, "3", 239119, 239154, 168087],
  [0.5, "3N", null, 239165, 177469],
  [1, "3N", 177446, 239166, 177470],
  [2, "3N", 177449, 239167, 177473],
  [3, "3N", 177451, 239168, 177475],
  [4, "3N", 177453, 239169, 177477],
  [6, "3N", 239155, 239170, 177479],
  [10, "3N", 239156, 239171, 177481],
  [16, "3N", 239158, 239173, 177413],
  [20, "3N", 239159, 239174, 177414],
  [25, "3N", 239160, 239175, 177415],
  [32, "3N", 239161, 239176, 177416],
  [40, "3N", 239162, 239177, 177417],
  [50, "3N", 239163, 239178, 177418],
  [63, "3N", 239164, 239179, 177419],
  [0.5, "4", null, 239190, 177599],
  [1, "4", 177420, 239191, 177600],
  [2, "4", 177422, 239192, 177603],
  [3, "4", 177425, 239193, 177605],
  [4, "4", 177427, 239194, 177607],
  [6, "4", 239180, 239199, 168088],
  [10, "4", 239181, 239204, 168089],
  [16, "4", 239183, 239216, 168090],
  [20, "4", 239184, 239219, 168091],
  [25, "4", 239185, 239220, 168092],
  [32, "4", 239186, 239221, 168093],
  [40, "4", 239187, 239222, 168094],
  [50, "4", 239188, 239223, 168095],
  [63, "4", 239189, 239224, null],
] as const;
const curves = ["B", "C", "D"] as const;

export const eatonFaz6Catalog: ElectricalComponentDefinition[] = orderRows.flatMap(([ratedCurrentA, designation, ...articles]) => {
  const switchedNeutral = designation.endsWith("N");
  const protectedPoles = Number(designation[0]);
  const poles = protectedPoles + Number(switchedNeutral);
  const { branches, terminals } = numberedBreakerPoles(poles);
  const neutralTerminals = switchedNeutral ? branches.at(-1)! : [];
  const labeledTerminals = terminals.map(terminal => neutralTerminals.includes(terminal.id) ? { ...terminal, label: "N" } : terminal);
  return articles.flatMap((article, index): ElectricalComponentDefinition[] => {
    if (article === null) return [];
    const curve = curves[index];
    const orderCode = "FAZ6-" + curve + ratedCurrentA + "/" + designation;
    const icnKa = 6;
    return [{
      id: "eaton." + orderCode.toLowerCase().replace("/", "-"),
      name: "Eaton " + orderCode + " · " + article,
      category: "Protection Devices", referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + (switchedNeutral ? "pn" : "p"),
      description: "FAZ6 xEffect miniature circuit breaker, " + protectedPoles + (switchedNeutral ? "P+N" : "P") + ".",
      terminals: labeledTerminals,
      manufacturerRecord: {
        manufacturer: "Eaton", series: "FAZ6 xEffect", orderCode, sourceUrl, terminalMap: "verified",
        documentRevision: "Eaton Aparamenta Modular, FAZ6 B/C/D order table; Eaton FAZ6 connection diagrams, CA003029DE",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles, neutralTerminals },
      },
      propertiesSchema: { ratedCurrentA, curve, articleNumber: String(article), icnKa, switchedNeutral, closed: true },
      simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
      documentation: "Manual switching controls all contacts. The catalog Icn is the IEC/EN 60898-1 rating at 230/400 VAC as applicable. Trip timing and protection coordination are outside simulation scope.",
      standardsReferences: ["IEC/EN 60898-1", "IEC/EN 60947-2", sourceUrl, terminalDiagrams],
    }];
  });
});
