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

This is a limited educational Boolean instruction interpreter. It does not provide a full IEC 61131-3 language implementation, graphical ladder programming, analog PLC registers, vendor execution compatibility, physical I/O voltages, or safety-controller certification.
