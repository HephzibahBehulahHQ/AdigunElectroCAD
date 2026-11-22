import { useState } from "react";
import type { ProjectTemplate } from "../projects/templateLibrary";
import { verifyProjectTemplate, type TemplateVerification } from "../projects/templateVerification";
import type { CircuitDocument } from "../types/electrical";
import { SOURCE_BACKED_DOL_TEMPLATE_ID } from "../projects/sourcedDolTemplate";

import { catalogById } from "../catalog/dolCatalog";
import { componentFootprint, componentLabelOffsets } from "../cad/componentGeometry";
import { endpointKey, terminalAnchors } from "../cad/terminalAnchors";
import { orthogonalWirePath } from "../cad/wirePath";
import { GenericSymbol, SixTerminalWindings } from "./Schematic";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "./functionalSymbols";

function ProjectPreview({ template }: { template: ProjectTemplate }) {
  const { document } = template;
  const anchors = terminalAnchors(document);
  const byEndpoint = new Map(anchors.map((anchor) => [endpointKey(anchor.endpoint), anchor]));
  const bounds = document.components.map(({ x, y, rotation, definitionId, size }) => componentFootprint(x, y, rotation, definitionId, size));
  const routePoints = [...anchors, ...document.wires.flatMap(({ points }) => points)];
  const left = Math.min(1100, ...bounds.map((item) => item.left), ...routePoints.map(({ x }) => x)) - 12;
  const top = Math.min(780, ...bounds.map((item) => item.top), ...routePoints.map(({ y }) => y)) - 12;
  const right = Math.max(left + 1, ...bounds.map((item) => item.right), ...routePoints.map(({ x }) => x)) + 12;
  const bottom = Math.max(top + 1, ...bounds.map((item) => item.bottom), ...routePoints.map(({ y }) => y)) + 12;
  return <svg className="project-preview" viewBox={`${left} ${top} ${right - left} ${bottom - top}`} role="img" aria-label={`${template.name} topology preview`}>
    {document.wires.map((wire) => {
      const from = byEndpoint.get(endpointKey(wire.from));
      const to = byEndpoint.get(endpointKey(wire.to));
      return from && to ? <path key={wire.id} d={orthogonalWirePath(from, to, wire.points, from.vertical, to.vertical)} fill="none" stroke={wire.draftingColor ?? "#c02c3a"} strokeWidth="4" /> : null;
    })}
    {document.components.map(({ id, definitionId, x, y, rotation, size = 1, reference, properties }) => {
      const definition = catalogById.get(definitionId);
      return <g key={id}>
        {definition && <g transform={`translate(${x} ${y}) scale(${size}) rotate(${rotation}) translate(${-x} ${-y})`}>
          {definition.simulationModelId === "six-terminal-windings" ? <SixTerminalWindings x={x} y={y} productName={definition.name} />
            : hasDedicatedFunctionalSymbol(definition.symbolId) ? <FunctionalSymbol x={x} y={y} symbolId={definition.symbolId} componentName={definition.name} properties={properties} />
            : <GenericSymbol x={x} y={y} symbolId={definition.symbolId} />}
        </g>}
        <text x={x} y={y + componentLabelOffsets(rotation, definitionId).reference * size} textAnchor="middle" className="free-reference">{reference}</text>
      </g>;
    })}
  </svg>;
}

export function ProjectLibraryPanel({ active, templates, selected, verification, activeDocument, onSelect, onLoad, onOpenWorkbook, onOpenFourSheetWorkbook, onOpenStarDeltaWorkbook, onOpenReversingWorkbook, onOpenTwoMotorWorkbook, onOpenAnalogWorkbook, onOpenPneumaticWorkbook, onOpenPlcSensorWorkbook, onOpenVfdWorkbook }: {
  active: boolean;
  templates: ProjectTemplate[];
  selected: ProjectTemplate;
  verification: TemplateVerification;
  activeDocument?: CircuitDocument;
  onSelect: (id: string) => void;
  onLoad: () => void;
  onOpenWorkbook: () => void;
  onOpenFourSheetWorkbook: () => void;
  onOpenStarDeltaWorkbook: () => void;
  onOpenReversingWorkbook: () => void;
  onOpenTwoMotorWorkbook: () => void;
  onOpenAnalogWorkbook?: () => void;
  onOpenPneumaticWorkbook?: () => void;
  onOpenPlcSensorWorkbook?: () => void;
  onOpenVfdWorkbook?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [checkedSheet, setCheckedSheet] = useState<{ templateId: string; document: CircuitDocument; result: TemplateVerification }>();
  const matchingDocument = activeDocument?.id === selected.document.id ? activeDocument : undefined;
  const currentCheck = matchingDocument && checkedSheet?.document === matchingDocument && checkedSheet.templateId === selected.id ? checkedSheet.result : undefined;
  const displayedVerification = currentCheck ?? verification;
  const filtered = templates.slice().sort((a, b) => Number(b.id === SOURCE_BACKED_DOL_TEMPLATE_ID) - Number(a.id === SOURCE_BACKED_DOL_TEMPLATE_ID)).filter((template) => (!level || template.level === level) && (!category || template.category === category) && `${template.name} ${template.category} ${template.id}`.toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 5, currentPage * 5 + 5);
  return <section className="dock-content project-library-panel" aria-label="Project library" hidden={!active}>
    <div className="project-menu-selection">
      <div className="project-menu-selection-copy"><span>Selected project</span><strong title={selected.name}>{selected.name}</strong><small className={verification.passed ? "template-verification pass" : "template-verification issue"}>{verification.passed ? "Verified and ready" : "Verification needs review"}</small></div>
      <button className="primary wide" onClick={onLoad}>Load into Free Sheet</button>
      {selected.id === "analog-level-plc-threshold" && onOpenAnalogWorkbook && <button className="wide workbook-open" onClick={onOpenAnalogWorkbook}>Open 4-sheet analog level project</button>}
      {selected.id === "pneumatic-double" && onOpenPneumaticWorkbook && <button className="wide workbook-open" onClick={onOpenPneumaticWorkbook}>Open 4-sheet cylinder control</button>}
      {selected.id === "plc-proximity-solenoid-hold" && onOpenPlcSensorWorkbook && <button className="wide workbook-open" onClick={onOpenPlcSensorWorkbook}>Open 3-sheet PLC sensor control</button>}
      {selected.id === "vfd-motor-feeder" && onOpenVfdWorkbook && <button className="wide workbook-open" onClick={onOpenVfdWorkbook}>Open 4-sheet VFD feeder</button>}
    </div>
    <div className="project-browser-controls">
      <input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
      <div className="project-filters">
        <select aria-label="Project level" value={level} onChange={(event) => { setLevel(event.target.value); setPage(0); }}><option value="">All levels</option>{[...new Set(templates.map((template) => template.level))].map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Project category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }}><option value="">All categories</option>{[...new Set(templates.map((template) => template.category))].map((value) => <option key={value}>{value}</option>)}</select>
      </div>
    </div>
    <div className="project-card-list" aria-label="Matching projects">
      {!visible.length && <p className="catalog-empty">No projects match these filters.</p>}
      {visible.map((template) => <button className={template.id === selected.id ? "project-card selected" : "project-card"} key={template.id} onClick={() => onSelect(template.id)} aria-pressed={template.id === selected.id}>
        <ProjectPreview template={template} />
        <span><strong>{template.name}</strong><small>{template.level} · {template.category}</small></span>
      </button>)}
    </div>
    <nav className="project-pagination" aria-label="Project pages">
      <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Previous project page">‹</button>
      <span>{currentPage + 1} / {pages}</span>
      <button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} aria-label="Next project page">›</button>
      <small>{filtered.length ? currentPage * 5 + 1 : 0}–{Math.min((currentPage + 1) * 5, filtered.length)} of {filtered.length}</small>
    </nav>
    <section className="template-library">
      <details className="project-information"><summary>Project details and operating sequence</summary><strong>{selected.name}</strong><p>{selected.description}</p><ol>{selected.testSequence.map((step, index) => <li key={index}>{step}</li>)}</ol>{matchingDocument && <button type="button" className="wide workbook-open" onClick={() => setCheckedSheet({
        templateId: selected.id,
        document: matchingDocument,
        result: verifyProjectTemplate({ ...selected, document: matchingDocument }, catalogById),
      })}>Check active sheet</button>}
        <p role="status">{currentCheck ? "Active sheet verification" : "Library example verification"}</p>
        <p className={displayedVerification.passed ? "template-verification pass" : "template-verification issue"}>{displayedVerification.passed ? "✓ Topology, drawing clearance and recorded model checks passed." : [...displayedVerification.topologyIssues.map(({ message }) => message), ...displayedVerification.failedExpectations].join(" ")}</p>
        {displayedVerification.sequenceResults.length > 0 && <details>
          <summary>Recorded check results</summary>
          <ol>{displayedVerification.sequenceResults.map((step, index) => {
            const checks = selected.operatingSequence?.[index].expectations ?? [];
            return <li key={index}>
              <strong>{step.passed ? "Passed" : "Failed"}</strong> · {step.name}
              <ul>{checks.map(({ reference, label }, checkIndex) => {
                const result = step.runs.find((run) => run.reference === reference && run.output.label === label);
                return <li key={checkIndex}>{reference} · {label} · {result?.output.value ?? "No matching result"}</li>;
              })}
              {step.failures.map((failure, failureIndex) => <li key={"failure-" + failureIndex}>{failure}</li>)}</ul>
            </li>;
          })}</ol>
        </details>}
      </details>
      {selected.id === SOURCE_BACKED_DOL_TEMPLATE_ID && <details className="project-workbooks"><summary>Open multi-sheet version</summary><button className="wide workbook-open" onClick={onOpenFourSheetWorkbook}>Open 4-sheet DOL project</button><button className="wide workbook-open" onClick={onOpenWorkbook}>Open 10-sheet feeder workbook</button></details>}
      {selected.id === "wired-star-delta-control" && <details className="project-workbooks"><summary>Open multi-sheet version</summary><button className="wide workbook-open" onClick={onOpenStarDeltaWorkbook}>Open 4-sheet star–delta project</button></details>}
      {selected.id === "wired-reversing-interlocks" && <details className="project-workbooks"><summary>Open multi-sheet version</summary><button className="wide workbook-open" onClick={onOpenReversingWorkbook}>Open 4-sheet reversing project</button></details>}
      {selected.id === "two-motor-sequence" && <details className="project-workbooks"><summary>Open multi-sheet version</summary><button className="wide workbook-open" onClick={onOpenTwoMotorWorkbook}>Open 4-sheet two-motor project</button></details>}
    </section>
  </section>;
}
