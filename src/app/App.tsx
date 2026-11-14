Warning: truncated output (original token count: 32286)
Total output lines: 1458

import { ModelRunSummary } from "../components/ModelRunSummary";
import { IndicatorColorPalette } from "../components/IndicatorColorPalette";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { catalogById, componentCatalog, dolCatalog } from "../catalog/dolCatalog";
import { canPlaceComponent, createManualWire, duplicateComponentInstance, findOpenPlacement, moveComponentsByGrid, reconnectWire, removeComponent, removeWire, renameWire, resizeComponent, rotateComponent, updateComponentProperty } from "../cad/documentOps";
import { controlTerminalOffset } from "../cad/componentGeometry";
import { schematicGraphicsToSymbolGraphics } from "../cad/userSymbol";
import { componentPropertyInputType } from "../cad/componentPropertyInput";
import { toggleComponentSelection } from "../cad/componentSelection";
import { appendWireRoutePoint, type WireBranchSource } from "../cad/wirePath";
import { deleteGraphicPathVertex, graphicPathBounds, insertGraphicPathVertex, moveGraphicPathVertex } from "../cad/graphicPath";
import { duplicateSchematicGraphic, setSchematicGraphicBounds } from "../cad/graphicOps";
import { recordProjectEdit, redoProject, undoProject, type ProjectHistory } from "../cad/projectHistory";
import { canConnectTerminals, validateCircuit } from "../electrical/topology";
import { addFreeSchematicSheet, createStarterProject, loadTemplateIntoSheet, replaceSheetDocument } from "../projects/starterProject";
import { templateLibrary } from "../projects/templateLibrary";
import { verifyProjectTemplate } from "../projects/templateVerification";
import { beginAnonymousUpgrade, finishAnonymousUpgrade, isAnonymousUser, signIn, signOut, signUp, startAnonymousPreview } from "../services/auth";
import { loadLatestCloudProject, saveCloudProject, saveUserPreferences } from "../services/cloudProjects";
import { supabaseClient } from "../services/supabase";
import { parseProjectJson } from "../projects/projectSerialization";
import { prepareStandaloneSchematicSvg } from "../projects/schematicExport";
import { createProjectReport, reportCsv, type ProjectReport, type ReportSection } from "../reports/projectReport";
import { initialDolState, transitionDol, type DolAction, type DolSimulationState } from "../simulation/dolSimulator";
import { compare, dacMilliamp, edgeTrigger, levelToMilliamp, logicGate, mathBlock, milliampToPlcRaw, normallyClosed, normallyOpen, outputCoil, setResetLatch, type Comparator, type LogicGate, type MathOperation } from "../simulation/controlLogic";
import { batteryStateOfCharge, compressorDeliveryLpm, cylinderPosition, damperPosition, directionalValve52, earthLeakageTripped, frlOutletPressureBar, gridTieClosed, humidistatOn, hydraulicCylinderForceN, inverterAcPowerW, lightCurtainClear, phaseHealthy, pumpFlowLpm, reliefValveOpen, safetyRelayEnergized, solarPowerW, thermostatOn, thermalStep, threePhaseCableLossW, threePhaseVoltageDropV, type Direction } from "../simulation/industrialDevices";
import type { FunctionalModelResult } from "../simulation/functionalModels";
import { executeCircuitModels } from "../simulation/circuitModels";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput, setCircuitLevelInput } from "../simulation/circuitClock";
import { RuntimeControls } from "../components/RuntimeControls";
import { CatalogTree } from "../components/CatalogTree";
import { LadderEditor } from "../components/LadderEditor";
import { LiveCopilot } from "../components/LiveCopilot";
import { HeaderUtilities } from "../components/HeaderUtilities";
import { MAX_PROJECT_SHEETS } from "../projects/projectLimits";
import { readLocalProject, writeLocalProject } from "../projects/projectLocalStore";
import { bindProjectExitSave } from "../projects/projectExitSave";
import { readCloudProjectSelection, rememberCloudProjectSelection, selectedCloudProjectId, type CloudProjectSelection } from "../services/cloudProjectSelection";
import { ProjectLibraryPanel } from "../components/ProjectLibraryPanel";
import type { CircuitDocument, ComponentInstance, ElectricalProject, SchematicAnnotation, SchematicGraphic, SchematicGraphicKind, SchematicGraphicPoint, TerminalDefinition, TerminalEndpoint, Wire } from "../types/electrical";
import { Schematic, terminalAnchors } from "../components/Schematic";
import { ReversingLab } from "../components/ReversingLab";
import { StarDeltaLab } from "../components/StarDeltaLab";

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
const UPGRADE_USER_KEY = "adigun-electro-cad.upgrade-user.v1";
const fixedReferenceComponentIds = new Set(["supply", "breaker", "contactor", "overload", "motor", "control", "stop", "start"]);

const isUserSymbolDefinition = (definitionId: string) => definitionId === "user.indicator-lamp" || definitionId === "user.drawn-symbol";

export function App() {
  const [project, setProject] = useState<ElectricalProject>(() => createStarterProject());
  const latestProject = useRef(project);
  latestProject.current = project;
  const [activeSheetId, setActiveSheetId] = useState("sheet-dol");
  const [schematicZoom, setSchematicZoom] = useState(.85);
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState<ProjectHistory>({ undo: [], redo: [] });
  const [selectedComponentId, setSelectedComponentId] = useState("contactor");
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>(["contactor"]);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("contactor.three-pole");
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");
  const [locale, setLocale] = useState<Locale>("en");
  const [dirty, setDirty] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [botActivation, setBotActivation] = useState(0);
  const [botUnread, setBotUnread] = useState(false);
  const [botEditsUnsaved, setBotEditsUnsaved] = useState(false);
  const pendingLocalSave = useRef({ project, dirty, botEditsUnsaved });
  pendingLocalSave.current = { project, dirty, botEditsUnsaved };
  const [notice, setNotice] = useState("DOL starter ready — local-only project storage.");
  const [simulation, setSimulation] = useState<DolSimulationState>(() => initialDolState());
  const [isRunning, setIsRunning] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wireMode, setWireMode] = useState(false);
  const [wireStart, setWireStart] = useState<TerminalEndpoint | null>(null);
  const [wireBranchStart, setWireBranchStart] = useState<{ wireId: string; source: WireBranchSource; position: number } | null>(null);
  const [selectedWireId, setSelectedWireId] = useState("");
  const [wireRouteEditId, setWireRouteEditId] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState("");
  const [annotationMode, setAnnotationMode] = useState(false);
  const [selectedGraphicId, setSelectedGraphicId] = useState("");
  const [selectedGraphicIds, setSelectedGraphicIds] = useState<string[]>([]);
  const [graphicMode, setGraphicMode] = useState<SchematicGraphicKind | "freehand" | null>(null);
  const [reconnectingWireId, setReconnectingWireId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateLibrary[0].id);
  const [rightDockView, setRightDockView] = useState<"properties" | "projects">("properties");
  const [reportsOpen, setReportsOpen] = useState(false);
  const [plcInputA, setPlcInputA] = useState(false);
  const [plcInputB, setPlcInputB] = useState(false);
  const [plcPreviousInputA, setPlcPreviousInputA] = useState(false);
  const [plcLatch, setPlcLatch] = useState(false);
  const [plcGate, setPlcGate] = useState<LogicGate>("and");
  const [plcComparator, setPlcComparator] = useState<Comparator>("greater-than");
  const [plcMath, setPlcMath] = useState<MathOperation>("add");
  const [plcLeft, setPlcLeft] = useState(50);
  const [plcRight, setPlcRight] = useState(40);
  const [levelPercent, setLevelPercent] = useState(50);
  const [industrialDirection, setIndustrialDirection] = useState<Direction>("hold");
  const [industrialPressureBar, setIndustrialPressureBar] = useState(100);
  const [industrialTemperatureC, setIndustrialTemperatureC] = useState(22);
  const [industrialSolarIrradiance, setIndustrialSolarIrradiance] = useState(800);
  const [industrialCableCurrentA, setIndustrialCableCurrentA] = useState(10);
  const [industrialSafetyA, setIndustrialSafetyA] = useState(true);
  const [industrialSafetyB, setIndustrialSafetyB] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [existingAccountMode, setExistingAccountMode] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [upgradeUserId, setUpgradeUserId] = useState(() => window.localStorage.getItem(UPGRADE_USER_KEY) ?? "");
  const [cloudSelection, setCloudSelection] = useState<CloudProjectSelection | null>(null);
  const activeAuthUserId = useRef<string | null>(null);
  const authEventVersion = useRef(0);
  const cloudProjectId = selectedCloudProjectId(cloudSelection, authUser?.id);
  const t = copy[locale];
  const anonymousSession = isAnonymousUser(authUser);

  const setComponentSelection = (componentId: string) => {
    setSelectedComponentId(componentId);
    setSelectedComponentIds(componentId ? [componentId] : []);
  };

  const activeSheet = project.sheets.find((sheet) => sheet.id === activeSheetId) ?? project.sheets[0];
  const document = activeSheet.document;
  const [runtimeDocument, setRuntimeDocument] = useState<CircuitDocument | null>(null);
  const isReferenceSheet = activeSheet.kind === "reference-dol";
  const selectedComponent = document.components.find((component) => component.id === selectedComponentId);
  const selectedWire = document.wires.find((wire) => wire.id === selectedWireId);
  const selectedAnnotation = document.annotations?.find((annotation) => annotation.id === selectedAnnotationId);
  const selectedGraphic = document.graphics?.find((graphic) => graphic.id === selectedGraphicId);
  const selectedDefinition = catalogById.get(selectedDefinitionId) ?? componentCatalog[0];
  const selectedTemplate = templateLibrary.find((template) => template.id === selectedTemplateId) ?? templateLibrary[0];
  const selectedTemplateVerification = useMemo(() => verifyProjectTemplate(selectedTemplate, catalogById), [selectedTemplate]);
  const topologyIssues = useMemo(() => validateCircuit(document, catalogById), [document]);
  const report = useMemo(() => createProjectReport(document, catalogById), [document]);
  const circuitModelRuns = useMemo(() => executeCircuitModels(runtimeDocument ?? document, catalogById), [document, runtimeDocument]);
  const selectedPlcRun = circuitModelRuns.find((run) => run.componentId === selectedComponentId && run.modelId === "catalog-plc-digital-io");
  const ladderPreviewInputs = selectedPlcRun && !selectedPlcRun.output.error ? { input0: selectedPlcRun.evaluatedProperties.inputA === true, input1: selectedPlcRun.evaluatedProperties.inputB === true, q0: selectedPlcRun.evaluatedProperties.runtimeQ0 === true, q1: selectedPlcRun.evaluatedProperties.runtimeQ1 === true || selectedPlcRun.evaluatedProperties.output1 === true, previousInput0: selectedPlcRun.evaluatedProperties.runtimeInput0Previous === true, previousInput1: selectedPlcRun.evaluatedProperties.runtimeInput1Previous === true, analogInput0: Number(selectedPlcRun.evaluatedProperties.analogInput0 ?? 0), analogInput1: Number(selectedPlcRun.evaluatedProperties.analogInput1 ?? 0), registers: Array.from({ length: 8 }, (_, index) => Number(selectedPlcRun.evaluatedProperties[`runtimeD${index}`] ?? 0)), memory: Array.from({ length: 8 }, (_, index) => selectedPlcRun.evaluatedProperties[`runtimeM${index}`] === true), timers: Object.fromEntries([0, 1, 2, 3].map((index) => [`T${index}`, { elapsedSeconds: Number(selectedPlcRun.evaluatedProperties[`runtimeT${index}Elapsed`] ?? 0), done: selectedPlcRun.evaluatedProperties[`runtimeT${index}Done`] === true }])), deltaSeconds: 0.1 } : undefined;
  const controlLab = useMemo(() => {
    const milliamp = levelToMilliamp(levelPercent);
    const raw = milliampToPlcRaw(milliamp);
    const comparison = compare(plcComparator, plcLeft, plcRight);
    const logic = logicGate(plcGate, [plcInputA, plcInputB]);
    return { milliamp, raw, comparison, logic, coil: outputCoil(logic && comparison), edges: edgeTrigger(plcPreviousInputA, plcInputA), math: mathBlock(plcMath, plcLeft, plcRight), dac: dacMilliamp(raw) };
  }, [levelPercent, plcComparator, plcGate, plcInputA, plcInputB, plcLeft, plcMath, plcPreviousInputA, plcRight]);
  const industrialLab = useMemo(() => {
    const extend = industrialDirection === "extend";
    const retract = industrialDirection === "retract";
    const valve = directionalValve52(extend, retract, "hold");
    const temperatureNext = thermalStep(industrialTemperatureC, 20, thermostatOn(industrialTemperatureC, 21, 2, false) ? 1200 : 0, 180, 12_000, 12, 1);
    const solarW = solarPowerW(industrialSolarIrradiance, 2, 0.2);
    return {
      valve, cylinder: cylinderPosition(50, valve, 1, 4), pumpLpm: pumpFlowLpm(10, 1000), forceN: hydraulicCylinderForceN(industrialPressureBar, 50), reliefOpen: reliefValveOpen(industrialPressureBar, 180), frlBar: frlOutletPressureBar(8, 6, 0.4), compressorLpm: compressorDeliveryLpm(120, extend || retract), temperatureNext, thermostat: thermostatOn(industrialTemperatureC, 21, 2, false), humidistat: humidistatOn(65, 60, 4, false), damper: damperPosition(30, industrialTemperatureC > 23 ? 100 : 20, 1, 10), solarW, batterySoc: batteryStateOfCharge(60, solarW / 48, 100, 1 / 60), inverterW: inverterAcPowerW(solarW, 0.93, 1000), gridTie: gridTieClosed(true, 0.05), safety: safetyRelayEnergized(industrialSafetyA, industrialSafetyB, true), curtainClear: lightCurtainClear(false), phaseHealthy: phaseHealthy(true, true, true), leakageTrip: earthLeakageTripped(12, 30), voltageDrop: threePhaseVoltageDropV(industrialCableCurrentA, 100, 1.5), cableLoss: threePhaseCableLossW(industrialCableCurrentA, 100, 1.5),
    };
  }, [industrialCableCurrentA, industrialDirection, industrialPressureBar, industrialSafetyA, industrialSafetyB, industrialSolarIrradiance, industrialTemperatureC]);
  const filteredCatalog = componentCatalog.filter((definition) => `${definition.name} ${definition.category} ${definition.referencePrefix}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    window.document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const client = supabaseClient();
    let active = true;
    const initialVersion = authEventVersion.current;
    void client.auth.getUser().then(({ data }) => { if (active && authEventVersion.current === initialVersion) { activeAuthUserId.current = data.user?.id ?? null; setAuthUser(data.user); } });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { authEventVersion.current++; activeAuthUserId.current = session?.user.id ?? null; setAuthUser(session?.user ?? null); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    try { setCloudSelection(readCloudProjectSelection(window.localStorage, authUser?.id)); }
    catch { setCloudSelection(authUser ? { userId: authUser.id, projectId: "" } : null); }
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser || anonymousSession) return;
    void saveUserPreferences(authUser.id, { theme, locale, favorites }).catch(() => undefined);
  }, [authUser, anonymousSession, favorites, locale, theme]);

  useEffect(() => {
    setRuntimeDocument(null);
    setIsRunning(false);
  }, [document]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      if (isReferenceSheet) setSimulation((state) => transitionDol(state, "tick", 100));
      else setRuntimeDocument((state) => advanceCircuitClock(state ?? resetCircuitClock(document, catalogById), catalogById, 0.1));
    }, 100);
    return () => window.clearInterval(timer);
  }, [isRunning, isReferenceSheet, document]);

  useEffect(() => {
    try {
      const saved = readLocalProject(window.localStorage, STORAGE_KEY);
      if (!saved) return;
      const restored = saved.project;
      const firstSheet = restored.sheets[0];
      setProject(restored);
      setActiveSheetId(firstSheet.id);
      setComponentSelection(firstSheet.document.components[0]?.id ?? "");
      setSelectedWireId("");
      setNotice(`${restored.name} restored from ${saved.source === "previous" ? "the previous local save; the current record remains unchanged" : "local storage"}.`);
    } catch {
      setNotice("The saved local project could not be restored. It was left unchanged for manual review.");
    }
  }, []);

  useEffect(() => {
    if (!dirty || botEditsUnsaved) return;
    const timer = window.setTimeout(() => {
      try {
        writeLocalProject(window.localStorage, STORAGE_KEY, project);
        setDirty(false);
      } catch {
        setNotice("Local autosave could not complete. Use File → Export JSON to preserve this project.");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [dirty, project, botEditsUnsaved]);

  useEffect(() => bindProjectExitSave(window, () => pendingLocalSave.current, (latest) => writeLocalProject(window.localStorage, STORAGE_KEY, latest)), []);

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

  const selectComponent = (componentId: string, additive = false) => {
    setRightDockView("properties");
    if (additive && !isReferenceSheet) {
      const next = toggleComponentSelection(selectedComponentIds, componentId);
      setSelectedComponentIds(next);
      setSelectedComponentId(next.includes(componentId) ? componentId : next[0] ?? "");
    } else setComponentSelection(componentId);
    setSelectedWireId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setGraphicMode(null);
    setReconnectingWireId("");
  };

  const selectComponents = (componentIds: string[], additive: boolean) => {
    setRightDockView("properties");
    const next = additive ? [...new Set([...selectedComponentIds, ...componentIds])] : componentIds;
    setSelectedComponentIds(next);
    setSelectedComponentId(next.at(-1) ?? "");
    setSelectedWireId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setGraphicMode(null);
    setReconnectingWireId("");
  };

  const selectWire = (wireId: string) => {
    setRightDockView("properties");
    setSelectedWireId(wireId);
    setWireRouteEditId("");
    setComponentSelection("");
    setWireMode(false);
    setWireStart(null);
    setWireBranchStart(null);
    setReconnectingWireId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setGraphicMode(null);
  };

  const selectAnnotation = (id: string) => {
    setSelectedAnnotationId(id);
    setComponentSelection("");
    setSelectedWireId("");
    setAnnotationMode(false);
    setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setGraphicMode(null);
  };

  const selectGraphic = (id: string, additive = false) => {
    const nextIds = additive
      ? selectedGraphicIds.includes(id) ? selectedGraphicIds.filter((item) => item !== id) : [...selectedGraphicIds, id]
      : [id];
    setSelectedGraphicIds(nextIds);
    setSelectedGraphicId(nextIds.at(-1) ?? "");
    setComponentSelection("");
    setSelectedWireId("");
    setSelectedAnnotationId("");
    setGraphicMode(null);
  };

  const addAnnotationAt = (x: number, y: number) => {
    if (isReferenceSheet || !annotationMode) return;
    const annotation: SchematicAnnotation = { id: `annotation-${Date.now()}`, text: "New annotation", x, y, color: "#19324f" };
    updateDocument({ ...document, annotations: [...(document.annotations ?? []), annotation], revision: document.revision + 1 });
    selectAnnotation(annotation.id);
    setNotice("Text annotation placed. Edit its text and color in Properties; drag it to reposition.");
  };

  const updateSelectedAnnotation = (patch: Partial<Pick<SchematicAnnotation, "text" | "color" | "x" | "y" | "fontSize" | "rotation" | "textAnchor" | "fontWeight" | "lineSpacing" | "fontStyle" | "backgroundColor">>) => {
    if (!selectedAnnotation) return;
    const next = { ...selectedAnnotation, ...patch };
    const lines = next.text.split(/\r?\n/);
    if (!next.text.trim() || next.text.length > 500 || lines.length > 8 || lines.some((line) => line.length > 160) || !/^#[0-9a-f]{6}$/i.test(next.color) || (next.backgroundColor !== undefined && !/^#[0-9a-f]{6}$/i.test(next.backgroundColor)) || !Number.isFinite(next.fontSize ?? 18) || (next.fontSize ?? 18) < 8 || (next.fontSize ?? 18) > 48 || !Number.isFinite(next.rotation ?? 0) || (next.rotation ?? 0) < 0 || (next.rotation ?? 0) >= 360 || ![400, 600, 700].includes(next.fontWeight ?? 600) || !Number.isFinite(next.lineSpacing ?? 1.2) || (next.lineSpacing ?? 1.2) < 1 || (next.lineSpacing ?? 1.2) > 3 || !["normal", "italic"].includes(next.fontStyle ?? "normal")) {
      setNotice("Annotation text, color, size, or rotation is outside its allowed range.");
      return;
    }
    updateDocument({ ...document, annotations: (document.annotations ?? []).map((item) => item.id === next.id ? next : item), revision: document.revision + 1 });
  };

  const removeSelectedAnnotation = () => {
    if (!selectedAnnotation) return;
    updateDocument({ ...document, annotations: (document.annotations ?? []).filter((item) => item.id !== selectedAnnotation.id), revision: document.revision + 1 });
    setSelectedAnnotationId("");
    setNotice("Text annotation removed. Use Undo to restore it.");
  };

  const addGraphic = (kind: SchematicGraphicKind, x1: number, y1: number, x2: number, y2: number, points?: SchematicGraphicPoint[]) => {
    if (isReferenceSheet) return;
    if ((document.graphics?.length ?? 0) >= 2000) { setNotice("This sheet has reached the 2,000 drawing-graphic limit."); return; }
    const graphic: SchematicGraphic = { id: `graphic-${Da…20286 tokens truncated…nt: number; onReferenceChange: (reference: string) => void; onDisplayNameChange: (displayName: string) => void; onTerminalLabelChange: (terminalId: string, label: string) => void; onCustomPropertyAdd: (name: string, value: string) => boolean; onCustomPropertyRename: (previousName: string, name: string) => boolean; onCustomPropertyChange: (name: string, value: string) => void; onCustomPropertyRemove: (name: string) => void; onPropertyChange: (property: string, value: string | boolean) => void; onDraftingColorChange: (color: string | undefined) => void; onSizeChange: (sizePercent: string) => void; onNudge: (deltaX: number, deltaY: number) => void; onRotate: () => void; onDuplicate: () => void; onRemove: () => void; onCustomTerminalChange: (terminalId: string, patch: Partial<Pick<TerminalDefinition, "kind" | "direction">>) => void; onCustomTerminalAdd: () => void; onCustomTerminalRemove: (terminalId: string) => void; onCustomTerminalOffsetChange: (terminalId: string, axis: "x" | "y", value: string) => void; movable: boolean }) {
  const definition = catalogById.get(savedInstance.definitionId);
  if (!definition) return <p className="empty">Catalog definition missing.</p>;
  const instance = { ...savedInstance, properties: { ...definition.propertiesSchema, ...savedInstance.properties } };
  return <section className="properties-form">{selectionCount > 1 && <p className="group-selection" aria-label="Group selection">{selectionCount} components selected. Arrow controls move the whole group.</p>}<label>Reference<input defaultValue={instance.reference} key={instance.id + instance.reference} onBlur={(event) => onReferenceChange(event.target.value)} /></label><label>Instance name<input defaultValue={savedInstance.displayName ?? ""} key={savedInstance.id + String(savedInstance.displayName ?? "")} maxLength={80} disabled={!movable} onBlur={(event) => onDisplayNameChange(event.target.value)} /></label><label>Component<input value={definition.name} readOnly /></label><label>Category<input value={definition.category} readOnly /></label><label>Simulation<input value={definition.simulationSupport} readOnly /></label>{movable && <><label>Symbol color<input aria-label="Component drafting color" type="color" value={instance.draftingColor ?? "#2272ad"} onChange={(event) => onDraftingColorChange(event.target.value)} /></label><div className="annotation-palette" aria-label="Component color palette">{["#2272ad", "#19324f", "#c62828", "#16814b", "#d27a00", "#7b3fa1"].map((color) => <button key={color} type="button" aria-label={`Set component color ${color}`} title={color} style={{ backgroundColor: color }} onClick={() => onDraftingColorChange(color)} />)}<button type="button" aria-label="Reset component color" title="Default color" onClick={() => onDraftingColorChange(undefined)}>↺</button></div><label>Symbol size · percent<input type="number" min="50" max="200" step="10" defaultValue={Math.round((instance.size ?? 1) * 100)} key={`${instance.id}:${instance.size ?? 1}`} onBlur={(event) => onSizeChange(event.target.value)} /></label></>}<section className="component-parameters"><strong>Component parameters</strong>{Object.entries(instance.properties).map(([property, value]) => typeof value === "boolean" ? <label className="property-checkbox" key={property}>{formatPropertyLabel(property)}<input type="checkbox" checked={value} disabled={!movable} onChange={(event) => onPropertyChange(property, event.target.checked)} /></label> : definition.symbolId === "user-indicator-lamp" && property === "color" && typeof value === "string" ? <div className="component-color-field" key={property}><label>{formatPropertyLabel(property)}<input key={JSON.stringify([instance.id, property, value])} type={componentPropertyInputType(value)} defaultValue={value} disabled={!movable} onBlur={(event) => onPropertyChange(property, event.target.value)} /></label><IndicatorColorPalette value={value} onChange={(color) => onPropertyChange(property, color)} /></div> : <label key={property}>{formatPropertyLabel(property)}<input key={JSON.stringify([instance.id, property, value])} type={componentPropertyInputType(value)} defaultValue={String(value)} maxLength={property.startsWith("terminalLabel") ? 8 : undefined} disabled={!movable} inputMode={typeof value === "number" ? "decimal" : undefined} onBlur={(event) => onPropertyChange(property, event.target.value)} /></label>)}</section>{movable && <CustomComponentData instance={instance} onAdd={onCustomPropertyAdd} onRename={onCustomPropertyRename} onChange={onCustomPropertyChange} onRemove={onCustomPropertyRemove} />}{modelOutput && <section className="model-output"><strong>Live model output</strong><span>{modelOutput.label}</span><b>{modelOutput.value}</b></section>}{!movable && <p className="parameter-note">Reference-model geometry and parameters are fixed so the supported DOL behaviour and displayed circuit stay consistent.</p>}{movable && <><div className="move-grid"><strong>Position · snap 20</strong><span>X {instance.x} · Y {instance.y} · R {instance.rotation}°</span><button onClick={() => onNudge(0, -20)} aria-label="Move component up">↑</button><button onClick={() => onNudge(-20, 0)} aria-label="Move component left">←</button><button onClick={() => onNudge(20, 0)} aria-label="Move component right">→</button><button onClick={() => onNudge(0, 20)} aria-label="Move component down">↓</button></div><button type="button" onClick={onDuplicate}>Duplicate component</button><button className="rotate-component" onClick={onRotate}>Rotate 90°</button><button className="remove-component" onClick={onRemove}>Remove placed component</button></>}<div className="terminals"><strong>Terminal display labels</strong>{(instance.customTerminals ?? definition.terminals).map((terminal, index) => { const fallback = displayTerminalLabel(instance.properties, index, terminal.label); return <span key={terminal.id}>{movable ? <TerminalLabelField instance={instance} terminalId={terminal.id} defaultLabel={fallback} onChange={onTerminalLabelChange} /> : instance.terminalLabels?.[terminal.id] ?? fallback}<small>{terminal.id} · {terminal.kind}</small></span>; })}</div>{movable && isUserSymbolDefinition(instance.definitionId) && <section className="component-parameters"><strong>User symbol terminals</strong><p>Configure connection points for this symbol. Labels, electrical type, and direction are user-defined; simulation behavior is not assigned.</p>{(instance.customTerminals ?? definition.terminals).map((terminal) => <div className="custom-terminal-row" key={terminal.id}><span>{terminal.id.toUpperCase()}</span><select aria-label={`${terminal.id} terminal type`} value={terminal.kind} onChange={(event) => onCustomTerminalChange(terminal.id, { kind: event.target.value as TerminalDefinition["kind"] })}><option value="control">Control</option><option value="power">Power</option><option value="protective-earth">Protective earth</option></select><select aria-label={`${terminal.id} terminal direction`} value={terminal.direction} onChange={(event) => onCustomTerminalChange(terminal.id, { direction: event.target.value as TerminalDefinition["direction"] })}><option value="input">Input</option><option value="output">Output</option><option value="bidirectional">Bidirectional</option></select>{!["t1", "t2"].includes(terminal.id) && <><label>{terminal.id.toUpperCase()} X<input type="number" aria-label={`${terminal.id} terminal X position`} min="-60" max="60" step="4" defaultValue={(instance.customTerminalOffsets?.[terminal.id] ?? controlTerminalOffset(definition.simulationModelId, terminal.id) ?? { x: 0, y: 0 }).x} key={`${instance.id}:${terminal.id}:x:${instance.customTerminalOffsets?.[terminal.id]?.x ?? "default"}`} onBlur={(event) => onCustomTerminalOffsetChange(terminal.id, "x", event.target.value)} /></label><label>{terminal.id.toUpperCase()} Y<input type="number" aria-label={`${terminal.id} terminal Y position`} min="-60" max="60" step="4" defaultValue={(instance.customTerminalOffsets?.[terminal.id] ?? controlTerminalOffset(definition.simulationModelId, terminal.id) ?? { x: 0, y: 0 }).y} key={`${instance.id}:${terminal.id}:y:${instance.customTerminalOffsets?.[terminal.id]?.y ?? "default"}`} onBlur={(event) => onCustomTerminalOffsetChange(terminal.id, "y", event.target.value)} /></label></>}{(instance.customTerminals?.length ?? definition.terminals.length) > 2 && !["t1", "t2"].includes(terminal.id) && <button type="button" onClick={() => onCustomTerminalRemove(terminal.id)} aria-label={`Remove ${terminal.id}`}>Remove</button>}</div>)}{(instance.customTerminals?.length ?? definition.terminals.length) < 8 && <button type="button" onClick={onCustomTerminalAdd}>Add terminal</button>}</section>}<p>{definition.documentation}</p></section>;
}

function TerminalLabelField({ instance, terminalId, defaultLabel, onChange }: { instance: ComponentInstance; terminalId: string; defaultLabel: string; onChange: (terminalId: string, label: string) => void }) {
  const current = instance.terminalLabels?.[terminalId] ?? defaultLabel;
  const [draft, setDraft] = useState(current);
  useEffect(() => setDraft(current), [current]);
  return <label className="terminal-label-field">{terminalId}<input aria-label={`Terminal display label ${terminalId}`} maxLength={8} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { onChange(terminalId, draft); if (!draft.trim()) setDraft(current); }} /></label>;
}

function displayTerminalLabel(properties: ComponentInstance["properties"], index: number, fallback: string) {
  const label = properties[`terminalLabel${index + 1}`];
  return typeof label === "string" && label.trim() ? label.slice(0, 8) : fallback;
}

function CustomComponentData({ instance, onAdd, onRename, onChange, onRemove }: { instance: ComponentInstance; onAdd: (name: string, value: string) => boolean; onRename: (previousName: string, name: string) => boolean; onChange: (name: string, value: string) => void; onRemove: (name: string) => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const fields = instance.customProperties ?? {};
  return <section className="component-parameters custom-component-data">
    <strong>User-defined component data</strong>
    <p>Saved on this component instance; custom data does not affect electrical simulation.</p>
    {Object.entries(fields).map(([fieldName, fieldValue]) => <div className="custom-data-row" key={fieldName}>
      <label>Field name<input aria-label={`${fieldName} field name`} maxLength={40} defaultValue={fieldName} key={`${instance.id}:name:${fieldName}`} onBlur={(event) => { if (event.target.value !== fieldName && !onRename(fieldName, event.target.value)) event.target.value = fieldName; }} /></label>
      <label>Value<input aria-label={`${fieldName} custom value`} maxLength={240} defaultValue={fieldValue} key={`${instance.id}:${fieldName}:${fieldValue}`} onBlur={(event) => { if (event.target.value !== fieldValue) onChange(fieldName, event.target.value); }} /></label>
      <button type="button" aria-label={`Remove custom field ${fieldName}`} onClick={() => onRemove(fieldName)}>Remove</button>
    </div>)}
    {Object.keys(fields).length < 20 && <>
      <label>Field name<input aria-label="New custom field name" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Value<input aria-label="New custom field value" maxLength={240} value={value} onChange={(event) => setValue(event.target.value)} /></label>
      <button type="button" disabled={!name.trim()} onClick={() => { if (onAdd(name, value)) { setName(""); setValue(""); } }}>Add custom field</button>
    </>}
  </section>;
}

function formatPropertyLabel(property: string) {
  return property.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (character) => character.toUpperCase());
}

function isValidCustomFieldName(name: string) {
  return name.length > 0 && name.length <= 40 && !["__proto__", "constructor", "prototype"].includes(name.toLowerCase());
}

function WireProperties({ wire, onNetNameChange, onColorChange, onReconnect, onRemove, routeEditable, routeEditing, onRouteEditToggle, onRoutePointAdd, onRouteReset }: { wire: Wire; onNetNameChange: (netName: string) => void; onColorChange: (color: string | undefined) => void; onReconnect: () => void; onRemove: () => void; routeEditable: boolean; routeEditing: boolean; onRouteEditToggle: () => void; onRoutePointAdd: () => void; onRouteReset: () => void }) {
  const palette = ["#68788b", "#d5242a", "#d39700", "#59708f", "#167a52", "#1565c0", "#7b3fa1"];
  return <section className="properties-form wire-properties"><label>Net name<input defaultValue={wire.netName ?? wire.id} key={wire.id + (wire.netName ?? "")} onBlur={(event) => onNetNameChange(event.target.value)} /></label><label>Wire color<input aria-label="Wire color" type="color" value={wire.draftingColor ?? "#68788b"} onChange={(event) => onColorChange(event.target.value)} /></label><div className="annotation-palette" aria-label="Wire color palette">{palette.map((color) => <button key={color} type="button" aria-label={`Set wire color ${color}`} title={color} style={{ backgroundColor: color }} onClick={() => onColorChange(color)} />)}<button type="button" aria-label="Reset wire color" title="Default color" onClick={() => onColorChange(undefined)}>↺</button></div><label>From terminal<input value={`${wire.from.componentId}.${wire.from.terminalId}`} readOnly /></label><label>To terminal<input value={`${wire.to.componentId}.${wire.to.terminalId}`} readOnly /></label><p>Wire color is drafting appearance only. Reconnecting changes its target terminal and recalculates the orthogonal path.</p>{routeEditable && <><strong>Orthogonal route</strong><button type="button" onClick={onRouteEditToggle}>{routeEditing ? "Stop editing route" : "Edit route points"}</button><button type="button" onClick={onRoutePointAdd}>Add route point</button>{wire.points.length > 0 && <button type="button" onClick={onRouteReset}>Reset to automatic route</button>}<p>Click the wire to add a point. Drag a route handle or use arrow keys to change the path; right-click or press Delete to remove a point.</p></>}{wire.branchOfWireId && <p>Branch route follows its parent wire. Edit the parent route to reposition this attachment.</p>}<button className="reconnect-wire" onClick={onReconnect}>Reconnect target terminal</button><button className="remove-component" onClick={onRemove}>Delete wire</button></section>;
}

function AnnotationProperties({ annotation, onChange, onRemove }: { annotation: SchematicAnnotation; onChange: (patch: Partial<Pick<SchematicAnnotation, "text" | "color" | "fontSize" | "rotation" | "textAnchor" | "fontWeight" | "lineSpacing" | "fontStyle" | "backgroundColor">>) => void; onRemove: () => void }) {
  const palette = ["#19324f", "#c62828", "#16814b", "#1565c0", "#d27a00", "#7b3fa1"];
  return <section className="properties-form annotation-properties" aria-label="Text annotation properties">
    <label>Text<textarea defaultValue={annotation.text} key={`${annotation.id}:${annotation.text}`} maxLength={500} rows={4} onBlur={(event) => onChange({ text: event.target.value })} /></label>
    <label>Text size · SVG units<input type="number" min={8} max={48} step={1} defaultValue={annotation.fontSize ?? 18} key={`${annotation.id}:size:${annotation.fontSize ?? 18}`} onBlur={(event) => onChange({ fontSize: Number(event.target.value) })} /></label>
    <label>Rotation · degrees<input type="number" min={0} max={359} step={1} defaultValue={annotation.rotation ?? 0} key={`${annotation.id}:rotation:${annotation.rotation ?? 0}`} onBlur={(event) => onChange({ rotation: Number(event.target.value) })} /></label>
    <label>Text alignment<select aria-label="Text alignment" value={annotation.textAnchor ?? "start"} onChange={(event) => onChange({ textAnchor: event.target.value as SchematicAnnotation["textAnchor"] })}><option value="start">Left</option><option value="middle">Center</option><option value="end">Right</option></select></label>
    <label>Text weight<select aria-label="Text weight" value={annotation.fontWeight ?? 600} onChange={(event) => onChange({ fontWeight: Number(event.target.value) as SchematicAnnotation["fontWeight"] })}><option value={400}>Standard</option><option value={600}>Semi-bold</option><option value={700}>Bold</option></select></label>
    <label>Line spacing · multiplier<input type="number" min={1} max={3} step={0.1} defaultValue={annotation.lineSpacing ?? 1.2} key={`${annotation.id}:line-spacing:${annotation.lineSpacing ?? 1.2}`} onBlur={(event) => onChange({ lineSpacing: Number(event.target.value) })} /></label>
    <label>Text style<select aria-label="Text style" value={annotation.fontStyle ?? "normal"} onChange={(event) => onChange({ fontStyle: event.target.value as SchematicAnnotation["fontStyle"] })}><option value="normal">Normal</option><option value="italic">Italic</option></select></label>
    <label>Color<input type="color" value={annotation.color} onChange={(event) => onChange({ color: event.target.value })} /></label>
    <div className="annotation-palette" aria-label="Text color palette">{palette.map((color) => <button key={color} type="button" aria-label={`Set text color ${color}`} title={color} style={{ backgroundColor: color }} onClick={() => onChange({ color })} />)}</div>
    <label>Background color<input type="color" value={annotation.backgroundColor ?? "#ffffff"} aria-label="Annotation background color" onChange={(event) => onChange({ backgroundColor: event.target.value })} /></label>
    <div className="annotation-palette" aria-label="Text background palette">{["#ffffff", "#fff2cc", "#ffe0b2", "#d9ead3", "#cfe2f3", "#ead1dc"].map((color) => <button key={color} type="button" aria-label={`Set annotation background ${color}`} title={color} style={{ backgroundColor: color }} onClick={() => onChange({ backgroundColor: color })} />)}<button type="button" aria-label="Clear annotation background" title="No fill" onClick={() => onChange({ backgroundColor: undefined })}>×</button></div>
    <p>Background stays transparent until a color is selected.</p>
    <p>Position · X {annotation.x} · Y {annotation.y}. Drag the text on the sheet to move it.</p>
    <button className="remove-component" onClick={onRemove}>Remove text annotation</button>
  </section>;
}

function GraphicProperties({ graphic, selectionCount, onChange, onGeometryChange, onDuplicate, onRemove, onMakeComponent }: { graphic: SchematicGraphic; selectionCount: number; onChange: (patch: Partial<Pick<SchematicGraphic, "name" | "color" | "fillColor" | "strokeWidth">>) => void; onGeometryChange: (x1: number, y1: number, x2: number, y2: number) => void; onDuplicate: () => void; onRemove: () => void; onMakeComponent: () => void }) {
  const palette = ["#1565c0", "#19324f", "#c62828", "#16814b", "#d27a00", "#7b3fa1"];
  return <section className="properties-form graphic-properties" aria-label="Drawing graphic properties">
    <label>Name / tag<input defaultValue={graphic.name} key={`${graphic.id}:${graphic.name}`} maxLength={80} onBlur={(event) => onChange({ name: event.target.value })} /></label>
    {!graphic.points && <fieldset className="graphic-geometry"><legend>Exact geometry</legend>{(["x1", "y1", "x2", "y2"] as const).map((key) => <label key={key}>{key.toUpperCase()}<input type="number" min="0" max={key.startsWith("x") ? 1100 : 780} step="1" defaultValue={graphic[key]} key={`${graphic.id}:${key}:${graphic[key]}`} onBlur={(event) => { if (!event.currentTarget.value.trim()) return; const value = Number(event.currentTarget.value); if (!Number.isFinite(value)) return; const next = { x1: graphic.x1, y1: graphic.y1, x2: graphic.x2, y2: graphic.y2, [key]: value }; onGeometryChange(next.x1, next.y1, next.x2, next.y2); }} /></label>)}</fieldset>}
    <label>Color<input type="color" value={graphic.color} onChange={(event) => onChange({ color: event.target.value })} /></label>
    <div className="annotation-palette" aria-label="Graphic color palette">{palette.map((color) => <button key={color} type="button" aria-label={`Set graphic color ${color}`} title={color} style={{ backgroundColor: color }} onClick={() => onChange({ color })} />)}</div>
    {(graphic.kind === "rectangle" || graphic.kind === "ellipse" || graphic.kind === "polygon") && <>
      <label>Fill color<input type="color" value={graphic.fillColor ?? "#ffffff"} onChange={(event) => onChange({ fillColor: event.target.value })} /></label>
      <div className="annotation-palette" aria-label="Graphic fill palette"><button type="button" aria-label="Set graphic fill to none" title="No fill" onClick={() => onChange({ fillColor: null })}>∅</button>{palette.map((color) => <button key={color} type="button" aria-label={`Set graphic fill ${color}`} title={color} style={{ backgroundColor: color }} onClick={() => onChange({ fillColor: color })} />)}</div>
    </>}
    <label>Stroke width · units<input type="number" min="1" max="12" step="1" defaultValue={graphic.strokeWidth} key={`${graphic.id}:${graphic.strokeWidth}`} onBlur={(event) => onChange({ strokeWidth: Number(event.target.value) })} /></label>
    <p>{graphic.kind[0].toUpperCase() + graphic.kind.slice(1)} · drafting geometry; it does not connect electrical terminals. {graphic.points ? "Double-click an edge to insert a vertex; drag vertices to reshape and right-click a handle to remove it." : "Drag the shape to move it."}</p>
    {selectionCount > 1 && <p>{selectionCount} graphics selected. Properties above edit the active graphic; symbol conversion combines the selected shapes.</p>}
    {selectionCount === 1 && <p>Shift-click more graphics to combine a drawing into one user symbol.</p>}
    <button type="button" onClick={onMakeComponent}>{selectionCount > 1 ? `Make symbol from ${selectionCount} graphics` : "Make component symbol"}</button>
    <button type="button" onClick={onDuplicate}>Duplicate drawing graphic</button>
    <button className="remove-component" onClick={onRemove}>Remove drawing graphic</button>
  </section>;
}

function ProjectReports({ sheetName, report, onExport, onClose }: { sheetName: string; report: ProjectReport; onExport: (section: ReportSection) => void; onClose: () => void }) {
  return <section className="report-panel" aria-label="Engineering reports"><div className="report-heading"><div><strong>Engineering reports</strong><span>{sheetName}</span></div><div className="report-actions"><button onClick={() => onExport("bom")}>Export BOM CSV</button><button onClick={() => onExport("wires")}>Export wires CSV</button><button onClick={() => onExport("terminals")}>Export terminals CSV</button><button onClick={onClose}>Close reports</button></div></div><div className="report-grid"><ReportTable title="Bill of materials" headers={["Component", "Category", "Qty", "References"]} rows={report.bom.map((line) => [line.component, line.category, String(line.quantity), line.references.join(", ")])} /><ReportTable title="Wire list" headers={["Net", "From", "To"]} rows={report.wires.map((line) => [line.netName, line.from, line.to])} /><ReportTable title="Terminal list" headers={["Reference", "Terminal", "Kind", "Direction"]} rows={report.terminals.map((line) => [line.reference, line.terminal, line.kind, line.direction])} /></div></section>;
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return <section className="report-table-section"><strong>{title}</strong><div className="report-table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>No entries on this sheet.</td></tr>}</tbody></table></div></section>;
}


