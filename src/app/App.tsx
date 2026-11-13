import { ModelRunSummary } from "../components/ModelRunSummary";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { catalogById, componentCatalog, dolCatalog } from "../catalog/dolCatalog";
import { canPlaceComponent, createManualWire, duplicateComponentInstance, findOpenPlacement, moveComponentsByGrid, reconnectWire, removeComponent, removeWire, renameWire, resizeComponent, rotateComponent, updateComponentProperty } from "../cad/documentOps";
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
  const [graphicMode, setGraphicMode] = useState<SchematicGraphicKind | null>(null);
  const [reconnectingWireId, setReconnectingWireId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateLibrary[0].id);
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
  const ladderPreviewInputs = selectedPlcRun && !selectedPlcRun.output.error ? { input0: selectedPlcRun.evaluatedProperties.inputA === true, input1: selectedPlcRun.evaluatedProperties.inputB === true, q0: selectedPlcRun.evaluatedProperties.runtimeQ0 === true, previousInput0: selectedPlcRun.evaluatedProperties.runtimeInput0Previous === true, previousInput1: selectedPlcRun.evaluatedProperties.runtimeInput1Previous === true, analogInput0: Number(selectedPlcRun.evaluatedProperties.analogInput0 ?? 0), registers: Array.from({ length: 8 }, (_, index) => Number(selectedPlcRun.evaluatedProperties[`runtimeD${index}`] ?? 0)), memory: Array.from({ length: 8 }, (_, index) => selectedPlcRun.evaluatedProperties[`runtimeM${index}`] === true), timers: Object.fromEntries([0, 1, 2, 3].map((index) => [`T${index}`, { elapsedSeconds: Number(selectedPlcRun.evaluatedProperties[`runtimeT${index}Elapsed`] ?? 0), done: selectedPlcRun.evaluatedProperties[`runtimeT${index}Done`] === true }])), deltaSeconds: 0.1 } : undefined;
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
    if (additive && !isReferenceSheet) {
      const next = toggleComponentSelection(selectedComponentIds, componentId);
      setSelectedComponentIds(next);
      setSelectedComponentId(next.includes(componentId) ? componentId : next[0] ?? "");
    } else setComponentSelection(componentId);
    setSelectedWireId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId("");
    setGraphicMode(null);
    setReconnectingWireId("");
  };

  const selectComponents = (componentIds: string[], additive: boolean) => {
    const next = additive ? [...new Set([...selectedComponentIds, ...componentIds])] : componentIds;
    setSelectedComponentIds(next);
    setSelectedComponentId(next.at(-1) ?? "");
    setSelectedWireId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId("");
    setGraphicMode(null);
    setReconnectingWireId("");
  };

  const selectWire = (wireId: string) => {
    setSelectedWireId(wireId);
    setWireRouteEditId("");
    setComponentSelection("");
    setWireMode(false);
    setWireStart(null);
    setWireBranchStart(null);
    setReconnectingWireId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId("");
    setGraphicMode(null);
  };

  const selectAnnotation = (id: string) => {
    setSelectedAnnotationId(id);
    setComponentSelection("");
    setSelectedWireId("");
    setAnnotationMode(false);
    setSelectedGraphicId("");
    setGraphicMode(null);
  };

  const selectGraphic = (id: string) => {
    setSelectedGraphicId(id);
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
    const graphic: SchematicGraphic = { id: `graphic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: `${kind[0].toUpperCase()}${kind.slice(1)} ${(document.graphics?.length ?? 0) + 1}`, kind, x1, y1, x2, y2, ...(points ? { points } : {}), color: "#1565c0", fillColor: null, strokeWidth: 2 };
    updateDocument({ ...document, graphics: [...(document.graphics ?? []), graphic], revision: document.revision + 1 });
    selectGraphic(graphic.id);
    setNotice(`${graphic.name} drawn. It is drafting geometry and does not create an electrical connection.`);
  };

  const updateSelectedGraphic = (patch: Partial<Pick<SchematicGraphic, "name" | "color" | "fillColor" | "strokeWidth">>) => {
    if (!selectedGraphic) return;
    const next = { ...selectedGraphic, ...patch };
    if (!next.name.trim() || next.name.length > 80 || !/^#[0-9a-f]{6}$/i.test(next.color) || (next.fillColor !== null && next.fillColor !== undefined && !/^#[0-9a-f]{6}$/i.test(next.fillColor)) || !Number.isFinite(next.strokeWidth) || next.strokeWidth < 1 || next.strokeWidth > 12) {
      setNotice("Graphic names are limited to 80 characters; color and stroke width must be valid.");
      return;
    }
    updateDocument({ ...document, graphics: (document.graphics ?? []).map((item) => item.id === next.id ? next : item), revision: document.revision + 1 });
  };

  const moveGraphic = (id: string, deltaX: number, deltaY: number) => {
    const graphic = document.graphics?.find((item) => item.id === id);
    if (!graphic) return;
    const snap = (value: number) => Math.round(value / 20) * 20;
    const dx = snap(deltaX); const dy = snap(deltaY);
    const xs = graphic.points?.map((point) => point.x) ?? [graphic.x1, graphic.x2];
    const ys = graphic.points?.map((point) => point.y) ?? [graphic.y1, graphic.y2];
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const boundedX = Math.max(-minX, Math.min(1100 - maxX, dx));
    const boundedY = Math.max(-minY, Math.min(780 - maxY, dy));
    if (!boundedX && !boundedY) return;
    selectGraphic(id);
    updateDocument({ ...document, graphics: (document.graphics ?? []).map((item) => item.id === id ? { ...item, x1: item.x1 + boundedX, x2: item.x2 + boundedX, y1: item.y1 + boundedY, y2: item.y2 + boundedY, ...(item.points ? { points: item.points.map((point) => ({ x: point.x + boundedX, y: point.y + boundedY })) } : {}) } : item), revision: document.revision + 1 });
  };

  const resizeGraphic = (id: string, x1: number, y1: number, x2: number, y2: number) => {
    const graphic = document.graphics?.find((item) => item.id === id);
    if (!graphic) return;
    const next = setSchematicGraphicBounds(graphic, { x1, y1, x2, y2 });
    if (!next) { setNotice("Graphic coordinates must stay on the sheet and span at least 4 units."); return; }
    updateDocument({ ...document, graphics: (document.graphics ?? []).map((item) => item.id === id ? next : item), revision: document.revision + 1 });
  };

  const moveGraphicVertex = (id: string, index: number, x: number, y: number) => {
    const graphic = document.graphics?.find((item) => item.id === id);
    if (!graphic?.points || (graphic.kind !== "polyline" && graphic.kind !== "polygon")) return;
    const points = moveGraphicPathVertex(graphic.points, graphic.kind, index, x, y); if (!points) return;
    const next = { ...graphic, points, ...graphicPathBounds(points) };
    updateDocument({ ...document, graphics: (document.graphics ?? []).map((item) => item.id === id ? next : item), revision: document.revision + 1 });
  };

  const insertGraphicVertex = (id: string, x: number, y: number) => {
    const graphic = document.graphics?.find((item) => item.id === id);
    if (!graphic?.points || (graphic.kind !== "polyline" && graphic.kind !== "polygon")) return;
    const updated = insertGraphicPathVertex(graphic.points, graphic.kind, x, y); if (!updated) return;
    const next = { ...graphic, points: updated, ...graphicPathBounds(updated) };
    updateDocument({ ...document, graphics: (document.graphics ?? []).map((item) => item.id === id ? next : item), revision: document.revision + 1 });
  };

  const deleteGraphicVertex = (id: string, index: number) => {
    const graphic = document.graphics?.find((item) => item.id === id);
    if (!graphic?.points || (graphic.kind !== "polyline" && graphic.kind !== "polygon")) return;
    const minimum = graphic.kind === "polygon" ? 3 : 2;
    if (graphic.points.length <= minimum) { setNotice(`${graphic.kind} requires at least ${minimum} vertices.`); return; }
    const points = deleteGraphicPathVertex(graphic.points, graphic.kind, index);
    if (!points) { setNotice("That vertex cannot be removed because it would collapse the polygon."); return; }
    const next = { ...graphic, points, ...graphicPathBounds(points) };
    updateDocument({ ...document, graphics: (document.graphics ?? []).map((item) => item.id === id ? next : item), revision: document.revision + 1 });
  };

  const removeSelectedGraphic = () => {
    if (!selectedGraphic) return;
    updateDocument({ ...document, graphics: (document.graphics ?? []).filter((item) => item.id !== selectedGraphic.id), revision: document.revision + 1 });
    setSelectedGraphicId("");
    setNotice(`${selectedGraphic.name} removed. Use Undo to restore it.`);
  };

  const duplicateSelectedGraphic = () => {
    if (!selectedGraphic || isReferenceSheet) return;
    const copy = duplicateSchematicGraphic(selectedGraphic, `graphic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    updateDocument({ ...document, graphics: [...(document.graphics ?? []), copy], revision: document.revision + 1 });
    selectGraphic(copy.id);
    setNotice(`${copy.name} created. It is drafting geometry and does not create an electrical connection.`);
  };

  const activateGraphicTool = (kind: SchematicGraphicKind) => {
    const next = graphicMode === kind ? null : kind;
    setGraphicMode(next);
    setWireMode(false); setWireStart(null); setAnnotationMode(false);
    setComponentSelection(""); setSelectedWireId(""); setSelectedAnnotationId(""); setSelectedGraphicId("");
    setNotice(next ? kind === "polyline" || kind === "polygon" ? `Click to add ${kind} vertices; double-click or press Enter to finish. Escape cancels.` : `Click and drag on the blank sheet to draw a ${kind}. Drafting geometry does not connect terminals.` : "Drawing tool closed.");
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
    if (botEditsUnsaved && (!authUser || anonymousSession)) { setAuthOpen(true); setAuthMessage("Sign in to a permanent account before saving Bot edits. They remain on the canvas without autosave."); return; }
    try {
      writeLocalProject(window.localStorage, STORAGE_KEY, project);
      setDirty(false);
      setBotEditsUnsaved(false);
      setNotice(t.projectSaved);
    } catch {
      setDirty(true);
      setNotice("The local save failed. Your current work remains in memory; export JSON to keep a copy.");
    }
  };

  const saveToCloud = async () => {
    if (botEditsUnsaved && (!authUser || anonymousSession)) { setAuthOpen(true); setAuthMessage("Sign in to a permanent account before saving Bot edits."); return; }
    if (!authUser) {
      setAuthOpen(true);
      setAuthMessage("Sign in or create an account before saving a new cloud project.");
      return;
    }
    if (anonymousSession && !cloudProjectId) {
      setAuthOpen(true);
      setAuthMessage("Anonymous accounts can read, update, and delete their owned rows, but cannot create a cloud project. Upgrade this account to create one.");
      return;
    }
    try {
      const saved = await saveCloudProject(authUser.id, project, cloudProjectId || undefined);
      if (activeAuthUserId.current !== authUser.id) { setNotice("Cloud save finished for the previous account. Sign back in to load it."); return; }
      const selection = { userId: authUser.id, projectId: saved.id };
      setCloudSelection(selection);
      try { rememberCloudProjectSelection(window.localStorage, selection); } catch { /* The current session still retains its selection. */ }
      if (latestProject.current !== project) { setNotice("The cloud saved the earlier project snapshot. Newer edits remain unsaved."); return; }
      setDirty(false);
      setBotEditsUnsaved(false);
      setNotice(`${project.name} saved to the authenticated cloud account.`);
    } catch (error) {
      setNotice(`Cloud save failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  };

  const loadFromCloud = async () => {
    if (!authUser) {
      setAuthOpen(true);
      setAuthMessage("Sign in before loading a cloud project.");
      return;
    }
    try {
      const saved = await loadLatestCloudProject(authUser.id);
      if (activeAuthUserId.current !== authUser.id) { setNotice("Cloud load ignored because the active account changed."); return; }
      if (!saved) {
        setNotice("No cloud project is available for this account.");
        return;
      }
      const restored = parseProjectJson(JSON.stringify(saved.document));
      const firstSheet = restored.sheets[0];
      setProject(restored);
      setHistory({ undo: [], redo: [] });
      setActiveSheetId(firstSheet.id);
      setComponentSelection(firstSheet.document.components[0]?.id ?? "");
      setSelectedWireId("");
      setWireMode(false);
      setWireStart(null);
      const selection = { userId: authUser.id, projectId: saved.id };
      setCloudSelection(selection);
      try { rememberCloudProjectSelection(window.localStorage, selection); } catch { /* The current session still retains its selection. */ }
      setDirty(false);
      setBotEditsUnsaved(false);
      setNotice(`${restored.name} loaded from the authenticated cloud account.`);
    } catch (error) {
      setNotice(`Cloud load failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  };

  const authenticate = async (mode: "sign-in" | "sign-up") => {
    try {
      const user = mode === "sign-in" ? await signIn(authEmail, authPassword) : await signUp(authEmail, authPassword);
      setAuthUser(user);
      setAuthPassword("");
      setExistingAccountMode(false);
      setAuthMessage(mode === "sign-up" ? "Check your email to confirm the account before signing in." : "Signed in. Cloud project commands are now available.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Authentication failed.");
    }
  };

  const startPreview = async () => {
    try {
      const user = await startAnonymousPreview();
      setAuthUser(user);
      setAuthMessage("Preview started. The five-minute reminder is informational only; it does not restrict account access.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Anonymous preview could not start.");
    }
  };

  const beginUpgrade = async () => {
    try {
      const result = await beginAnonymousUpgrade(authEmail);
      if (result.existingEmail) { setExistingAccountMode(true); setAuthPassword(""); }
      if (result.sent && authUser) {
        window.localStorage.setItem(UPGRADE_USER_KEY, authUser.id);
        setUpgradeUserId(authUser.id);
      }
      setAuthMessage(result.existingEmail ? "That email already has an account. Enter its existing password and press Sign in to existing account." : result.message);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Could not send the confirmation email. Try again.");
    }
  };

  const finishUpgrade = async () => {
    try {
      const user = await finishAnonymousUpgrade(authPassword);
      window.localStorage.removeItem(UPGRADE_USER_KEY);
      setUpgradeUserId("");
      setAuthUser(user);
      setAuthMessage("Password set. The anonymous account is now linked to the confirmed email.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Set a password only after confirming the email link.");
    }
  };

  const loadLocalSave = () => {
    try {
      const saved = readLocalProject(window.localStorage, STORAGE_KEY);
      if (!saved) { setNotice("No saved local project was found."); return; }
      const restored = saved.project;
      const firstSheet = restored.sheets[0];
      recordEdit(restored);
      setActiveSheetId(firstSheet.id);
      setComponentSelection(firstSheet.document.components[0]?.id ?? "");
      setSelectedWireId("");
      setWireMode(false);
      setWireStart(null);
      setDirty(false);
      setNotice(`${restored.name} restored from ${saved.source === "previous" ? "the previous local save; the current record remains unchanged" : "local storage"}.`);
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

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const captureSchematicSvg = () => {
    const drawing = window.document.querySelector("svg.schematic");
    if (!(drawing instanceof SVGSVGElement)) {
      setNotice("No schematic drawing is available for export.");
      return null;
    }
    const copy = drawing.cloneNode(true) as SVGSVGElement;
    copy.querySelectorAll(".terminal-anchors").forEach((node) => node.remove());
    return prepareStandaloneSchematicSvg(new XMLSerializer().serializeToString(copy));
  };

  const exportSchematicSvg = () => {
    try {
      const markup = captureSchematicSvg();
      if (!markup) return;
      downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), "adigun-electro-cad-schematic.svg");
      setNotice("Standalone schematic SVG exported.");
    } catch {
      setNotice("Schematic SVG export could not be completed.");
    }
  };

  const exportSchematicPng = () => {
    try {
      const markup = captureSchematicSvg();
      if (!markup) return;
      const sourceUrl = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
      const image = new Image();
      image.onload = () => {
        const canvas = window.document.createElement("canvas");
        canvas.width = 1100;
        canvas.height = 780;
        const context = canvas.getContext("2d");
        if (!context) {
          URL.revokeObjectURL(sourceUrl);
          setNotice("PNG export is unavailable in this browser.");
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(sourceUrl);
          if (!blob) {
            setNotice("PNG export could not be completed.");
            return;
          }
          downloadBlob(blob, "adigun-electro-cad-schematic.png");
          setNotice("Schematic PNG exported.");
        }, "image/png");
      };
      image.onerror = () => {
        URL.revokeObjectURL(sourceUrl);
        setNotice("PNG export could not render the schematic.");
      };
      image.src = sourceUrl;
    } catch {
      setNotice("Schematic PNG export could not be completed.");
    }
  };

  const printSchematic = () => {
    setNotice("Opening the browser print dialog for the active schematic.");
    window.print();
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
      setComponentSelection(firstSheet.document.components[0]?.id ?? "");
      setSelectedWireId("");
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
    setComponentSelection("contactor");
    setSelectedWireId("");
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
    setComponentSelection(restoredSheet.document.components[0]?.id ?? "");
    setSelectedWireId("");
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
    setComponentSelection(restoredSheet.document.components[0]?.id ?? "");
    setSelectedWireId("");
    setDirty(true);
    setNotice("Last project edit redone.");
  };

  const addSelectedComponent = () => {
    const movableComponents = document.components.filter((component) => !(isReferenceSheet && fixedReferenceComponentIds.has(component.id)));
    const placement = findOpenPlacement(movableComponents, isReferenceSheet ? "reference" : "free", selectedDefinition.id);
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
    selectComponent(instance.id);
    setNotice(`${selectedDefinition.name} inserted as ${instance.reference}.`);
  };

  const tryAddFreeSheet = (source: ElectricalProject) => {
    if (source.sheets.length >= MAX_PROJECT_SHEETS) { setNotice(`This project has reached its ${MAX_PROJECT_SHEETS}-sheet limit. Create a new project to add more sheets.`); return null; }
    return addFreeSchematicSheet(source);
  };

  const addSheet = () => {
    const next = tryAddFreeSheet(project);
    if (!next) return;
    const sheet = next.sheets.at(-1)!;
    recordEdit(next);
    setActiveSheetId(sheet.id);
    setComponentSelection("");
    setSelectedWireId("");
    setSelectedAnnotationId(""); setSelectedGraphicId(""); setAnnotationMode(false); setGraphicMode(null);
    setWireMode(false);
    setWireStart(null);
    setDirty(true);
    setNotice(`${sheet.name} added. Insert a catalog component to begin the schematic.`);
  };

  const selectSheet = (sheetId: string) => {
    const sheet = project.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    setActiveSheetId(sheetId);
    setComponentSelection(sheet.document.components[0]?.id ?? "");
    setSelectedWireId("");
    setWireRouteEditId("");
    setSelectedAnnotationId(""); setSelectedGraphicId(""); setAnnotationMode(false); setGraphicMode(null);
    setWireMode(false);
    setWireStart(null);
    setNotice(`${sheet.name} selected.`);
  };

  const loadTemplate = () => {
    let targetProject = project;
    let targetSheetId = activeSheet.id;
    if (isReferenceSheet) {
      const extended = tryAddFreeSheet(project);
      if (!extended) return;
      targetProject = extended;
      targetSheetId = targetProject.sheets.at(-1)!.id;
    }
    const next = loadTemplateIntoSheet(targetProject, targetSheetId, selectedTemplate);
    const loadedSheet = next.sheets.find((sheet) => sheet.id === targetSheetId)!;
    recordEdit(next);
    setActiveSheetId(targetSheetId);
    setComponentSelection(loadedSheet.document.components[0]?.id ?? "");
    setSelectedWireId("");
    setWireMode(false);
    setWireStart(null);
    setDirty(true);
    setNotice(`${selectedTemplate.name} loaded with its recorded test sequence and executable component abstractions.`);
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
    setWireRouteEditId("");
    setWireStart(null);
    setWireBranchStart(null);
    setAnnotationMode(false); setGraphicMode(null); setSelectedGraphicId("");
    if (!next) setReconnectingWireId("");
    setNotice(next ? "Wiring mode: select a source terminal, then a compatible target. Shift-click targets to branch from the same source." : "Wiring mode closed.");
  };

  const selectWireTerminal = (endpoint: TerminalEndpoint, continueBranch = false) => {
    if (!wireMode) return;
    if (!wireStart) {
      setWireStart(endpoint);
      setWireBranchStart(null);
      setNotice("Wire start selected. Choose a compatible target terminal.");
      return;
    }
    const reconnectingWire = reconnectingWireId ? document.wires.find((wire) => wire.id === reconnectingWireId) : undefined;
    if (reconnectingWireId && !reconnectingWire) {
      setNotice("The selected wire is no longer available for reconnection.");
      setWireStart(null);
      setReconnectingWireId("");
      return;
    }
    const validationDocument = reconnectingWire ? { ...document, wires: document.wires.filter((wire) => wire.id !== reconnectingWire.id) } : document;
    const check = canConnectTerminals(validationDocument, catalogById, wireStart, endpoint);
    if (!check.ok) {
      setNotice(check.reason ?? "The selected terminals cannot be connected.");
      setWireStart(reconnectingWire?.from ?? wireStart);
      return;
    }
    if (reconnectingWire) {
      updateDocument(reconnectWire(document, reconnectingWire.id, endpoint));
      setSelectedWireId(reconnectingWire.id);
      setNotice(`Wire ${reconnectingWire.netName ?? reconnectingWire.id} reconnected to the selected terminal.`);
    } else {
      const wire = createManualWire(document, wireStart, endpoint, wireBranchStart ? { wireId: wireBranchStart.wireId, source: wireBranchStart.source, position: wireBranchStart.position } : undefined);
      updateDocument({ ...document, wires: [...document.wires, wire], revision: document.revision + 1 });
      setSelectedWireId(wire.id);
      setNotice(continueBranch ? `Wire ${wire.netName} added. The source remains selected; Shift-click another compatible target or click without Shift to finish branching.` : `Wire ${wire.netName} created between catalog terminals.`);
    }
    setWireStart(continueBranch && !reconnectingWire ? wireStart : null);
    setWireBranchStart(continueBranch && !reconnectingWire ? wireBranchStart : null);
    setReconnectingWireId("");
  };

  const selectWireBranch = (wireId: string, source: WireBranchSource, position: number) => {
    if (!wireMode || reconnectingWireId) return;
    const wire = document.wires.find((item) => item.id === wireId);
    if (!wire || !Number.isFinite(position) || position <= 0 || position >= 1) return;
    const endpoint = source === "from" ? wire.from : wire.to;
    setWireStart(endpoint);
    setWireBranchStart({ wireId, source, position });
    setNotice(`Branch origin selected on ${wire.netName ?? wire.id}. Choose a compatible target terminal; Shift-click to add more branches here.`);
  };

  const renameSelectedWire = (netName: string) => {
    if (!selectedWire) return;
    const normalized = netName.trim();
    if (!normalized || normalized.length > 80) {
      setNotice("Wire net names must contain 1–80 readable characters.");
      return;
    }
    updateDocument(renameWire(document, selectedWire.id, normalized));
    setNotice(`Wire renamed to ${normalized}.`);
  };

  const updateSelectedWireColor = (draftingColor: string | undefined) => {
    if (!selectedWire) return;
    if (draftingColor !== undefined && !/^#[0-9a-f]{6}$/i.test(draftingColor)) return;
    const wires = document.wires.map((wire) => {
      if (wire.id !== selectedWire.id) return wire;
      const next = { ...wire };
      if (draftingColor) next.draftingColor = draftingColor;
      else delete next.draftingColor;
      return next;
    });
    updateDocument({ ...document, wires, revision: document.revision + 1 });
  };

  const updateWireRoute = (wireId: string, points: SchematicGraphicPoint[]) => {
    if (!document.wires.some((wire) => wire.id === wireId && !wire.branchOfWireId)) return;
    updateDocument({ ...document, wires: document.wires.map((wire) => wire.id === wireId ? { ...wire, points } : wire), revision: document.revision + 1 });
  };

  const addSelectedWireRoutePoint = () => {
    if (!selectedWire || selectedWire.branchOfWireId) return;
    const anchors = terminalAnchors(document);
    const from = anchors.find((anchor) => anchor.endpoint.componentId === selectedWire.from.componentId && anchor.endpoint.terminalId === selectedWire.from.terminalId);
    const to = anchors.find((anchor) => anchor.endpoint.componentId === selectedWire.to.componentId && anchor.endpoint.terminalId === selectedWire.to.terminalId);
    if (!from || !to) { setNotice("Could not find the selected wire's catalog terminal positions."); return; }
    const points = appendWireRoutePoint(from, to, selectedWire.points, from.vertical ?? false, to.vertical ?? false);
    if (points.length === selectedWire.points.length) { setNotice("This route already has a point at the available position."); return; }
    updateWireRoute(selectedWire.id, points);
    setWireRouteEditId(selectedWire.id);
    setNotice("Route point added. Drag its handle to edit the wire path.");
  };

  const resetSelectedWireRoute = () => {
    if (!selectedWire || selectedWire.branchOfWireId) return;
    updateWireRoute(selectedWire.id, []);
    setNotice("Wire route reset to its automatic orthogonal path.");
  };

  const reconnectSelectedWire = () => {
    if (!selectedWire) return;
    setWireRouteEditId("");
    setWireMode(true);
    setWireStart(selectedWire.from);
    setWireBranchStart(null);
    setReconnectingWireId(selectedWire.id);
    setNotice(`Reconnecting ${selectedWire.netName ?? selectedWire.id}: choose a replacement target terminal.`);
  };

  const removeSelectedWire = () => {
    if (!selectedWire) return;
    const before = document.wires.length;
    const updated = removeWire(document, selectedWire.id);
    updateDocument(updated);
    setSelectedWireId("");
    setWireRouteEditId("");
    if (wireBranchStart && !updated.wires.some((wire) => wire.id === wireBranchStart.wireId)) { setWireStart(null); setWireBranchStart(null); }
    const removedCount = before - updated.wires.length;
    setNotice(removedCount > 1 ? `Wire ${selectedWire.netName ?? selectedWire.id} and ${removedCount - 1} dependent branch${removedCount === 2 ? "" : "es"} removed. Use Undo to restore them.` : `Wire ${selectedWire.netName ?? selectedWire.id} removed. Use Undo to restore it.`);
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

  const updateDisplayName = (displayName: string) => {
    if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const normalized = displayName.trim();
    if (normalized.length > 80) { setNotice("Component names are limited to 80 characters."); return; }
    const components = document.components.map((component) => {
      if (component.id !== selectedComponent.id) return component;
      const next = { ...component };
      if (normalized) next.displayName = normalized;
      else delete next.displayName;
      return next;
    });
    updateDocument({ ...document, components, revision: document.revision + 1 });
  };

  const updateTerminalLabel = (terminalId: string, label: string) => {
    if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const terminals = selectedComponent.customTerminals ?? catalogById.get(selectedComponent.definitionId)?.terminals ?? [];
    const index = terminals.findIndex((terminal) => terminal.id === terminalId);
    if (index < 0) return;
    const normalized = label.trim();
    if (normalized.length > 8) { setNotice("Terminal display labels are limited to 8 characters."); return; }
    const fallback = displayTerminalLabel(selectedComponent.properties, index, terminals[index].label);
    const nextLabel = normalized && normalized !== fallback ? normalized : undefined;
    if (selectedComponent.terminalLabels?.[terminalId] === nextLabel) return;
    const terminalLabels = { ...(selectedComponent.terminalLabels ?? {}) };
    if (nextLabel === undefined) delete terminalLabels[terminalId];
    else terminalLabels[terminalId] = nextLabel;
    const components = document.components.map((component) => {
      if (component.id !== selectedComponent.id) return component;
      const next = { ...component };
      if (Object.keys(terminalLabels).length) next.terminalLabels = terminalLabels;
      else delete next.terminalLabels;
      return next;
    });
    updateDocument({ ...document, components, revision: document.revision + 1 });
  };

  const changeCustomTerminal = (terminalId: string, patch: Partial<Pick<TerminalDefinition, "kind" | "direction">>) => {
    if (!selectedComponent || selectedComponent.definitionId !== "user.indicator-lamp" || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const base = catalogById.get(selectedComponent.definitionId)?.terminals ?? [];
    const terminals = (selectedComponent.customTerminals ?? base).map((terminal) => terminal.id === terminalId ? { ...terminal, ...patch } : terminal);
    updateDocument({ ...document, components: document.components.map((component) => component.id === selectedComponent.id ? { ...component, customTerminals: terminals } : component), revision: document.revision + 1 });
  };

  const addCustomTerminal = () => {
    if (!selectedComponent || selectedComponent.definitionId !== "user.indicator-lamp" || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const terminals = selectedComponent.customTerminals ?? catalogById.get(selectedComponent.definitionId)?.terminals ?? [];
    if (terminals.length >= 8) { setNotice("User-defined symbols support up to 8 terminals."); return; }
    const id = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"].find((candidate) => !terminals.some((terminal) => terminal.id === candidate)) ?? "t8";
    const next = [...terminals, { id, label: id.toUpperCase(), kind: "control" as const, direction: "bidirectional" as const }];
    updateDocument({ ...document, components: document.components.map((component) => component.id === selectedComponent.id ? { ...component, customTerminals: next } : component), revision: document.revision + 1 });
    setNotice(`${id.toUpperCase()} added. Choose its type, direction, label, and wire connections in Properties.`);
  };

  const removeCustomTerminal = (terminalId: string) => {
    if (!selectedComponent || selectedComponent.definitionId !== "user.indicator-lamp" || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const terminals = selectedComponent.customTerminals ?? catalogById.get(selectedComponent.definitionId)?.terminals ?? [];
    if (terminals.length <= 2 || terminalId === "t1" || terminalId === "t2") { setNotice("Keep the base T1 and T2 identities; remove added terminals when no longer needed."); return; }
    if (document.wires.some((wire) => [wire.from, wire.to].some((endpoint) => endpoint.componentId === selectedComponent.id && endpoint.terminalId === terminalId))) { setNotice("Disconnect this terminal before removing it."); return; }
    const customTerminals = terminals.filter((terminal) => terminal.id !== terminalId);
    const terminalLabels = { ...(selectedComponent.terminalLabels ?? {}) }; delete terminalLabels[terminalId];
    updateDocument({ ...document, components: document.components.map((component) => { if (component.id !== selectedComponent.id) return component; const next = { ...component, customTerminals } as ComponentInstance; if (Object.keys(terminalLabels).length) next.terminalLabels = terminalLabels; else delete next.terminalLabels; return next; }), revision: document.revision + 1 });
    setNotice(`${terminalId.toUpperCase()} removed.`);
  };

  const updateSelectedDraftingColor = (draftingColor: string | undefined) => {
    if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    if (draftingColor !== undefined && !/^#[0-9a-f]{6}$/i.test(draftingColor)) return;
    const components = document.components.map((component) => {
      if (component.id !== selectedComponent.id) return component;
      const next = { ...component };
      if (draftingColor) next.draftingColor = draftingColor;
      else delete next.draftingColor;
      return next;
    });
    updateDocument({ ...document, components, revision: document.revision + 1 });
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
      if (typeof rawValue !== "string" || (property !== "program" && !rawValue.trim()) || rawValue.trim().length > (property === "program" ? 2048 : 80)) {
        setNotice("Program allows up to 2048 characters; other text parameters require 1–80 characters.");
        return;
      }
      value = rawValue.trim();
    }
    updateDocument(updateComponentProperty(document, selectedComponent.id, property, value));
    setNotice(`${selectedComponent.reference} parameter ${property} updated.`);
  };

    const addSelectedCustomProperty = (rawName: string, value: string) => {
      if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return false;
      const name = rawName.trim();
      const fields = selectedComponent.customProperties ?? {};
      if (!isValidCustomFieldName(name) || value.length > 240 || Object.keys(fields).length >= 20 || Object.keys(fields).some((key) => key.toLowerCase() === name.toLowerCase())) {
        setNotice("Use a unique field name of 1–40 characters and a value of at most 240 characters; a component can have up to 20 custom fields.");
        return false;
      }
      updateDocument({ ...document, components: document.components.map((component) => component.id === selectedComponent.id ? { ...component, customProperties: { ...fields, [name]: value } } : component), revision: document.revision + 1 });
      setNotice(`${selectedComponent.reference} custom field ${name} added. It does not affect simulation.`);
      return true;
    };

    const updateSelectedCustomProperty = (name: string, value: string) => {
      if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
      const fields = selectedComponent.customProperties ?? {};
      if (!Object.prototype.hasOwnProperty.call(fields, name) || value.length > 240) return;
      updateDocument({ ...document, components: document.components.map((component) => component.id === selectedComponent.id ? { ...component, customProperties: { ...fields, [name]: value } } : component), revision: document.revision + 1 });
      setNotice(`${selectedComponent.reference} custom field ${name} updated. It does not affect simulation.`);
    };

    const renameSelectedCustomProperty = (previousName: string, rawName: string) => {
      if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return false;
      const name = rawName.trim();
      const fields = selectedComponent.customProperties ?? {};
      if (!Object.prototype.hasOwnProperty.call(fields, previousName)) return false;
      if (!isValidCustomFieldName(name) || Object.keys(fields).some((key) => key !== previousName && key.toLowerCase() === name.toLowerCase())) {
        setNotice("Custom field names must be unique and 1–40 characters long.");
        return false;
      }
      if (name !== previousName) {
        const customProperties = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key === previousName ? name : key, value]));
        updateDocument({ ...document, components: document.components.map((component) => component.id === selectedComponent.id ? { ...component, customProperties } : component), revision: document.revision + 1 });
        setNotice(`${selectedComponent.reference} custom field renamed to ${name}.`);
      }
      return true;
    };

    const removeSelectedCustomProperty = (name: string) => {
      if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
      const fields = selectedComponent.customProperties ?? {};
      if (!Object.prototype.hasOwnProperty.call(fields, name)) return;
      const customProperties = Object.fromEntries(Object.entries(fields).filter(([key]) => key !== name));
      updateDocument({ ...document, components: document.components.map((component) => component.id === selectedComponent.id ? { ...component, customProperties } : component), revision: document.revision + 1 });
      setNotice(`${selectedComponent.reference} custom field ${name} removed.`);
    };

  const updateSelectedSize = (rawValue: string) => {
    if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const size = Number(rawValue) / 100;
    const result = resizeComponent(document, selectedComponent.id, size);
    if (!result.ok) { setNotice(result.reason ?? "Component size could not be updated."); return; }
    updateDocument(result.document);
    setNotice(`${selectedComponent.reference} size set to ${Math.round(size * 100)}%.`);
  };

  const nudgeSelectedComponent = (deltaX: number, deltaY: number) => {
    if (!selectedComponent) return;
    const componentIds = selectedComponentIds.includes(selectedComponent.id) ? selectedComponentIds : [selectedComponent.id];
    if (isReferenceSheet && componentIds.some((id) => fixedReferenceComponentIds.has(id))) {
      setNotice("Reference DOL symbols are fixed in this increment. Newly placed component instances can be moved on the grid.");
      return;
    }
    const result = moveComponentsByGrid(document, componentIds, deltaX, deltaY);
    if (!result.ok) { setNotice(result.reason ?? "Move blocked: keep symbols and labels inside the sheet and clear of neighbors."); return; }
    if (result.document !== document) updateDocument(result.document);
    setNotice(`${componentIds.length} selected component${componentIds.length === 1 ? "" : "s"} moved; terminal-level wire topology is preserved.`);
  };

  const dragComponent = (componentId: string, x: number, y: number) => {
    if (isReferenceSheet) return;
    const component = document.components.find((item) => item.id === componentId);
    if (!component) return;
    const componentIds = selectedComponentIds.includes(componentId) ? selectedComponentIds : [componentId];
    const result = moveComponentsByGrid(document, componentIds, x - component.x, y - component.y);
    if (!result.ok) { setNotice(result.reason ?? "Move rejected."); return; }
    if (result.document === document) return;
    updateDocument(result.document);
    setNotice(`${componentIds.length} selected component${componentIds.length === 1 ? "" : "s"} moved on the 20-unit grid; connected wire endpoints are preserved.`);
  };

  const removeSelectedComponent = () => {
    if (!selectedComponent) return;
    if (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id)) {
      setNotice("Reference DOL symbols cannot be removed from this supported model. Remove placed instances from a free sheet instead.");
      return;
    }
    const result = removeComponent(document, selectedComponent.id);
    updateDocument(result.document);
    if (wireStart?.componentId === selectedComponent.id || (wireBranchStart && !result.document.wires.some((wire) => wire.id === wireBranchStart.wireId))) { setWireStart(null); setWireBranchStart(null); }
    if (selectedWireId && !result.document.wires.some((wire) => wire.id === selectedWireId)) setSelectedWireId("");
    setComponentSelection("");
    setNotice(`${selectedComponent.reference} removed${result.removedWireCount ? ` with ${result.removedWireCount} connected wire${result.removedWireCount === 1 ? "" : "s"}` : ""}. Use Undo to restore it.`);
  };

  const duplicateSelectedComponent = () => {
    if (!selectedComponent || isReferenceSheet) return;
    const definition = catalogById.get(selectedComponent.definitionId);
    if (!definition) { setNotice("The selected catalog definition is unavailable."); return; }
    const copy = duplicateComponentInstance(document.components, selectedComponent, `component-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, definition.referencePrefix);
    if (!copy) { setNotice("No clear position is available for another copy on this sheet."); return; }
    updateDocument({ ...document, components: [...document.components, copy], revision: document.revision + 1 });
    selectComponent(copy.id);
    setNotice(`${copy.reference} duplicated from ${selectedComponent.reference}. No wires were copied; connect the terminals you choose.`);
  };

  const rotateSelectedComponent = () => {
    if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const nextRotation: ComponentInstance["rotation"] = selectedComponent.rotation === 270 ? 0 : (selectedComponent.rotation + 90) as 90 | 180 | 270;
    const movableComponents = document.components.filter((component) => !(isReferenceSheet && fixedReferenceComponentIds.has(component.id)));
    const rotatedComponents = movableComponents.map((component) => component.id === selectedComponent.id ? { ...component, rotation: nextRotation } : component);
    if (!canPlaceComponent(rotatedComponents, selectedComponent.id, selectedComponent.x, selectedComponent.y)) {
      setNotice("Rotation blocked by sheet bounds or symbol/label clearance.");
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
          <div className="brand-identity"><strong>Hephzibah Behulah</strong><small>GLOBAL · HB ELEKTRONIKER</small></div>
          <div className="product-brand"><strong>⚡ Adigun<span>ElectroCAD</span></strong><small>BY HB ELEKTRONIKER</small></div>
        </div>
        <div className="project-status"><strong>{project.name}</strong><span className={isRunning ? "simulation-pill active" : "simulation-pill"}>{isRunning ? t.running : t.stopped}</span></div>
        <HeaderUtilities saved={!dirty && !botEditsUnsaved} signedIn={Boolean(authUser && !anonymousSession)} accountOpen={authOpen} locale={locale} theme={theme} search={search} grid={showGrid} onAccount={() => setAuthOpen((open) => !open)} onDismissAccount={() => setAuthOpen(false)} onLocale={(value) => setLocale(value as Locale)} onTheme={(value) => setTheme(value as Theme)} onSearch={setSearch} onGrid={setShowGrid} onBot={() => setBotActivation((value) => value + 1)} />
      </header>

      <LiveCopilot canvas={document} projectId={project.id} catalog={catalogById} selectedId={selectedComponentId} simulationState={isRunning ? "running" : runtimeDocument ? "paused" : "stopped"} liveOutput={circuitModelRuns.find((run) => run.componentId === selectedComponentId)?.output} owner={authUser?.id ?? "guest"} cloudOwner={authUser && !anonymousSession ? authUser.id : null} activation={botActivation} onShow={() => setBotActivation((value) => value + 1)} onUnread={setBotUnread} onOpen={setBotOpen} editable={!isReferenceSheet} onApply={(next) => { if (isReferenceSheet) throw new Error("Reference-sheet wiring is fixed. Use a free sheet for Bot wire fixes."); setBotEditsUnsaved(true); updateDocument(next); setNotice("Bot wire fix applied without saving. Undo reverses it. Sign in and explicitly save to preserve it."); }} />

      {authOpen && <section className="auth-panel" aria-label="Cloud account">
        <div><strong>{authUser ? anonymousSession ? "Guest preview account" : "Authenticated cloud account" : "Cloud account"}</strong><p>{anonymousSession ? "Preview access is not time-limited. Anonymous accounts can read, update and delete their owned data; the database blocks only new inserts." : "Use a confirmed email and password for cloud project creation and cross-device access."}</p></div>
        {!authUser && <div className="auth-fields"><label>Email<input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" /></label><label>Password<input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete="current-password" /></label><div className="auth-actions"><button onClick={() => void authenticate("sign-in")}>Sign in</button><button onClick={() => void authenticate("sign-up")}>Create account</button><button onClick={() => void startPreview()}>Start preview</button></div></div>}
        {anonymousSession && !existingAccountMode && <div className="auth-fields"><label>Confirmed email<input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" /></label><label>New password<input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete="new-password" /></label><div className="auth-actions"><button onClick={() => void beginUpgrade()}>1. Send confirmation</button><button onClick={() => void finishUpgrade()}>2. Set password after confirmation</button><button onClick={() => { setExistingAccountMode(true); setAuthPassword(""); setAuthMessage(""); }}>Use an existing account</button></div></div>}
        {anonymousSession && existingAccountMode && <form className="auth-fields" onSubmit={(event) => { event.preventDefault(); void authenticate("sign-in"); }}><label>Account email<input type="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" /></label><label>Existing password<input type="password" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete="current-password" /></label><div className="auth-actions"><button type="submit">Sign in to existing account</button><button type="button" onClick={() => { setExistingAccountMode(false); setAuthPassword(""); setAuthMessage(""); }}>Back to guest upgrade</button><span>This switches accounts; guest data stays with the guest account.</span></div></form>}
        {authUser && !anonymousSession && upgradeUserId === authUser.id && <div className="auth-fields"><label>New password<input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete="new-password" /></label><button onClick={() => void finishUpgrade()}>2. Set password after confirmation</button></div>}
        {authUser && !anonymousSession && <div className="auth-actions"><span>{authUser.email ?? "Confirmed account"}</span><button onClick={() => void signOut().then(() => { setAuthUser(null); setAuthMessage("Signed out."); }).catch((error) => setAuthMessage(error instanceof Error ? error.message : "Sign out failed."))}>Sign out</button></div>}
        {authMessage && <p className="auth-message">{authMessage}</p>}
      </section>}

      <nav className="menu-row" aria-label="Project actions">
        <details><summary>File</summary><div className="menu-popover"><button onClick={restoreDol}>{t.restore}</button><button onClick={saveLocally}>{t.save}</button><button onClick={() => void saveToCloud()}>Save to cloud</button><button onClick={loadLocalSave}>Load local save</button><button onClick={() => void loadFromCloud()}>Load cloud project</button><button onClick={exportProject}>{t.export}</button><button onClick={exportSchematicSvg}>Export SVG</button><button onClick={exportSchematicPng}>Export PNG</button><button onClick={printSchematic}>Print schematic</button><label className="menu-file-control">Import JSON<input type="file" accept="application/json,.json" onChange={importProject} /></label></div></details>
        <button onClick={undo} disabled={!history.undo.length}>Edit · Undo</button>
        <button onClick={redo} disabled={!history.redo.length}>Edit · Redo</button>
        <button onClick={() => setShowGrid((value) => !value)} aria-pressed={showGrid}>View · Grid</button>
        <button onClick={() => setNotice("Select a catalog entry and use Insert to place a real catalog instance.")}>Insert · Component</button>
        <button onClick={() => setNotice(`${topologyIssues.length ? `${topologyIssues.length} topology issue(s) found.` : t.valid}.`)}>Electrical · Validate</button>
        <button onClick={() => setNotice("Simulation buttons operate the validated DOL model in this increment.")}>Simulation</button>
        <button onClick={() => setReportsOpen((open) => !open)} aria-expanded={reportsOpen}>Reports</button>
        <button onClick={() => setNotice("Documentation is included in the repository docs folder.")}>Help</button>
      </nav>

      <section className="tool-row" aria-label="CAD and simulation tools">
        <button className="tool-button selected" onClick={() => setNotice("Select components directly on the schematic or from the catalog.")}>⌖<span>Select</span></button>
        <button className="tool-button" onClick={addSelectedComponent}>⊞<span>Insert</span></button>
        <button className="tool-button" onClick={undo} disabled={!history.undo.length} aria-label="Undo last project edit">↶<span>Undo</span></button>
        <button className="tool-button" onClick={redo} disabled={!history.redo.length} aria-label="Redo last project edit">↷<span>Redo</span></button>
        <button className={wireMode ? "tool-button selected" : "tool-button"} onClick={toggleWireMode}>⌁<span>Wiring</span></button>
        {!isReferenceSheet && <>
          <button className={annotationMode ? "tool-button selected" : "tool-button"} onClick={() => { const nextMode = !annotationMode; setAnnotationMode(nextMode); setGraphicMode(null); setWireMode(false); setWireStart(null); setSelectedAnnotationId(""); setSelectedGraphicId(""); setComponentSelection(""); setSelectedWireId(""); setNotice(nextMode ? "Click the sheet to place a text annotation." : "Text placement ended."); }}>T<span>Text</span></button>
          <button className={graphicMode === "line" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("line")} aria-label="Draw line">／<span>Line</span></button>
          <button className={graphicMode === "rectangle" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("rectangle")} aria-label="Draw rectangle">▭<span>Rectangle</span></button>
          <button className={graphicMode === "ellipse" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("ellipse")} aria-label="Draw ellipse">◯<span>Ellipse</span></button>
          <button className={graphicMode === "polyline" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("polyline")} aria-label="Draw polyline">⌁<span>Polyline</span></button>
          <button className={graphicMode === "polygon" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("polygon")} aria-label="Draw polygon">⬠<span>Polygon</span></button>
        </>}
        <button onClick={() => setSchematicZoom((value) => Math.max(.25, Math.round((value - .1) * 100) / 100))} disabled={schematicZoom <= .25} aria-label="Zoom out">−</button>
        <output className="zoom-readout" aria-label="Schematic zoom">{Math.round(schematicZoom * 100)}%</output>
        <button onClick={() => setSchematicZoom((value) => Math.min(2, Math.round((value + .1) * 100) / 100))} disabled={schematicZoom >= 2} aria-label="Zoom in">＋</button>
        <button onClick={() => { const viewport = window.document.querySelector(".drawing-area .schematic-wrap"); if (viewport) { setSchematicZoom(Math.max(.25, Math.min(2, (viewport.clientWidth - 16) / 1100, (viewport.clientHeight - 16) / 780))); viewport.scrollTo(0, 0); } }} aria-label="Fit schematic sheet">Fit</button>
        <button onClick={() => setShowGrid((value) => !value)} aria-pressed={showGrid}>▦ Grid</button>
        <button id="adigun-bot-launcher" className="bot-button" onClick={() => setBotActivation((value) => value + 1)} aria-expanded={botOpen}>◌ Adigun BOT{botUnread && <span className="bot-unread" aria-label="Pending Bot suggestion">●</span>}</button>
        <span className="tool-divider" />
        <button className="run" onClick={() => { if (!isReferenceSheet && !runtimeDocument) setRuntimeDocument(resetCircuitClock(document, catalogById)); setIsRunning(true); }}>▶ Run</button>
        <button onClick={() => setIsRunning(false)}>Ⅱ Pause</button>
        <button className="danger" onClick={() => { setIsRunning(false); if (isReferenceSheet) runAction("reset"); else setRuntimeDocument(resetCircuitClock(document, catalogById)); }}>■ Stop</button>
        <button onClick={() => runAction("trip-overload")} disabled={!isReferenceSheet}>⚠ Trip F1</button>
      </section>

      <section className="workspace">
        <aside className="panel component-panel">
          <div className="panel-title"><strong>Component Library</strong><span>{componentCatalog.length} catalog variants · {dolCatalog.length} DOL components</span></div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search catalog" aria-label="Search component library" />
          <CatalogTree definitions={filteredCatalog} selectedId={selectedDefinitionId} searching={Boolean(search.trim())} onSelect={setSelectedDefinitionId} />
          <section className="component-card">
            <div className="card-heading"><strong>{selectedDefinition.name}</strong><button className={favorites.includes(selectedDefinition.id) ? "favorite active" : "favorite"} onClick={() => setFavorites((items) => items.includes(selectedDefinition.id) ? items.filter((id) => id !== selectedDefinition.id) : [...items, selectedDefinition.id])} aria-label="Toggle component favorite">★</button></div>
            <p>{selectedDefinition.description}</p>
            <dl><dt>Reference</dt><dd>{selectedDefinition.referencePrefix}</dd><dt>Terminals</dt><dd>{selectedDefinition.terminals.map((terminal) => terminal.label).join(", ")}</dd><dt>Support</dt><dd>{selectedDefinition.simulationSupport}</dd></dl>
            <button className="primary wide" onClick={addSelectedComponent}>Insert into drawing</button>
          </section>
        </aside>

        <section className="drawing-area" aria-label={`${activeSheet.name} schematic canvas`}>
          <div className="sheet-tabs">{project.sheets.map((sheet, index) => <button key={sheet.id} className={sheet.id === activeSheet.id ? "active" : ""} onClick={() => selectSheet(sheet.id)}>{sheet.name} · Sheet {index + 1}</button>)}<button onClick={addSheet} aria-label="Add free schematic sheet">＋ Sheet</button></div>
          <Schematic document={document} selectedComponentId={selectedComponentId} selectedComponentIds={selectedComponentIds} selectedWireId={selectedWireId} wireRouteEditId={wireRouteEditId} onWireRouteChange={updateWireRoute} simulation={simulation} wireMode={wireMode} wireStart={wireStart} onSelect={selectComponent} onGroupSelect={selectComponents} onWireSelect={selectWire} onWireBranchStart={selectWireBranch} onTerminalSelect={selectWireTerminal} onMove={isReferenceSheet ? undefined : dragComponent} zoom={schematicZoom} showGrid={showGrid} annotationMode={annotationMode} selectedAnnotationId={selectedAnnotationId} onAnnotationSelect={selectAnnotation} onAnnotationPlace={addAnnotationAt} onAnnotationMove={(id, x, y) => { const item = document.annotations?.find((annotation) => annotation.id === id); if (item) { selectAnnotation(id); updateDocument({ ...document, annotations: (document.annotations ?? []).map((annotation) => annotation.id === id ? { ...annotation, x: Math.max(0, Math.min(1100, Math.round(x / 20) * 20)), y: Math.max(0, Math.min(780, Math.round(y / 20) * 20)) } : annotation), revision: document.revision + 1 }); } }} graphicMode={graphicMode} selectedGraphicId={selectedGraphicId} onGraphicSelect={selectGraphic} onGraphicCreate={addGraphic} onGraphicMove={moveGraphic} onGraphicResize={resizeGraphic} onGraphicVertexMove={moveGraphicVertex} onGraphicVertexInsert={insertGraphicVertex} onGraphicVertexDelete={deleteGraphicVertex} />
          <div className="canvas-caption">{isReferenceSheet ? <><strong>Editable reference project:</strong> breaker, START/STOP, overload and contactor states drive the simplified motor model. <button onClick={() => setNotice("This is an educational simplified model, not a real-world installation or protection-coordination calculation.")}>{t.limitations}</button></> : <><strong>Free schematic sheet:</strong> insert catalog components, connect compatible terminals and move placed symbols on the 20-unit grid.</>}</div>
        </section>

        <aside className="panel properties-panel">
          <div className="panel-title"><strong>Properties</strong><span>{selectedComponent?.reference ?? selectedAnnotation?.text ?? selectedGraphic?.name ?? (selectedWire ? selectedWire.netName ?? "Wire" : "—")}</span></div>
          {botEditsUnsaved && <p className="cloud-note">Bot edits are unsaved. Autosave is paused until an explicit save.</p>}
          {!isReferenceSheet && selectedComponent && catalogById.get(selectedComponent.definitionId) && <RuntimeControls component={selectedComponent} definition={catalogById.get(selectedComponent.definitionId)!} runtime={runtimeDocument?.components.find((component) => component.id === selectedComponent.id)} onLevelChange={(value) => setRuntimeDocument((current) => setCircuitLevelInput(current ?? resetCircuitClock(document, catalogById), catalogById, selectedComponent.id, value))} onChange={(property, value) => setRuntimeDocument((current) => setCircuitBooleanInput(current ?? resetCircuitClock(document, catalogById), catalogById, selectedComponent.id, property, value))} />}
        {selectedWire ? <WireProperties wire={selectedWire} onNetNameChange={renameSelectedWire} onColorChange={updateSelectedWireColor} onReconnect={reconnectSelectedWire} onRemove={removeSelectedWire} routeEditable={!isReferenceSheet && selectedWire.id.startsWith("manual-wire-") && !selectedWire.branchOfWireId} routeEditing={wireRouteEditId === selectedWire.id} onRouteEditToggle={() => setWireRouteEditId(wireRouteEditId === selectedWire.id ? "" : selectedWire.id)} onRoutePointAdd={addSelectedWireRoutePoint} onRouteReset={resetSelectedWireRoute} /> : selectedComponent ? <Properties instance={selectedComponent} selectionCount={selectedComponentIds.length} modelOutput={isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id) ? undefined : circuitModelRuns.find((run) => run.componentId === selectedComponent.id)?.output} onReferenceChange={updateReference} onDisplayNameChange={updateDisplayName} onTerminalLabelChange={updateTerminalLabel} onCustomPropertyAdd={addSelectedCustomProperty} onCustomPropertyRename={renameSelectedCustomProperty} onCustomPropertyChange={updateSelectedCustomProperty} onCustomPropertyRemove={removeSelectedCustomProperty} onPropertyChange={updateSelectedProperty} onDraftingColorChange={updateSelectedDraftingColor} onSizeChange={updateSelectedSize} onNudge={nudgeSelectedComponent} onRotate={rotateSelectedComponent} onDuplicate={duplicateSelectedComponent} onRemove={removeSelectedComponent} onCustomTerminalChange={changeCustomTerminal} onCustomTerminalAdd={addCustomTerminal} onCustomTerminalRemove={removeCustomTerminal} movable={!(isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))} /> : selectedAnnotation ? <AnnotationProperties annotation={selectedAnnotation} onChange={updateSelectedAnnotation} onRemove={removeSelectedAnnotation} /> : selectedGraphic ? <GraphicProperties graphic={selectedGraphic} onChange={updateSelectedGraphic} onGeometryChange={(x1, y1, x2, y2) => resizeGraphic(selectedGraphic.id, x1, y1, x2, y2)} onDuplicate={duplicateSelectedGraphic} onRemove={removeSelectedGraphic} /> : <p className="empty">Select a component, wire, annotation, or drawing graphic to inspect and edit it.</p>}
          {isReferenceSheet ? <><section className="state-card"><strong>Simulation state</strong><div><span className={simulation.contactorEnergized ? "state-dot on" : "state-dot"} /> KM1 coil {simulation.contactorEnergized ? "energized" : "de-energized"}</div><div><span className={simulation.overloadTripped ? "state-dot fault" : "state-dot"} /> F1 {simulation.overloadTripped ? "tripped" : "healthy"}</div><div><span className={simulation.motorState === "running" ? "state-dot on" : "state-dot"} /> M1 {simulation.motorState}</div></section><section className="control-card"><strong>Operate DOL circuit</strong><button onClick={() => runAction(simulation.breakerClosed ? "open-breaker" : "close-breaker")}>{simulation.breakerClosed ? "Open Q1" : "Close Q1"}</button><button className="start" onMouseDown={() => runAction("press-start")} onMouseUp={() => runAction("release-start")} onMouseLeave={() => simulation.startPressed && runAction("release-start")}>START S1</button><button className="stop" onClick={() => runAction("press-stop")}>STOP S0</button><button onClick={() => runAction("reset-overload")} disabled={!simulation.overloadTripped}>Reset F1</button></section></> : <section className="state-card"><strong>Free sheet</strong><div>{isRunning ? "Simulation clock running." : runtimeDocument ? "Simulation clock paused or reset." : "Ready for runtime simulation."}</div><div>Run advances timers, thermal protection and other runtime models; Pause retains their state; Stop restores the design.</div></section>}
          {!isReferenceSheet && selectedComponent && catalogById.get(selectedComponent.definitionId)?.simulationModelId === "catalog-plc-digital-io" && <LadderEditor key={`${activeSheet.id}:${selectedComponent.id}`} program={String(selectedComponent.properties.program ?? "")} previewInputs={ladderPreviewInputs} onApply={(program) => updateSelectedProperty("program", program)} />}
          <p className="cloud-note">☁ {authUser ? anonymousSession ? "Guest preview: cloud inserts require a confirmed account." : "Cloud account connected. Save and load projects from File." : "Sign in to save and load cloud projects."}</p>
        </aside>
        <ProjectLibraryPanel templates={templateLibrary} selected={selectedTemplate} verification={selectedTemplateVerification} onSelect={setSelectedTemplateId} onLoad={loadTemplate} />
      </section>

      <section className="engineering-console">
        <StarDeltaLab onLoadCircuit={(circuit) => {
          const extended = tryAddFreeSheet(project);
          if (!extended) return;
          const sheet = extended.sheets.at(-1)!;
          recordEdit(replaceSheetDocument(extended, sheet.id, circuit));
          setActiveSheetId(sheet.id);
          setComponentSelection("motor");
          setSelectedWireId(""); setWireMode(false); setWireStart(null);
          setDirty(true);
          setNotice("Star–delta power circuit copied to a new editable sheet. Lab controls remain independent.");
        }} />
        <ReversingLab onLoadCircuit={(circuit) => {
          const extended = tryAddFreeSheet(project);
          if (!extended) return;
          const sheet = extended.sheets.at(-1)!;
          const next = replaceSheetDocument(extended, sheet.id, circuit);
          recordEdit(next);
          setActiveSheetId(sheet.id);
          setComponentSelection("breaker");
          setSelectedWireId("");
          setWireMode(false);
          setWireStart(null);
          setDirty(true);
          setNotice("Reversing power circuit copied to a new editable sheet. Lab controls remain independent.");
        }} />
        <div className="console-section"><strong>Simulation</strong><span className={simulation.motorState === "running" ? "badge running" : "badge"}>{simulation.motorState.toUpperCase()}</span><dl><dt>Voltage</dt><dd>{simulation.lineVoltageV.toFixed(0)} V</dd><dt>Current</dt><dd>{simulation.lineCurrentA.toFixed(1)} A</dd><dt>Speed</dt><dd>{simulation.motorSpeedRpm.toFixed(0)} rpm</dd><dt>Time</dt><dd>{(simulation.elapsedMs / 1000).toFixed(1)} s</dd></dl></div>
        <div className="console-section"><strong>{t.validation}</strong>{topologyIssues.length ? topologyIssues.map((issue) => <p className="issue" key={`${issue.code}-${issue.message}`}>{issue.message}</p>) : <p className="pass">✓ {t.valid} · {document.wires.length} terminal-to-terminal wires checked.</p>}<ModelRunSummary runs={circuitModelRuns} /><p className="muted">Component results are documented engineering abstractions; validate physical designs independently.</p></div>
        <div className="console-section event-log"><strong>Event log</strong>{simulation.events.slice(0, 4).map((event, index) => <p key={`${event}-${index}`}>{event}</p>)}</div>
        <section className="console-section plc-lab" aria-label="PLC logic and analog signal laboratory"><strong>PLC Control &amp; Analog Lab</strong><span className="badge running">FUNCTIONAL</span><div className="plc-controls"><label>Input A (NO / NC)<input type="checkbox" checked={plcInputA} onChange={(event) => { setPlcPreviousInputA(plcInputA); setPlcInputA(event.target.checked); }} /></label><label>Input B<input type="checkbox" checked={plcInputB} onChange={(event) => setPlcInputB(event.target.checked)} /></label><label>Logic gate<select value={plcGate} onChange={(event) => setPlcGate(event.target.value as LogicGate)}><option value="and">AND</option><option value="or">OR</option><option value="not">NOT</option><option value="nand">NAND</option><option value="nor">NOR</option><option value="xor">XOR</option></select></label><label>Comparator<select value={plcComparator} onChange={(event) => setPlcComparator(event.target.value as Comparator)}><option value="greater-than">Greater than</option><option value="less-than">Less than</option><option value="equal-to">Equal to</option></select></label><label>Math block<select value={plcMath} onChange={(event) => setPlcMath(event.target.value as MathOperation)}><option value="add">Add</option><option value="subtract">Subtract</option><option value="multiply">Multiply</option><option value="divide">Divide</option></select></label><label>Value A<input type="number" value={plcLeft} onChange={(event) => setPlcLeft(Number(event.target.value) || 0)} /></label><label>Value B<input type="number" value={plcRight} onChange={(event) => setPlcRight(Number(event.target.value) || 0)} /></label><label>Level sensor {levelPercent}%<input type="range" min="0" max="100" value={levelPercent} onChange={(event) => setLevelPercent(Number(event.target.value))} /></label></div><div className="plc-results"><span>NO {normallyOpen(plcInputA) ? "ON" : "OFF"} · NC {normallyClosed(plcInputA) ? "ON" : "OFF"}</span><span>Edge + {controlLab.edges.positive ? "ON" : "OFF"} · − {controlLab.edges.negative ? "ON" : "OFF"}</span><span>Gate {controlLab.logic ? "ON" : "OFF"} · Compare {controlLab.comparison ? "ON" : "OFF"} · Coil {controlLab.coil ? "ON" : "OFF"}</span><span>Math {controlLab.math.ok ? controlLab.math.value.toFixed(2) : controlLab.math.reason}</span><span>Level 4–20 mA: {controlLab.milliamp.toFixed(2)} mA → ADC {controlLab.raw} → DAC {controlLab.dac.toFixed(2)} mA</span></div><div className="plc-latch"><span>Set/Reset latch: {plcLatch ? "SET" : "RESET"}</span><button onClick={() => setPlcLatch((value) => setResetLatch(value, true, false))}>Set</button><button onClick={() => setPlcLatch((value) => setResetLatch(value, false, true))}>Reset</button></div></section>
        <section className="console-section industrial-lab" aria-label="Industrial device laboratory"><strong>Industrial Device Lab</strong><span className="badge running">FUNCTIONAL</span><div className="plc-controls industrial-controls"><label>Actuator command<select value={industrialDirection} onChange={(event) => setIndustrialDirection(event.target.value as Direction)}><option value="extend">Extend</option><option value="retract">Retract</option><option value="hold">Hold</option></select></label><label>Hydraulic pressure {industrialPressureBar} bar<input type="range" min="0" max="250" value={industrialPressureBar} onChange={(event) => setIndustrialPressureBar(Number(event.target.value))} /></label><label>Zone temperature {industrialTemperatureC}°C<input type="range" min="0" max="40" value={industrialTemperatureC} onChange={(event) => setIndustrialTemperatureC(Number(event.target.value))} /></label><label>Solar irradiance {industrialSolarIrradiance} W/m²<input type="range" min="0" max="1000" value={industrialSolarIrradiance} onChange={(event) => setIndustrialSolarIrradiance(Number(event.target.value))} /></label><label>Cable current {industrialCableCurrentA} A<input type="range" min="0" max="100" value={industrialCableCurrentA} onChange={(event) => setIndustrialCableCurrentA(Number(event.target.value))} /></label><label>Safety channel A<input type="checkbox" checked={industrialSafetyA} onChange={(event) => setIndustrialSafetyA(event.target.checked)} /></label><label>Safety channel B<input type="checkbox" checked={industrialSafetyB} onChange={(event) => setIndustrialSafetyB(event.target.checked)} /></label></div><div className="industrial-results"><span>Pneumatic 5/2: {industrialLab.valve} · cylinder 1 s step: {industrialLab.cylinder.toFixed(0)}% · compressor {industrialLab.compressorLpm.toFixed(0)} L/min · FRL {industrialLab.frlBar.toFixed(1)} bar</span><span>Hydraulic pump {industrialLab.pumpLpm.toFixed(1)} L/min · cylinder {industrialLab.forceN.toFixed(0)} N · relief {industrialLab.reliefOpen ? "OPEN" : "CLOSED"}</span><span>HVAC next {industrialLab.temperatureNext.toFixed(2)}°C · thermostat {industrialLab.thermostat ? "ON" : "OFF"} · humidistat {industrialLab.humidistat ? "ON" : "OFF"} · damper {industrialLab.damper.toFixed(0)}%</span><span>Solar {industrialLab.solarW.toFixed(0)} W · battery forecast {industrialLab.batterySoc.toFixed(1)}% · inverter {industrialLab.inverterW.toFixed(0)} W · grid tie {industrialLab.gridTie ? "CLOSED" : "OPEN"}</span><span>Safety relay {industrialLab.safety ? "ENERGIZED" : "OPEN"} · light curtain {industrialLab.curtainClear ? "CLEAR" : "BLOCKED"} · phases {industrialLab.phaseHealthy ? "HEALTHY" : "FAILED"} · leakage {industrialLab.leakageTrip ? "TRIPPED" : "HEALTHY"}</span><span>100 m three-phase cable: {industrialLab.voltageDrop.toFixed(2)} V drop · {industrialLab.cableLoss.toFixed(1)} W loss</span></div></section>
      </section>

      {reportsOpen && <ProjectReports sheetName={activeSheet.name} report={report} onExport={exportReport} onClose={() => setReportsOpen(false)} />}

      <footer><span>© {new Date().getFullYear()} Hephzibah Behulah</span><span>HB Elektroniker · AdigunElectroCAD</span><span>{notice}</span><span>Languages in this foundation: English, German. Yoruba and Nigerian Pidgin await reviewed translations.</span></footer>
    </main>
  );
}

function Properties({ instance: savedInstance, modelOutput, selectionCount, onReferenceChange, onDisplayNameChange, onTerminalLabelChange, onCustomPropertyAdd, onCustomPropertyRename, onCustomPropertyChange, onCustomPropertyRemove, onPropertyChange, onDraftingColorChange, onSizeChange, onNudge, onRotate, onDuplicate, onRemove, onCustomTerminalChange, onCustomTerminalAdd, onCustomTerminalRemove, movable }: { instance: ComponentInstance; modelOutput?: FunctionalModelResult; selectionCount: number; onReferenceChange: (reference: string) => void; onDisplayNameChange: (displayName: string) => void; onTerminalLabelChange: (terminalId: string, label: string) => void; onCustomPropertyAdd: (name: string, value: string) => boolean; onCustomPropertyRename: (previousName: string, name: string) => boolean; onCustomPropertyChange: (name: string, value: string) => void; onCustomPropertyRemove: (name: string) => void; onPropertyChange: (property: string, value: string | boolean) => void; onDraftingColorChange: (color: string | undefined) => void; onSizeChange: (sizePercent: string) => void; onNudge: (deltaX: number, deltaY: number) => void; onRotate: () => void; onDuplicate: () => void; onRemove: () => void; onCustomTerminalChange: (terminalId: string, patch: Partial<Pick<TerminalDefinition, "kind" | "direction">>) => void; onCustomTerminalAdd: () => void; onCustomTerminalRemove: (terminalId: string) => void; movable: boolean }) {
  const definition = catalogById.get(savedInstance.definitionId);
  if (!definition) return <p className="empty">Catalog definition missing.</p>;
  const instance = { ...savedInstance, properties: { ...definition.propertiesSchema, ...savedInstance.properties } };
  return <section className="properties-form">{selectionCount > 1 && <p className="group-selection" aria-label="Group selection">{selectionCount} components selected. Arrow controls move the whole group.</p>}<label>Reference<input defaultValue={instance.reference} key={instance.id + instance.reference} onBlur={(event) => onReferenceChange(event.target.value)} /></label><label>Instance name<input defaultValue={savedInstance.displayName ?? ""} key={savedInstance.id + String(savedInstance.displayName ?? "")} maxLength={80} disabled={!movable} onBlur={(event) => onDisplayNameChange(event.target.value)} /></label><label>Component<input value={definition.name} readOnly /></label><label>Category<input value={definition.category} readOnly /></label><label>Simulation<input value={definition.simulationSupport} readOnly /></label>{movable && <><label>Symbol color<input aria-label="Component drafting color" type="color" value={instance.draftingColor ?? "#2272ad"} onChange={(event) => onDraftingColorChange(event.target.value)} /></label><div className="annotation-palette" aria-label="Component color palette">{["#2272ad", "#19324f", "#c62828", "#16814b", "#d27a00", "#7b3fa1"].map((color) => <button key={color} type="button" aria-label={`Set component color ${color}`} title={color} style={{ backgroundColor: color }} onClick={() => onDraftingColorChange(color)} />)}<button type="button" aria-label="Reset component color" title="Default color" onClick={() => onDraftingColorChange(undefined)}>↺</button></div><label>Symbol size · percent<input type="number" min="50" max="200" step="10" defaultValue={Math.round((instance.size ?? 1) * 100)} key={`${instance.id}:${instance.size ?? 1}`} onBlur={(event) => onSizeChange(event.target.value)} /></label></>}<section className="component-parameters"><strong>Component parameters</strong>{Object.entries(instance.properties).map(([property, value]) => typeof value === "boolean" ? <label className="property-checkbox" key={property}>{formatPropertyLabel(property)}<input type="checkbox" checked={value} disabled={!movable} onChange={(event) => onPropertyChange(property, event.target.checked)} /></label> : <label key={property}>{formatPropertyLabel(property)}<input key={JSON.stringify([instance.id, property, value])} type={componentPropertyInputType(value)} defaultValue={String(value)} maxLength={property.startsWith("terminalLabel") ? 8 : undefined} disabled={!movable} inputMode={typeof value === "number" ? "decimal" : undefined} onBlur={(event) => onPropertyChange(property, event.target.value)} /></label>)}</section>{movable && <CustomComponentData instance={instance} onAdd={onCustomPropertyAdd} onRename={onCustomPropertyRename} onChange={onCustomPropertyChange} onRemove={onCustomPropertyRemove} />}{modelOutput && <section className="model-output"><strong>Live model output</strong><span>{modelOutput.label}</span><b>{modelOutput.value}</b></section>}{!movable && <p className="parameter-note">Reference-model geometry and parameters are fixed so the supported DOL behaviour and displayed circuit stay consistent.</p>}{movable && <><div className="move-grid"><strong>Position · snap 20</strong><span>X {instance.x} · Y {instance.y} · R {instance.rotation}°</span><button onClick={() => onNudge(0, -20)} aria-label="Move component up">↑</button><button onClick={() => onNudge(-20, 0)} aria-label="Move component left">←</button><button onClick={() => onNudge(20, 0)} aria-label="Move component right">→</button><button onClick={() => onNudge(0, 20)} aria-label="Move component down">↓</button></div><button type="button" onClick={onDuplicate}>Duplicate component</button><button className="rotate-component" onClick={onRotate}>Rotate 90°</button><button className="remove-component" onClick={onRemove}>Remove placed component</button></>}<div className="terminals"><strong>Terminal display labels</strong>{(instance.customTerminals ?? definition.terminals).map((terminal, index) => { const fallback = displayTerminalLabel(instance.properties, index, terminal.label); return <span key={terminal.id}>{movable ? <TerminalLabelField instance={instance} terminalId={terminal.id} defaultLabel={fallback} onChange={onTerminalLabelChange} /> : instance.terminalLabels?.[terminal.id] ?? fallback}<small>{terminal.id} · {terminal.kind}</small></span>; })}</div>{movable && instance.definitionId === "user.indicator-lamp" && <section className="component-parameters"><strong>User symbol terminals</strong><p>Configure connection points for this symbol. Labels, electrical type, and direction are user-defined; simulation behavior is not assigned.</p>{(instance.customTerminals ?? definition.terminals).map((terminal) => <div className="custom-property-row" key={terminal.id}><span>{terminal.id.toUpperCase()}</span><select aria-label={`${terminal.id} terminal type`} value={terminal.kind} onChange={(event) => onCustomTerminalChange(terminal.id, { kind: event.target.value as TerminalDefinition["kind"] })}><option value="control">Control</option><option value="power">Power</option><option value="protective-earth">Protective earth</option></select><select aria-label={`${terminal.id} terminal direction`} value={terminal.direction} onChange={(event) => onCustomTerminalChange(terminal.id, { direction: event.target.value as TerminalDefinition["direction"] })}><option value="input">Input</option><option value="output">Output</option><option value="bidirectional">Bidirectional</option></select>{(instance.customTerminals?.length ?? definition.terminals.length) > 2 && !["t1", "t2"].includes(terminal.id) && <button type="button" onClick={() => onCustomTerminalRemove(terminal.id)} aria-label={`Remove ${terminal.id}`}>Remove</button>}</div>)}{(instance.customTerminals?.length ?? definition.terminals.length) < 8 && <button type="button" onClick={onCustomTerminalAdd}>Add terminal</button>}</section>}<p>{definition.documentation}</p></section>;
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

function GraphicProperties({ graphic, onChange, onGeometryChange, onDuplicate, onRemove }: { graphic: SchematicGraphic; onChange: (patch: Partial<Pick<SchematicGraphic, "name" | "color" | "fillColor" | "strokeWidth">>) => void; onGeometryChange: (x1: number, y1: number, x2: number, y2: number) => void; onDuplicate: () => void; onRemove: () => void }) {
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

