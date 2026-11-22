import { ModelRunSummary } from "../components/ModelRunSummary";
import { IndicatorColorPalette } from "../components/IndicatorColorPalette";
import { DraftingLayerFields } from "../components/DraftingLayerFields";
import { createEntityLayer, resolveDraftingStyle, updateDraftingLayer, updateEntityDrafting, type DraftingSelection } from "../cad/draftingLayers";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { indexComponentCatalog } from "../catalog/catalogSearch";
import { catalogById, componentLibraryById, componentLibraryCatalog, dolCatalog } from "../catalog/dolCatalog";
import { canPlaceComponent, createManualWire, duplicateComponentInstance, findOpenPlacement, moveComponentsByGrid, moveComponentsByOffset, nextComponentReference, positionCustomTerminal, reconnectWire, removeComponent, removeWire, renameWire, transformComponent, type ComponentTransform, updateComponentProperty } from "../cad/documentOps";
import { controlTerminalOffset } from "../cad/componentGeometry";
import { schematicGraphicsToSymbolGraphics } from "../cad/userSymbol";
import { componentPropertyInputType } from "../cad/componentPropertyInput";
import { cameraBounds, fitDrawingCamera, MAX_FREE_ZOOM, MIN_FREE_ZOOM, unobstructedDrawingBounds, zoomDrawingAt, type DrawingCamera } from "../cad/drawingCamera";
import { svgDrawingBounds } from "../cad/svgDrawingBounds";
import { DrawingGuideEditor } from "../components/DrawingGuideEditor";
import { DrawingGridEditor } from "../components/DrawingGridEditor";
import { defaultDrawingGrid, snapDrawingCoordinate, validDrawingGrid, type DrawingGrid } from "../cad/drawingGrid";
import { PrintLayoutEditor } from "../components/PrintLayoutEditor";
import { printFrameBounds, validPrintLayout, type PrintLayout } from "../cad/printLayout";
import { MAX_DRAWING_GUIDES } from "../cad/drawingGuides";
import type { DrawingGuide } from "../types/electrical";
import { applyGenericTopologyTerminals, genericTopologyChoices, genericTopologyTerminalsForChange } from "../cad/componentTopology";
import { toggleComponentSelection } from "../cad/componentSelection";
import { appendWireRoutePoint, type WireBranchSource } from "../cad/wirePath";
import { deleteGraphicPathVertex, graphicPathBounds, insertGraphicPathVertex, moveGraphicPathVertex } from "../cad/graphicPath";
import { componentsInStackOrder, reorderComponents } from "../cad/componentStack";
import { duplicateSchematicGraphic, canReorderSchematicGraphics, reorderSchematicGraphic, setSchematicGraphicBounds, type GraphicStackCapabilities, type GraphicStackOrder } from "../cad/graphicOps";
import { recordProjectEdit, redoProject, undoProject, type ProjectHistory } from "../cad/projectHistory";
import { canConnectTerminals, validateCircuit } from "../electrical/topology";
import { addFreeSchematicSheet, createBlankProject, createMotorStarterWorkbook, loadTemplateIntoSheet, replaceSheetDocument } from "../projects/starterProject";
import { createFourSheetDolWorkbook } from "../projects/fourSheetDolWorkbook";
import { createFourSheetStarDeltaWorkbook } from "../projects/fourSheetStarDeltaWorkbook";
import { createFourSheetReversingWorkbook } from "../projects/fourSheetReversingWorkbook";
import { createFourSheetTwoMotorWorkbook } from "../projects/fourSheetTwoMotorWorkbook";
import { createFourSheetAnalogLevelWorkbook } from "../projects/fourSheetAnalogLevelWorkbook";
import { createFourSheetPneumaticWorkbook } from "../projects/fourSheetPneumaticWorkbook";
import { createFourSheetVfdFeederWorkbook } from "../projects/fourSheetVfdFeederWorkbook";
import { createThreeSheetPlcSensorWorkbook } from "../projects/threeSheetPlcSensorWorkbook";
import { removeProjectSheet, reorderProjectSheet } from "../projects/sheetManagement";
import { templateLibrary } from "../projects/templateLibrary";
import { SOURCE_BACKED_DOL_TEMPLATE_ID } from "../projects/sourcedDolTemplate";
import { verifyProjectTemplate } from "../projects/templateVerification";
import { beginAnonymousUpgrade, finishAnonymousUpgrade, isAnonymousUser, signIn, signOut, signUp, startAnonymousPreview } from "../services/auth";
import { loadLatestCloudProject, saveCloudProject, saveUserPreferences } from "../services/cloudProjects";
import { supabaseClient } from "../services/supabase";
import { parseProjectJson } from "../projects/projectSerialization";
import { editCustomTerminalContract } from "../projects/customTerminalEdit";
import { assignProjectCableCore, createProjectContinuation, extendProjectContinuation, findTerminalContinuation, removeProjectContinuation, updateProjectContinuation, type ProjectTerminalReference } from "../projects/projectContinuations";
import { prepareStandaloneSchematicSvg, snapshotSchematicSvg } from "../projects/schematicExport";
import { schematicPrintHtml } from "../projects/schematicPrint";
import { cableScheduleTable, createProjectReport, createProjectWideReport, electricalValidationTable, reportCsv, wireReportTable, type ProjectReport, type ReportSection } from "../reports/projectReport";
import { initialDolState, transitionDol, type DolAction, type DolSimulationState } from "../simulation/dolSimulator";
import { compare, dacMilliamp, edgeTrigger, levelToMilliamp, logicGate, mathBlock, milliampToPlcRaw, normallyClosed, normallyOpen, outputCoil, setResetLatch, type Comparator, type LogicGate, type MathOperation } from "../simulation/controlLogic";
import { batteryStateOfCharge, compressorDeliveryLpm, cylinderPosition, damperPosition, directionalValve52, earthLeakageTripped, frlOutletPressureBar, gridTieClosed, humidistatOn, hydraulicCylinderForceN, inverterAcPowerW, lightCurtainClear, phaseHealthy, pumpFlowLpm, reliefValveOpen, safetyRelayEnergized, solarPowerW, thermostatOn, thermalStep, threePhaseCableLossW, threePhaseVoltageDropV, type Direction } from "../simulation/industrialDevices";
import type { FunctionalModelResult } from "../simulation/functionalModels";
import { createProjectRuntimeDocument, executeProjectCircuitModels } from "../simulation/projectCircuitModels";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput, setCircuitLevelInput } from "../simulation/circuitClock";
import { RuntimeControls } from "../components/RuntimeControls";
import { CatalogTree } from "../components/CatalogTree";
import { ComponentSymbolPreview } from "../components/ComponentSymbolPreview";
import { LadderEditor } from "../components/LadderEditor";
import { LiveCopilot } from "../components/LiveCopilot";
import { HeaderUtilities } from "../components/HeaderUtilities";
import { MAX_PROJECT_SHEETS } from "../projects/projectLimits";
import { readLocalProject, writeLocalProject } from "../projects/projectLocalStore";
import { bindProjectExitPrompt } from "../projects/projectExitSave";
import { readCloudProjectSelection, rememberCloudProjectSelection, selectedCloudProjectId, type CloudProjectSelection } from "../services/cloudProjectSelection";
import { ProjectLibraryPanel } from "../components/ProjectLibraryPanel";
import { resolveTopLevelMenu, shouldCloseMenuOnPointerLeave, shouldCloseSiblingMenu, shouldPinProjectsMenuOnInteraction } from "./topLevelMenu";
import type { CircuitDocument, CircuitSheet, ComponentInstance, ElectricalProject, ProjectContinuation, SchematicAnnotation, SchematicGraphic, SchematicGraphicKind, SchematicGraphicPoint, TerminalDefinition, TerminalEndpoint, Wire } from "../types/electrical";
import { Schematic } from "../components/Schematic";
import { terminalAnchors, terminalGridReference } from "../cad/terminalAnchors";
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
  const [project, setProject] = useState<ElectricalProject>(() => createBlankProject());
  const latestProject = useRef(project);
  latestProject.current = project;
  const [activeSheetId, setActiveSheetId] = useState("sheet-1");
  const [schematicZoom, setSchematicZoom] = useState(.85);
  const [freeCamera, setFreeCamera] = useState<DrawingCamera>({ center: { x: 550, y: 390 }, zoom: .85 });
  const [drawingViewport, setDrawingViewport] = useState({ width: 0, height: 0 });
  const drawingAreaRef = useRef<HTMLElement>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showGuideEditor, setShowGuideEditor] = useState(false);
  const [showGridEditor, setShowGridEditor] = useState(false);
  const [showPrintLayout, setShowPrintLayout] = useState(false);
  const [history, setHistory] = useState<ProjectHistory>({ undo: [], redo: [] });
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("supply.three-phase");
  const [componentPanelOpen, setComponentPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");
  const [locale, setLocale] = useState<Locale>("en");
  const [dirty, setDirty] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [botActivation, setBotActivation] = useState(0);
  const [botUnread, setBotUnread] = useState(false);
  const [botEditsUnsaved, setBotEditsUnsaved] = useState(false);
  const [notice, setNotice] = useState("Blank canvas ready. Save locally or export to keep your work.");
  const [simulation, setSimulation] = useState<DolSimulationState>(() => initialDolState());
  const [isRunning, setIsRunning] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wireMode, setWireMode] = useState(false);
  const [wireStart, setWireStart] = useState<TerminalEndpoint | null>(null);
  const [wireBends, setWireBends] = useState<Array<{ x: number; y: number }>>([]);
  useEffect(() => { setWireBends([]); }, [wireStart, wireMode, activeSheetId]);
  const [crossSheetContinuationMode, setCrossSheetContinuationMode] = useState(false);
  const [crossSheetContinuationStart, setCrossSheetContinuationStart] = useState<ProjectTerminalReference | null>(null);
  const [crossSheetContinuationExtendId, setCrossSheetContinuationExtendId] = useState("");
  const [wireBranchStart, setWireBranchStart] = useState<{ wireId: string; source: WireBranchSource; position: number } | null>(null);
  const [selectedWireId, setSelectedWireId] = useState("");
  const [selectedContinuationId, setSelectedContinuationId] = useState("");
  const [draggedSheetId, setDraggedSheetId] = useState("");
  const [componentContextMenu, setComponentContextMenu] = useState<{ componentId: string; x: number; y: number } | null>(null);
  const [wireRouteEditId, setWireRouteEditId] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState("");
  const [annotationMode, setAnnotationMode] = useState(false);
  const [selectedGraphicId, setSelectedGraphicId] = useState("");
  const [selectedGraphicIds, setSelectedGraphicIds] = useState<string[]>([]);
  const [graphicMode, setGraphicMode] = useState<SchematicGraphicKind | "freehand" | null>(null);
  const [reconnectingWireId, setReconnectingWireId] = useState("");
  const [reconnectSide, setReconnectSide] = useState<"from" | "to">("to");
  const [placementDefinitionId, setPlacementDefinitionId] = useState("");
  const [catalogDragId, setCatalogDragId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(SOURCE_BACKED_DOL_TEMPLATE_ID);
  const [rightDockView, setRightDockView] = useState<"properties" | "runtime" | "diagnostics">("properties");
  const [reportsOpen, setReportsOpen] = useState(false);
  const [consoleView, setConsoleView] = useState<"labs">("labs");
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const projectsMenuRef = useRef<HTMLDetailsElement | null>(null);
  const projectsMenuPinnedRef = useRef(false);
  const [projectsMenuOpen, setProjectsMenuOpen] = useState(false);
  const setProjectsMenuPinned = (pinned: boolean) => { projectsMenuPinnedRef.current = pinned; };
  const closeProjectsMenu = () => { setProjectsMenuPinned(false); setProjectsMenuOpen(false); if (projectsMenuRef.current) projectsMenuRef.current.open = false; };
  const [isLabPage, setIsLabPage] = useState(() => window.location.hash.toUpperCase() === "#LAB");
  const [plcInputA, setPlcInputA] = useState(false);
  const [plcInputB, setPlcInputB] = useState(false);
  const [plcPreviousInputA, setPlcPreviousInputA] = useState(false);
  const [plcLatch, setPlcLatch] = useState(false);
  const [plcGate, setPlcGate] = useState<LogicGate>("and");
  const [plcComparator, setPlcComparator] = useState<Comparator>("greater-than");
  const [plcMath, setPlcMath] = useState<MathOperation>("add");
  const [plcLeft, setPlcLeft] = useState(50);
  const [plcRight, setPlcRight] = useState(40);

  useEffect(() => {
    const syncLabRoute = () => setIsLabPage(window.location.hash.toUpperCase() === "#LAB");
    window.addEventListener("hashchange", syncLabRoute);
    return () => window.removeEventListener("hashchange", syncLabRoute);
  }, []);

  useEffect(() => {
    const closeMenus = () => { window.document.querySelectorAll<HTMLDetailsElement>(".menu-row details[open]").forEach((menu) => { menu.open = false; }); closeProjectsMenu(); };
    const onOutsidePress = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".menu-row")) closeMenus();
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { closeMenus(); setPlacementDefinitionId(""); setReconnectingWireId(""); setWireStart(null); } };
    window.document.addEventListener("pointerdown", onOutsidePress);
    window.document.addEventListener("keydown", onEscape);
    window.document.querySelectorAll<HTMLElement>(".menu-row summary, .tool-row button").forEach((control) => {
      if (!control.title) control.title = control.getAttribute("aria-label") ?? (control.innerText || control.textContent || "").trim();
    });
    return () => {
      window.document.removeEventListener("pointerdown", onOutsidePress);
      window.document.removeEventListener("keydown", onEscape);
    };
  }, []);
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
  const drawingGrid = document.drawingGrid ?? defaultDrawingGrid;
  const snapSpacing = drawingGrid.snapEnabled ? drawingGrid.snapSpacing : null;
  const currentZoom = isReferenceSheet ? schematicZoom : freeCamera.zoom;
  const freeView = !isReferenceSheet && drawingViewport.width > 0 && drawingViewport.height > 0
    ? cameraBounds(freeCamera, drawingViewport) : undefined;

  useEffect(() => {
    const viewport = drawingAreaRef.current?.querySelector<HTMLElement>(".schematic-wrap");
    if (!viewport || isReferenceSheet || isLabPage) return;
    const size = () => ({ width: viewport.clientWidth, height: viewport.clientHeight });
    const resize = new ResizeObserver(() => setDrawingViewport(size()));
    resize.observe(viewport);
    setDrawingViewport(size());
    const handlers = new AbortController();
    const options = { signal: handlers.signal };
    viewport.addEventListener("wheel", (event) => {
      event.preventDefault();
      const dimensions = size();
      const bounds = viewport.getBoundingClientRect();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? dimensions.height : 1;
      const dx = event.deltaX * unit, dy = event.deltaY * unit;
      setFreeCamera((camera) => !event.shiftKey && dy !== 0
        ? zoomDrawingAt(camera, dimensions, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }, Math.max(MIN_FREE_ZOOM, Math.min(MAX_FREE_ZOOM, camera.zoom * Math.exp(-dy / 500))))
        : { ...camera, center: { x: camera.center.x + (dx || dy) / camera.zoom, y: camera.center.y } });
    }, { ...options, passive: false });
    let drag: { id: number; x: number; y: number } | undefined;
    let spaceHeld = false;
    let suppressClick = false;
    const releaseSpace = () => { spaceHeld = false; viewport.classList.remove("pan-ready"); };
    window.addEventListener("keydown", (event) => {
      if (event.code !== "Space" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof Element && event.target.closest("input, select, textarea, [contenteditable]")) return;
      if (!(viewport.matches(":hover") || viewport.contains(window.document.activeElement))) return;
      event.preventDefault();
      event.stopPropagation();
      spaceHeld = true;
      viewport.classList.add("pan-ready");
    }, { ...options, capture: true });
    window.addEventListener("keyup", (event) => { if (event.code === "Space") releaseSpace(); }, options);
    window.addEventListener("blur", releaseSpace, options);
    viewport.addEventListener("pointerdown", (event) => {
      suppressClick = false;
      if (event.button !== 1 && !(spaceHeld && event.button === 0)) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = event.button === 0;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("panning");
    }, { ...options, capture: true });
    viewport.addEventListener("pointermove", (event) => {
      if (drag?.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      setFreeCamera((camera) => ({ ...camera, center: { x: camera.center.x - dx / camera.zoom, y: camera.center.y - dy / camera.zoom } }));
    }, options);
    viewport.addEventListener("click", (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }, { ...options, capture: true });
    viewport.addEventListener("lostpointercapture", () => { drag = undefined; viewport.classList.remove("panning"); }, options);
    return () => { handlers.abort(); resize.disconnect(); viewport.classList.remove("pan-ready", "panning"); };
  }, [isReferenceSheet, isLabPage]);
  const isReferenceProject = project.sheets.length === 1 && isReferenceSheet;
  const selectedComponent = document.components.find((component) => component.id === selectedComponentId);
  const contextComponent = componentContextMenu ? document.components.find((component) => component.id === componentContextMenu.componentId) : undefined;
  const selectedWire = document.wires.find((wire) => wire.id === selectedWireId);
  const selectedContinuation = project.continuations?.find((item) => item.id === selectedContinuationId);
  const selectedAnnotation = document.annotations?.find((annotation) => annotation.id === selectedAnnotationId);
  const selectedGraphic = document.graphics?.find((graphic) => graphic.id === selectedGraphicId);
  const selectedDefinition = componentLibraryById.get(selectedDefinitionId) ?? componentLibraryCatalog[0];
  const selectedTemplate = templateLibrary.find((template) => template.id === selectedTemplateId) ?? templateLibrary.find((template) => template.id === SOURCE_BACKED_DOL_TEMPLATE_ID)!;
  const selectedTemplateVerification = useMemo(() => verifyProjectTemplate(selectedTemplate, catalogById), [selectedTemplate]);
  const topologyIssues = useMemo(() => validateCircuit(document, catalogById), [document]);
  const report = useMemo(() => createProjectReport(document, catalogById), [document]);
  const { sheets, continuations } = project;
  const projectReport = useMemo(() => createProjectWideReport({ sheets, continuations }, catalogById), [sheets, continuations]);
  const circuitModelRuns = useMemo(() => executeProjectCircuitModels(project, catalogById, runtimeDocument ? undefined : activeSheet.id, runtimeDocument), [project, activeSheet.id, runtimeDocument]);
  const activeSheetModelRuns = circuitModelRuns.filter((run) => run.sheetId === activeSheet.id);
  const symbolStates = new Map(activeSheetModelRuns.map(({ componentId, evaluatedProperties }) => [componentId, evaluatedProperties]));
  const litIndicatorIds = new Set(activeSheetModelRuns.filter((run) => run.modelId === "indicator-lamp-v1" && run.evaluatedProperties.runtimeLampLit === true).map((run) => run.componentId));
  const selectedPlcRun = activeSheetModelRuns.find((run) => run.componentId === selectedComponentId && run.modelId === "catalog-plc-digital-io");
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
  const searchCatalog = useMemo(() => indexComponentCatalog(componentLibraryCatalog), []);
  const filteredCatalog = useMemo(() => searchCatalog(search), [searchCatalog, search]);

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
  }, [project]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      if (isReferenceProject) setSimulation((state) => transitionDol(state, "tick", 100));
      else setRuntimeDocument((state) => advanceCircuitClock(state ?? resetCircuitClock(createProjectRuntimeDocument(project), catalogById), catalogById, 0.1));
    }, 100);
    return () => window.clearInterval(timer);
  }, [isRunning, isReferenceProject, project]);

  useEffect(() => bindProjectExitPrompt(window, () => dirty || botEditsUnsaved, () => {
    const blank = createBlankProject();
    latestProject.current = blank;
    setProject(blank);
    setActiveSheetId(blank.sheets[0].id);
    setHistory({ undo: [], redo: [] });
    setSelectedComponentId("");
    setSelectedComponentIds([]);
    setSelectedWireId("");
    setSelectedContinuationId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId("");
    setSelectedGraphicIds([]);
    setComponentContextMenu(null);
    setWireMode(false);
    setWireStart(null);
    setWireBranchStart(null);
    setCrossSheetContinuationMode(false);
    setCrossSheetContinuationStart(null);
    setCrossSheetContinuationExtendId("");
    setReconnectingWireId("");
    setWireRouteEditId("");
    setAnnotationMode(false);
    setGraphicMode(null);
    setRuntimeDocument(null);
    setSimulation(initialDolState());
    setIsRunning(false);
    setDirty(false);
    setBotEditsUnsaved(false);
    setNotice("Blank canvas ready. Saved projects remain available in Projects.");
  }), [dirty, botEditsUnsaved]);

  const recordEdit = (next: ElectricalProject) => {
    setHistory((state) => recordProjectEdit(state, project));
    setProject(next);
    setDirty(true);
  };

  const updateDocument = (next: CircuitDocument, saveHistory = true) => {
    const replaced = replaceSheetDocument(project, activeSheet.id, next);
    const anchors = terminalAnchors(next);
    const nextProject = replaced.continuations ? {
      ...replaced,
      continuations: replaced.continuations.flatMap((continuation) => {
        const points = continuation.points.flatMap((point) => {
          if (point.sheetId !== activeSheet.id) return [point];
          const component = next.components.find((item) => item.id === point.endpoint.componentId);
          const definition = component && catalogById.get(component.definitionId);
          const terminalExists = (component?.customTerminals ?? definition?.terminals)?.some((terminal) => terminal.id === point.endpoint.terminalId);
          if (!terminalExists) return [];
          const anchor = anchors.find((item) => item.endpoint.componentId === point.endpoint.componentId && item.endpoint.terminalId === point.endpoint.terminalId);
          return [{ ...point, gridReference: anchor ? terminalGridReference(next, point.endpoint) : point.gridReference }];
        });
        if (points.length < 2) return [];
        return [{ ...continuation, points: points.map((point, index) => ({ ...point, role: index === 0 ? "source" as const : index === points.length - 1 ? "destination" as const : "continuation" as const })) }];
      }),
    } : replaced;
    if (selectedContinuationId && !nextProject.continuations?.some((item) => item.id === selectedContinuationId)) setSelectedContinuationId("");
    if (saveHistory) recordEdit(nextProject);
    else setProject(nextProject);
  };

  const selectContinuation = (continuationId: string) => {
    setRightDockView("properties");
    setRightPanelOpen(true);
    setSelectedContinuationId(continuationId);
    setComponentSelection("");
    setSelectedWireId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setAnnotationMode(false); setGraphicMode(null); setWireMode(false); setWireStart(null);
    setCrossSheetContinuationMode(false); setCrossSheetContinuationStart(null); setCrossSheetContinuationExtendId("");
  };

  const updateSelectedContinuation = (edit: Partial<Pick<ProjectContinuation, "label" | "conductorColor">>) => {
    if (!selectedContinuation) return;
    const next = updateProjectContinuation(project, selectedContinuation.id, edit);
    if (next !== project) recordEdit(next);
  };

  const updateSelectedCableCore = (assignment: NonNullable<ProjectContinuation["cableCore"]> | null) => {
    if (!selectedContinuation) return "Select an existing continuation.";
    const result = assignProjectCableCore(project, selectedContinuation.id, assignment);
    if (!result.ok) return result.reason;
    if (result.project !== project) recordEdit(result.project);
  };

  const removeSelectedContinuation = () => {
    if (!selectedContinuation) return;
    recordEdit(removeProjectContinuation(project, selectedContinuation.id));
    setSelectedContinuationId("");
    setNotice("Project continuation removed. Its components and local wires remain.");
  };

  const selectComponent = (componentId: string, additive = false) => {
    setPlacementDefinitionId("");
    setRightDockView("properties");
    setRightPanelOpen(true);
    if (additive && !isReferenceSheet) {
      const next = toggleComponentSelection(selectedComponentIds, componentId);
      setSelectedComponentIds(next);
      setSelectedComponentId(next.includes(componentId) ? componentId : next[0] ?? "");
    } else setComponentSelection(componentId);
    setSelectedWireId("");
    setSelectedContinuationId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setGraphicMode(null);
    setReconnectingWireId("");
  };

  const openComponentContextMenu = (componentId: string, clientX: number, clientY: number) => {
    selectComponent(componentId);
    setComponentContextMenu({
      componentId,
      x: Math.max(8, Math.min(clientX, window.innerWidth - 220)),
      y: Math.max(8, Math.min(clientY, window.innerHeight - 240)),
    });
  };

  useEffect(() => {
    if (!componentContextMenu) return;
    const dismiss = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(".component-context-menu")) return;
      setComponentContextMenu(null);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setComponentContextMenu(null);
    };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", dismissOnEscape);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismissOnEscape);
    };
  }, [componentContextMenu]);

  const selectComponents = (componentIds: string[], additive: boolean) => {
    setRightDockView("properties");
    setSelectedContinuationId("");
    setRightPanelOpen(true);
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
    setSelectedContinuationId("");
    setRightPanelOpen(true);
    setSelectedWireId(wireId);
    setWireRouteEditId("");
    setComponentSelection("");
    setWireMode(false);
    setWireStart(null);
    setWireBranchStart(null);
    setCrossSheetContinuationMode(false);
    setCrossSheetContinuationStart(null);
    setReconnectingWireId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setGraphicMode(null);
  };

  const selectAnnotation = (id: string) => {
    setRightDockView("properties");
    setSelectedContinuationId("");
    setRightPanelOpen(true);
    setSelectedAnnotationId(id);
    setComponentSelection("");
    setSelectedWireId("");
    setAnnotationMode(false);
    setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setGraphicMode(null);
  };

  const selectGraphic = (id: string, additive = false) => {
    setRightDockView("properties");
    setSelectedContinuationId("");
    setRightPanelOpen(true);
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

  const makeComponentFromGraphic = () => {
    if (!selectedGraphic || isReferenceSheet) return;
    const selectedGraphics = (document.graphics ?? []).filter((graphic) => selectedGraphicIds.includes(graphic.id));
    if (!selectedGraphics.length) return;
    const definition = catalogById.get("user.drawn-symbol");
    if (!definition) return;
    const points = selectedGraphics.flatMap((graphic) => graphic.points ?? [{ x: graphic.x1, y: graphic.y1 }, { x: graphic.x2, y: graphic.y2 }]);
    const xs = points.map((point) => point.x); const ys = points.map((point) => point.y);
    const x = Math.round(((Math.min(...xs) + Math.max(...xs)) / 2) / 20) * 20;
    const y = Math.round(((Math.min(...ys) + Math.max(...ys)) / 2) / 20) * 20;
    const usedReferences = new Set(document.components.map((component) => component.reference.toLowerCase()));
    let suffix = 1;
    while (usedReferences.has(`${definition.referencePrefix}${suffix}`.toLowerCase())) suffix++;
    const instance: ComponentInstance = {
      id: `user-drawn-symbol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      definitionId: definition.id, reference: `${definition.referencePrefix}${suffix}`,
      displayName: selectedGraphic.name, x, y, rotation: 0,
      properties: { ...definition.propertiesSchema },
      customSymbolGraphics: schematicGraphicsToSymbolGraphics(selectedGraphics),
    };
    if (!canPlaceComponent([...document.components, instance], instance.id, x, y)) {
      setNotice("Move this drawing to clear symbol space before converting it into a component.");
      return;
    }
    updateDocument({ ...document, components: [...document.components, instance], graphics: (document.graphics ?? []).filter((graphic) => !selectedGraphicIds.includes(graphic.id)), revision: document.revision + 1 });
    selectComponent(instance.id);
    setNotice(`${selectedGraphics.length} drafted shape${selectedGraphics.length === 1 ? "" : "s"} converted to ${instance.reference}. Edit its name and terminals in Properties, or duplicate it to reuse the symbol.`);
  };

  const moveGraphic = (id: string, deltaX: number, deltaY: number) => {
    const graphic = document.graphics?.find((item) => item.id === id);
    if (!graphic) return;
    const snap = (value: number) => snapDrawingCoordinate(value, snapSpacing);
    const dx = snap(deltaX); const dy = snap(deltaY);
    if (!dx && !dy) return;
    selectGraphic(id);
    updateDocument({ ...document, graphics: (document.graphics ?? []).map((item) => item.id === id ? { ...item, x1: item.x1 + dx, x2: item.x2 + dx, y1: item.y1 + dy, y2: item.y2 + dy, ...(item.points ? { points: item.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) } : {}) } : item), revision: document.revision + 1 });
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
    const points = moveGraphicPathVertex(graphic.points, graphic.kind, index, x, y, snapSpacing); if (!points) return;
    const next = { ...graphic, points, ...graphicPathBounds(points) };
    updateDocument({ ...document, graphics: (document.graphics ?? []).map((item) => item.id === id ? next : item), revision: document.revision + 1 });
  };

  const insertGraphicVertex = (id: string, x: number, y: number) => {
    const graphic = document.graphics?.find((item) => item.id === id);
    if (!graphic?.points || (graphic.kind !== "polyline" && graphic.kind !== "polygon")) return;
    const updated = insertGraphicPathVertex(graphic.points, graphic.kind, x, y, 28, snapSpacing); if (!updated) return;
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
    setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setNotice(`${selectedGraphic.name} removed. Use Undo to restore it.`);
  };

  const duplicateSelectedGraphic = () => {
    if (!selectedGraphic || isReferenceSheet) return;
    const copy = duplicateSchematicGraphic(selectedGraphic, `graphic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    updateDocument({ ...document, graphics: [...(document.graphics ?? []), copy], revision: document.revision + 1 });
    selectGraphic(copy.id);
    setNotice(`${copy.name} created. It is drafting geometry and does not create an electrical connection.`);
  };

  const updateGraphicStackOrder = (ids: string[], order: GraphicStackOrder) => {
    const current = document.graphics ?? [];
    const graphics = reorderSchematicGraphic(current, ids, order);
    if (graphics === current) return;
    updateDocument({ ...document, graphics, revision: document.revision + 1 });
  };

  const activateGraphicTool = (kind: SchematicGraphicKind | "freehand") => {
    setPlacementDefinitionId("");
    const next = graphicMode === kind ? null : kind;
    setGraphicMode(next);
    setWireMode(false); setWireStart(null); setAnnotationMode(false);
    setComponentSelection(""); setSelectedWireId(""); setSelectedAnnotationId(""); setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setNotice(next ? kind === "polyline" || kind === "polygon" ? `Click to add ${kind} vertices; double-click or press Enter to finish. Escape cancels.` : kind === "freehand" ? "Drag on the blank sheet to sketch an editable path. Drafting geometry does not connect terminals." : `Click and drag on the blank sheet to draw a ${kind}. Drafting geometry does not connect terminals.` : "Drawing tool closed.");
  };

  const runAction = (action: DolAction) => {
    if (!isReferenceSheet) {
      setNotice("DOL simulation controls are available on the Power & Control Circuit sheet.");
      return;
    }
    setSimulation((state) => transitionDol(state, action));
    if (action === "reset") setIsRunning(false);
  };

  const startSimulation = () => {
    if (!isReferenceProject && !runtimeDocument) setRuntimeDocument(resetCircuitClock(createProjectRuntimeDocument(project), catalogById));
    setIsRunning(true);
  };

  const pauseSimulation = () => setIsRunning(false);

  const stopSimulation = () => {
    setIsRunning(false);
    if (isReferenceSheet) runAction("reset");
    else setRuntimeDocument(resetCircuitClock(createProjectRuntimeDocument(project), catalogById));
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
    downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), "adigun-electro-cad-project.json");
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

  const captureSchematicSvg = (scope: "drawing" | "frame" = "drawing") => {
    const drawing = window.document.querySelector("svg.schematic");
    if (!(drawing instanceof SVGSVGElement)) {
      setNotice("No schematic drawing is available for export.");
      return null;
    }
    const { svg, clipsContent } = snapshotSchematicSvg(drawing, scope, isReferenceSheet ? undefined : document.printLayout);
    if (scope === "frame" && clipsContent && !window.confirm("The print frame clips part of this drawing. Export the frame anyway?")) return null;
    return {
      markup: prepareStandaloneSchematicSvg(new XMLSerializer().serializeToString(svg)),
      width: parseFloat(svg.getAttribute("width") ?? "0"), height: parseFloat(svg.getAttribute("height") ?? "0"),
    };
  };

  const exportSchematicSvg = (scope: "drawing" | "frame" = "drawing") => {
    try {
      const image = captureSchematicSvg(scope);
      if (!image) return;
      const { markup } = image;
      downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), "adigun-electro-cad-schematic.svg");
      setNotice("Standalone schematic SVG exported.");
    } catch {
      setNotice("Schematic SVG export could not be completed.");
    }
  };

  const exportSchematicPng = () => {
    try {
      const capture = captureSchematicSvg();
      if (!capture) return;
      const { markup, width, height } = capture;
      const sourceUrl = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
      const image = new Image();
      image.onload = () => {
        const canvas = window.document.createElement("canvas");
        const scale = Math.min(1, 4096 / Math.max(width, height));
        canvas.width = Math.max(1, Math.ceil(width * scale));
        canvas.height = Math.max(1, Math.ceil(height * scale));
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
    try {
      const capture = captureSchematicSvg("frame");
      if (!capture) return;
      const frame = window.document.createElement("iframe");
      frame.title = "Schematic print document";
      frame.setAttribute("sandbox", "allow-same-origin allow-modals");
      frame.style.cssText = "position:fixed; left:0; top:0; width:1px; height:1px; border:0; opacity:0; pointer-events:none";
      frame.addEventListener("load", () => {
        const view = frame.contentWindow;
        if (!view) { frame.remove(); setNotice("The schematic print document could not be opened."); return; }
        view.addEventListener("afterprint", () => frame.remove(), { once: true });
        view.focus();
        view.print();
      }, { once: true });
      frame.srcdoc = schematicPrintHtml(capture.markup, isReferenceSheet ? undefined : document.printLayout);
      window.document.body.append(frame);
      setNotice("Print the frame or choose Save as PDF at actual size in the browser dialog.");
    } catch {
      setNotice("The schematic could not be prepared for printing.");
    }
  };

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const imported = parseProjectJson(await file.text());
      loadProjectIntoEditor(imported, `${imported.name} imported locally. Save to keep this project copy.`);
    } catch (error) {
      setNotice(`Import rejected: ${error instanceof Error ? error.message : "Unable to read project."}`);
    }
  };

  const loadProjectIntoEditor = (starter: ElectricalProject, noticeText: string) => {
    recordEdit(starter);
    const firstSheet = starter.sheets[0];
    setActiveSheetId(firstSheet.id);
    setComponentSelection(firstSheet.document.components[0]?.id ?? "");
    setSelectedWireId("");
    setSelectedContinuationId("");
    setSelectedAnnotationId("");
    setSelectedGraphicId("");
    setSelectedGraphicIds([]);
    setAnnotationMode(false);
    setGraphicMode(null);
    setWireRouteEditId("");
    setWireMode(false);
    setWireStart(null);
    setWireBranchStart(null);
    setReconnectingWireId("");
    setCrossSheetContinuationMode(false);
    setCrossSheetContinuationStart(null);
    setCrossSheetContinuationExtendId("");
    setRuntimeDocument(null);
    setIsRunning(false);
    setRightDockView("properties");
    setDirty(true);
    setSimulation(initialDolState());
    setNotice(noticeText);
  };

  const restoreDol = () => loadProjectIntoEditor(createMotorStarterWorkbook(), "Nine-motor feeder workbook restored with all ten sheets.");

  const openFeederWorkbook = () => {
    if (!window.confirm("Open the 10-sheet motor feeder example and replace the current project? Save or export the current project first if you need to keep it.")) return;
    restoreDol();
    closeProjectsMenu();
  };

  const openFourSheetDolWorkbook = () => {
    if (!window.confirm("Open the 4-sheet DOL starter example and replace the current project? Save or export the current project first if you need to keep it.")) return;
    loadProjectIntoEditor(createFourSheetDolWorkbook(), "Four-sheet sourced DOL starter opened with labeled cross-sheet wires.");
    closeProjectsMenu();
  };

  const openFourSheetStarDeltaWorkbook = () => {
    if (!window.confirm("Open the 4-sheet star–delta starter and replace the current project? Save or export the current project first if you need to keep it.")) return;
    loadProjectIntoEditor(createFourSheetStarDeltaWorkbook(), "Four-sheet sourced star–delta starter opened with actual terminal grid references.");
    closeProjectsMenu();
  };

  const openFourSheetReversingWorkbook = () => {
    if (!window.confirm("Open the 4-sheet forward/reverse starter and replace the current project? Save or export the current project first if you need to keep it.")) return;
    loadProjectIntoEditor(createFourSheetReversingWorkbook(), "Four-sheet sourced reversing starter opened with labeled terminal grid references.");
    closeProjectsMenu();
  };

  const openFourSheetTwoMotorWorkbook = () => {
    if (!window.confirm("Open the 4-sheet two-motor sequence and replace the current project? Save or export the current project first if you need to keep it.")) return;
    loadProjectIntoEditor(createFourSheetTwoMotorWorkbook(), "Four-sheet, two-motor sequential starter opened with real terminal continuations.");
    closeProjectsMenu();
  };

  const openFourSheetAnalogLevelWorkbook = () => {
    if (!window.confirm("Open the 4-sheet analog level control example and replace the current project? Save or export the current project first if you need to keep it.")) return;
    loadProjectIntoEditor(createFourSheetAnalogLevelWorkbook(), "Four-sheet 4–20 mA level control opened with labeled signal continuations.");
    closeProjectsMenu();
  };

  const openFourSheetPneumaticWorkbook = () => {
    if (!window.confirm("Open the 4-sheet double-acting cylinder example and replace the current project? Save or export the current project first if you need to keep it.")) return;
    loadProjectIntoEditor(createFourSheetPneumaticWorkbook(), "Four-sheet double-acting cylinder control opened with labeled command and feedback continuations.");
    closeProjectsMenu();
  };
  const openFourSheetVfdFeederWorkbook = () => {
    if (!window.confirm("Open the 4-sheet VFD feeder example and replace the current project? Save or export the current project first if you need to keep it.")) return;
    loadProjectIntoEditor(createFourSheetVfdFeederWorkbook(), "Four-sheet VFD feeder opened with phase and protective-earth continuations.");
    closeProjectsMenu();
  };


  const openThreeSheetPlcSensorWorkbook = () => {
    if (!window.confirm("Open the 3-sheet PLC sensor and solenoid example and replace the current project? Save or export the current project first if you need to keep it.")) return;
    loadProjectIntoEditor(createThreeSheetPlcSensorWorkbook(), "Three-sheet PLC sensor, scan and solenoid workbook opened with labeled terminal continuations.");
    closeProjectsMenu();
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

  const insertCatalogComponentAt = (definitionId: string, x: number, y: number) => {
    const definition = componentLibraryById.get(definitionId);
    if (!definition) return;
    const movableComponents = document.components.filter((component) => !(isReferenceSheet && fixedReferenceComponentIds.has(component.id)));
    if (!canPlaceComponent(movableComponents, "", x, y, definition.id, undefined, isReferenceSheet ? "reference" : "free")) {
      setNotice(`There is not enough clear space at that position for ${definition.name}. Drop it in another open area.`);
      return;
    }
    const idBase = `${definition.id.replaceAll(".", "-")}-${Date.now()}`;
    let id = idBase;
    let suffix = 2;
    while (document.components.some((component) => component.id === id)) id = `${idBase}-${suffix++}`;
    const instance: ComponentInstance = {
      id,
      definitionId: definition.id,
      reference: nextComponentReference(document.components, definition.referencePrefix),
      x,
      y,
      rotation: 0,
      properties: { ...definition.propertiesSchema },
    };
    updateDocument({ ...document, components: [...document.components, instance], revision: document.revision + 1 });
    setSelectedDefinitionId(definition.id);
    setPlacementDefinitionId("");
    selectComponent(instance.id);
    setNotice(`${definition.name} placed as ${instance.reference}.`);
  };

  const addSelectedComponent = () => {
    const movableComponents = document.components.filter((component) => !(isReferenceSheet && fixedReferenceComponentIds.has(component.id)));
    const placementView = freeView && unobstructedDrawingBounds(freeView, currentZoom);
    const placement = findOpenPlacement(movableComponents, isReferenceSheet ? "reference" : "free", selectedDefinition.id, placementView);
    if (!placement) {
      if (!isReferenceSheet) {
        activateSelectTool();
        setPlacementDefinitionId(selectedDefinition.id);
        setNotice("No clear quick-insert position is visible. Pan or zoom, then click a clear position to place the component.");
      } else setNotice("No clear quick-insert position remains on the reference sheet.");
      return;
    }
    insertCatalogComponentAt(selectedDefinition.id, placement.x, placement.y);
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
    setSelectedAnnotationId(""); setSelectedGraphicId(""); setSelectedGraphicIds([]); setAnnotationMode(false); setGraphicMode(null);
    setWireMode(false);
    setWireStart(null);
    setDirty(true);
    setNotice(`${sheet.name} added. Insert a catalog component to begin the schematic.`);
  };

  const moveSheetTab = (sourceSheetId: string, targetSheetId: string) => {
    const next = reorderProjectSheet(project, sourceSheetId, targetSheetId);
    if (next === project) return;
    recordEdit(next);
    setDraggedSheetId("");
    setNotice("Sheet order changed. Cross-sheet labels keep their original source references.");
  };

  const removeSheetTab = (sheetId: string) => {
    const sheetIndex = project.sheets.findIndex((sheet) => sheet.id === sheetId);
    const sheet = project.sheets[sheetIndex];
    if (!sheet) return;
    const result = removeProjectSheet(project, sheetId);
    if (!result.removed) {
      setNotice("A project must keep at least one sheet.");
      return;
    }
    recordEdit(result.project);
    if (activeSheetId === sheetId) {
      const nextActive = result.project.sheets[Math.min(sheetIndex, result.project.sheets.length - 1)];
      setActiveSheetId(nextActive.id);
      setComponentSelection(nextActive.document.components[0]?.id ?? "");
      setSelectedWireId("");
      setSelectedAnnotationId("");
      setSelectedGraphicId("");
      setSelectedGraphicIds([]);
      setWireMode(false);
      setWireStart(null);
      setWireBranchStart(null);
      setCrossSheetContinuationMode(false);
      setCrossSheetContinuationStart(null);
      setCrossSheetContinuationExtendId("");
      setRuntimeDocument(null);
    }
    if (selectedContinuationId && !result.project.continuations?.some((item) => item.id === selectedContinuationId)) setSelectedContinuationId("");
    setNotice(`${sheet.name} removed. ${result.removedContinuations ? `${result.removedContinuations} affected continuation(s) removed` : "Cross-sheet links preserved"}; Undo restores the sheet.`);
  };

  const selectSheet = (sheetId: string) => {
    const sheet = project.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    setPlacementDefinitionId("");
    setActiveSheetId(sheetId);
    setComponentSelection(sheet.document.components[0]?.id ?? "");
    setSelectedWireId("");
    setWireRouteEditId("");
    setSelectedAnnotationId(""); setSelectedGraphicId(""); setSelectedGraphicIds([]); setAnnotationMode(false); setGraphicMode(null);
    setWireMode(crossSheetContinuationMode);
    setWireStart(null);
    setWireBranchStart(null);
    setReconnectingWireId("");
    setNotice(crossSheetContinuationMode && crossSheetContinuationStart ? `${sheet.name} selected. Choose a compatible destination terminal.` : `${sheet.name} selected.`);
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
    setRightDockView("properties");
    setSelectedWireId("");
    setSelectedContinuationId("");
    setCrossSheetContinuationMode(false);
    setCrossSheetContinuationStart(null);
    setCrossSheetContinuationExtendId("");
    setWireMode(false);
    setWireStart(null);
    setDirty(true);
    const removedLinks = (targetProject.continuations?.length ?? 0) - (next.continuations?.length ?? 0);
    setNotice(removedLinks
      ? `${selectedTemplate.name} loaded. Removed ${removedLinks} cross-sheet net(s) connected to the replaced sheet. Undo restores the original sheet and links.`
      : `${selectedTemplate.name} loaded with its recorded test sequence and executable component abstractions.`);
    closeProjectsMenu();
  };

  const exportReport = (section: ReportSection, scope: "sheet" | "project") => {
    const selectedReport = scope === "project" ? projectReport : report;
    const blob = new Blob([reportCsv(selectedReport, section)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `adigun-electro-cad-${scope}-${section}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`${scope === "project" ? "Project " : "Active-sheet "}${section === "bom" ? "BOM" : section === "wires" ? "wire list" : "terminal list"} CSV exported.`);
  };

  const toggleWireMode = () => {
    setPlacementDefinitionId("");
    const next = !wireMode;
    setWireMode(next);
    setWireRouteEditId("");
    setWireStart(null);
    setWireBranchStart(null);
    setCrossSheetContinuationMode(false);
    setCrossSheetContinuationStart(null);
    setCrossSheetContinuationExtendId("");
    setAnnotationMode(false); setGraphicMode(null); setSelectedGraphicId(""); setSelectedGraphicIds([]);
    setReconnectingWireId("");
    setNotice(next ? "Wiring mode: select a source terminal, then a compatible target. Shift-click targets to branch from the same source." : "Wiring mode closed.");
  };

  const activateSelectTool = () => {
    setPlacementDefinitionId("");
    setWireMode(false);
    setWireStart(null);
    setWireBranchStart(null);
    setWireRouteEditId("");
    setReconnectingWireId("");
    setCrossSheetContinuationMode(false);
    setCrossSheetContinuationStart(null);
    setCrossSheetContinuationExtendId("");
    setAnnotationMode(false);
    setGraphicMode(null);
    setComponentContextMenu(null);
    setNotice("Select mode active. Click or drag components, wires, or drawing objects on the sheet.");
  };

  const beginCrossSheetContinuation = () => {
    setCrossSheetContinuationStart(null);
    setCrossSheetContinuationExtendId("");
    setCrossSheetContinuationMode(true);
    setWireMode(true);
    setWireStart(null);
    setWireBranchStart(null);
    setReconnectingWireId("");
    setAnnotationMode(false);
    setGraphicMode(null);
    setNotice("Choose the source terminal, select a different sheet, then choose its compatible destination terminal.");
  };

  const beginExtendSelectedContinuation = () => {
    if (!selectedContinuation) return;
    setCrossSheetContinuationStart(null);
    setCrossSheetContinuationExtendId(selectedContinuation.id);
    setCrossSheetContinuationMode(true);
    setWireMode(true);
    setWireStart(null);
    setWireBranchStart(null);
    setReconnectingWireId("");
    setAnnotationMode(false);
    setGraphicMode(null);
    setNotice(`Choose a compatible terminal on another sheet to extend ${selectedContinuation.label}; its original source reference will be kept.`);
  };

  const selectWireTerminal = (endpoint: TerminalEndpoint, continueBranch = false) => {
    if (!wireMode) {
      toggleWireMode();
      setWireStart(endpoint);
      setNotice("Wire start selected. Click another terminal to connect, or click the drawing to add bends.");
      return;
    }
    if (crossSheetContinuationMode) {
      const selected: ProjectTerminalReference = { sheetId: activeSheet.id, endpoint };
      if (crossSheetContinuationExtendId) {
        const destinationSheet = project.sheets.find((sheet) => sheet.id === selected.sheetId);
        const result = extendProjectContinuation(project, crossSheetContinuationExtendId, selected, destinationSheet ? terminalGridReference(destinationSheet.document, endpoint) : "A.1");
        if (!result.ok) { setNotice(result.reason); return; }
        recordEdit(result.project);
        setSelectedContinuationId(result.continuation.id);
        setRightDockView("properties");
        setRightPanelOpen(true);
        setComponentSelection("");
        setCrossSheetContinuationStart(null);
        setCrossSheetContinuationExtendId("");
        setCrossSheetContinuationMode(false);
        setWireMode(false);
        setWireStart(null);
        const sourcePoint = result.continuation.points[0];
        const sourceSheetNumber = project.sheets.findIndex((sheet) => sheet.id === sourcePoint.sheetId) + 1;
        setNotice(`Continuation ${result.continuation.label} now reaches ${destinationSheet?.name ?? "the selected sheet"}; source remains S${sourceSheetNumber} · ${sourcePoint.gridReference}.`);
        return;
      }
      if (!crossSheetContinuationStart) {
        setCrossSheetContinuationStart(selected);
        setNotice("Source terminal selected. Switch to a different sheet and choose the destination terminal.");
        return;
      }
      const sourceSheet = project.sheets.find((sheet) => sheet.id === crossSheetContinuationStart.sheetId);
      const destinationSheet = project.sheets.find((sheet) => sheet.id === selected.sheetId);
      if (!sourceSheet || !destinationSheet) { setNotice("The selected project sheet is no longer available."); return; }
      const result = createProjectContinuation(
        project,
        crossSheetContinuationStart,
        selected,
        terminalGridReference(sourceSheet.document, crossSheetContinuationStart.endpoint),
        terminalGridReference(destinationSheet.document, endpoint),
      );
      if (!result.ok) { setNotice(result.reason); return; }
      recordEdit(result.project);
      setSelectedContinuationId(result.continuation.id);
      setRightDockView("properties");
      setRightPanelOpen(true);
      setComponentSelection("");
      setCrossSheetContinuationStart(null);
      setCrossSheetContinuationMode(false);
      setWireMode(false);
      setWireStart(null);
      setNotice(`Project continuation ${result.continuation.label} created between ${sourceSheet.name} and ${destinationSheet.name}.`);
      return;
    }
    if (!wireStart) {
      setWireStart(endpoint);
      setWireBranchStart(null);
      setNotice("Wire start selected. Click another terminal to connect, or click the drawing to add bends.");
      return;
    }
    const reconnectingWire = reconnectingWireId ? document.wires.find((wire) => wire.id === reconnectingWireId) : undefined;
    if (reconnectingWireId && !reconnectingWire) {
      setNotice("The selected wire is no longer available for reconnection.");
      setWireStart(null);
      setReconnectingWireId("");
      return;
    }
    if (reconnectingWire) {
      const next = reconnectWire(document, reconnectingWire.id, endpoint, reconnectSide);
      const issue = validateCircuit(next, catalogById).find((item) => item.severity === "error");
      if (issue) { setNotice(issue.message); return; }
      if (next !== document) updateDocument(next);
      setSelectedWireId(reconnectingWire.id);
      setNotice(`Wire ${reconnectingWire.netName ?? reconnectingWire.id} reconnected to the selected terminal.`);
    } else {
      const check = canConnectTerminals(document, catalogById, wireStart, endpoint);
      if (!check.ok) { setNotice(check.reason ?? "The selected terminals cannot be connected."); return; }
      const wire = createManualWire(document, wireStart, endpoint, wireBranchStart ? { wireId: wireBranchStart.wireId, source: wireBranchStart.source, position: wireBranchStart.position } : undefined);
      if (!wireBranchStart) wire.points = wireBends;
      updateDocument({ ...document, wires: [...document.wires, wire], revision: document.revision + 1 });
      setSelectedWireId(wire.id);
      setNotice(continueBranch ? `Wire ${wire.netName} added. The source remains selected; Shift-click another compatible target or click without Shift to finish branching.` : `Wire ${wire.netName} created between catalog terminals.`);
    }
    setWireStart(continueBranch && !reconnectingWire ? wireStart : null);
    setWireBends([]);
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
    applyDraftingEdit(updateEntityDrafting(document, { kind: "wires", id: selectedWire.id }, { draftingColor }));
  };

  const draftingTarget: DraftingSelection | undefined = selectedContinuation ? undefined
    : selectedWire ? { kind: "wires", id: selectedWire.id }
    : selectedComponent && !(isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))
      ? { kind: "components", id: selectedComponent.id } : undefined;
  const draftingEntity = draftingTarget && (draftingTarget.kind === "wires" ? selectedWire : selectedComponent);
  const applyDraftingEdit = (result: ReturnType<typeof updateEntityDrafting>) => {
    if (!result.ok) { setNotice(result.reason); return false; }
    if (result.document !== document) updateDocument(result.document);
    return true;
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

  const reconnectSelectedWire = (side: "from" | "to" = "to") => {
    if (!selectedWire) return;
    setWireRouteEditId("");
    setWireMode(true);
    setWireStart(side === "from" ? selectedWire.to : selectedWire.from);
    setWireBranchStart(null);
    setReconnectSide(side);
    setReconnectingWireId(selectedWire.id);
    setNotice(`Reconnecting ${selectedWire.netName ?? selectedWire.id}: choose a replacement ${side === "from" ? "source" : "target"} terminal.`);
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
    if (!selectedComponent || !isUserSymbolDefinition(selectedComponent.definitionId) || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const result = editCustomTerminalContract(project, activeSheet.id, selectedComponent.id, terminalId, patch);
    if (!result.document) { setNotice(result.reason); return; }
    if (result.document !== document) updateDocument(result.document);
  };

  const changeCustomTerminalOffset = (terminalId: string, axis: "x" | "y", input: HTMLInputElement) => {
    if (!selectedComponent || !isUserSymbolDefinition(selectedComponent.definitionId) || !/^t[3-8]$/.test(terminalId) || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const base = selectedComponent.customTerminalOffsets?.[terminalId] ?? controlTerminalOffset(catalogById.get(selectedComponent.definitionId)?.simulationModelId ?? "user-indicator-symbol", terminalId) ?? { x: 0, y: 0 };
    if (base[axis] === input.valueAsNumber) return;
    const result = positionCustomTerminal(document, selectedComponent.id, terminalId, { ...base, [axis]: input.valueAsNumber });
    if (!result.ok) {
      input.value = String(base[axis]);
      setNotice(result.reason);
      return;
    }
    updateDocument(result.document);
  };

  const addCustomTerminal = () => {
    if (!selectedComponent || !isUserSymbolDefinition(selectedComponent.definitionId) || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const terminals = selectedComponent.customTerminals ?? catalogById.get(selectedComponent.definitionId)?.terminals ?? [];
    if (terminals.length >= 8) { setNotice("User-defined symbols support up to 8 terminals."); return; }
    const id = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"].find((candidate) => !terminals.some((terminal) => terminal.id === candidate)) ?? "t8";
    const next = [...terminals, { id, label: id.toUpperCase(), kind: "control" as const, direction: "bidirectional" as const }];
    updateDocument({ ...document, components: document.components.map((component) => component.id === selectedComponent.id ? { ...component, customTerminals: next } : component), revision: document.revision + 1 });
    setNotice(`${id.toUpperCase()} added. Choose its type, direction, label, and wire connections in Properties.`);
  };

  const removeCustomTerminal = (terminalId: string) => {
    if (!selectedComponent || !isUserSymbolDefinition(selectedComponent.definitionId) || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    const terminals = selectedComponent.customTerminals ?? catalogById.get(selectedComponent.definitionId)?.terminals ?? [];
    if (terminals.length <= 2 || terminalId === "t1" || terminalId === "t2") { setNotice("Keep the base T1 and T2 identities; remove added terminals when no longer needed."); return; }
    if (document.wires.some((wire) => [wire.from, wire.to].some((endpoint) => endpoint.componentId === selectedComponent.id && endpoint.terminalId === terminalId))) { setNotice("Disconnect this terminal before removing it."); return; }
    const continuation = findTerminalContinuation(project, { sheetId: activeSheet.id, endpoint: { componentId: selectedComponent.id, terminalId } });
    if (continuation) { setNotice(`Disconnect ${selectedComponent.reference}.${terminalId.toUpperCase()} from continuation ${continuation.label} before removing it.`); return; }
    const customTerminals = terminals.filter((terminal) => terminal.id !== terminalId);
    const terminalLabels = { ...(selectedComponent.terminalLabels ?? {}) }; delete terminalLabels[terminalId];
    updateDocument({ ...document, components: document.components.map((component) => { if (component.id !== selectedComponent.id) return component; const next = { ...component, customTerminals } as ComponentInstance; if (Object.keys(terminalLabels).length) next.terminalLabels = terminalLabels; else delete next.terminalLabels; const customTerminalOffsets = { ...(component.customTerminalOffsets ?? {}) }; delete customTerminalOffsets[terminalId]; if (Object.keys(customTerminalOffsets).length) next.customTerminalOffsets = customTerminalOffsets; else delete next.customTerminalOffsets; return next; }), revision: document.revision + 1 });
    setNotice(`${terminalId.toUpperCase()} removed.`);
  };

  const updateSelectedDraftingColor = (draftingColor: string | undefined) => {
    if (!selectedComponent || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return;
    applyDraftingEdit(updateEntityDrafting(document, { kind: "components", id: selectedComponent.id }, { draftingColor }));
  };

  const updateSelectedProperty = (property: string, rawValue: string | boolean) => {
    if (!selectedComponent) return false;
    const definition = catalogById.get(selectedComponent.definitionId);
    if (!definition) {
      setNotice("The selected catalog definition is unavailable.");
      return false;
    }
    const schemaValue = definition.propertiesSchema[property];
    if (schemaValue === undefined) {
      setNotice("That property is not part of the selected catalog definition.");
      return false;
    }
    let value: string | number | boolean;
    if (typeof schemaValue === "number") {
      const parsed = typeof rawValue === "string" && rawValue.trim() ? Number(rawValue) : Number.NaN;
      if (!Number.isFinite(parsed)) {
        setNotice("Enter a finite numeric parameter value.");
        return false;
      }
      if (definition.simulationModelId === "indicator-lamp-v1" && property === "ratedVoltageV" && parsed < 0) {
        setNotice("Enter a positive indicator voltage, or 0 to leave it unrated.");
        return false;
      }
      value = parsed;
    } else if (typeof schemaValue === "boolean") {
      if (typeof rawValue !== "boolean") return false;
      value = rawValue;
    } else {
      if (typeof rawValue !== "string" || (property !== "program" && !rawValue.trim()) || rawValue.trim().length > (property === "program" ? 2048 : 80)) {
        setNotice("Program allows up to 2048 characters; other text parameters require 1–80 characters.");
        return false;
      }
      value = rawValue.trim();
    }
    if (value === (selectedComponent.properties[property] ?? schemaValue)) return false;
    const nextTerminals = genericTopologyTerminalsForChange(definition.id, property, value);
    if (nextTerminals === null) {
      setNotice("That terminal configuration is unavailable for this generic component profile.");
      return false;
    }
    let nextDocument = updateComponentProperty(document, selectedComponent.id, property, value);
    let removedWires = 0;
    if (nextTerminals) {
      const updatedTopology = applyGenericTopologyTerminals(nextDocument, selectedComponent.id, definition.terminals, nextTerminals);
      nextDocument = updatedTopology.document;
      removedWires = updatedTopology.removedWireCount;
    }
    updateDocument(nextDocument);
    setNotice(removedWires
      ? `${selectedComponent.reference} topology updated; ${removedWires} wire(s) on removed terminals were deleted.`
      : `${selectedComponent.reference} parameter ${property} updated.`);
    return true;
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

  const updateComponentStackOrder = (order: GraphicStackOrder) => {
    if (isReferenceSheet || !selectedComponent) return;
    const ids = selectedComponentIds.length ? selectedComponentIds : [selectedComponent.id];
    const components = reorderComponents(document.components, ids, order);
    if (components !== document.components) updateDocument({ ...document, components, revision: document.revision + 1 });
  };

  const applyComponentTransform = (id: string, transform: ComponentTransform) => {
    const instance = document.components.find((component) => component.id === id);
    if (!instance || (isReferenceSheet && fixedReferenceComponentIds.has(id))) return;
    const clearance = isReferenceSheet ? document.components.filter((component) => !fixedReferenceComponentIds.has(component.id)) : document.components;
    const result = transformComponent(document, id, transform, clearance);
    if (!result.ok) { setNotice(result.reason ?? "Component transform blocked."); return; }
    if (result.document === document) return;
    updateDocument(result.document);
    setNotice(transform.kind === "resize" ? `${instance.reference} size set to ${Math.round(transform.size * 100)}%.` : `${instance.reference} rotated to ${transform.rotation}°.`);
  };

  const updateSelectedSize = (rawValue: string) => {
    if (selectedComponent) applyComponentTransform(selectedComponent.id, { kind: "resize", size: Number(rawValue) / 100 });
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

  const updateSelectedPosition = (axis: "x" | "y", rawValue: string) => {
    if (!selectedComponent || !rawValue.trim() || (isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))) return false;
    const delta = Number(rawValue) - selectedComponent[axis];
    const result = moveComponentsByOffset(document, [selectedComponent.id], axis === "x" ? delta : 0, axis === "y" ? delta : 0);
    if (!result.ok) { setNotice(result.reason ?? "Position rejected."); return false; }
    if (result.document !== document) updateDocument(result.document);
    return true;
  };

  const dragComponent = (componentId: string, x: number, y: number) => {
    if (isReferenceSheet) return;
    const component = document.components.find((item) => item.id === componentId);
    if (!component) return;
    const componentIds = selectedComponentIds.includes(componentId) ? selectedComponentIds : [componentId];
    const result = moveComponentsByOffset(document, componentIds, x - component.x, y - component.y, 2);
    if (!result.ok) { setNotice(result.reason ?? "Move rejected."); return; }
    if (result.document === document) return;
    updateDocument(result.document);
    setNotice(`${componentIds.length} selected component${componentIds.length === 1 ? "" : "s"} moved; connected wire endpoints are preserved.`);
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
    const copy = duplicateComponentInstance(document.components, selectedComponent, `component-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, definition.referencePrefix, isReferenceSheet ? "reference" : "free");
    if (!copy) { setNotice("No clear position is available for another copy on this sheet."); return; }
    updateDocument({ ...document, components: [...document.components, copy], revision: document.revision + 1 });
    selectComponent(copy.id);
    setNotice(`${copy.reference} duplicated from ${selectedComponent.reference}. No wires were copied; connect the terminals you choose.`);
  };

  const saveDrawingGrid = (grid: DrawingGrid) => {
    if (isReferenceSheet || !validDrawingGrid(grid)) return;
    if (grid.displaySpacing === drawingGrid.displaySpacing && grid.snapSpacing === drawingGrid.snapSpacing && grid.snapEnabled === drawingGrid.snapEnabled) return;
    updateDocument({ ...document, drawingGrid: grid, revision: document.revision + 1 });
  };

  const savePrintLayout = (layout: PrintLayout) => {
    if (isReferenceSheet) return;
    if (!validPrintLayout(layout)) { setNotice("Enter valid paper dimensions, margin and drawing scale."); return; }
    if (JSON.stringify(layout) === JSON.stringify(document.printLayout)) return;
    updateDocument({ ...document, printLayout: layout, revision: document.revision + 1 });
    setNotice("Print layout updated.");
  };

  const removePrintLayout = () => {
    if (isReferenceSheet || !document.printLayout) return;
    const { printLayout: _layout, ...drawing } = document;
    updateDocument({ ...drawing, revision: document.revision + 1 });
  };

  const fitPrintFrame = () => {
    if (!document.printLayout || !drawingViewport.width || !drawingViewport.height) return;
    setFreeCamera(fitDrawingCamera(printFrameBounds(document.printLayout), drawingViewport));
  };

  const saveGuides = (guides: DrawingGuide[]) => {
    updateDocument({ ...document, guides, revision: document.revision + 1 });
  };

  const addDrawingGuide = (axis: DrawingGuide["axis"], coordinate: number) => {
    if (isReferenceSheet || !Number.isFinite(coordinate)) return;
    const guides = document.guides ?? [];
    if (guides.length >= MAX_DRAWING_GUIDES) { setNotice("This sheet has reached its drawing guide limit."); return; }
    if (guides.some(guide => guide.axis === axis && guide.coordinate === coordinate)) return;
    saveGuides([...guides, { id: crypto.randomUUID(), axis, coordinate, locked: false, hidden: false }]);
  };

  const updateDrawingGuide = (id: string, patch: Partial<Pick<DrawingGuide, "coordinate" | "locked" | "hidden">>) => {
    const guides = document.guides ?? [];
    const guide = guides.find(item => item.id === id);
    if (!guide || (patch.coordinate !== undefined && (guide.locked || !Number.isFinite(patch.coordinate)))) return;
    if (Object.entries(patch).every(([key, value]) => guide[key as keyof DrawingGuide] === value)) return;
    saveGuides(guides.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const removeDrawingGuide = (id: string) => {
    const guides = document.guides ?? [];
    if (guides.some(guide => guide.id === id && !guide.locked)) saveGuides(guides.filter(guide => guide.id !== id));
  };

  const zoomSchematicAroundCenter = (nextZoom: number) => {
    if (!isReferenceSheet) { setFreeCamera((camera) => ({ ...camera, zoom: nextZoom })); return; }
    const viewport = window.document.querySelector<HTMLElement>(".drawing-area .schematic-wrap");
    if (!viewport) { setSchematicZoom(nextZoom); return; }
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / schematicZoom;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / schematicZoom;
    setSchematicZoom(nextZoom);
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = centerX * nextZoom - viewport.clientWidth / 2;
      viewport.scrollTop = centerY * nextZoom - viewport.clientHeight / 2;
    });
  };

  const fitSchematicContent = (scope: "drawing" | "selection" = "drawing") => {
    const viewport = window.document.querySelector<HTMLElement>(".drawing-area .schematic-wrap");
    const svg = viewport?.querySelector<SVGSVGElement>("svg.schematic");
    if (!viewport || !svg) return;
    const measured = svgDrawingBounds(svg, scope === "selection"
      ? ".schematic-component.selected, .wire.selected-wire, [data-drawing-selected], .project-continuation-marker.selected"
      : ".schematic-component, .wire, [data-graphic-id], [data-annotation-id], .project-continuation-marker, .terminal-pin-markers");
    if (!measured && scope === "selection") { setNotice("Select a drawing object to fit the selection."); return; }
    const bounds = measured ?? { x: 0, y: 0, width: 1100, height: 780 };
    if (!isReferenceSheet) { setFreeCamera(fitDrawingCamera(bounds, { width: viewport.clientWidth, height: viewport.clientHeight })); return; }
    const nextZoom = Math.max(.25, Math.min(2, (viewport.clientWidth - 48) / Math.max(1, bounds.width), (viewport.clientHeight - 48) / Math.max(1, bounds.height)));
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    setSchematicZoom(nextZoom);
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = centerX * nextZoom - viewport.clientWidth / 2;
      viewport.scrollTop = centerY * nextZoom - viewport.clientHeight / 2;
    });
  };

  const rotateSelectedComponent = () => {
    if (!selectedComponent) return;
    const rotation = ((selectedComponent.rotation + 90) % 360) as ComponentInstance["rotation"];
    applyComponentTransform(selectedComponent.id, { kind: "rotate", rotation });
  };

  return (
    <main className={isLabPage ? "app-shell lab-route-active" : "app-shell"}>
      {componentContextMenu && contextComponent && <div className="component-context-menu" role="menu" aria-label={`Actions for ${contextComponent.reference}`} style={{ left: componentContextMenu.x, top: componentContextMenu.y }} onContextMenu={(event) => event.preventDefault()}>
        <strong>{contextComponent.reference} · {catalogById.get(contextComponent.definitionId)?.name ?? "Component"}</strong>
        <button role="menuitem" onClick={() => setComponentContextMenu(null)}>Properties and terminals</button>
        <button role="menuitem" onClick={() => { setComponentContextMenu(null); toggleWireMode(); }}>Wire terminals</button>
        <button role="menuitem" disabled={isReferenceSheet && fixedReferenceComponentIds.has(contextComponent.id)} onClick={() => { setComponentContextMenu(null); rotateSelectedComponent(); }}>Rotate 90°</button>
        <button role="menuitem" disabled={isReferenceSheet} onClick={() => { setComponentContextMenu(null); duplicateSelectedComponent(); }}>Duplicate</button>
        <button role="menuitem" className="danger" disabled={isReferenceSheet && fixedReferenceComponentIds.has(contextComponent.id)} onClick={() => { setComponentContextMenu(null); removeSelectedComponent(); }}>Delete component</button>
      </div>}
      <header className="app-header">
        <div className="brand-lockup">
          <img src={`${import.meta.env.BASE_URL}assets/hephzibah-behulah-official.jpg`} alt="Hephzibah Behulah" />
          <div className="brand-identity"><strong>Hephzibah Behulah</strong><small>GLOBAL · HB ELEKTRONIKER</small></div>
          <div className="product-brand"><strong>⚡ Adigun<span>ElectroCAD</span></strong><small>BY HB ELEKTRONIKER</small></div>
        </div>
        <div className="project-status"><strong>{project.name}</strong><span className={isRunning ? "simulation-pill active" : "simulation-pill"}>{isRunning ? t.running : t.stopped}</span></div>
        <HeaderUtilities saved={!dirty && !botEditsUnsaved} signedIn={Boolean(authUser && !anonymousSession)} accountOpen={authOpen} locale={locale} theme={theme} search={search} grid={showGrid} onAccount={() => setAuthOpen((open) => !open)} onDismissAccount={() => setAuthOpen(false)} onLocale={(value) => setLocale(value as Locale)} onTheme={(value) => setTheme(value as Theme)} onSearch={setSearch} onGrid={setShowGrid} onBot={() => setBotActivation((value) => value + 1)} />
      </header>

      {isLabPage && <nav className="lab-route-nav" aria-label="Laboratory navigation"><a href="#CAD">← Back to CAD</a><strong>Laboratory</strong></nav>}

      {!isLabPage &&       <LiveCopilot canvas={document} projectId={project.id} catalog={catalogById} selectedId={selectedComponentId} simulationState={isRunning ? "running" : runtimeDocument ? "paused" : "stopped"} liveOutput={activeSheetModelRuns.find((run) => run.componentId === selectedComponentId)?.output} owner={authUser?.id ?? "guest"} cloudOwner={authUser && !anonymousSession ? authUser.id : null} activation={botActivation} onShow={() => setBotActivation((value) => value + 1)} onUnread={setBotUnread} onOpen={setBotOpen} editable={!isReferenceSheet} onApply={(next) => { if (isReferenceSheet) throw new Error("Reference-sheet wiring is fixed. Use a free sheet for Bot wire fixes."); setBotEditsUnsaved(true); updateDocument(next); setNotice("Bot wire fix applied without saving. Undo reverses it. Sign in and explicitly save to preserve it."); }} />}

      {authOpen && <section className="auth-panel" aria-label="Cloud account">
        <div><strong>{authUser ? anonymousSession ? "Guest preview account" : "Authenticated cloud account" : "Cloud account"}</strong><p>{anonymousSession ? "Preview access is not time-limited. Anonymous accounts can read, update and delete their owned data; the database blocks only new inserts." : "Use a confirmed email and password for cloud project creation and cross-device access."}</p></div>
        {!authUser && <div className="auth-fields"><label>Email<input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" /></label><label>Password<input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete="current-password" /></label><div className="auth-actions"><button onClick={() => void authenticate("sign-in")}>Sign in</button><button onClick={() => void authenticate("sign-up")}>Create account</button><button onClick={() => void startPreview()}>Start preview</button></div></div>}
        {anonymousSession && !existingAccountMode && <div className="auth-fields"><label>Confirmed email<input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" /></label><label>New password<input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete="new-password" /></label><div className="auth-actions"><button onClick={() => void beginUpgrade()}>1. Send confirmation</button><button onClick={() => void finishUpgrade()}>2. Set password after confirmation</button><button onClick={() => { setExistingAccountMode(true); setAuthPassword(""); setAuthMessage(""); }}>Use an existing account</button></div></div>}
        {anonymousSession && existingAccountMode && <form className="auth-fields" onSubmit={(event) => { event.preventDefault(); void authenticate("sign-in"); }}><label>Account email<input type="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" /></label><label>Existing password<input type="password" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete="current-password" /></label><div className="auth-actions"><button type="submit">Sign in to existing account</button><button type="button" onClick={() => { setExistingAccountMode(false); setAuthPassword(""); setAuthMessage(""); }}>Back to guest upgrade</button><span>This switches accounts; guest data stays with the guest account.</span></div></form>}
        {authUser && !anonymousSession && upgradeUserId === authUser.id && <div className="auth-fields"><label>New password<input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete="new-password" /></label><button onClick={() => void finishUpgrade()}>2. Set password after confirmation</button></div>}
        {authUser && !anonymousSession && <div className="auth-actions"><span>{authUser.email ?? "Confirmed account"}</span><button onClick={() => void signOut().then(() => { setAuthUser(null); setAuthMessage("Signed out."); }).catch((error) => setAuthMessage(error instanceof Error ? error.message : "Sign out failed."))}>Sign out</button></div>}
        {authMessage && <p className="auth-message">{authMessage}</p>}
      </section>}

      <nav className="menu-row" aria-label="Project actions" onPointerOver={(event) => {
        const current = resolveTopLevelMenu(event.target as Element, event.currentTarget);
        if (!current || event.pointerType !== "mouse") return;
        const projectsMenu = event.currentTarget.querySelector<HTMLDetailsElement>(".projects-menu");
        if (projectsMenuPinnedRef.current && projectsMenu && current !== projectsMenu) return;
        current.open = true;
        if (current.matches(".projects-menu")) setProjectsMenuOpen(true);
        event.currentTarget.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
          if (!shouldCloseSiblingMenu(current, menu)) return;
          if (menu.matches(".projects-menu")) closeProjectsMenu();
          else menu.open = false;
        });
      }} onMouseLeave={(event) => {
        const nav = event.currentTarget;
        window.setTimeout(() => {
          nav.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
            // Include the absolutely positioned popover in the hover check.
            if (shouldCloseMenuOnPointerLeave(menu.matches(".projects-menu"), menu.matches(":hover"), projectsMenuPinnedRef.current)) {
              if (menu.matches(".projects-menu")) closeProjectsMenu();
              else menu.open = false;
            }
          });
        }, 240);
      }} onPointerDownCapture={(event) => {
        const target = event.target as Element;
        if (shouldPinProjectsMenuOnInteraction(Boolean(target.closest(".projects-menu")), Boolean(target.closest(".projects-menu > summary, .project-menu-close")))) {
          setProjectsMenuPinned(true);
          setProjectsMenuOpen(true);
        }
      }} onClickCapture={(event) => {
        const target = event.target as Element;
        if (target.closest(".projects-menu")) {
          if (target.closest(".project-menu-close")) window.setTimeout(closeProjectsMenu, 0);
          return;
        }
        if (target.closest(".menu-popover button, .menu-popover input")) {
          const nav = event.currentTarget;
          window.setTimeout(() => {
            nav.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => { menu.open = false; });
            closeProjectsMenu();
          }, 0);
        }
      }}>
        <details><summary>File</summary><div className="menu-popover"><button onClick={restoreDol}>{t.restore}</button><button onClick={saveLocally}>{t.save}</button><button onClick={() => void saveToCloud()}>Save to cloud</button><button onClick={loadLocalSave}>Load local save</button><button onClick={() => void loadFromCloud()}>Load cloud project</button><button onClick={exportProject}>{t.export}</button><button onClick={() => exportSchematicSvg()}>Export SVG</button><button onClick={() => exportSchematicSvg("frame")}>Export frame SVG</button><button onClick={exportSchematicPng}>Export PNG</button><button onClick={printSchematic}>Print schematic</button><label className="menu-file-control">Import JSON<input type="file" accept="application/json,.json" onChange={importProject} /></label></div></details>
        <details><summary>Edit</summary><div className="menu-popover"><button onClick={undo} disabled={!history.undo.length}>Undo</button><button onClick={redo} disabled={!history.redo.length}>Redo</button></div></details>

        <details><summary>View</summary><div className="menu-popover"><button onClick={() => setShowGrid((value) => !value)} aria-pressed={showGrid}>Grid</button>{!isReferenceSheet && <button aria-pressed={showGuideEditor} onClick={() => { setShowGuideEditor(value => !value); setRightPanelOpen(true); setRightDockView("properties"); }}>Drawing guides</button>}{!isReferenceSheet && <button aria-pressed={showGridEditor} onClick={() => { setShowGridEditor(value => !value); setRightPanelOpen(true); setRightDockView("properties"); }}>Grid settings</button>}{!isReferenceSheet && <button aria-pressed={showPrintLayout} onClick={() => { setShowPrintLayout(value => !value); setRightPanelOpen(true); setRightDockView("properties"); }}>Print layout</button>}{!isReferenceSheet && document.printLayout && <button onClick={fitPrintFrame}>Fit Print Frame</button>}{!isReferenceSheet && <><button onClick={() => fitSchematicContent("selection")}>Fit Selection</button><button onClick={() => setFreeCamera(camera => ({ ...camera, center: { x: 0, y: 0 } }))}>Go to Origin</button></>}</div></details>
        <details><summary>Insert</summary><div className="menu-popover"><button onClick={addSelectedComponent}>Component</button></div></details>
        <details><summary>Electrical</summary><div className="menu-popover"><button onClick={() => setNotice(`${topologyIssues.length ? `${topologyIssues.length} topology issue(s) found.` : t.valid}.`)}>Validate</button><button onClick={beginCrossSheetContinuation} disabled={project.sheets.length < 2}>Add sheet continuation</button><button onClick={beginExtendSelectedContinuation} disabled={!selectedContinuation || project.sheets.every((sheet) => selectedContinuation.points.some((point) => point.sheetId === sheet.id))}>Extend selected continuation</button></div></details>
        <details><summary>Simulation</summary><div className="menu-popover"><button onClick={startSimulation}>▶ Run</button><button onClick={pauseSimulation}>Ⅱ Pause</button><button onClick={stopSimulation}>■ Stop</button></div></details>
        <button onClick={() => setReportsOpen((open) => !open)} aria-expanded={reportsOpen}>Reports</button>
        <button onClick={() => window.open("https://github.com/HephzibahBehulahHQ/AdigunElectroCAD/blob/main/docs/HELP.md", "_blank", "noopener,noreferrer")}>Help</button>
        <details className="projects-menu" ref={projectsMenuRef} open={projectsMenuOpen}><summary aria-expanded={projectsMenuOpen} onClick={(event) => { event.preventDefault(); const nextOpen = !projectsMenuPinnedRef.current; setProjectsMenuPinned(nextOpen); setProjectsMenuOpen(nextOpen); }}>Projects</summary><div className="menu-popover project-menu-popover"><div className="project-menu-heading"><strong>Projects</strong><button type="button" className="project-menu-close" aria-label="Close Projects menu" title="Close Projects menu" onClick={closeProjectsMenu}>×</button></div><ProjectLibraryPanel active templates={templateLibrary} selected={selectedTemplate} verification={selectedTemplateVerification} onSelect={setSelectedTemplateId} onLoad={loadTemplate} onOpenWorkbook={openFeederWorkbook} onOpenFourSheetWorkbook={openFourSheetDolWorkbook} onOpenStarDeltaWorkbook={openFourSheetStarDeltaWorkbook} onOpenReversingWorkbook={openFourSheetReversingWorkbook} onOpenTwoMotorWorkbook={openFourSheetTwoMotorWorkbook} onOpenAnalogWorkbook={openFourSheetAnalogLevelWorkbook} onOpenPneumaticWorkbook={openFourSheetPneumaticWorkbook} onOpenPlcSensorWorkbook={openThreeSheetPlcSensorWorkbook} onOpenVfdWorkbook={openFourSheetVfdFeederWorkbook} /></div></details>
        <a className="lab-route-link" href="#LAB">Laboratory →</a>
      </nav>

      <section className="tool-row" aria-label="CAD and simulation tools">
        <div className="tool-group" aria-label="Selection and editing"><span className="tool-group-label">Edit</span><div className="tool-group-actions">
          <button className={!wireMode && !annotationMode && !graphicMode && !crossSheetContinuationMode && !reconnectingWireId && !wireRouteEditId ? "tool-button selected" : "tool-button"} onClick={activateSelectTool} aria-pressed={!wireMode && !annotationMode && !graphicMode && !crossSheetContinuationMode && !reconnectingWireId && !wireRouteEditId}>⌖<span>Select</span></button>
          <button className="tool-button" onClick={addSelectedComponent}>⊞<span>Insert</span></button>
          <button className="tool-button" onClick={undo} disabled={!history.undo.length} aria-label="Undo last project edit">↶<span>Undo</span></button>
          <button className="tool-button" onClick={redo} disabled={!history.redo.length} aria-label="Redo last project edit">↷<span>Redo</span></button>
        </div></div>
        <div className="tool-group" aria-label="Drawing tools"><span className="tool-group-label">Draw</span><div className="tool-group-actions">
          <button className={wireMode ? "tool-button selected" : "tool-button"} onClick={toggleWireMode}>⌁<span>Wiring</span></button>
          {!isReferenceSheet && <>
            <button className={annotationMode ? "tool-button selected" : "tool-button"} onClick={() => { const nextMode = !annotationMode; setAnnotationMode(nextMode); setGraphicMode(null); setWireMode(false); setWireStart(null); setSelectedAnnotationId(""); setSelectedGraphicId(""); setSelectedGraphicIds([]); setComponentSelection(""); setSelectedWireId(""); setNotice(nextMode ? "Click the sheet to place a text annotation." : "Text placement ended."); }}>T<span>Text</span></button>
            <button className={graphicMode === "line" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("line")} aria-label="Draw line">／<span>Line</span></button>
            <button className={graphicMode === "rectangle" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("rectangle")} aria-label="Draw rectangle">▭<span>Rectangle</span></button>
            <button className={graphicMode === "ellipse" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("ellipse")} aria-label="Draw ellipse">◯<span>Ellipse</span></button>
            <button className={graphicMode === "polyline" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("polyline")} aria-label="Draw polyline">⌁<span>Polyline</span></button>
            <button className={graphicMode === "polygon" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("polygon")} aria-label="Draw polygon">⬠<span>Polygon</span></button>
            <button className={graphicMode === "freehand" ? "tool-button selected" : "tool-button"} onClick={() => activateGraphicTool("freehand")} aria-label="Draw freehand path">✎<span>Freehand</span></button>
          </>}
        </div></div>
        <div className="tool-group" aria-label="Canvas view"><span className="tool-group-label">View</span><div className="tool-group-actions">
          <button onClick={() => zoomSchematicAroundCenter(isReferenceSheet ? Math.max(.25, Math.round((currentZoom - .1) * 100) / 100) : Math.max(MIN_FREE_ZOOM, currentZoom / 1.15))} disabled={currentZoom <= (isReferenceSheet ? .25 : MIN_FREE_ZOOM)} aria-label="Zoom out">−</button>
          <output className="zoom-readout" aria-label="Schematic zoom">{currentZoom < .1 ? Number((currentZoom * 100).toPrecision(2)) : Math.round(currentZoom * 100)}%</output>
          <button onClick={() => zoomSchematicAroundCenter(isReferenceSheet ? Math.min(2, Math.round((currentZoom + .1) * 100) / 100) : Math.min(MAX_FREE_ZOOM, currentZoom * 1.15))} disabled={currentZoom >= MAX_FREE_ZOOM} aria-label="Zoom in">＋</button>
          <button onClick={() => fitSchematicContent()} aria-label="Fit drawing content in canvas">Fit</button>
          <button onClick={() => setShowGrid((value) => !value)} aria-pressed={showGrid}>▦ Grid</button>
        </div></div>
        <div className="tool-group tool-group-assistant" aria-label="Design assistant"><span className="tool-group-label">Assistant</span><div className="tool-group-actions">
          <button id="adigun-bot-launcher" className="bot-button" onClick={() => setBotActivation((value) => value + 1)} aria-expanded={botOpen}>◌ Adigun BOT{botUnread && <span className="bot-unread" aria-label="Pending Bot suggestion">●</span>}</button>
        </div></div>
        <div className="tool-group tool-group-simulation" aria-label="Simulation controls"><span className="tool-group-label">Simulation</span><div className="tool-group-actions">
          <button className="run" onClick={startSimulation}>▶ Run</button>
          <button onClick={pauseSimulation}>Ⅱ Pause</button>
          <button className="danger" onClick={stopSimulation}>■ Stop</button>
          <button onClick={() => runAction("trip-overload")} disabled={!isReferenceSheet}>⚠ Trip F1</button>
        </div></div>
      </section>

      <section className={`workspace${componentPanelOpen ? "" : " component-panel-collapsed"}${rightPanelOpen ? "" : " properties-panel-collapsed"}`}>
        <aside className="panel component-panel">
          <div className="panel-title"><strong hidden={!componentPanelOpen}>Component Library</strong><span hidden={!componentPanelOpen}>{componentLibraryCatalog.length} selectable models · source-backed and generic</span><button type="button" className="panel-toggle" aria-expanded={componentPanelOpen} aria-label={componentPanelOpen ? "Close component library" : "Open component library"} title={componentPanelOpen ? "Close component library" : "Open component library"} onClick={() => setComponentPanelOpen((open) => !open)}>{componentPanelOpen ? "‹" : "›"}</button></div>
          <div className="component-panel-content" hidden={!componentPanelOpen}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search catalog" aria-label="Search component library" />
          <CatalogTree onDragPreview={setCatalogDragId} key={search} definitions={filteredCatalog} selectedId={selectedDefinitionId} searching={Boolean(search.trim())} onSelect={(id) => { activateSelectTool(); setSelectedDefinitionId(id); setComponentSelection(""); setSelectedWireId(""); setSelectedContinuationId(""); setSelectedAnnotationId(""); setSelectedGraphicId(""); setRightDockView("properties"); setRightPanelOpen(true); if (!isReferenceSheet) { setPlacementDefinitionId(id); setNotice("Click a clear canvas position to place the component, or press Escape to cancel."); } }} />
          <section className="component-card">
            <div className="card-heading"><strong>{selectedDefinition.name}</strong><button className={favorites.includes(selectedDefinition.id) ? "favorite active" : "favorite"} onClick={() => setFavorites((items) => items.includes(selectedDefinition.id) ? items.filter((id) => id !== selectedDefinition.id) : [...items, selectedDefinition.id])} aria-label="Toggle component favorite">★</button></div>
            <ComponentSymbolPreview definition={selectedDefinition} />
            <p>{selectedDefinition.description}</p>
            <dl><dt>Reference</dt><dd>{selectedDefinition.referencePrefix}</dd><dt>Terminals</dt><dd>{selectedDefinition.terminals.map((terminal) => terminal.label).join(", ")}</dd><dt>Support</dt><dd>{selectedDefinition.simulationSupport}</dd></dl>
            <button className="primary wide" onClick={addSelectedComponent}>Insert into drawing</button>
          </section>
          </div>
        </aside>

        <section ref={drawingAreaRef} className="drawing-area" aria-label={`${activeSheet.name} schematic canvas`}>
          <div className="sheet-tabs" role="tablist" aria-label="Project sheets">{project.sheets.map((sheet, index) => <div key={sheet.id} className={`sheet-tab ${sheet.id === activeSheet.id ? "active" : ""} ${draggedSheetId === sheet.id ? "dragging" : ""}`} draggable onDragStart={(event) => { if ((event.target as HTMLElement).closest(".sheet-tab-remove")) { event.preventDefault(); return; } setDraggedSheetId(sheet.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", sheet.id); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); const sourceId = event.dataTransfer.getData("text/plain") || draggedSheetId; moveSheetTab(sourceId, sheet.id); }} onDragEnd={() => setDraggedSheetId("")} title="Drag to reorder sheet"><button type="button" role="tab" aria-selected={sheet.id === activeSheet.id} className="sheet-tab-select" onClick={() => selectSheet(sheet.id)} onKeyDown={(event) => { if (!event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return; event.preventDefault(); const target = project.sheets[index + (event.key === "ArrowLeft" ? -1 : 1)]; if (target) moveSheetTab(sheet.id, target.id); }}>{sheet.name} · Sheet {index + 1}</button><button type="button" className="sheet-tab-remove" aria-label={`Remove ${sheet.name}`} title="Remove sheet (Undo restores it)" disabled={project.sheets.length <= 1} onClick={(event) => { event.stopPropagation(); removeSheetTab(sheet.id); }}>×</button></div>)}<button className="add-sheet-tab" onClick={addSheet} aria-label="Add free schematic sheet">＋ Sheet</button></div>
          <Schematic document={document} placementPreviewDefinitionId={isReferenceSheet || wireMode || graphicMode || annotationMode ? undefined : catalogDragId || placementDefinitionId} placementDragging={Boolean(catalogDragId)} symbolStates={symbolStates} selectedComponentId={selectedComponentId} selectedComponentIds={selectedComponentIds} selectedWireId={selectedWireId} wireRouteEditId={wireRouteEditId} onWireRouteChange={updateWireRoute} simulation={simulation} wireMode={wireMode} wireStart={wireStart} wireBends={wireBends} onWireBend={wireMode && wireStart && !wireBranchStart && !crossSheetContinuationMode && !reconnectingWireId ? (point) => setWireBends((bends) => { const last = bends.at(-1); return last?.x === point.x && last.y === point.y ? bends : [...bends, point]; }) : undefined} onSelect={selectComponent} onGroupSelect={selectComponents} onWireSelect={selectWire} onWireBranchStart={selectWireBranch} onTerminalSelect={selectWireTerminal} onMove={isReferenceSheet ? undefined : dragComponent} onPlaceComponent={placementDefinitionId && !isReferenceSheet && !wireMode && !graphicMode && !annotationMode ? (x, y) => insertCatalogComponentAt(placementDefinitionId, x, y) : undefined} litIndicatorIds={litIndicatorIds} onComponentTransform={isReferenceSheet || reconnectingWireId || crossSheetContinuationMode ? undefined : applyComponentTransform} onComponentDrop={insertCatalogComponentAt} zoom={currentZoom} freeView={freeView} onAddGuide={isReferenceSheet ? undefined : addDrawingGuide} showGrid={showGrid} annotationMode={annotationMode} selectedAnnotationId={selectedAnnotationId} onAnnotationSelect={selectAnnotation} onAnnotationPlace={addAnnotationAt} onAnnotationMove={(id, x, y) => { const item = document.annotations?.find((annotation) => annotation.id === id); if (item) { selectAnnotation(id); updateDocument({ ...document, annotations: (document.annotations ?? []).map((annotation) => annotation.id === id ? { ...annotation, x: snapDrawingCoordinate(x, snapSpacing), y: snapDrawingCoordinate(y, snapSpacing) } : annotation), revision: document.revision + 1 }); } }} graphicMode={graphicMode} selectedGraphicId={selectedGraphicId} selectedGraphicIds={selectedGraphicIds} onGraphicSelect={selectGraphic} onGraphicCreate={addGraphic} onGraphicMove={moveGraphic} onGraphicResize={resizeGraphic} onGraphicVertexMove={moveGraphicVertex} onGraphicVertexInsert={insertGraphicVertex} onGraphicVertexDelete={deleteGraphicVertex} onComponentContextMenu={openComponentContextMenu} continuations={project.continuations ?? []} projectSheets={project.sheets} activeSheetId={activeSheet.id} onContinuationNavigate={(sheetId) => { setCrossSheetContinuationMode(false); setCrossSheetContinuationStart(null); setCrossSheetContinuationExtendId(""); selectSheet(sheetId); setWireMode(false); setComponentSelection(""); }} selectedContinuationId={selectedContinuationId} onContinuationSelect={selectContinuation} />
          <div className="canvas-caption">{isReferenceSheet ? <><strong>Editable reference project:</strong> breaker, START/STOP, overload and contactor states drive the simplified motor model. <button onClick={() => setNotice("This is an educational simplified model, not a real-world installation or protection-coordination calculation.")}>{t.limitations}</button></> : <><strong>Free schematic sheet:</strong> insert catalog components, connect compatible terminals and drag placed symbols freely.</>}</div>
        </section>

        <aside className="panel workspace-dock" aria-label="Properties and project library">
          <nav className="workspace-dock-tabs" aria-label="Right panel">
            <button type="button" hidden={!rightPanelOpen} aria-pressed={rightDockView === "properties"} onClick={() => setRightDockView("properties")}>Properties</button>
            <button type="button" hidden={!rightPanelOpen} aria-pressed={rightDockView === "runtime"} onClick={() => setRightDockView("runtime")}>Runtime</button>
            <button type="button" hidden={!rightPanelOpen} aria-pressed={rightDockView === "diagnostics"} onClick={() => setRightDockView("diagnostics")}>Diagnostics</button>
            <button type="button" className="panel-toggle" aria-expanded={rightPanelOpen} aria-label={rightPanelOpen ? "Close right panel" : "Open right panel"} title={rightPanelOpen ? "Close right panel" : "Open right panel"} onClick={() => setRightPanelOpen((open) => !open)}>{rightPanelOpen ? "›" : "‹"}</button>
          </nav>
          <div className="dock-content properties-panel" hidden={!rightPanelOpen || rightDockView !== "properties"}>

            <div className="panel-title"><strong>Properties</strong><span>{selectedContinuation?.label ?? selectedComponent?.reference ?? selectedAnnotation?.text ?? selectedGraphic?.name ?? (selectedWire ? selectedWire.netName ?? "Wire" : "—")}</span></div>
            {botEditsUnsaved && <p className="cloud-note">Bot edits are unsaved. Autosave is paused until an explicit save.</p>}
            {!isReferenceSheet && selectedComponent && catalogById.get(selectedComponent.definitionId) && <RuntimeControls component={selectedComponent} definition={catalogById.get(selectedComponent.definitionId)!} runtime={runtimeDocument?.components.find((component) => component.id === `${activeSheet.id}::${selectedComponent.id}`)} onLevelChange={(value) => setRuntimeDocument((current) => setCircuitLevelInput(current ?? resetCircuitClock(createProjectRuntimeDocument(project), catalogById), catalogById, `${activeSheet.id}::${selectedComponent.id}`, value))} onChange={(property, value) => setRuntimeDocument((current) => setCircuitBooleanInput(current ?? resetCircuitClock(createProjectRuntimeDocument(project), catalogById), catalogById, `${activeSheet.id}::${selectedComponent.id}`, property, value))} />}
          {selectedContinuation ? <ContinuationProperties continuation={selectedContinuation} sheets={project.sheets} onCableCoreChange={updateSelectedCableCore} onLabelChange={(label) => updateSelectedContinuation({ label })} onColorChange={(conductorColor) => updateSelectedContinuation({ conductorColor })} onRemove={removeSelectedContinuation} /> : selectedWire ? <WireProperties wire={selectedWire} effectiveColor={resolveDraftingStyle(selectedWire, document.draftingLayers).draftingColor} onNetNameChange={renameSelectedWire} onColorChange={updateSelectedWireColor} onReconnect={reconnectSelectedWire} onRemove={removeSelectedWire} routeEditable={!isReferenceSheet && !selectedWire.branchOfWireId} routeEditing={wireRouteEditId === selectedWire.id} onRouteEditToggle={() => setWireRouteEditId(wireRouteEditId === selectedWire.id ? "" : selectedWire.id)} onRoutePointAdd={addSelectedWireRoutePoint} onRouteReset={resetSelectedWireRoute} /> : selectedComponent ? <Properties instance={selectedComponent} effectiveColor={resolveDraftingStyle(selectedComponent, document.draftingLayers).draftingColor} selectionCount={selectedComponentIds.length} stackCapabilities={isReferenceSheet ? undefined : canReorderSchematicGraphics(componentsInStackOrder(document.components), selectedComponentIds.length ? selectedComponentIds : [selectedComponent.id])} onStackChange={updateComponentStackOrder} modelOutput={isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id) ? undefined : activeSheetModelRuns.find((run) => run.componentId === selectedComponent.id)?.output} onReferenceChange={updateReference} onDisplayNameChange={updateDisplayName} onTerminalLabelChange={updateTerminalLabel} onCustomPropertyAdd={addSelectedCustomProperty} onCustomPropertyRename={renameSelectedCustomProperty} onCustomPropertyChange={updateSelectedCustomProperty} onCustomPropertyRemove={removeSelectedCustomProperty} onPropertyChange={updateSelectedProperty} onDraftingColorChange={updateSelectedDraftingColor} onSizeChange={updateSelectedSize} onPositionChange={updateSelectedPosition} onNudge={nudgeSelectedComponent} onRotate={rotateSelectedComponent} onRotationChange={(rotation) => { if (selectedComponent) applyComponentTransform(selectedComponent.id, { kind: "rotate", rotation }); }} onDuplicate={duplicateSelectedComponent} onRemove={removeSelectedComponent} onCustomTerminalChange={changeCustomTerminal} onCustomTerminalAdd={addCustomTerminal} onCustomTerminalRemove={removeCustomTerminal} onCustomTerminalOffsetChange={changeCustomTerminalOffset} movable={!(isReferenceSheet && fixedReferenceComponentIds.has(selectedComponent.id))} /> : selectedAnnotation ? <AnnotationProperties annotation={selectedAnnotation} onChange={updateSelectedAnnotation} onRemove={removeSelectedAnnotation} /> : selectedGraphic ? <GraphicProperties graphic={selectedGraphic} selectionCount={selectedGraphicIds.length} stackCapabilities={canReorderSchematicGraphics(document.graphics ?? [], selectedGraphicIds.length ? selectedGraphicIds : [selectedGraphic.id])} onStackChange={(order) => updateGraphicStackOrder(selectedGraphicIds.length ? selectedGraphicIds : [selectedGraphic.id], order)} onChange={updateSelectedGraphic} onGeometryChange={(x1, y1, x2, y2) => resizeGraphic(selectedGraphic.id, x1, y1, x2, y2)} onDuplicate={duplicateSelectedGraphic} onRemove={removeSelectedGraphic} onMakeComponent={makeComponentFromGraphic} /> : <section className="catalog-properties-preview"><strong>{selectedDefinition.name}</strong><p>{selectedDefinition.description}</p><dl><dt>Reference</dt><dd>{selectedDefinition.referencePrefix}</dd><dt>Terminals</dt><dd>{selectedDefinition.terminals.map((terminal) => terminal.label).join(", ")}</dd><dt>Simulation</dt><dd>{selectedDefinition.simulationSupport}</dd></dl><button type="button" className="primary wide" onClick={addSelectedComponent}>Insert into drawing</button></section>}
            {!isReferenceSheet && showGridEditor && <DrawingGridEditor grid={drawingGrid} onSave={saveDrawingGrid} />}
            {!isReferenceSheet && showPrintLayout && <PrintLayoutEditor layout={document.printLayout} onSave={savePrintLayout} onRemove={removePrintLayout} />}
            {!isReferenceSheet && showGuideEditor && <DrawingGuideEditor guides={document.guides ?? []} onAdd={addDrawingGuide} onChange={updateDrawingGuide} onRemove={removeDrawingGuide} />}
            {draftingEntity && draftingTarget && <DraftingLayerFields key={draftingTarget.kind + ":" + draftingTarget.id} entity={draftingEntity} layers={document.draftingLayers ?? []} onChange={(patch) => applyDraftingEdit(updateEntityDrafting(document, draftingTarget, patch))} onCreateLayer={(name) => applyDraftingEdit(createEntityLayer(document, draftingTarget, name))} onLayerChange={(id, patch) => applyDraftingEdit(updateDraftingLayer(document, id, patch))} />}
            {isReferenceSheet ? <><section className="state-card"><strong>Simulation state</strong><div><span className={simulation.contactorEnergized ? "state-dot on" : "state-dot"} /> KM1 coil {simulation.contactorEnergized ? "energized" : "de-energized"}</div><div><span className={simulation.overloadTripped ? "state-dot fault" : "state-dot"} /> F1 {simulation.overloadTripped ? "tripped" : "healthy"}</div><div><span className={simulation.motorState === "running" ? "state-dot on" : "state-dot"} /> M1 {simulation.motorState}</div></section><section className="control-card"><strong>Operate DOL circuit</strong><button onClick={() => runAction(simulation.breakerClosed ? "open-breaker" : "close-breaker")}>{simulation.breakerClosed ? "Open Q1" : "Close Q1"}</button><button className="start" onMouseDown={() => runAction("press-start")} onMouseUp={() => runAction("release-start")} onMouseLeave={() => simulation.startPressed && runAction("release-start")}>START S1</button><button className="stop" onClick={() => runAction("press-stop")}>STOP S0</button><button onClick={() => runAction("reset-overload")} disabled={!simulation.overloadTripped}>Reset F1</button></section></> : <section className="state-card"><strong>Free sheet</strong><div>{isRunning ? "Simulation clock running." : runtimeDocument ? "Simulation clock paused or reset." : "Ready for runtime simulation."}</div><div>Run advances timers, thermal protection and other runtime models; Pause retains their state; Stop restores the design.</div></section>}
            {!isReferenceSheet && selectedComponent && catalogById.get(selectedComponent.definitionId)?.simulationModelId === "catalog-plc-digital-io" && <LadderEditor key={`${activeSheet.id}:${selectedComponent.id}`} program={String(selectedComponent.properties.program ?? "")} previewInputs={ladderPreviewInputs} onApply={(program) => updateSelectedProperty("program", program)} />}
            <p className="cloud-note">☁ {authUser ? anonymousSession ? "Guest preview: cloud inserts require a confirmed account." : "Cloud account connected. Save and load projects from File." : "Sign in to save and load cloud projects."}</p>
          </div>
          <div className="dock-content right-runtime" hidden={!rightPanelOpen || rightDockView !== "runtime"}>
            <div className="panel-title"><strong>Runtime</strong><span className={simulation.motorState === "running" ? "badge running" : "badge"}>{simulation.motorState.toUpperCase()}</span></div>
            <div className="console-section"><dl><dt>Voltage</dt><dd>{simulation.lineVoltageV.toFixed(0)} V</dd><dt>Current</dt><dd>{simulation.lineCurrentA.toFixed(1)} A</dd><dt>Speed</dt><dd>{simulation.motorSpeedRpm.toFixed(0)} rpm</dd><dt>Time</dt><dd>{(simulation.elapsedMs / 1000).toFixed(1)} s</dd></dl></div>
          </div>
          <div className="dock-content right-diagnostics" hidden={!rightPanelOpen || rightDockView !== "diagnostics"}>
            <div className="panel-title"><strong>{t.validation}</strong></div>
            <div className="console-section">{topologyIssues.length ? topologyIssues.map((issue) => <p className="issue" key={`${issue.code}-${issue.message}`}>{issue.message}</p>) : <p className="pass">✓ {t.valid} · {document.wires.length} terminal-to-terminal wires checked.</p>}<ModelRunSummary runs={activeSheetModelRuns} /><p className="muted">Component results are documented engineering abstractions; validate physical designs independently.</p></div>
            <div className="console-section event-log"><strong>Event log</strong>{simulation.events.slice(0, 4).map((event, index) => <p key={`${event}-${index}`}>{event}</p>)}</div>
          </div>
        </aside>
      </section>

      <section className={isLabPage ? "engineering-console lab-route-console" : "engineering-console editor-console"}>
        <nav className="console-tabs" aria-label="Engineering console">
          <button type="button" aria-pressed={consoleView === "labs"} onClick={() => setConsoleView("labs")}>Laboratories</button>
          <button type="button" className="console-collapse" aria-expanded={!consoleCollapsed} onClick={() => setConsoleCollapsed((collapsed) => !collapsed)}>{consoleCollapsed ? "Show console" : "Hide console"}</button>
        </nav>
        <div className="console-view laboratory-view" aria-label="Laboratory controls and results" hidden={!isLabPage}>
        <section className="lab-introduction" aria-labelledby="lab-page-title">
          <div className="lab-intro-copy"><span className="lab-kicker">ADIGUN ELECTROCAD · LAB</span><h1 id="lab-page-title">Simulation workbench</h1><p>Explore independent motor, PLC, and industrial-device models. Changing lab controls does not change the active CAD sheet.</p><p>To edit a starter circuit in CAD, use its <strong>Copy power circuit to new editable sheet</strong> action.</p></div>
          <div className="lab-how-to"><strong>How to use the labs</strong><ol><li>Set inputs and conditions.</li><li>Operate the controls in a starter bench.</li><li>Read the calculated results below.</li><li>Copy a starter circuit when you want to edit it in CAD.</li></ol></div>
        </section>
        <div className="lab-content-section lab-status"><h3>Current CAD sheet · read-only context</h3><div className="lab-status-grid"><span>Motor model: <strong>{simulation.motorState.toUpperCase()}</strong></span><span>Terminal wires: <strong>{document.wires.length}</strong></span><span>Topology: <strong>{topologyIssues.length ? `${topologyIssues.length} issue(s)` : "Valid"}</strong></span></div></div>
        <div className="lab-content-section lab-inputs"><h3>Inputs and conditions</h3>
        <section className="console-section plc-lab" aria-label="PLC logic and analog signal laboratory"><strong>PLC logic &amp; analog</strong><span className="badge">Interactive model</span><p className="lab-bench-description">Practice digital inputs, logic gates, comparisons, math, and a level-sensor signal. The resulting values appear in Results and readings.</p><div className="plc-controls"><label>Input A (NO / NC)<input type="checkbox" checked={plcInputA} onChange={(event) => { setPlcPreviousInputA(plcInputA); setPlcInputA(event.target.checked); }} /></label><label>Input B<input type="checkbox" checked={plcInputB} onChange={(event) => setPlcInputB(event.target.checked)} /></label><label>Logic gate<select value={plcGate} onChange={(event) => setPlcGate(event.target.value as LogicGate)}><option value="and">AND</option><option value="or">OR</option><option value="not">NOT</option><option value="nand">NAND</option><option value="nor">NOR</option><option value="xor">XOR</option></select></label><label>Comparator<select value={plcComparator} onChange={(event) => setPlcComparator(event.target.value as Comparator)}><option value="greater-than">Greater than</option><option value="greater-or-equal">Greater than or equal to</option><option value="less-than">Less than</option><option value="less-or-equal">Less than or equal to</option><option value="equal-to">Equal to</option><option value="not-equal">Not equal to</option></select></label><label>Math block<select value={plcMath} onChange={(event) => setPlcMath(event.target.value as MathOperation)}><option value="add">Add</option><option value="subtract">Subtract</option><option value="multiply">Multiply</option><option value="divide">Divide</option></select></label><label>Value A<input type="number" value={plcLeft} onChange={(event) => setPlcLeft(Number(event.target.value) || 0)} /></label><label>Value B<input type="number" value={plcRight} onChange={(event) => setPlcRight(Number(event.target.value) || 0)} /></label><label>Level sensor {levelPercent}%<input type="range" min="0" max="100" value={levelPercent} onChange={(event) => setLevelPercent(Number(event.target.value))} /></label></div></section>
        <section className="console-section industrial-lab" aria-label="Industrial device laboratory"><strong>Industrial devices</strong><span className="badge">Interactive model</span><p className="lab-bench-description">Adjust actuator, process, and safety inputs; review the modelled pneumatic, hydraulic, HVAC, solar, and cable readings.</p><div className="plc-controls industrial-controls"><label>Actuator command<select value={industrialDirection} onChange={(event) => setIndustrialDirection(event.target.value as Direction)}><option value="extend">Extend</option><option value="retract">Retract</option><option value="hold">Hold</option></select></label><label>Hydraulic pressure {industrialPressureBar} bar<input type="range" min="0" max="250" value={industrialPressureBar} onChange={(event) => setIndustrialPressureBar(Number(event.target.value))} /></label><label>Zone temperature {industrialTemperatureC}°C<input type="range" min="0" max="40" value={industrialTemperatureC} onChange={(event) => setIndustrialTemperatureC(Number(event.target.value))} /></label><label>Solar irradiance {industrialSolarIrradiance} W/m²<input type="range" min="0" max="1000" value={industrialSolarIrradiance} onChange={(event) => setIndustrialSolarIrradiance(Number(event.target.value))} /></label><label>Cable current {industrialCableCurrentA} A<input type="range" min="0" max="100" value={industrialCableCurrentA} onChange={(event) => setIndustrialCableCurrentA(Number(event.target.value))} /></label><label>Safety channel A<input type="checkbox" checked={industrialSafetyA} onChange={(event) => setIndustrialSafetyA(event.target.checked)} /></label><label>Safety channel B<input type="checkbox" checked={industrialSafetyB} onChange={(event) => setIndustrialSafetyB(event.target.checked)} /></label></div></section>
        </div>
        <div className="lab-content-section lab-actions"><h3>Actions and starter benches</h3>
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
        <div className="plc-latch"><span>Set/Reset latch: {plcLatch ? "SET" : "RESET"}</span><button onClick={() => setPlcLatch((value) => setResetLatch(value, true, false))}>Set</button><button onClick={() => setPlcLatch((value) => setResetLatch(value, false, true))}>Reset</button></div>
        </div>
        <div className="lab-content-section lab-results"><h3>Results and readings</h3><div className="lab-readings-grid"><div className="plc-results"><span>NO {normallyOpen(plcInputA) ? "ON" : "OFF"} · NC {normallyClosed(plcInputA) ? "ON" : "OFF"}</span><span>Edge + {controlLab.edges.positive ? "ON" : "OFF"} · − {controlLab.edges.negative ? "ON" : "OFF"}</span><span>Gate {controlLab.logic ? "ON" : "OFF"} · Compare {controlLab.comparison ? "ON" : "OFF"} · Coil {controlLab.coil ? "ON" : "OFF"}</span><span>Math {controlLab.math.ok ? controlLab.math.value.toFixed(2) : controlLab.math.reason}</span><span>Level 4–20 mA: {controlLab.milliamp.toFixed(2)} mA → ADC {controlLab.raw} → DAC {controlLab.dac.toFixed(2)} mA</span></div><div className="industrial-results"><span>Pneumatic 5/2: {industrialLab.valve} · cylinder 1 s step: {industrialLab.cylinder.toFixed(0)}% · compressor {industrialLab.compressorLpm.toFixed(0)} L/min · FRL {industrialLab.frlBar.toFixed(1)} bar</span><span>Hydraulic pump {industrialLab.pumpLpm.toFixed(1)} L/min · cylinder {industrialLab.forceN.toFixed(0)} N · relief {industrialLab.reliefOpen ? "OPEN" : "CLOSED"}</span><span>HVAC next {industrialLab.temperatureNext.toFixed(2)}°C · thermostat {industrialLab.thermostat ? "ON" : "OFF"} · humidistat {industrialLab.humidistat ? "ON" : "OFF"} · damper {industrialLab.damper.toFixed(0)}%</span><span>Solar {industrialLab.solarW.toFixed(0)} W · battery forecast {industrialLab.batterySoc.toFixed(1)}% · inverter {industrialLab.inverterW.toFixed(0)} W · grid tie {industrialLab.gridTie ? "CLOSED" : "OPEN"}</span><span>Safety relay {industrialLab.safety ? "ENERGIZED" : "OPEN"} · light curtain {industrialLab.curtainClear ? "CLEAR" : "BLOCKED"} · phases {industrialLab.phaseHealthy ? "HEALTHY" : "FAILED"} · leakage {industrialLab.leakageTrip ? "TRIPPED" : "HEALTHY"}</span><span>100 m three-phase cable: {industrialLab.voltageDrop.toFixed(2)} V drop · {industrialLab.cableLoss.toFixed(1)} W loss</span></div></div></div>
        </div>
      </section>

      {reportsOpen && <ProjectReports projectName={project.name} sheetName={activeSheet.name} sheetReport={report} projectReport={projectReport} onExport={exportReport} onClose={() => setReportsOpen(false)} />}

      <footer><span>© {new Date().getFullYear()} Hephzibah Behulah</span><span>HB Elektroniker · AdigunElectroCAD</span><span>{notice}</span><span>Languages in this foundation: English, German. Yoruba and Nigerian Pidgin await reviewed translations.</span></footer>
    </main>
  );
}

function Properties({ instance: savedInstance, effectiveColor, modelOutput, selectionCount, stackCapabilities, onStackChange, onReferenceChange, onDisplayNameChange, onTerminalLabelChange, onCustomPropertyAdd, onCustomPropertyRename, onCustomPropertyChange, onCustomPropertyRemove, onPropertyChange, onDraftingColorChange, onSizeChange, onPositionChange, onNudge, onRotate, onRotationChange, onDuplicate, onRemove, onCustomTerminalChange, onCustomTerminalAdd, onCustomTerminalRemove, onCustomTerminalOffsetChange, movable }: { instance: ComponentInstance; effectiveColor?: string; modelOutput?: FunctionalModelResult; selectionCount: number; stackCapabilities?: GraphicStackCapabilities; onStackChange: (order: GraphicStackOrder) => void; onReferenceChange: (reference: string) => void; onDisplayNameChange: (displayName: string) => void; onTerminalLabelChange: (terminalId: string, label: string) => void; onCustomPropertyAdd: (name: string, value: string) => boolean; onCustomPropertyRename: (previousName: string, name: string) => boolean; onCustomPropertyChange: (name: string, value: string) => void; onCustomPropertyRemove: (name: string) => void; onPropertyChange: (property: string, value: string | boolean) => boolean; onDraftingColorChange: (color: string | undefined) => void; onSizeChange: (sizePercent: string) => void; onPositionChange: (axis: "x" | "y", value: string) => boolean; onNudge: (deltaX: number, deltaY: number) => void; onRotate: () => void; onRotationChange: (rotation: ComponentInstance["rotation"]) => void; onDuplicate: () => void; onRemove: () => void; onCustomTerminalChange: (terminalId: string, patch: Partial<Pick<TerminalDefinition, "kind" | "direction">>) => void; onCustomTerminalAdd: () => void; onCustomTerminalRemove: (terminalId: string) => void; onCustomTerminalOffsetChange: (terminalId: string, axis: "x" | "y", input: HTMLInputElement) => void; movable: boolean }) {
  const definition = catalogById.get(savedInstance.definitionId);
  if (!definition) return <p className="empty">Catalog definition missing.</p>;
  const instance = { ...savedInstance, properties: { ...definition.propertiesSchema, ...savedInstance.properties } };
  return <section className="properties-form">{selectionCount > 1 && <p className="group-selection" aria-label="Group selection">{selectionCount} components selected. Arrow controls move the whole group.</p>}<label>Reference<input defaultValue={instance.reference} key={instance.id + instance.reference} onBlur={(event) => onReferenceChange(event.target.value)} /></label><label>Instance name<input defaultValue={savedInstance.displayName ?? ""} key={savedInstance.id + String(savedInstance.displayName ?? "")} maxLength={80} disabled={!movable} onBlur={(event) => onDisplayNameChange(event.target.value)} /></label><label>Component<input value={definition.name} readOnly /></label><label>Category<input value={definition.category} readOnly /></label><label>Simulation<input value={definition.simulationSupport} readOnly /></label>{movable && <><label>Symbol color<input aria-label="Component drafting color" type="color" value={effectiveColor ?? "#2272ad"} onChange={(event) => onDraftingColorChange(event.target.value)} /></label><div className="annotation-palette" aria-label="Component color palette">{["#2272ad", "#19324f", "#c62828", "#16814b", "#d27a00", "#7b3fa1"].map((color) => <button key={color} type="button" aria-label={`Set component color ${color}`} title={color} style={{ backgroundColor: color }} onClick={() => onDraftingColorChange(color)} />)}<button type="button" aria-label="Reset component color" title="Restore layer or default color" onClick={() => onDraftingColorChange(undefined)}>↺</button></div><label>Symbol size · percent<input type="number" min="50" max="200" step="10" defaultValue={Math.round((instance.size ?? 1) * 100)} key={`${instance.id}:${instance.size ?? 1}`} onBlur={(event) => onSizeChange(event.target.value)} /></label></>}<section className="component-parameters"><strong>Component parameters</strong>{Object.entries(instance.properties).map(([property, value]) => typeof value === "boolean" ? <label className="property-checkbox" key={property}>{formatPropertyLabel(property)}<input type="checkbox" checked={value} disabled={!movable} onChange={(event) => onPropertyChange(property, event.target.checked)} /></label> : definition.symbolId === "user-indicator-lamp" && property === "color" && typeof value === "string" ? <div className="component-color-field" key={property}><label>{formatPropertyLabel(property)}<input key={JSON.stringify([instance.id, property, value])} type={componentPropertyInputType(value)} defaultValue={value} disabled={!movable} onBlur={(event) => { const input = event.currentTarget; if (!onPropertyChange(property, input.value)) input.value = String(value); }} /></label><IndicatorColorPalette value={value} onChange={(color) => onPropertyChange(property, color)} /></div> : genericTopologyChoices(definition.id, property) ? <label key={property} title={definition.id === "generic.iec.plc-digital-io" ? "This four-channel profile has fixed I0, I1, Q0, Q1, and COM terminals." : undefined}>{formatPropertyLabel(property)}<select key={JSON.stringify([instance.id, property, value])} value={String(value)} disabled={!movable || (genericTopologyChoices(definition.id, property)?.length ?? 0) === 1} onChange={(event) => onPropertyChange(property, event.target.value)}>{genericTopologyChoices(definition.id, property)!.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select></label> : <label key={property}>{formatPropertyLabel(property)}<input key={JSON.stringify([instance.id, property, value])} type={componentPropertyInputType(value)} defaultValue={String(value)} maxLength={property.startsWith("terminalLabel") ? 8 : undefined} disabled={!movable} inputMode={typeof value === "number" ? "decimal" : undefined} onBlur={(event) => { const input = event.currentTarget; if (!onPropertyChange(property, input.value)) input.value = String(value); }} /></label>)}</section>{movable && <CustomComponentData instance={instance} onAdd={onCustomPropertyAdd} onRename={onCustomPropertyRename} onChange={onCustomPropertyChange} onRemove={onCustomPropertyRemove} />}{modelOutput && <section className="model-output"><strong>Live model output</strong><span>{modelOutput.label}</span><b>{modelOutput.value}</b></section>}{!movable && <p className="parameter-note">Reference-model geometry and parameters are fixed so the supported DOL behaviour and displayed circuit stay consistent.</p>}{movable && <><div className="move-grid"><strong>Position · nudge 20</strong><span>X {instance.x} · Y {instance.y} · R {instance.rotation}°</span><button onClick={() => onNudge(0, -20)} aria-label="Move component up">↑</button><button onClick={() => onNudge(-20, 0)} aria-label="Move component left">←</button><button onClick={() => onNudge(20, 0)} aria-label="Move component right">→</button><button onClick={() => onNudge(0, 20)} aria-label="Move component down">↓</button></div><button type="button" onClick={onDuplicate}>Duplicate component</button><button className="rotate-component" onClick={onRotate}>Rotate 90°</button><label>Rotation<select value={instance.rotation} onChange={(event) => onRotationChange(Number(event.target.value) as ComponentInstance["rotation"])}>{[0, 90, 180, 270].map((angle) => <option key={angle} value={angle}>{angle}°</option>)}</select></label><button className="remove-component" onClick={onRemove}>Remove placed component</button></>}<div className="terminals"><strong>Terminal display labels</strong>{(instance.customTerminals ?? definition.terminals).map((terminal, index) => { const fallback = displayTerminalLabel(instance.properties, index, terminal.label); return <span key={terminal.id}>{movable ? <TerminalLabelField instance={instance} terminalId={terminal.id} defaultLabel={fallback} onChange={onTerminalLabelChange} /> : instance.terminalLabels?.[terminal.id] ?? fallback}<small>{terminal.id} · {terminal.kind}</small></span>; })}</div>{movable && isUserSymbolDefinition(instance.definitionId) && <section className="component-parameters"><strong>User symbol terminals</strong><p>Configure connection points for this symbol. Labels, electrical type, and direction are user-defined; simulation behavior is not assigned.</p>{(instance.customTerminals ?? definition.terminals).map((terminal) => <div className="custom-terminal-row" key={terminal.id}><span>{terminal.id.toUpperCase()}</span><select aria-label={`${terminal.id} terminal type`} value={terminal.kind} onChange={(event) => onCustomTerminalChange(terminal.id, { kind: event.target.value as TerminalDefinition["kind"] })}><option value="control">Control</option><option value="power">Power</option><option value="protective-earth">Protective earth</option></select><select aria-label={`${terminal.id} terminal direction`} value={terminal.direction} onChange={(event) => onCustomTerminalChange(terminal.id, { direction: event.target.value as TerminalDefinition["direction"] })}><option value="input">Input</option><option value="output">Output</option><option value="bidirectional">Bidirectional</option></select>{!["t1", "t2"].includes(terminal.id) && <><label>{terminal.id.toUpperCase()} X<input type="number" aria-label={`${terminal.id} terminal X position`} min="-60" max="60" step="4" defaultValue={(instance.customTerminalOffsets?.[terminal.id] ?? controlTerminalOffset(definition.simulationModelId, terminal.id) ?? { x: 0, y: 0 }).x} key={`${instance.id}:${terminal.id}:x:${instance.customTerminalOffsets?.[terminal.id]?.x ?? "default"}`} onBlur={(event) => onCustomTerminalOffsetChange(terminal.id, "x", event.currentTarget)} /></label><label>{terminal.id.toUpperCase()} Y<input type="number" aria-label={`${terminal.id} terminal Y position`} min="-60" max="60" step="4" defaultValue={(instance.customTerminalOffsets?.[terminal.id] ?? controlTerminalOffset(definition.simulationModelId, terminal.id) ?? { x: 0, y: 0 }).y} key={`${instance.id}:${terminal.id}:y:${instance.customTerminalOffsets?.[terminal.id]?.y ?? "default"}`} onBlur={(event) => onCustomTerminalOffsetChange(terminal.id, "y", event.currentTarget)} /></label></>}{(instance.customTerminals?.length ?? definition.terminals.length) > 2 && !["t1", "t2"].includes(terminal.id) && <button type="button" onClick={() => onCustomTerminalRemove(terminal.id)} aria-label={`Remove ${terminal.id}`}>Remove</button>}</div>)}{(instance.customTerminals?.length ?? definition.terminals.length) < 8 && <button type="button" onClick={onCustomTerminalAdd}>Add terminal</button>}</section>}<p>{definition.documentation}</p>{movable && <fieldset className="graphic-geometry"><legend>Position</legend>{(["x", "y"] as const).map((axis) => <label key={axis}>{axis.toUpperCase()} position<input type="number" step="any" key={instance.id + axis + instance[axis]} defaultValue={instance[axis]} onBlur={(event) => { const input = event.currentTarget; if (!onPositionChange(axis, input.value)) input.value = String(instance[axis]); }} /></label>)}</fieldset>}{stackCapabilities && <StackControls capabilities={stackCapabilities} onChange={onStackChange} />}</section>;
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
  if (property === "dc") return "DC supply (clear for AC)";
  return property.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (character) => character.toUpperCase());
}

function isValidCustomFieldName(name: string) {
  return name.length > 0 && name.length <= 40 && !["__proto__", "constructor", "prototype"].includes(name.toLowerCase());
}

function CableCoreFields({ assignment, onChange }: { assignment: ProjectContinuation["cableCore"]; onChange: (assignment: NonNullable<ProjectContinuation["cableCore"]> | null) => string | void }) {
  const [cableId, setCableId] = useState(assignment?.cableId ?? "");
  const [coreId, setCoreId] = useState(assignment?.coreId ?? "");
  const [error, setError] = useState<string>();
  return <form className="properties-form" aria-label="Cable core assignment" onSubmit={(event) => {
    event.preventDefault();
    const next = { cableId: cableId.trim(), coreId: coreId.trim() };
    const reason = onChange(next);
    setError(reason || undefined);
    if (!reason) {
      setCableId(next.cableId);
      setCoreId(next.coreId);
    }
  }}>
    <label>Cable ID<input value={cableId} maxLength={64} onChange={(event) => { setCableId(event.currentTarget.value); setError(undefined); }} /></label>
    <label>Core ID<input value={coreId} maxLength={64} onChange={(event) => { setCoreId(event.currentTarget.value); setError(undefined); }} /></label>
    <button type="submit">Assign cable core</button>
    {assignment && <button type="button" onClick={() => setError(onChange(null) || undefined)}>Clear cable core</button>}
    {error && <p role="alert">{error}</p>}
  </form>;
}

function ContinuationProperties({ continuation, sheets, onLabelChange, onColorChange, onCableCoreChange, onRemove }: { continuation: ProjectContinuation; sheets: CircuitSheet[]; onLabelChange: (label: string) => void; onColorChange: (color: string) => void; onCableCoreChange: (assignment: NonNullable<ProjectContinuation["cableCore"]> | null) => string | void; onRemove: () => void }) {
  const [labelDraft, setLabelDraft] = useState(continuation.label);
  useEffect(() => setLabelDraft(continuation.label), [continuation.id, continuation.label]);
  return <section className="properties-form continuation-properties" aria-label="Project continuation properties">
    <strong>Cross-sheet net</strong>
    <label>Net label<input value={labelDraft} maxLength={64} onChange={(event) => setLabelDraft(event.currentTarget.value)} onBlur={() => { const label = labelDraft.trim(); if (label) { setLabelDraft(label); onLabelChange(label); } else setLabelDraft(continuation.label); }} /></label>
    <label>Conductor color<input aria-label="Conductor color" type="color" value={continuation.conductorColor} onChange={(event) => onColorChange(event.currentTarget.value)} /></label>
    <CableCoreFields key={JSON.stringify([continuation.id, continuation.cableCore])} assignment={continuation.cableCore} onChange={onCableCoreChange} />
    <div className="continuation-points"><strong>Connected terminals</strong><ol>{continuation.points.map((point) => {
      const sheet = sheets.find((item) => item.id === point.sheetId);
      const sheetNumber = sheets.findIndex((item) => item.id === point.sheetId) + 1;
      const component = sheet?.document.components.find((item) => item.id === point.endpoint.componentId);
      const definition = component && catalogById.get(component.definitionId);
      const terminal = (component?.customTerminals ?? definition?.terminals)?.find((item) => item.id === point.endpoint.terminalId);
      return <li key={point.sheetId + point.endpoint.componentId + point.endpoint.terminalId}>Sheet {sheetNumber} · {point.gridReference} · {component?.reference ?? point.endpoint.componentId}.{terminal?.label ?? point.endpoint.terminalId}</li>;
    })}</ol></div>
    <button type="button" className="danger" onClick={onRemove}>Remove continuation</button>
  </section>;
}

function WireProperties({ wire, effectiveColor, onNetNameChange, onColorChange, onReconnect, onRemove, routeEditable, routeEditing, onRouteEditToggle, onRoutePointAdd, onRouteReset }: { wire: Wire; effectiveColor?: string; onNetNameChange: (netName: string) => void; onColorChange: (color: string | undefined) => void; onReconnect: (side: "from" | "to") => void; onRemove: () => void; routeEditable: boolean; routeEditing: boolean; onRouteEditToggle: () => void; onRoutePointAdd: () => void; onRouteReset: () => void }) {
  const palette = ["#68788b", "#d5242a", "#d39700", "#59708f", "#167a52", "#1565c0", "#7b3fa1"];
  return <section className="properties-form wire-properties"><label>Net name<input defaultValue={wire.netName ?? wire.id} key={wire.id + (wire.netName ?? "")} onBlur={(event) => onNetNameChange(event.target.value)} /></label><label>Wire color<input aria-label="Wire color" type="color" value={effectiveColor ?? "#68788b"} onChange={(event) => onColorChange(event.target.value)} /></label><div className="annotation-palette" aria-label="Wire color palette">{palette.map((color) => <button key={color} type="button" aria-label={`Set wire color ${color}`} title={color} style={{ backgroundColor: color }} onClick={() => onColorChange(color)} />)}<button type="button" aria-label="Reset wire color" title="Restore layer or default color" onClick={() => onColorChange(undefined)}>↺</button></div><label>From terminal<input value={`${wire.from.componentId}.${wire.from.terminalId}`} readOnly /></label><label>To terminal<input value={`${wire.to.componentId}.${wire.to.terminalId}`} readOnly /></label><p>Wire color controls drafting appearance. Reconnecting either endpoint recalculates the orthogonal path.</p>{routeEditable && <><strong>Orthogonal route</strong><button type="button" onClick={onRouteEditToggle}>{routeEditing ? "Stop editing route" : "Edit route points"}</button><button type="button" onClick={onRoutePointAdd}>Add route point</button>{wire.points.length > 0 && <button type="button" onClick={onRouteReset}>Reset to automatic route</button>}<p>Click the wire to add a point. Drag a route handle or use arrow keys to change the path; right-click or press Delete to remove a point.</p></>}{wire.branchOfWireId && <p>Branch route follows its parent wire. Edit the parent route to reposition this attachment.</p>}<button className="reconnect-wire" onClick={() => onReconnect("to")}>Reconnect target terminal</button><button className="reconnect-wire" onClick={() => onReconnect("from")}>Reconnect source terminal</button><button className="remove-component" onClick={onRemove}>Delete wire</button></section>;
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

function GraphicProperties({ graphic, selectionCount, stackCapabilities, onStackChange, onChange, onGeometryChange, onDuplicate, onRemove, onMakeComponent }: { graphic: SchematicGraphic; selectionCount: number; stackCapabilities: GraphicStackCapabilities; onStackChange: (order: GraphicStackOrder) => void; onChange: (patch: Partial<Pick<SchematicGraphic, "name" | "color" | "fillColor" | "strokeWidth">>) => void; onGeometryChange: (x1: number, y1: number, x2: number, y2: number) => void; onDuplicate: () => void; onRemove: () => void; onMakeComponent: () => void }) {
  const palette = ["#1565c0", "#19324f", "#c62828", "#16814b", "#d27a00", "#7b3fa1"];
  return <section className="properties-form graphic-properties" aria-label="Drawing graphic properties">
    <label>Name / tag<input defaultValue={graphic.name} key={`${graphic.id}:${graphic.name}`} maxLength={80} onBlur={(event) => onChange({ name: event.target.value })} /></label>
    {!graphic.points && <fieldset className="graphic-geometry"><legend>Exact geometry</legend>{(["x1", "y1", "x2", "y2"] as const).map((key) => <label key={key}>{key.toUpperCase()}<input type="number" step="1" defaultValue={graphic[key]} key={`${graphic.id}:${key}:${graphic[key]}`} onBlur={(event) => { if (!event.currentTarget.value.trim()) return; const value = Number(event.currentTarget.value); if (!Number.isFinite(value)) return; const next = { x1: graphic.x1, y1: graphic.y1, x2: graphic.x2, y2: graphic.y2, [key]: value }; onGeometryChange(next.x1, next.y1, next.x2, next.y2); }} /></label>)}</fieldset>}
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
    <StackControls capabilities={stackCapabilities} onChange={onStackChange} groupHint={selectionCount > 1 ? "Moves the selected shapes together." : undefined} />
    <button type="button" onClick={onMakeComponent}>{selectionCount > 1 ? `Make symbol from ${selectionCount} graphics` : "Make component symbol"}</button>
    <button type="button" onClick={onDuplicate}>Duplicate drawing graphic</button>
    <button className="remove-component" onClick={onRemove}>Remove drawing graphic</button>
  </section>;
}

function StackControls({ capabilities, onChange, groupHint }: { capabilities: GraphicStackCapabilities; onChange: (order: GraphicStackOrder) => void; groupHint?: string }) {
  return <fieldset className="graphic-geometry graphic-stack-controls"><legend>Drafting order</legend>{groupHint && <small>{groupHint}</small>}
    <button type="button" disabled={!capabilities.back} onClick={() => onChange("back")}>Send to back</button>
    <button type="button" disabled={!capabilities.backward} onClick={() => onChange("backward")}>Lower one step</button>
    <button type="button" disabled={!capabilities.forward} onClick={() => onChange("forward")}>Raise one step</button>
    <button type="button" disabled={!capabilities.front} onClick={() => onChange("front")}>Bring to front</button>
  </fieldset>;
}

function ProjectReports({ projectName, sheetName, sheetReport, projectReport, onExport, onClose }: { projectName: string; sheetName: string; sheetReport: ProjectReport; projectReport: ProjectReport; onExport: (section: ReportSection, scope: "sheet" | "project") => void; onClose: () => void }) {
  const [scope, setScope] = useState<"sheet" | "project">("sheet");
  const report = scope === "project" ? projectReport : sheetReport;
  const projectScope = scope === "project";
  return <section className="report-panel" aria-label="Engineering reports">
    <div className="report-heading">
      <div><strong>Engineering reports</strong><span>{projectScope ? projectName : sheetName}</span></div>
      <div className="report-actions">
        <button type="button" aria-pressed={!projectScope} onClick={() => setScope("sheet")}>Active sheet</button>
        <button type="button" aria-pressed={projectScope} onClick={() => setScope("project")}>Entire project</button>
        <button onClick={() => onExport("bom", scope)}>Export BOM CSV</button>
        <button onClick={() => onExport("wires", scope)}>Export wires CSV</button>
        <button onClick={() => onExport("terminals", scope)}>Export terminals CSV</button>
        {projectScope && <button onClick={() => onExport("cables", "project")}>Export cable schedule CSV</button>}
        <button onClick={() => onExport("validation", scope)}>Export validation CSV</button>
        <button onClick={onClose}>Close reports</button>
      </div>
    </div>
    <div className="report-grid">
      <ReportTable title="Bill of materials" headers={["Component", "Category", "Qty", "References"]} rows={report.bom.map((line) => [line.component, line.category, String(line.quantity), line.references.join(", ")])} />
      <ReportTable title="Wire list" {...wireReportTable(report)} />
      {projectScope && <ReportTable title="Cable schedule" {...cableScheduleTable(report)} />}
      <ReportTable title="Electrical validation" emptyMessage="No topology findings in this scope." {...electricalValidationTable(report)} />
      <ReportTable title="Terminal list" headers={projectScope ? ["Sheet", "Reference", "Terminal", "Kind", "Direction"] : ["Reference", "Terminal", "Kind", "Direction"]} rows={report.terminals.map((line) => projectScope ? [line.sheet ?? "", line.reference, line.terminal, line.kind, line.direction] : [line.reference, line.terminal, line.kind, line.direction])} />
    </div>
  </section>;
}

function ReportTable({ title, headers, rows, emptyMessage = "No entries in this scope." }: { title: string; headers: string[]; rows: string[][]; emptyMessage?: string }) {
  return <section className="report-table-section"><strong>{title}</strong><div className="report-table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>{emptyMessage}</td></tr>}</tbody></table></div></section>;
}



