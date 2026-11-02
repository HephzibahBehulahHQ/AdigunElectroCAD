# Boolean PLC program execution

Placed PLC digital I/O modules support two Boolean inputs (`I0`, `I1`) and one output (`Q0`). Connect control wires to I0/I1 and use Q0 to command a relay, actuator or contactor. Enter a Program in the property panel and press Run. Each 100 ms runtime scan samples the converged wired inputs, executes instructions in order, and retains Q0 for the next scan. Pause retains state; Stop clears runtime Q0. Editing the design resets runtime state.

An empty Program retains the existing manual Output mode. Nonempty programs begin with Q0 off and ignore manual Output. Invalid programs force Q0 off and display an error in the live I/O result.

Use **Operate** controls above the selected component's design properties to change live Boolean parameters while retaining scan memory. For example, toggle a sensor's **Live Detected** input for START and the PLC's unwired **Live Input B** for STOP. Wired input signals override local parameters. These controls change only the runtime document; Stop discards their changes and restores the configured design. Design-property edits continue to reset runtime state.

Supported instructions are `LD`, `LDN`, `AND`, `ANDN`, `OR`, `ORN`, `XOR`, `OUT`, `SET` and `RESET`. Separate instructions with semicolons. Logic instructions read I0, I1 or Q0; output instructions write Q0. LD/LDN must precede logic or output operations. SET and RESET share Q0; later instructions take priority. The interpreter accepts at most 32 instructions; the property editor accepts up to 80 characters.

Start/stop holding circuit, with I0 as START and I1 as STOP:

```text
LD I0; OR Q0; ANDN I1; OUT Q0
```

Shared set/reset output, with reset priority:

```text
LD I0; SET Q0; LD I1; RESET Q0
```

This is a limited educational instruction interpreter. It does not provide a full IEC 61131-3 language implementation, graphical ladder programming, vendor execution compatibility, physical I/O voltages, or safety-controller certification.

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

At 4 mA D0 is 0; at 12 mA it is 50; at 20 mA it is 100. The runtime I/O result displays registers mentioned in the program, rounded to eight significant digits for readability. Calculation uses JavaScript floating-point numbers, not a vendor-specific integer or REAL format; exact decimal equality is subject to floating-point rounding. Values must be finite with magnitude at most Number.MAX_SAFE_INTEGER. Division by zero, overflow, unknown registers or malformed instructions force Q0 off and preserve the previous scan's register bank without committing partial writes. The error appears in the I/O result.

Automated tests cover all four operations, retained state, signed decimal operands, invalid destinations/operands, division faults and overflow. A wired transmitter → ADC → PLC arithmetic → coil test sweeps 0/25/50/75/100 percent, verifies output transitions, Pause retention and reset, and confirms the saved design is unchanged. Production arithmetic interaction remains to be verified.
