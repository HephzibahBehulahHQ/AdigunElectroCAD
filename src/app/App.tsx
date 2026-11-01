import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { catalogById, componentCatalog, dolCatalog } from "../catalog/dolCatalog";
import { canPlaceComponent, findOpenPlacement, moveComponent, removeComponent, rotateComponent, updateComponentProperty } from "../cad/documentOps";
import { recordProjectEdit, redoProject, undoProject, type ProjectHistory } from "../cad/projectHistory";
import { canConnectTerminals, validateCircuit } from "../electrical/topology";
import { addFreeSchematicSheet, createStarterProject, loadTemplateIntoSheet, replaceSheetDocument } from "../projects/starterProject";
import { templateLibrary } from "../projects/templateLibrary";
import { parseProjectJson } from "../projects/projectSerialization";
import { createProjectReport, reportCsv, type ProjectReport, type ReportSection } from "../reports/projectReport";
import { initialDolState, transitionDol, type DolAction, type DolSimulationState } from "../simulation/dolSimulator";
import type { CircuitDocument, ComponentInstance, ElectricalProject, TerminalEndpoint } from "../types/electrical";
import { Schematic } from "../components/Schematic";

type Locale = "en" | "de";
type Theme = "dark" | "light";

const copy = {
  en: {
    save: "Save locally", export: "Export JSON", restore: "Restore DOL starter", running: "Simulation running", stopped: "Simulation stopped", projectSaved: "Saved locally", projectRestored: "DOL project restored", validation: "Topology validation", valid: "No topology errors", unavailable: "Cloud accounts are not configured for this product.", limitations: "Supported model notice",
  },
  de: {
    save: "Lokal speichern", export: "JSON exportieren", restore: "DOL-Starter wiederherstellen", running: "Simulation läuft", stopped: "Simulation angehalten", projectSaved: "Lokal gespeichert", projectRestored: "DOL-Projekt wiederhergestellt", validation: "Topologieprüfung", valid: "Keine Topologiefehler", unavailable: "Cloud-Konten sind für dieses Produkt nicht konfiguriert.", limitations: "Hinweis zum unterstützten Modell",
  },
} as const;

const STORAGE_KEY = "adigun-electro-cad.project.v2";
const fixedReferenceComponentIds = new Set(["supply", "breaker", "contactor", "overload", "motor", "control", "stop", "start"]);

export function App() {
  const [project, setProject] = useState<ElectricalProject>(() => createStarterProject());
  const [activeSheetId, setActiveSheetId] = useState("sheet-dol");
  const [history, setHistory] = useState<ProjectHistory>({ undo: [], redo: [] });
  const [selectedComponentId, setSelectedComponentId] = useState("contactor");
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("contactor.three-pole");
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");
  const [locale, setLocale] = useState<Locale>("en");
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("DOL starter ready — local-only project storage.");
  const [simulation, setSimulation] = useState<DolSimulationState>(() => initialDolState());
  const [isRunning, setIsRunning] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wireMode, setWireMode] = useState(false);
  const [wireStart, setWireStart] = useState<TerminalEndpoint | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateLibrary[0].id);
  const [reportsOpen, setReportsOpen] = useState(false);
  const t = copy[locale];

  const activeSheet = project.sheets.find((sheet) => sheet.id === activeSheetId) ?? project.sheets[0];
  const document = activeSheet.document;
  const isReferenceSheet = activeSheet.kind === "reference-dol";
  const selectedComponent = document.components.find((component) => component.id === selectedComponentId);
  const selectedDefinition = catalogById.get(selectedDefinitionId) ?? componentCatalog[0];
  const selectedTemplate = templateLibrary.find((template) => template.id === selectedTemplateId) ?? templateLibrary[0];
  const topologyIssues = useMemo(() => validateCircuit(document, catalogById), [document]);
  const report = useMemo(() => createProjectReport(document, catalogById), [document]);
  const filteredCatalog = componentCatalog.filter((definition) => `${definition.name} ${definition.category} ${definition.referencePrefix}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    window.document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => setSimulation((state) => transitionDol(state, "tick", 100)), 100);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const restored = parseProjectJson(saved);
      const firstSheet = restored.sheets[0];
      setProject(restored);
      setActiveSheetId(firstSheet.id);
      setSelectedComponentId(firstSheet.document.components[0]?.id ?? "");
      setNotice(`${restored.name} restored from local storage.`);
    } catch {
      setNotice("The saved local project could not be restored. It was left unchanged for manual review.");
    }
  }, []);

  const recordEdit = (next: ElectricalProject) => {
    setHistory((state) => recordProjectEdit(state, project));
    setProject(next);
    setDirty(true);
  };

  const updateDocument = (next: CircuitDocument, saveHistory = true) => {
    const nextProject = replaceSheetDocument(project, activeSheet.id, next);
    if (saveHistory) recordEdit(nextProject);
    else setProject(nextProject);
  };

  const runAction = (action: DolAction) => {
    if (!isReferenceSheet) {
      setNotice("DOL simulation controls are available on the Power & Control Circuit sheet.");
      return;
    }
    setSimulation((state) => transitionDol(state, action));
    if (action === "reset") setIsRunning(false);
  };

  const saveLocally = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    setDirty(false);
    setNotice(t.projectSaved);
  };

  const loadLocalSave = () => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setNotice("No saved local project was found.");
      return;
    }
    try {
      const restored = parseProjectJson(saved);
      const firstSheet = restored.sheets[0];
      recordEdit(restored);
      setActiveSheetId(firstSheet.id);
      setSelectedComponentId(firstSheet.document.components[0]?.id ?? "");
      setWireMode(false);
      setWireStart(null);
      setDirty(false);
      setNotice(`${restored.name} restored from local storage.`);
    } catch {
      setNotice("The saved local project is invalid and was not loaded.");
    }
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "adigun-electro-cad-project.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Project JSON exported.");
  };

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const imported = parseProjectJson(await file.text());
      const firstSheet = imported.sheets[0];
      recordEdit(imported);
      setActiveSheetId(firstSheet.id);
      setSelectedComponentId(firstSheet.document.components[0]?.id ?? "");
      setWireMode(false);
      setWireStart(null);
      setDirty(true);
      setNotice(`${imported.name} imported locally. Save to keep this project copy.`);
    } catch (error) {
      setNotice(`Import rejected: ${error instanceof Error ? error.message : "Unable to read project."}`);
    }
  };

  const restoreDol = () => {
    recordEdit(createStarterProject());
    setActiveSheetId("sheet-dol");
    setSelectedComponentId("contactor");
    setDirty(true);
    setSimulation(initialDolState());
    setNotice(t.projectRestored);
  };

  const undo = () => {
    const result = undoProject(history, project);
    if (!result.project) return;
    setHistory(result.history);
    setProject(result.project);
    const restoredSheet = result.project.sheets.find((sheet) => sheet.id === activeSheetId) ?? result.project.sheets[0];
    setActiveSheetId(restoredSheet.id);
    setSelectedComponentId(restoredSheet.document.components[0]?.id ?? "");
    setDirty(true);
    setNotice("Last project edit undone.");
  };

  const redo = () => {
    const result = redoProject(history, project);
    if (!result.project) return;
    setHistory(result.history);
    setProject(result.project);
    const restoredSheet = result.project.sheets.find((sheet) => sheet.id === activeSheetId) ?? result.project.sheets[0];
    setActiveSheetId(restoredSheet.id);
    setSelectedComponentId(restoredSheet.document.components[0]?.id ?? "");
    setDirty(true);
    setNotice("Last project edit redone.");
  };

  const addSelectedComponent = () => {
    const movableComponents = document.components.filter((component) => !(isReferenceSheet && fixedReferenceComponentIds.has(component.id)));
    const placement = findOpenPlacement(movableComponents, isReferenceSheet ? "reference" : "free");
    if (!placement) {
      setNotice("This sheet's placement grid is full. Add another free sheet to keep symbols clear and non-overlapping.");
      return;
    }
    const number = document.components.filter((component) => component.definitionId === selectedDefinition.id).length + 1;
    const instance: ComponentInstance = {
      id: `${selectedDefinition.id.replaceAll(".", "-")}-${Date.now()}`,
      definitionId: selectedDefinition.id,
      reference: `${selectedDefinition.referencePrefix}${number}`,
      x: placement.x,
      y: placement.y,
      rotation: 0,
      properties: { ...selectedDefinition.propertiesSchema },
    };
    updateDocument({ ...document, components: [...document.components, instance], revision: document.revision + 1 });
    setSelectedComponentId(instance.id);
    setNotice(`${selectedDefinition.name} inserted as ${instance.reference}.`);
  };

  const addSheet = () => {
    const next = addFreeSchematicSheet(project);
    const sheet = next.sheets.at(-1)!;
    recordEdit(next);
    setActiveSheetId(sheet.id);
    setSelectedComponentId("");
    setWireMode(false);
    setWireStart(null);
    setDirty(true);
    setNotice(`${sheet.name} added. Insert a catalog component to begin the schematic.`);
  };

  const selectSheet = (sheetId: string) => {
    const sheet = project.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    setActiveSheetId(sheetId);
    setSelectedComponentId(sheet.document.components[0]?.id ?? "");
    setWireMode(false);
    setWireStart(null);
    setNotice(`${sheet.name} selected.`);
  };

  const loadTemplate = () => {
    let targetProject = project;
    let targetSheetId = activeSheet.id;
    if (isReferenceSheet) {
      targetProject = addFreeSchematicSheet(project);
      targetSheetId = targetProject.sheets.at(-1)!.id;
    }
    const next = loadTemplateIntoSheet(targetProject, targetSheetId, selectedTemplate);
    const loadedSheet = next.sheets.find((sheet) => sheet.id === targetSheetId)!;
    recordEdit(next);
    setActiveSheetId(targetSheetId);
    setSelectedComponentId(loadedSheet.document.components[0]?.id ?? "");
    setWireMode(false);
    setWireStart(null);
    setDirty(true);
    setNotice(`${selectedTemplate.name} loaded as a topology-validated template; no process simulation is assigned.`);
  };

  const exportReport = (section: ReportSection) => {
    const blob = new Blob([reportCsv(report, section)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `adigun-electro-cad-${section}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`${section === "bom" ? "BOM" : section === "wires" ? "Wire list" : "Terminal list"} CSV exported.`);
  };

  const toggleWireMode = () => {
    const next = !wireMode;
    setWireMode(next);
    setWireStart(null);
    setNotice(next ? "Wiring mode: select a source terminal, then a compatible target terminal." : "Wiring mode closed.");
  };

  const selectWireTerminal = (endpoint: TerminalEndpoint) => {
    if (!wireMode) return;
    if (!wireStart) {
      setWireStart(endpoint);
      setNotice("Wire start selected. Choose a compatible target terminal.");
      return;
    }
    const check = canConnectTerminals(document, catalogById, wireStart, endpoint);
    if (!check.ok) {
      setNotice(check.reason ?? "The selected terminals cannot be connected.");
      setWireStart(null);
      return;
    }
    const wire = { id: `manual-wire-${document.wires.length + 1}`, from: wireStart, to: endpoint, points: [], netName: `MANUAL_${document.wires.length + 1}` };
    updateDocument({ ...document, wires: [...document.wires, wire], revision: document.revision + 1 });
    setWireStart(null);
    setNotice(`Wire ${wire.netName} created between catalog terminals.`);
  };

  const updateReference = (reference: string) => {
    if (!selectedComponent || !reference.trim()) return;
    if (reference.trim().length > 12) {
      setNotice("Component reference labels are limited to 12 characters to keep the schematic legible.");
      return;
    }
    if (document.components.some((component) => component.id !== selectedComponent.id && component.reference === reference.trim())) {
      setNotice(`Reference ${reference.trim()} is already in use.`);
      return;
    }
    updateDocument({ ...document, components: document.components.map((component) => component.id === selectedComponent.id ? { ...component, reference: reference.trim() } : component), revision: document.revision + 1 });
  };

  const updateSelectedProperty = (property: string, rawValue: string | boolean) => {
    if (!selectedComponent) return;
    const definition = catalogById.get(selectedComponent.definitionId);
    const schemaValue = definition?.propertiesSchema[property];
    if (schemaValue === undefined) {
      setNotice("That property is not part of the selected catalog definition.");
      return;
    }
    let value: string | number | boolean;
    if (typeof schemaValue === "number") {
      const parsed = typeof rawValue === "string" ? Number(rawValue) : Number.NaN;
      if (!Number.isFinite(parsed)) {
        setNotice("Enter a finite numeric parameter value.");
        return;
      }
      value = parsed;
    } else if (typeof schemaValue === "boolean") {
      if (typeof rawValue !== "boolean") return;
      value = rawValue;
    } else {
      if (typeof rawValue !== "string" || !rawValue.trim() || rawValue.trim().length > 80) {
        setNotice("Text parameters must contain 1–80 readable characters.");
        return;
      }
      value = rawValue.trim();
    }
    updateDocument(updateComponentProperty(document, selectedComponent.id, property, value));
    setNotice(`${selectedComponent.reference} parameter ${property} updated.`);
  };

  const nudgeSelectedComponent = (deltaX: number, deltaY: number) => {
    if (!selectedComponent) return;
    if (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id)) {
      setNotice("Reference DOL symbols are fixed in this increment. Newly placed component instances can be moved on the grid.");
      return;
    }
    const nextX = selectedComponent.x + deltaX;
    const nextY = selectedComponent.y + deltaY;
    const movableComponents = document.components.filter((component) => !(isReferenceSheet && fixedReferenceComponentIds.has(component.id)));
    if (!canPlaceComponent(movableComponents, selectedComponent.id, nextX, nextY)) {
      setNotice("Move blocked to keep component symbols clear and non-overlapping.");
      return;
    }
    updateDocument(moveComponent(document, selectedComponent.id, deltaX, deltaY));
    setNotice(`${selectedComponent.reference} moved; terminal-level wire topology is preserved.`);
  };

  const removeSelectedComponent = () => {
    if (!selectedComponent) return;
    if (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id)) {
      setNotice("Reference DOL symbols cannot be removed from this supported model. Remove placed instances from a free sheet instead.");
      return;
    }
    const result = removeComponent(document, selectedComponent.id);
    updateDocument(result.document);
    setSelectedComponentId("");
    setNotice(`${selectedComponent.reference} removed${result.removedWireCount ? ` with ${result.removedWireCount} connected wire${result.removedWireCount === 1 ? "" : "s"}` : ""}. Use Undo to restore it.`);
  };

  const rotateSelectedComponent = () => {
    if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const nextRotation: ComponentInstance["rotation"] = selectedComponent.rotation === 270 ? 0 : (selectedComponent.rotation + 90) as 90 | 180 | 270;
    const movableComponents = document.components.filter((component) => !(isReferenceSheet && fixedReferenceComponentIds.has(component.id)));
    const rotatedComponents = movableComponents.map((component) => component.id === selectedComponent.id ? { ...component, rotation: nextRotation } : component);
    if (!canPlaceComponent(rotatedComponents, selectedComponent.id, selectedComponent.x, selectedComponent.y)) {
      setNotice("Rotation blocked to keep component symbols clear and non-overlapping.");
      return;
    }
    updateDocument(rotateComponent(document, selectedComponent.id));
    setNotice(`${selectedComponent.reference} rotated to ${nextRotation}°; reference labels remain upright.`);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <img src={`${import.meta.env.BASE_URL}assets/hephzibah-behulah-official.jpg`} alt="Hephzibah Behulah" />
          <div className="product-brand"><strong>⚡ Adigun<span>ElectroCAD</span></strong><small>BY HB ELEKTRONIKER</small></div>
        </div>
        <div className="project-status"><strong>{project.name}</strong><span className={dirty ? "dirty" : "saved"}>{dirty ? "Unsaved local changes" : "Saved locally"}</span></div>
        <div className="header-actions">
          <span className={isRunning ? "simulation-pill active" : "simulation-pill"}>{isRunning ? t.running : t.stopped}</span>
          <button className="icon-button" onClick={undo} disabled={!history.undo.length} aria-label="Undo last project edit">↶</button>
          <button className="icon-button" onClick={redo} disabled={!history.redo.length} aria-label="Redo last project edit">↷</button>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label="Interface language"><option value="en">EN</option><option value="de">DE</option></select>
          <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)} aria-label="Theme"><option value="dark">Dark</option><option value="light">Light</option></select>
          <button className="bot-button" onClick={() => setNotice("Adigun BOT requires a separately configured secure service; it is not enabled in this foundation.")}>◌ Adigun BOT</button>
        </div>
      </header>

      <nav className="menu-row" aria-label="Project actions">
        <details><summary>File</summary><div className="menu-popover"><button onClick={restoreDol}>{t.restore}</button><button onClick={saveLocally}>{t.save}</button><button onClick={loadLocalSave}>Load local save</button><button onClick={exportProject}>{t.export}</button><label className="menu-file-control">Import JSON<input type="file" accept="application/json,.json" onChange={importProject} /></label></div></details>
        <button onClick={undo} disabled={!history.undo.length}>Edit · Undo</button>
        <button onClick={redo} disabled={!history.redo.length}>Edit · Redo</button>
        <button onClick={() => setNotice("Grid and terminal anchors are enabled on the current schematic.")}>View · Grid</button>
        <button onClick={() => setNotice("Select a catalog entry and use Insert to place a real catalog instance.")}>Insert · Component</button>
        <button onClick={() => setNotice(`${topologyIssues.length ? `${topologyIssues.length} topology issue(s) found.` : t.valid}.`)}>Electrical · Validate</button>
        <button onClick={() => setNotice("Simulation buttons operate the validated DOL model in this increment.")}>Simulation</button>
        <button onClick={() => setReportsOpen((open) => !open)} aria-expanded={reportsOpen}>Reports</button>
        <button onClick={() => setNotice("Documentation is included in the repository docs folder.")}>Help</button>
      </nav>

      <section className="tool-row" aria-label="CAD and simulation tools">
        <button className="tool-button selected" onClick={() => setNotice("Select components directly on the schematic or from the catalog.")}>⌖<span>Select</span></button>
        <button className="tool-button" onClick={addSelectedComponent}>⊞<span>Insert</span></button>
        <button className="tool-button" onClick={undo} disabled={!history.undo.length}>↶<span>Undo</span></button>
        <button className="tool-button" onClick={redo} disabled={!history.redo.length}>↷<span>Redo</span></button>
        <button className={wireMode ? "tool-button selected" : "tool-button"} onClick={toggleWireMode}>⌁<span>Wiring</span></button>
        <span className="tool-divider" />
        <button className="run" onClick={() => setIsRunning(true)} disabled={!isReferenceSheet}>▶ Run</button>
        <button onClick={() => setIsRunning(false)} disabled={!isReferenceSheet}>Ⅱ Pause</button>
        <button className="danger" onClick={() => { setIsRunning(false); runAction("reset"); }} disabled={!isReferenceSheet}>■ Stop</button>
        <button onClick={() => runAction("trip-overload")} disabled={!isReferenceSheet}>⚠ Trip F1</button>
      </section>

      <section className="workspace">
        <aside className="panel component-panel">
          <div className="panel-title"><strong>Component Library</strong><span>{componentCatalog.length} modeled · {dolCatalog.length} DOL</span></div>
          <section className="template-library"><div><strong>Project Library</strong><span>{templateLibrary.length} topology templates</span></div><select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} aria-label="Project template">{templateLibrary.map((template) => <option key={template.id} value={template.id}>{template.level} · {template.name}</option>)}</select><p>{selectedTemplate.description}</p><button className="wide" onClick={loadTemplate}>Load into free sheet</button></section>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search catalog" aria-label="Search component library" />
          <div className="catalog-list">
            {filteredCatalog.map((definition) => <button key={definition.id} className={definition.id === selectedDefinitionId ? "catalog-item selected" : "catalog-item"} onClick={() => setSelectedDefinitionId(definition.id)}>
              <span className="symbol-glyph">{definition.symbolId.includes("motor") ? "Ⓜ" : definition.symbolId.includes("contactor") ? "⌇" : definition.symbolId.includes("pushbutton") ? "○" : "▣"}</span>
              <span><strong>{definition.name}</strong><small>{definition.category} · {definition.simulationSupport}</small></span>
            </button>)}
          </div>
          <section className="component-card">
            <div className="card-heading"><strong>{selectedDefinition.name}</strong><button className={favorites.includes(selectedDefinition.id) ? "favorite active" : "favorite"} onClick={() => setFavorites((items) => items.includes(selectedDefinition.id) ? items.filter((id) => id !== selectedDefinition.id) : [...items, selectedDefinition.id])} aria-label="Toggle component favorite">★</button></div>
            <p>{selectedDefinition.description}</p>
            <dl><dt>Reference</dt><dd>{selectedDefinition.referencePrefix}</dd><dt>Terminals</dt><dd>{selectedDefinition.terminals.map((terminal) => terminal.label).join(", ")}</dd><dt>Support</dt><dd>{selectedDefinition.simulationSupport}</dd></dl>
            <button className="primary wide" onClick={addSelectedComponent}>Insert into drawing</button>
          </section>
        </aside>

        <section className="drawing-area" aria-label={`${activeSheet.name} schematic canvas`}>
          <div className="sheet-tabs">{project.sheets.map((sheet, index) => <button key={sheet.id} className={sheet.id === activeSheet.id ? "active" : ""} onClick={() => selectSheet(sheet.id)}>{sheet.name} · Sheet {index + 1}</button>)}<button onClick={addSheet} aria-label="Add free schematic sheet">＋ Sheet</button></div>
          <Schematic document={document} selectedComponentId={selectedComponentId} simulation={simulation} wireMode={wireMode} wireStart={wireStart} onSelect={setSelectedComponentId} onTerminalSelect={selectWireTerminal} />
          <div className="canvas-caption">{isReferenceSheet ? <><strong>Editable reference project:</strong> breaker, START/STOP, overload and contactor states drive the simplified motor model. <button onClick={() => setNotice("This is an educational simplified model, not a real-world installation or protection-coordination calculation.")}>{t.limitations}</button></> : <><strong>Free schematic sheet:</strong> insert catalog components, connect compatible terminals and move placed symbols on the 20-unit grid.</>}</div>
        </section>

        <aside className="panel properties-panel">
          <div className="panel-title"><strong>Properties</strong><span>{selectedComponent?.reference ?? "—"}</span></div>
          {selectedComponent ? <Properties instance={selectedComponent} onReferenceChange={updateReference} onPropertyChange={updateSelectedProperty} onNudge={nudgeSelectedComponent} onRotate={rotateSelectedComponent} onRemove={removeSelectedComponent} movable={!(isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))} /> : <p className="empty">Select a component to inspect its definition and terminals.</p>}
          {isReferenceSheet ? <><section className="state-card"><strong>Simulation state</strong><div><span className={simulation.contactorEnergized ? "state-dot on" : "state-dot"} /> KM1 coil {simulation.contactorEnergized ? "energized" : "de-energized"}</div><div><span className={simulation.overloadTripped ? "state-dot fault" : "state-dot"} /> F1 {simulation.overloadTripped ? "tripped" : "healthy"}</div><div><span className={simulation.motorState === "running" ? "state-dot on" : "state-dot"} /> M1 {simulation.motorState}</div></section><section className="control-card"><strong>Operate DOL circuit</strong><button onClick={() => runAction(simulation.breakerClosed ? "open-breaker" : "close-breaker")}>{simulation.breakerClosed ? "Open Q1" : "Close Q1"}</button><button className="start" onMouseDown={() => runAction("press-start")} onMouseUp={() => runAction("release-start")} onMouseLeave={() => simulation.startPressed && runAction("release-start")}>START S1</button><button className="stop" onClick={() => runAction("press-stop")}>STOP S0</button><button onClick={() => runAction("reset-overload")} disabled={!simulation.overloadTripped}>Reset F1</button></section></> : <section className="state-card"><strong>Free sheet</strong><div>Simulation is not assigned to this schematic sheet.</div><div>Use the DOL reference sheet for the supported motor model.</div></section>}
          <p className="cloud-note">☁ {t.unavailable}</p>
        </aside>
      </section>

      <section className="engineering-console">
        <div className="console-section"><strong>Simulation</strong><span className={simulation.motorState === "running" ? "badge running" : "badge"}>{simulation.motorState.toUpperCase()}</span><dl><dt>Voltage</dt><dd>{simulation.lineVoltageV.toFixed(0)} V</dd><dt>Current</dt><dd>{simulation.lineCurrentA.toFixed(1)} A</dd><dt>Speed</dt><dd>{simulation.motorSpeedRpm.toFixed(0)} rpm</dd><dt>Time</dt><dd>{(simulation.elapsedMs / 1000).toFixed(1)} s</dd></dl></div>
        <div className="console-section"><strong>{t.validation}</strong>{topologyIssues.length ? topologyIssues.map((issue) => <p className="issue" key={`${issue.code}-${issue.message}`}>{issue.message}</p>) : <p className="pass">✓ {t.valid} · {document.wires.length} terminal-to-terminal wires checked.</p>}<p className="muted">Catalog/project release targets are intentionally not claimed by this initial increment.</p></div>
        <div className="console-section event-log"><strong>Event log</strong>{simulation.events.slice(0, 4).map((event, index) => <p key={`${event}-${index}`}>{event}</p>)}</div>
      </section>

      {reportsOpen && <ProjectReports sheetName={activeSheet.name} report={report} onExport={exportReport} onClose={() => setReportsOpen(false)} />}

      <footer><span>© {new Date().getFullYear()} Hephzibah Behulah</span><span>HB Elektroniker · AdigunElectroCAD</span><span>{notice}</span><span>Languages in this foundation: English, German. Yoruba and Nigerian Pidgin await reviewed translations.</span></footer>
    </main>
  );
}

function Properties({ instance, onReferenceChange, onPropertyChange, onNudge, onRotate, onRemove, movable }: { instance: ComponentInstance; onReferenceChange: (reference: string) => void; onPropertyChange: (property: string, value: string | boolean) => void; onNudge: (deltaX: number, deltaY: number) => void; onRotate: () => void; onRemove: () => void; movable: boolean }) {
  const definition = catalogById.get(instance.definitionId);
  if (!definition) return <p className="empty">Catalog definition missing.</p>;
  return <section className="properties-form"><label>Reference<input defaultValue={instance.reference} key={instance.id + instance.reference} onBlur={(event) => onReferenceChange(event.target.value)} /></label><label>Component<input value={definition.name} readOnly /></label><label>Category<input value={definition.category} readOnly /></label><label>Simulation<input value={definition.simulationSupport} readOnly /></label><section className="component-parameters"><strong>Component parameters</strong>{Object.entries(instance.properties).map(([property, value]) => typeof value === "boolean" ? <label className="property-checkbox" key={property}>{formatPropertyLabel(property)}<input type="checkbox" checked={value} disabled={!movable} onChange={(event) => onPropertyChange(property, event.target.checked)} /></label> : <label key={property}>{formatPropertyLabel(property)}<input type={typeof value === "number" ? "number" : "text"} defaultValue={String(value)} disabled={!movable} inputMode={typeof value === "number" ? "decimal" : undefined} onBlur={(event) => onPropertyChange(property, event.target.value)} /></label>)}</section>{!movable && <p className="parameter-note">Reference-model parameters are fixed so the supported DOL behaviour and displayed circuit stay consistent.</p>}{movable && <><div className="move-grid"><strong>Position · snap 20</strong><span>X {instance.x} · Y {instance.y} · R {instance.rotation}°</span><button onClick={() => onNudge(0, -20)} aria-label="Move component up">↑</button><button onClick={() => onNudge(-20, 0)} aria-label="Move component left">←</button><button onClick={() => onNudge(20, 0)} aria-label="Move component right">→</button><button onClick={() => onNudge(0, 20)} aria-label="Move component down">↓</button></div><button className="rotate-component" onClick={onRotate}>Rotate 90°</button><button className="remove-component" onClick={onRemove}>Remove placed component</button></>}<div className="terminals"><strong>Terminals</strong>{definition.terminals.map((terminal) => <span key={terminal.id}>{terminal.label}<small>{terminal.kind}</small></span>)}</div><p>{definition.documentation}</p></section>;
}

function formatPropertyLabel(property: string) {
  return property.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (character) => character.toUpperCase());
}

function ProjectReports({ sheetName, report, onExport, onClose }: { sheetName: string; report: ProjectReport; onExport: (section: ReportSection) => void; onClose: () => void }) {
  return <section className="report-panel" aria-label="Engineering reports"><div className="report-heading"><div><strong>Engineering reports</strong><span>{sheetName}</span></div><div className="report-actions"><button onClick={() => onExport("bom")}>Export BOM CSV</button><button onClick={() => onExport("wires")}>Export wires CSV</button><button onClick={() => onExport("terminals")}>Export terminals CSV</button><button onClick={onClose}>Close reports</button></div></div><div className="report-grid"><ReportTable title="Bill of materials" headers={["Component", "Category", "Qty", "References"]} rows={report.bom.map((line) => [line.component, line.category, String(line.quantity), line.references.join(", ")])} /><ReportTable title="Wire list" headers={["Net", "From", "To"]} rows={report.wires.map((line) => [line.netName, line.from, line.to])} /><ReportTable title="Terminal list" headers={["Reference", "Terminal", "Kind", "Direction"]} rows={report.terminals.map((line) => [line.reference, line.terminal, line.kind, line.direction])} /></div></section>;
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return <section className="report-table-section"><strong>{title}</strong><div className="report-table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>No entries on this sheet.</td></tr>}</tbody></table></div></section>;
}
