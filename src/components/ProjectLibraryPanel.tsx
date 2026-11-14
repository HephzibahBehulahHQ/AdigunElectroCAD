import { useState } from "react";
import type { ProjectTemplate } from "../projects/templateLibrary";
import type { TemplateVerification } from "../projects/templateVerification";

function ProjectPreview({ template }: { template: ProjectTemplate }) {
  const components = template.document.components;
  const positions = new Map(components.map((component) => [component.id, component]));
  const left = Math.min(...components.map((component) => component.x)) - 65;
  const top = Math.min(...components.map((component) => component.y)) - 45;
  const width = Math.max(...components.map((component) => component.x)) - left + 65;
  const height = Math.max(...components.map((component) => component.y)) - top + 45;
  return <svg className="project-preview" viewBox={`${left} ${top} ${width} ${height}`} role="img" aria-label={`${template.name} topology preview`}>
    {template.document.wires.map((wire) => {
      const from = positions.get(wire.from.componentId); const to = positions.get(wire.to.componentId);
      return from && to ? <path key={wire.id} d={`M${from.x} ${from.y}H${(from.x + to.x) / 2}V${to.y}H${to.x}`} fill="none" stroke="#c02c3a" strokeWidth="4" /> : null;
    })}
    {components.map((component) => <g key={component.id}>
      <rect x={component.x - 38} y={component.y - 19} width="76" height="38" rx="4" fill="#edf5ff" stroke="#284e76" strokeWidth="3" />
      <text x={component.x} y={component.y + 7} textAnchor="middle" fontSize="22" fontWeight="700" fill="#153755">{component.reference}</text>
    </g>)}
  </svg>;
}

export function ProjectLibraryPanel({ active, templates, selected, verification, onSelect, onLoad }: {
  active: boolean;
  templates: ProjectTemplate[];
  selected: ProjectTemplate;
  verification: TemplateVerification;
  onSelect: (id: string) => void;
  onLoad: () => void;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const filtered = templates.filter((template) => (!level || template.level === level) && (!category || template.category === category) && `${template.name} ${template.category} ${template.id}`.toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 5, currentPage * 5 + 5);
  return <section className="dock-content project-library-panel" aria-label="Project library" hidden={!active}>
    <div className="panel-title"><strong>Project Library</strong><span>{templates.length} entries</span></div>
    <div className="project-browser-controls">
      <input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
      <div className="project-filters">
        <select aria-label="Project level" value={level} onChange={(event) => { setLevel(event.target.value); setPage(0); }}><option value="">All levels</option>{[...new Set(templates.map((template) => template.level))].map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Project category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }}><option value="">All categories</option>{[...new Set(templates.map((template) => template.category))].map((value) => <option key={value}>{value}</option>)}</select>
      </div>
    </div>
    <div className="project-card-list">
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
      <strong>{selected.name}</strong><p>{selected.description}</p>
      <details><summary>Operating sequence</summary><ol>{selected.testSequence.map((step, index) => <li key={index}>{step}</li>)}</ol></details>
      <p className={verification.passed ? "template-verification pass" : "template-verification issue"}>{verification.passed ? "✓ Topology and recorded model checks passed." : verification.failedExpectations.join(" ")}</p>
      <button className="primary wide" onClick={onLoad}>Load into free sheet</button>
    </section>
  </section>;
}

