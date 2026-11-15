/** Attach the browser's native unsaved-work warning to refresh and tab close. */
export function bindProjectExitPrompt(events: Pick<EventTarget, "addEventListener" | "removeEventListener">, hasUnsavedWork: () => boolean): () => void {
  const warn = (event: Event) => {
    if (!hasUnsavedWork()) return;
    event.preventDefault();
    (event as BeforeUnloadEvent).returnValue = "";
  };
  events.addEventListener("beforeunload", warn);
  return () => events.removeEventListener("beforeunload", warn);
}