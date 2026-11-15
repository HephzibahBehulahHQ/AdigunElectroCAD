import { expect, it } from "vitest";
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

it("removes the warning listener when the app releases it", () => {
  const events = new EventTarget();
  const release = bindProjectExitPrompt(events, () => true);
  release();
  const exit = new Event("beforeunload", { cancelable: true });
  events.dispatchEvent(exit);
  expect(exit.defaultPrevented).toBe(false);
});