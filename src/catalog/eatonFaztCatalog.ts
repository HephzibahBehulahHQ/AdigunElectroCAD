import type { ElectricalComponentDefinition } from "../types/electrical";
import { numberedBreakerPoles } from "./numberedBreakerPoles";

const sourceUrl = "https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/circuit-breakers/arc-fault-detection-device/documentation/es/eaton-user-guide-pd-es-es.pdf";
const terminalDiagrams = "https://www.eaton.com/content/dam/eaton/products/low-voltage-power-distribution-controls-systems/Eaton%20EA%20Low%20Voltage%20Final%20Distribution%20Catalogue.pdf";
// Rated current, pole designation, then Eaton article numbers for curves B, C and D.
const orderRows = [
  [1, "1", 240770, 240798, 240810],
  [2, "1", 240771, 240799, 240811],
  [3, "1", 240772, 240800, 240812],
  [4, "1", 240777, 240801, 240813],
  [6, "1", 240782, 240802, 240814],
  [10, "1", 240787, 240803, 240815],
  [16, "1", 240795, 240807, 240819],
  [20, "1", 240796, 240808, 142481],
  [25, "1", 240797, 240809, 142482],
  [32, "1", 141907, 141909, 142483],
  [40, "1", 141908, 142480, 142484],
  [1, "1N", 240994, 241022, 241048],
  [2, "1N", 240995, 241023, 241051],
  [3, "1N", 240996, 241024, 241052],
  [4, "1N", 240997, 241025, 241053],
  [6, "1N", 240998, 241026, 241054],
  [10, "1N", 240999, 241027, 241055],
  [16, "1N", 241009, 241034, 241059],
  [20, "1N", 241015, 241038, 142513],
  [25, "1N", 241019, 241044, 142514],
  [32, "1N", 142509, 142511, 142515],
  [40, "1N", 142510, 142512, 142516],
  [1, "2", 240820, 240832, 240864],
  [2, "2", 240821, 240833, 240865],
  [3, "2", 240822, 240838, 240866],
  [4, "2", 240823, 240843, 240867],
  [6, "2", 240824, 240850, 240868],
  [10, "2", 240825, 240855, 240869],
  [16, "2", 240829, 240861, 240873],
  [20, "2", 240830, 240862, 142489],
  [25, "2", 240831, 240863, 142490],
  [32, "2", 142485, 142487, 142491],
  [40, "2", 142486, 142488, 142492],
  [1, "3", 240874, 240886, 240898],
  [2, "3", 240875, 240887, 240899],
  [3, "3", 240876, 240888, 240900],
  [4, "3", 240877, 240889, 240901],
  [6, "3", 240878, 240890, 240902],
  [10, "3", 240879, 240891, 240903],
  [16, "3", 240883, 240895, 240915],
  [20, "3", 240884, 240896, 142497],
  [25, "3", 240885, 240897, 142498],
  [32, "3", 142493, 142495, 142499],
  [40, "3", 142494, 142496, 142500],
  [1, "3N", 241060, 241120, 241180],
  [2, "3N", 241065, 241125, 241181],
  [3, "3N", 241070, 241130, 241182],
  [4, "3N", 241075, 241135, 241183],
  [6, "3N", 241080, 241140, 241184],
  [10, "3N", 241085, 241145, 241185],
  [16, "3N", 241105, 241165, 241189],
  [20, "3N", 241110, 241170, 142521],
  [25, "3N", 241115, 241175, 142522],
  [32, "3N", 142517, 142519, 142523],
  [40, "3N", 142518, 142520, 142524],
  [1, "4", 240922, 240940, 240968],
  [2, "4", 240927, 240941, 240969],
  [3, "4", 240930, 240945, 240970],
  [4, "4", 240931, 240949, 240971],
  [6, "4", 240932, 240955, 240975],
  [10, "4", 240933, 240959, 240979],
  [16, "4", 240937, 240965, 240993],
  [20, "4", 240938, 240966, 142505],
  [25, "4", 240939, 240967, 142506],
  [32, "4", 142501, 142503, 142507],
  [40, "4", 142502, 142504, 142508],
] as const;
const curves = ["B", "C", "D"] as const;

export const eatonFaztCatalog: ElectricalComponentDefinition[] = orderRows.flatMap(([ratedCurrentA, designation, ...articles]) => {
  const switchedNeutral = designation.endsWith("N");
  const protectedPoles = Number(designation[0]);
  const poles = protectedPoles + Number(switchedNeutral);
  const { branches, terminals } = numberedBreakerPoles(poles);
  const neutralTerminals = switchedNeutral ? branches.at(-1)! : [];
  const labeledTerminals = terminals.map(terminal => neutralTerminals.includes(terminal.id) ? { ...terminal, label: "N" } : terminal);
  return articles.map((article, index): ElectricalComponentDefinition => {
    const curve = curves[index];
    const orderCode = "FAZT-" + curve + ratedCurrentA + "/" + designation;
    const icnKa = ratedCurrentA >= (curve === "D" ? 20 : 32) ? 10 : 15;
    return {
      id: "eaton." + orderCode.toLowerCase().replace("/", "-"),
      name: "Eaton " + orderCode + " · " + article,
      category: "Protection Devices", referencePrefix: "Q",
      symbolId: "breaker-acti9-" + poles + (switchedNeutral ? "pn" : "p"),
      description: "FAZ-T xEffect miniature circuit breaker, " + protectedPoles + (switchedNeutral ? "P+N" : "P") + ".",
      terminals: labeledTerminals,
      manufacturerRecord: {
        manufacturer: "Eaton", series: "FAZ-T xEffect", orderCode, sourceUrl, terminalMap: "verified",
        documentRevision: "Eaton Aparamenta Modular, FAZ-T B/C/D order table; Eaton EA Final Distribution Catalogue, p. 59 wiring diagrams",
        topology: { type: "mechanically-linked-breaker", closed: branches, open: [], protectedPoles, neutralTerminals },
      },
      propertiesSchema: { ratedCurrentA, curve, articleNumber: String(article), icnKa, switchedNeutral, closed: true },
      simulationModelId: "catalog-circuit-breaker", simulationSupport: "connectivity",
      documentation: "Manual switching controls all contacts. The catalog Icn is the IEC/EN 60898-1 rating at 230/400 VAC as applicable. Trip timing and protection coordination are outside simulation scope.",
      standardsReferences: ["IEC/EN 60898-1", "IEC/EN 60947-2", sourceUrl, terminalDiagrams],
    };
  });
});
