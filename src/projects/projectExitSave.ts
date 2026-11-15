/** Warn before discarding unsaved work and reset transient state if browser history restores a cached page. */
export function bindProjectExitPrompt(
  events: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  hasUnsavedWork: () => boolean,
  resetRestoredWorkspace: () => void = () => undefined,
): () => void {
  const warn = (event: Event) => {
    if (!hasUnsavedWork()) return;
    event.preventDefault();
    (event as BeforeUnloadEvent).returnValue = "";
  };
  const resetCachedPage = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) resetRestoredWorkspace();
  };
  events.addEventListener("beforeunload", warn);
  events.addEventListener("pageshow", resetCachedPage);
  return () => {
    events.removeEventListener("beforeunload", warn);
    events.removeEventListener("pageshow", resetCachedPage);
  };
}