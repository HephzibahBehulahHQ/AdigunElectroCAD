import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { botWindowAction, defaultBotWindow, displayedWindow, moveBotWindow, readBotWindow, resizeBotWindow, saveBotWindow, type BotWindowLayout } from "../copilot/windowLayout";
import { loadAccountBotWindow, saveAccountBotWindow } from "../services/botWindowPreferences";

export function FloatingBotWindow({ owner, cloudOwner, activation, onVisibility, children }: { owner: string; cloudOwner: string | null; activation: number; onVisibility: (open: boolean, visible: boolean) => void; children: ReactNode }) {
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const load = () => { try { return readBotWindow(window.localStorage, owner, viewport); } catch { return defaultBotWindow(viewport); } };
  const [layout, setLayout] = useState(load);
  const [layoutOwner, setLayoutOwner] = useState(owner);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const [storageNotice, setStorageNotice] = useState("");
  const [cloudReady, setCloudReady] = useState<string | null>(null);
  const lastCloudLayout = useRef("");
  const cloudQueue = useRef(Promise.resolve());
  const loadedOwner = useRef(owner);
  const surface = useRef<HTMLElement>(null);
  const lastActivation = useRef(activation);
  const gesture = useRef<{ id: number; x: number; y: number; layout: BotWindowLayout; type: "move" | "resize" } | null>(null);
  useEffect(() => { const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight }); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, []);
  useEffect(() => { if (loadedOwner.current !== owner) { loadedOwner.current = owner; setLayout(load()); setLayoutOwner(owner); } }, [owner]);
  useEffect(() => {
    setCloudReady(null); lastCloudLayout.current = "";
    if (!cloudOwner || layoutOwner !== owner) return;
    let active = true;
    const initialVersion = layoutRef.current.updatedAt;
    void loadAccountBotWindow(cloudOwner).then((remote) => {
      if (!active) return;
      lastCloudLayout.current = remote ? JSON.stringify(remote) : "";
      if (remote && layoutRef.current.updatedAt === initialVersion && remote.updatedAt > layoutRef.current.updatedAt) { layoutRef.current = remote; setLayout(remote); }
      setCloudReady(cloudOwner);
    }).catch(() => { if (active) setStorageNotice("Account layout is unavailable; local window controls still work."); });
    return () => { active = false; };
  }, [owner, cloudOwner, layoutOwner]);
  useEffect(() => { if (layoutOwner !== owner) return; const timer = window.setTimeout(() => { try { if (!saveBotWindow(window.localStorage, owner, layout)) setStorageNotice("Window layout is kept for this session because storage is unavailable."); } catch { setStorageNotice("Window layout is kept for this session because storage is unavailable."); } }, 150); return () => window.clearTimeout(timer); }, [layout, owner, layoutOwner]);
  useEffect(() => { const flush = () => { if (layoutOwner === owner) { try { saveBotWindow(window.localStorage, owner, layoutRef.current); } catch { /* The in-memory window remains usable. */ } } }; window.addEventListener("pagehide", flush); return () => window.removeEventListener("pagehide", flush); }, [owner, layoutOwner]);
  useEffect(() => {
    const serialized = JSON.stringify(layout);
    if (!cloudOwner || cloudReady !== cloudOwner || layoutOwner !== owner || !layout.updatedAt || serialized === lastCloudLayout.current) return;
    let active = true;
    const timer = window.setTimeout(() => { cloudQueue.current = cloudQueue.current.catch(() => undefined).then(async () => { if (!active) return; await saveAccountBotWindow(cloudOwner, layout); if (active) lastCloudLayout.current = serialized; }).catch(() => { if (active) setStorageNotice("Account layout could not sync; the local window layout is retained."); }); }, 500);
    return () => { active = false; window.clearTimeout(timer); };
  }, [layout, owner, layoutOwner, cloudOwner, cloudReady]);
  useEffect(() => { if (lastActivation.current !== activation) { lastActivation.current = activation; setLayout((current) => botWindowAction(current, "open", Date.now())); window.requestAnimationFrame(() => surface.current?.querySelector<HTMLInputElement>("[data-bot-question]")?.focus()); } }, [activation]);
  useEffect(() => { onVisibility(layout.open, layout.open && layout.mode !== "minimized"); }, [layout.open, layout.mode, onVisibility]);
  useEffect(() => { if (layout.open && layout.mode !== "minimized") window.requestAnimationFrame(() => surface.current?.querySelector<HTMLInputElement>("[data-bot-question]")?.focus()); }, [layout.open, layout.mode]);
  const action = (kind: Parameters<typeof botWindowAction>[1]) => { setLayout((current) => botWindowAction(current, kind, Date.now())); if (kind === "close") document.getElementById("adigun-bot-launcher")?.focus(); };
  useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && layout.open && !event.defaultPrevented) { event.preventDefault(); action("close"); } }; window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape); }, [layout.open]);
  const start = (event: PointerEvent<HTMLElement>, type: "move" | "resize") => {
    if (event.button !== 0 || (type === "move" && (event.target as HTMLElement).closest("button")) || viewport.width <= 600 || layout.mode === "maximized") return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, layout, type }; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
  };
  const move = (event: PointerEvent<HTMLElement>) => { const current = gesture.current; if (!current || current.id !== event.pointerId) return; const change = current.type === "move" ? moveBotWindow : resizeBotWindow; const next = change(current.layout, viewport, event.clientX - current.x, event.clientY - current.y, Date.now()); layoutRef.current = next; setLayout(next); };
  const end = (event: PointerEvent<HTMLElement>) => { if (gesture.current?.id === event.pointerId) { gesture.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } };
  const rect = displayedWindow(layout, viewport), minimized = layout.mode === "minimized";
  return <aside ref={surface} className={`floating-bot-window ${minimized ? "minimized" : ""}`} role="dialog" aria-modal="false" aria-labelledby="floating-bot-title" hidden={!layout.open} style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
    <header className="floating-bot-titlebar" tabIndex={0} title="Drag to move; arrow keys also move the window" onKeyDown={(event) => { if (event.target !== event.currentTarget) return; const dx = event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0, dy = event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0; if (dx || dy) { event.preventDefault(); setLayout((current) => moveBotWindow(current, viewport, dx, dy, Date.now())); } }} onPointerDown={(event) => start(event, "move")} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <div><strong id="floating-bot-title">Adigun BOT</strong><small>Offline · local assistance</small></div>
      <div className="floating-bot-controls"><button type="button" title={minimized ? "Restore Bot window" : "Minimize Bot window"} aria-label={minimized ? "Restore Bot window" : "Minimize Bot window"} onClick={() => action(minimized ? "restore" : "minimize")}>{minimized ? "▣" : "−"}</button><button type="button" title={layout.mode === "maximized" ? "Restore Bot size" : "Maximize Bot window"} aria-label={layout.mode === "maximized" ? "Restore Bot size" : "Maximize Bot window"} onClick={() => action(layout.mode === "maximized" ? "restore" : "maximize")}>{layout.mode === "maximized" ? "▣" : "□"}</button><button type="button" title="Close Bot window" aria-label="Close Bot window" onClick={() => action("close")}>×</button></div>
    </header>
    <div className="floating-bot-body" hidden={minimized}>{children}{storageNotice && <p role="status">{storageNotice}</p>}</div>
    {!minimized && layout.mode === "normal" && viewport.width > 600 && <button type="button" className="floating-bot-resize" title="Resize Bot window; arrow keys also resize" aria-label="Resize Bot window" onPointerDown={(event) => start(event, "resize")} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={(event) => { const dx = event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0, dy = event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0; if (dx || dy) { event.preventDefault(); setLayout((current) => resizeBotWindow(current, viewport, dx, dy, Date.now())); } }}>◢</button>}
  </aside>;
}
