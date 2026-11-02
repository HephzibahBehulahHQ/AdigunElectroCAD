# AdigunElectroCAD help

## Table of contents

- [The live co-pilot](#the-live-co-pilot)
- [Graphical PLC programming](#graphical-plc-programming)
- [Wiring signals](#wiring-signals)
- [Saving and recovery](#saving-and-recovery)

## The live co-pilot

Open **Adigun BOT** in the header. Its panel sits in the Properties column and leaves the drawing accessible. Toggle **Live co-pilot** to enable or disable proactive offers. A small inline offer can appear while the full panel is closed; open it or dismiss it without interrupting the canvas.

The current co-pilot uses local canvas rules. It receives design changes with a short debounce, tracks the latest placement/move/wire/delete, and displays the selected component's current model result and simulation state. It can identify an unwired coil input, an AND gate with one connected input, multiple output drivers, topology errors and a timer output left unconnected for 20 seconds. Unwired model inputs may still use manual parameters; a missing wire alone is not proof that an output can never turn on. The co-pilot does not certify physical power, grounding or safety.

Proactive offers wait until editing is quiet. They are suppressed during pointer operations or focused text/control editing and are spaced at least 25 seconds apart. Dismissed findings stay suppressed for the current project session. **Inspect current sheet** requests an immediate supported check.

The unconnected-timer check counts continuous observation on the current sheet. Connecting its output, removing the timer, switching sheets or turning live assistance off resets the observation interval. Re-enabling starts a fresh interval; time spent disabled does not count as being stuck.

An offered wire fix names its source and destination and previews that one wire will be added. **Accept wire fix** applies it only after checking that the sheet still matches the preview and that the proposed topology is valid. A stale or invalid preview leaves the original sheet unchanged; use **Refresh preview** to review the current sheet. **Undo** reverses a successfully applied fix. No components or existing wires are changed by this fix. The co-pilot offers a source only when exactly one unused compatible Boolean output exists; choosing the intended circuit remains the user's decision. **Tell me more** explains the evidence behind an offer.

Guests can receive explanations, preview offers and apply a fix to the canvas. Bot edits never auto-save. Autosave remains paused until an explicit save; saving Bot edits to local storage or cloud requires a permanent signed-in account. Sign in, then use File → Save locally or Save to cloud. Closing or refreshing without saving can discard those edits.

Enter **Project goal** and choose **Remember project goal** to keep an answer for this project during the current session. Select a component and choose **What does this do?**, or ask about it in **Ask about this canvas**, to see its catalog explanation, actual connected terminals and live result. Goals and dismissals reset on page refresh. A secure generative AI service is not configured: broad natural-language planning, automatic multi-component completion and general intent inference remain unsupported. The panel identifies this limitation rather than pretending to provide those capabilities.

## Graphical PLC programming

See [PLC programs](PLC-PROGRAMS.md) for contact/coil editing, branch compilation, numeric registers, supported instructions and execution limits. Apply a graphical draft to commit it; ordinary draft changes do not alter the running design until Apply.

## Wiring signals

One modeled signal output can drive multiple compatible inputs. Multiple modeled outputs on the same wire net are unsupported, even when their present values match. The connection and import validators reject these nets, including indirect connections through bidirectional control terminals. Use separate inputs of an appropriate processing block to combine signals. This signal rule does not reject parallel power contactors and does not certify physical wiring, protection or safety.

## Saving and recovery

See [local recovery](LOCAL-RECOVERY.md) for current/previous saves and [cloud project selection](CLOUD-PROJECT-SELECTION.md) for account-scoped cloud IDs. Cloud authentication and verification boundaries are recorded in [auth/RLS verification](AUTH-RLS-VERIFICATION-2026-11-02.md).
