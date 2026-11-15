import { expect, it, vi } from "vitest";
import { bindProjectExitPrompt } from "../src/projects/projectExitSave";

it("warns before unloading only while the canvas has unsaved work", () => {
  const events = new EventTarget();
  let hasUnsavedWork = false;
  const release = bindProjectExitPrompt(events, () => hasUnsavedWork);
  const cleanExit = new Event("beforeunload", { cancelable: true });
  events.dispatchEvent(cleanExit);
  expect(cleanExit.defaultPrevented).toBe(false);

  hasUnsavedWork = true;
  const unsavedExit = new Event("beforeunload", { cancelable: true });
  events.dispatchEvent(unsavedExit);
  expect(unsavedExit.defaultPrevented).toBe(true);
  release();
});

it("clears the transient canvas after the browser accepts a page exit", () => {
  const events = new EventTarget();
  const reset = vi.fn();
  const release = bindProjectExitPrompt(events, () => false, reset);

  events.dispatchEvent(new Event("pagehide"));
  expect(reset).toHaveBeenCalledOnce();
  release();
});

it("clears transient workspace when browser history restores a cached page", () => {
  const events = new EventTarget();
  const reset = vi.fn();
  const release = bindProjectExitPrompt(events, () => false, reset);

  const ordinaryLoad = new Event("pageshow");
  Object.defineProperty(ordinaryLoad, "persisted", { value: false });
  events.dispatchEvent(ordinaryLoad);
  expect(reset).not.toHaveBeenCalled();

  const restoredLoad = new Event("pageshow");
  Object.defineProperty(restoredLoad, "persisted", { value: true });
  events.dispatchEvent(restoredLoad);
  expect(reset).toHaveBeenCalledOnce();
  release();
});

it("removes unload, exit, and restore listeners when the app releases them", () => {
  const events = new EventTarget();
  const reset = vi.fn();
  const release = bindProjectExitPrompt(events, () => true, reset);
  release();

  const exit = new Event("beforeunload", { cancelable: true });
  events.dispatchEvent(exit);
  events.dispatchEvent(new Event("pagehide"));
  const restoredLoad = new Event("pageshow");
  Object.defineProperty(restoredLoad, "persisted", { value: true });
  events.dispatchEvent(restoredLoad);
  expect(exit.defaultPrevented).toBe(false);
  expect(reset).not.toHaveBeenCalled();
});
