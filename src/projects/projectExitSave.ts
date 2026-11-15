/** Warn before discarding unsaved work and clear transient workspace state when the page exits or is restored from browser history. */
export function bindProjectExitPrompt(
  events: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  hasUnsavedWork: () => boolean,
  resetWorkspace: () => void = () => undefined,
): () => void {
  const warn = (event: Event) => {
    if (!hasUnsavedWork()) return;
    event.preventDefault();
    (event as BeforeUnloadEvent).returnValue = "";
  };
  const clearOnExit = () => resetWorkspace();
  const clearRestoredPage = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) resetWorkspace();
  };
  events.addEventListener("beforeunload", warn);
  events.addEventListener("pagehide", clearOnExit);
  events.addEventListener("pageshow", clearRestoredPage);
  return () => {
    events.removeEventListener("beforeunload", warn);
    events.removeEventListener("pagehide", clearOnExit);
    events.removeEventListener("pageshow", clearRestoredPage);
  };
}