# Boolean PLC program execution

Placed PLC digital I/O modules support two Boolean inputs (`I0`, `I1`) and one output (`Q0`). Connect control wires to I0/I1 and use Q0 to command a relay, actuator or contactor. Enter a Program in the property panel and press Run. Each 100 ms runtime scan samples the converged wired inputs, executes instructions in order, and retains Q0 for the next scan. Pause retains state; Stop clears runtime Q0. Editing the design resets runtime state.

An empty Program retains the existing manual Output mode. Nonempty programs begin with Q0 off and ignore manual Output. Invalid programs force Q0 off and display an error in the live I/O result.

Use **Operate** controls above the selected component's design properties to change live Boolean parameters while retaining scan memory. For example, toggle a sensor's **Live Detected** input for START and the PLC's unwired **Live Input B** for STOP. Wired input signals override local parameters. These controls change only the runtime document; Stop discards their changes and restores the configured design. Design-property edits continue to reset runtime state.

Supported Boolean instructions are `LD`, `LDN`, `AND`, `ANDN`, `OR`, `ORN`, `XOR`, `OUT`, `SET` and `RESET`. Separate instructions with semicolons. Logic instructions read I0, I1 or Q0; output instructions write Q0. LD/LDN must precede logic or output operations. SET and RESET share Q0; later instructions take priority. The interpreter accepts at most 32 instructions; the Program property editor accepts up to 2048 characters.

Start/stop holding circuit, with I0 as START and I1 as STOP:

```text
LD I0; OR Q0; ANDN I1; OUT Q0
```

Shared set/reset output, with reset priority:

```text
LD I0; SET Q0; LD I1; RESET Q0
```

This is a limited educational instruction interpreter. It does not provide a full IEC 61131-3 language implementation, vendor execution compatibility, physical I/O voltages, or safety-controller certification.

## Input transition contacts

`LDP I0` / `LDP I1` load a rising-edge pulse; `LDF I0` / `LDF I1` load a falling-edge pulse. Each compares the current sampled Boolean input against that module's previous scan. The result lasts one positive-time scan. For example, `LDP I0; OUT Q0` drives a wired output coil for one scan when I0 changes from false to true. A held input does not repeat the pulse. Combine the result with Boolean instructions, or use SET Q0 to latch it until a separate reset rung.

Both inputs initially have false history, so an input already true on the first scan produces a rising pulse; an initially false input does not produce a falling pulse. Pause preserves history and any current pulse. Transitions that occur entirely between scans are not detected. Stop/design reset clears history. Repeated edge reads in one scan use the same snapshot, and each PLC module retains its own history. Edge contacts accept only I0/I1, not Q0, analog inputs or numeric registers. ANDP/ANDF and ORP/ORF combine a rising/falling pulse with the existing accumulator using AND or OR; they require a preceding load instruction.

The graphical editor offers Rising edge and Falling edge alongside NO/NC. Edge contacts can appear in series stages or parallel branches and compile to the matching load/AND/OR transition instruction. Their symbols show an up/down arrow between the contact bars. Selecting an edge on a Q0 contact changes its address to I0; Q0 remains unavailable until the type returns to NO/NC. Apply saves one undoable program edit. Existing edge programs import only when their exact branch structure is representable by the editor. Automated tests cover compiler/import round trips and series/parallel transition truth tables.

Local desktop browser checks selected Rising edge on the Q0 feedback contact: the address changed to I0, Q0 became unavailable and the draft compiled to `LD I0; ORP I0; ANDN I1; OUT Q0`. Apply saved that program. Changing to Falling edge saved ORF, and Undo restored ORP and the Rising edge selection. The arrow, input labels and separate contact controls were readable in the checked diagram; its horizontal scrolling stayed inside the properties panel. Verification also found and fixed a stale Program text field after graphical Apply: property inputs now refresh when their saved component/value changes. The final Undo actions removed the test edits and temporary sheet from the rendered project.

Responsive browser checks at 390 × 844 and 320 × 740 verified readable transition controls and diagram arrows. Mobile Apply saved `LDP I0; OR Q0; ANDN I1; OUT Q0`. A classic vertical scrollbar exposed a page overflow at 320px: the body's 320px minimum exceeded the 305px available content width. Removing that forced minimum produced scrollWidth = clientWidth (305px at a 320px viewport; 375px at 390px). Contact labels had a measured 6px gap and stayed inside the viewport. At 390px the five utility buttons were 40px squares separated by 12px. Diagram/tool scrolling remained local to their panels. Viewport overrides were reset afterward. Actual touch gestures and production rendering remain unverified.

Cleanup verification found that closing immediately after Undo could precede the 650ms local autosave, leaving a temporary test sheet in the saved preview. An export was preserved, the known test-only sheet was removed from a recovery copy, and that copy was imported and explicitly saved locally. Reload then confirmed the original two sheets. No cloud project was changed. Automatic saving on immediate tab close remains a separate open data-preservation issue.

Automated transition tests cover both addresses, rising/falling truth tables, repeated reads, invalid instructions, wired input precedence, one-scan wired coil pulses, pause, reset and preservation of the saved design. Draft #63's initial text-contact CI passed. After adding graphical contacts, the local workspace's 245 tests and production build passed; that workspace also includes draft #62 UI changes.

Local browser verification used the wired PLC sensor/actuator example. With `LDP I0; SET Q0; LD I1; RESET Q0`, initially high I0 latched Q0 ON. Raising I1 reset Q0; releasing I1 with I0 still high kept Q0 OFF. With LDF in the same program, initially high I0 kept Q0 OFF; switching the wired sensor low latched Q0 ON and the downstream actuator reported EXTENDED. Resetting and releasing I1 with I0 still low kept Q0 OFF. Stop restored the configured sensor input and Q0 OFF. Three Undo actions removed both test program edits and the temporary sheet, restoring the prior two-sheet project. These checks verify sampled edge/latch behavior; browser timing of an unlatched 100 ms pulse, Pause during a pulse, mobile operation and production behavior remain unverified.

## Graphical contact/coil editor

Select a placed PLC on a free sheet and open Graphical ladder in its properties panel. The editor supports one to four rungs, each with up to four series stages. A stage can contain up to four parallel NO/NC, rising/falling edge, or numeric comparison contacts. Boolean contacts read I0, I1 or retained Q0; comparisons use AI0 or D0–D7 against AI0, D0–D7 or a numeric constant. Choose an output, set or reset Q0 coil per rung. Later rungs take priority. The diagram shows the actual branch structure. When live PLC state is available, green contact paths preview which branches conduct on the next scan using the latest inputs, retained Q0, edge history and numeric state. This is a logic preview, not electrical power flow or a substitute for the next PLC scan.

Add/remove contacts, stages and rungs to edit a draft. Apply ladder program compiles the draft into the same Program executed by the PLC runtime and commits one undoable design edit. Discard ladder draft restores the saved Program. Design edits reset simulation memory. The 32-instruction limit still applies, so large branch combinations can be rejected before Apply. The diagram scrolls within its panel when wider than the available space.

Existing programs are imported only when the editor can reproduce their exact instruction order. Arithmetic, XOR, arbitrary instruction combinations and ambiguous precedence remain in the text editor. Create ladder draft prepares a replacement without modifying the saved Program; only Apply replaces it. For example, the holding circuit above becomes a parallel I0/Q0 stage followed in series by NC I1 and an output Q0 coil.

Compiled parallel groups after the first series stage use PUSH, a new LD/LDN expression, and ANDPOP. The text interpreter also supports ORPOP. These no-operand Boolean stack instructions require an initialized accumulator, a balanced stack and at most eight nested levels. Invalid branch instructions force Q0 off. The graphical editor accepts its own canonical contact/coil subset and rejects other stack layouts rather than guessing their meaning.

Automated tests cover branch truth tables, exact import/compile round trips, rejection of ambiguous text, reset priority, instruction limits and a compiled start/stop ladder driving a wired coil through start/release/stop/release. Production release 672dfc36 was checked by adding a parallel I0 contact to the second stage of the holding ladder. Apply saved the matching PUSH/LDN/OR/ANDPOP program. One Undo restored the original program; Redo restored the branch. Run energized Q0, releasing the wired sensor retained Q0, and Input B stopped it. The checked diagram had no overlapping text labels or page-level horizontal overflow; its 370px diagram scrolled inside a 263px preview. This is not exhaustive coverage of all rung sizes or mobile layouts.

## Analog threshold input

AI0 accepts the ADC block's `plc-raw` output (integer 0–27648). Wire a level sensor's 4–20 mA signal to ADC IN, ADC OUT to PLC AI0 raw, and PLC Q0 to the controlled Boolean block. Four milliamps maps to 0; 12 mA to 13824; 20 mA to 27648.

`GT AI0 13824`, `LT AI0 13824` and `EQ AI0 13824` load a comparison result into the accumulator. Thresholds must be integer raw values in 0–27648. Invalid analog inputs or comparison instructions force Q0 off with an error. For example:

```text
GT AI0 13824; OUT Q0
```

This switches Q0 on above 50% level. AI0 is the only wired analog input. Physical input diagnostics and wire-break/overrange faults remain unimplemented.

Select a placed level sensor and use its **Live Level Percent** slider to change the runtime input from 0 to 100% while scanning continues. The saved level stays unchanged, and Stop restores it. The dedicated analog-level example in the project library includes the complete wired chain.

## Numeric registers and arithmetic

Each placed PLC has eight independent numeric registers, D0–D7. They start at zero, retain values across runtime scans and Pause, and reset on Stop or design edits. MOV source destination copies a value. ADD/SUB/MUL/DIV left right destination perform arithmetic. Operands can be AI0, D0–D7 or signed decimal constants; destinations must be D0–D7. Instructions execute unconditionally in program order. Q0 must still be assigned in every valid program.

GT/LT/EQ can compare a numeric register against another register or constant. Existing direct AI0 comparisons retain their integer raw-threshold range of 0–27648. For example, scale the wired ADC reading to percent before comparing:

```text
DIV AI0 276.48 D0; GT D0 50; OUT Q0
```

At 4 mA D0 is 0; at 12 mA it is 50; at 20 mA it is 100. The PLC watch table displays I0, I1, Q0, all D0–D7 registers, and AI0 when the program references it; numeric values are rounded to eight significant digits for readability. The runtime also retains the latest 25 scan attempts, with the most recent 10 shown in the diagnostics panel. Each row records simulated time, I/O, the register bank, and whether the scan succeeded, faulted, or was inhibited by an upstream signal fault. Stop clears this history; Pause retains it. This is a scan-level snapshot trace, not an instruction-by-instruction trace. Calculation uses JavaScript floating-point numbers, not a vendor-specific integer or REAL format; exact decimal equality is subject to floating-point rounding. Values must be finite with magnitude at most Number.MAX_SAFE_INTEGER. Division by zero, overflow, unknown registers or malformed instructions force Q0 off and preserve the previous scan's register bank without committing partial writes. The error appears in the I/O result.

Automated tests cover all four operations, retained state, signed decimal operands, invalid destinations/operands, division faults and overflow. A wired transmitter → ADC → PLC arithmetic → coil test sweeps 0/25/50/75/100 percent, verifies output transitions, Pause retention and reset, and confirms the saved design is unchanged. Production release 2b350ccd was checked with the scaling program above: 50 percent showed AI0 13824/D0 50/Q0 OFF; 100 percent showed AI0 27648/D0 100/Q0 ON and the wired coil ON; zero showed AI0 0/D0 0/Q0 OFF. Stop restored design AI0 13824 with D0 zero. A division-by-zero program displayed its error and held Q0 OFF. These checks do not cover every arithmetic operation in the browser.

A wired input evaluation fault (including upstream model errors or incompatible signal units) inhibits the PLC scan: Q0 is cleared and D0–D7 and edge-history state are preserved. No instruction executes against stale analog values or substituted Boolean values. After the input becomes valid, scanning resumes from the retained register bank; Q0 is determined by the program. The bottom fault summary shows the affected PLC's current I/O state and registers referenced by its program alongside the error; it is not a historical trace. This is an educational fault response, not a certified safety-controller restart interlock. Automated digital/analog input tests cover three faulted scans, downstream error propagation, and recovery without hidden register increments.

Production release b3486f4 was checked through the visible editor on 2026-11-03 with a temporary imported Divide → comparator → PLC → output-coil circuit. Division by zero displayed a PLC signal fault and propagated the error to the coil. After correcting the divisor and restarting, the PLC displayed I0 ON / Q0 ON / D0 advancing and the coil displayed ON. Undo restored the fault; a second Undo and reload restored the original 14-sheet project. The current local model output keeps the PLC I/O and retained registers visible with the wired-fault error; automated coverage verifies this rendering. Production browser verification of the updated fault display is pending. The numeric design edit resets scan state; it does not establish live retained-state recovery. No cloud save was performed.

## On-delay timers

`TON T0 0.2` through `TON T3 0.2` update one of four per-PLC timers. The Boolean accumulator before TON is the enable input. While enabled, elapsed time (ET) increases by the simulation scan step; when disabled, ET and done reset. The timer's done bit becomes true when ET reaches its non-negative preset in seconds. `LD T0` and the other Boolean instructions can read T0–T3 as done contacts. A timer instruction does not assign Q0, so every valid program still needs an OUT, SET or RESET Q0 instruction. Each timer may have at most one TON coil per program scan. Timer state is retained through Pause, cleared by Stop/design reset, and shown as Tn.Q and Tn.ET in the PLC watch table when referenced. If a later instruction faults, Q0 is forced off and register and timer updates from that scan are not committed. An upstream wired input fault inhibits the scan and preserves retained timer state. This bounded educational timer model follows the simulation clock; it is not a vendor-specific IEC timer implementation or safety-rated controller. Automated coverage verifies accumulation, done contacts, reset, ladder round-trip/preview, runtime persistence, and fault rollback; direct production browser verification remains pending.

