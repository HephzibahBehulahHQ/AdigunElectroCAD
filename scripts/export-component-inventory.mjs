import { writeFile } from "node:fs/promises";
import { build } from "esbuild";

const { outputFiles } = await build({
  entryPoints: ["src/catalog/dolCatalog.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const catalog = await import("data:text/javascript;base64," + Buffer.from(outputFiles[0].contents).toString("base64"));
const visible = new Set(catalog.componentLibraryCatalog.map(({ id }) => id));
const knownParts = new Map([
  ["overload.thermal", ["Siemens", "SIRIUS", "3RU2126-4AB0"]],
  ["iec.industrial-miniature-breaker.01", ["Siemens", "SENTRON", "5SY6332-7"]],
  ["iec.dc-control-supply.01", ["Siemens", "SITOP PSU100C", "6EP1332-5BA10"]],
  ["iec.motor-starter.01", ["Siemens", "SIRIUS", "3RT2025-1BB40"]],
  ["iec.induction-motor.01", ["Siemens", "SIMOTICS GP", "1LE1003-1CB23-4AA4"]],
  ["iec.induction-motor.41", ["Siemens", "SIMOTICS GP", "1LE1003-1CB23-4AA4"]],
  ["iec.safety-relay.01", ["Pilz", "PNOZ X2.7P", "777305"]],
]);
const records = catalog.componentCatalog.map(definition => {
  const { id, name, category, symbolId, terminals, simulationModelId, simulationSupport, propertiesSchema, standardsReferences, description, documentation } = definition;
  const verified = definition.manufacturerRecord;
  const [manufacturer, series, orderCode] = verified ? [verified.manufacturer, verified.series, verified.orderCode] : knownParts.get(id) ?? [];
  const links = [...new Set([...standardsReferences, documentation].flatMap(value =>
    (value.match(/https?:\/\/[^\s]+/g) ?? []).map(url => url.replace(/[.,;]+$/, "")),
  ))];
  return {
    id, name, category, family: id.replace(/^generic\./, "").replace(/\.\d{2}$/, ""),
    function: description, visible: visible.has(id),
    recordKind: verified ? "manufacturer-part" : orderCode ? "manufacturer-candidate" : id.startsWith("user.") ? "custom-profile" : visible.has(id) ? "engineering-profile" : "legacy-definition",
    manufacturer: manufacturer ?? null, series: series ?? null, orderCode: orderCode ?? null,
    sources: links, references: standardsReferences, symbolFamily: symbolId,
    terminals, verifiedPhysicalTerminalMap: !!verified, internalTopology: verified ? { nodes: [], branches: [], reason: verified.terminalMap } : null,
    model: simulationModelId, support: simulationSupport, simulationNotes: documentation, properties: propertiesSchema,
    status: verified ? "source-verified mechanical CAD part" : orderCode ? "source-referenced; full acceptance pending" : "engineering profile; no manufacturer order code",
  };
});
if (new Set(records.map(({ id }) => id)).size !== records.length) throw new Error("Duplicate component definition IDs");
for (const { id, terminals } of records) {
  if (new Set(terminals.map(terminal => terminal.id)).size !== terminals.length) throw new Error("Duplicate terminal IDs in " + id);
}
const verifiedParts = records.filter(record => record.recordKind === "manufacturer-part");
if (new Set(verifiedParts.map(record => record.manufacturer + ":" + record.orderCode)).size !== verifiedParts.length) {
  throw new Error("Duplicate verified manufacturer order code");
}
const summary = {
  resolverDefinitions: records.length,
  selectableDefinitions: records.filter(record => record.visible).length,
  distinctSymbolIds: new Set(records.map(record => record.symbolFamily)).size,
  simulationModels: new Set(records.filter(record => record.model !== "none").map(record => record.model)).size,
  manufacturerCandidateDefinitions: records.filter(record => record.recordKind === "manufacturer-candidate").length,
  distinctCandidateOrderCodes: new Set(records.filter(record => record.recordKind === "manufacturer-candidate").map(record => record.manufacturer + ":" + record.orderCode)).size,
  sourceVerifiedMechanicalParts: records.filter(record => record.recordKind === "manufacturer-part").length,
  verifiedPhysicalTerminalMaps: records.filter(record => record.verifiedPhysicalTerminalMap).length,
  customProfiles: records.filter(record => record.recordKind === "custom-profile").length,
  nonSelectableDefinitions: records.filter(record => !record.visible).length,
};
const json = '{\n  "schemaVersion": 1,\n  "summary": ' + JSON.stringify(summary) + ',\n  "records": [\n' +
  records.map(record => "    " + JSON.stringify(record)).join(",\n") + "\n  ]\n}\n";
await writeFile("docs/component-inventory.json", json, "utf8");
console.log(summary);
