import { useEffect, useMemo, useState } from "react";
import { catalogById, dolCatalog } from "../catalog/dolCatalog";
import { canConnectTerminals, validateCircuit } from "../electrical/topology";
import { createDolMotorStarter } from "../projects/dolMotorStarter";
import { initialDolState, transitionDol, type DolAction, type DolSimulationState } from "../simulation/dolSimulator";
import type { CircuitDocument, ComponentInstance, TerminalEndpoint } from "../types/electrical";
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

const STORAGE_KEY = "adigun-electro-cad.dol-project.v1";

export function App() {
  const [document, setDocument] = useState<CircuitDocument>(() => createDolMotorStarter());
  const [history, setHistory] = useState<CircuitDocument[]>([]);
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
  const t = copy[locale];

  const selectedComponent = document.components.find((component) => component.id === selectedComponentId);
  const selectedDefinition = catalogById.get(selectedDefinitionId) ?? dolCatalog[0];
  const topologyIssues = useMemo(() => validateCircuit(document, catalogById), [document]);
  const filteredCatalog = dolCatalog.filter((definition) => `${definition.name} ${definition.category} ${definition.referencePrefix}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    window.document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => setSimulation((state) => transitionDol(state, "tick", 100)), 100);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const updateDocument = (next: CircuitDocument, saveHistory = true) => {
    if (saveHistory) setHistory((items) => [...items, document].slice(-30));
    setDocument(next);
    setDirty(true);
  };

  const runAction = (action: DolAction) => {
    setSimulation((state) => transitionDol(state, action));
    if (action === "reset") setIsRunning(false);
  };

  const saveLocally = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
    setDirty(false);
    setNotice(t.projectSaved);
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "adigun-electro-cad-dol-starter.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Project JSON exported.");
  };

  const restoreDol = () => {
    const restored = createDolMotorStarter();
    updateDocument(restored);
    setSelectedComponentId("contactor");
    setSimulation(initialDolState());
    setNotice(t.projectRestored);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((items) => items.slice(0, -1));
    setDocument(previous);
    setSelectedComponentId("contactor");
    setDirty(true);
    setNotice("Last project edit undone.");
  };

  const addSelectedComponent = () => {
    const number = document.components.filter((component) => component.definitionId === selectedDefinition.id).length + 1;
    const instance: ComponentInstance = {
      id: `${selectedDefinition.id.replaceAll(".", "-")}-${Date.now()}`,
      definitionId: selectedDefinition.id,
      reference: `${selectedDefinition.referencePrefix}${number}`,
      x: 955,
      y: 130 + (document.components.length % 5) * 95,
      rotation: 0,
      properties: { ...selectedDefinition.propertiesSchema },
    };
    updateDocument({ ...document, components: [...document.components, instance], revision: document.revision + 1 });
    setSelectedComponentId(instance.id);
    setNotice(`${selectedDefinition.name} inserted as ${instance.reference}.`);
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
    if (document.components.some((component) => component.id !== selectedComponent.id && component.reference === reference.trim())) {
      setNotice(`Reference ${reference.trim()} is already in use.`);
      return;
    }
    updateDocument({ ...document, components: document.components.map((component) => component.id === selectedComponent.id ? { ...component, reference: reference.trim() } : component), revision: document.revision + 1 });
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <img src={`${import.meta.env.BASE_URL}assets/hephzibah-behulah-official.jpg`} alt="Hephzibah Behulah" />
          <div className="product-brand"><strong>⚡ Adigun<span>ElectroCAD</span></strong><small>BY HB ELEKTRONIKER</small></div>
        </div>
        <div className="project-status"><strong>{document.name}</strong><span className={dirty ? "dirty" : "saved"}>{dirty ? "Unsaved local changes" : "Saved locally"}</span></div>
        <div className="header-actions">
          <span className={isRunning ? "simulation-pill active" : "simulation-pill"}>{isRunning ? t.running : t.stopped}</span>
          <button className="icon-button" onClick={undo} disabled={!history.length} aria-label="Undo last project edit">↶</button>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label="Interface language"><option value="en">EN</option><option value="de">DE</option></select>
          <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)} aria-label="Theme"><option value="dark">Dark</option><option value="light">Light</option></select>
          <button className="bot-button" onClick={() => setNotice("Adigun BOT requires a separately configured secure service; it is not enabled in this foundation.")}>◌ Adigun BOT</button>
        </div>
      </header>

      <nav className="menu-row" aria-label="Project actions">
        <details><summary>File</summary><div className="menu-popover"><button onClick={restoreDol}>{t.restore}</button><button onClick={saveLocally}>{t.save}</button><button onClick={exportProject}>{t.export}</button></div></details>
        <button onClick={undo} disabled={!history.length}>Edit · Undo</button>
        <button onClick={() => setNotice("Grid and terminal anchors are enabled on the current schematic.")}>View · Grid</button>
        <button onClick={() => setNotice("Select a catalog entry and use Insert to place a real catalog instance.")}>Insert · Component</button>
        <button onClick={() => setNotice(`${topologyIssues.length ? `${topologyIssues.length} topology issue(s) found.` : t.valid}.`)}>Electrical · Validate</button>
        <button onClick={() => setNotice("Simulation buttons operate the validated DOL model in this increment.")}>Simulation</button>
        <button onClick={() => setNotice("Engineering reports are not available in this initial vertical slice.")}>Reports</button>
        <button onClick={() => setNotice("Documentation is included in the repository docs folder.")}>Help</button>
      </nav>

      <section className="tool-row" aria-label="CAD and simulation tools">
        <button className="tool-button selected" onClick={() => setNotice("Select components directly on the schematic or from the catalog.")}>⌖<span>Select</span></button>
        <button className="tool-button" onClick={addSelectedComponent}>⊞<span>Insert</span></button>
        <button className="tool-button" onClick={undo} disabled={!history.length}>↶<span>Undo</span></button>
        <button className={wireMode ? "tool-button selected" : "tool-button"} onClick={toggleWireMode}>⌁<span>Wiring</span></button>
        <span className="tool-divider" />
        <button className="run" onClick={() => setIsRunning(true)}>▶ Run</button>
        <button onClick={() => setIsRunning(false)}>Ⅱ Pause</button>
        <button className="danger" onClick={() => { setIsRunning(false); runAction("reset"); }}>■ Stop</button>
        <button onClick={() => runAction("trip-overload")}>⚠ Trip F1</button>
      </section>

      <section className="workspace">
        <aside className="panel component-panel">
          <div className="panel-title"><strong>Component Library</strong><span>{dolCatalog.length} verified models</span></div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search verified models" aria-label="Search component library" />
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

        <section className="drawing-area" aria-label="DOL motor starter schematic canvas">
          <div className="sheet-tabs"><button className="active">Power & Control Circuit · Sheet 1</button><button onClick={() => setNotice("Multi-sheet projects are not available in this initial increment.")}>＋ Sheet</button></div>
          <Schematic document={document} selectedComponentId={selectedComponentId} simulation={simulation} wireMode={wireMode} wireStart={wireStart} onSelect={setSelectedComponentId} onTerminalSelect={selectWireTerminal} />
          <div className="canvas-caption"><strong>Editable reference project:</strong> breaker, START/STOP, overload and contactor states drive the simplified motor model. <button onClick={() => setNotice("This is an educational simplified model, not a real-world installation or protection-coordination calculation.")}>{t.limitations}</button></div>
        </section>

        <aside className="panel properties-panel">
          <div className="panel-title"><strong>Properties</strong><span>{selectedComponent?.reference ?? "—"}</span></div>
          {selectedComponent ? <Properties instance={selectedComponent} onReferenceChange={updateReference} /> : <p className="empty">Select a component to inspect its definition and terminals.</p>}
          <section className="state-card"><strong>Simulation state</strong><div><span className={simulation.contactorEnergized ? "state-dot on" : "state-dot"} /> KM1 coil {simulation.contactorEnergized ? "energized" : "de-energized"}</div><div><span className={simulation.overloadTripped ? "state-dot fault" : "state-dot"} /> F1 {simulation.overloadTripped ? "tripped" : "healthy"}</div><div><span className={simulation.motorState === "running" ? "state-dot on" : "state-dot"} /> M1 {simulation.motorState}</div></section>
          <section className="control-card"><strong>Operate DOL circuit</strong><button onClick={() => runAction(simulation.breakerClosed ? "open-breaker" : "close-breaker")}>{simulation.breakerClosed ? "Open Q1" : "Close Q1"}</button><button className="start" onMouseDown={() => runAction("press-start")} onMouseUp={() => runAction("release-start")} onMouseLeave={() => simulation.startPressed && runAction("release-start")}>START S1</button><button className="stop" onClick={() => runAction("press-stop")}>STOP S0</button><button onClick={() => runAction("reset-overload")} disabled={!simulation.overloadTripped}>Reset F1</button></section>
          <p className="cloud-note">☁ {t.unavailable}</p>
        </aside>
      </section>

      <section className="engineering-console">
        <div className="console-section"><strong>Simulation</strong><span className={simulation.motorState === "running" ? "badge running" : "badge"}>{simulation.motorState.toUpperCase()}</span><dl><dt>Voltage</dt><dd>{simulation.lineVoltageV.toFixed(0)} V</dd><dt>Current</dt><dd>{simulation.lineCurrentA.toFixed(1)} A</dd><dt>Speed</dt><dd>{simulation.motorSpeedRpm.toFixed(0)} rpm</dd><dt>Time</dt><dd>{(simulation.elapsedMs / 1000).toFixed(1)} s</dd></dl></div>
        <div className="console-section"><strong>{t.validation}</strong>{topologyIssues.length ? topologyIssues.map((issue) => <p className="issue" key={`${issue.code}-${issue.message}`}>{issue.message}</p>) : <p className="pass">✓ {t.valid} · {document.wires.length} terminal-to-terminal wires checked.</p>}<p className="muted">Catalog/project release targets are intentionally not claimed by this initial increment.</p></div>
        <div className="console-section event-log"><strong>Event log</strong>{simulation.events.slice(0, 4).map((event, index) => <p key={`${event}-${index}`}>{event}</p>)}</div>
      </section>

      <footer><span>© {new Date().getFullYear()} Hephzibah Behulah</span><span>HB Elektroniker · AdigunElectroCAD</span><span>{notice}</span><span>Languages in this foundation: English, German. Yoruba and Nigerian Pidgin await reviewed translations.</span></footer>
    </main>
  );
}

function Properties({ instance, onReferenceChange }: { instance: ComponentInstance; onReferenceChange: (reference: string) => void }) {
  const definition = catalogById.get(instance.definitionId);
  if (!definition) return <p className="empty">Catalog definition missing.</p>;
  return <section className="properties-form"><label>Reference<input defaultValue={instance.reference} key={instance.id + instance.reference} onBlur={(event) => onReferenceChange(event.target.value)} /></label><label>Component<input value={definition.name} readOnly /></label><label>Category<input value={definition.category} readOnly /></label><label>Simulation<input value={definition.simulationSupport} readOnly /></label><div className="terminals"><strong>Terminals</strong>{definition.terminals.map((terminal) => <span key={terminal.id}>{terminal.label}<small>{terminal.kind}</small></span>)}</div><p>{definition.documentation}</p></section>;
}
