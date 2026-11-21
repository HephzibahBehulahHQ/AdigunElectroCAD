# Component symbol audit

The automated inventory covers 587 catalog definitions, including 102 selectable definitions and the definitions retained for saved-project compatibility. Every declared terminal resolves to a unique finite anchor, and every definition resolves to symbol artwork or its user-drawn rendering path. These checks establish renderer and anchor coverage. Inspection of lead-to-anchor coincidence, manufacturer pinouts, and live state for every family remains open.

| Electrical family | Definitions | Selectable | Symbol and anchor coverage |
| --- | ---: | ---: | ---: |
| Power supply | 36 | 4 | 36 / 36 |
| Circuit breakers | 43 | 3 | 43 / 43 |
| Contactors and starters | 3 | 3 | 3 / 3 |
| Protection devices | 37 | 2 | 37 / 37 |
| Motors | 45 | 6 | 45 / 45 |
| Switches and pushbuttons | 38 | 3 | 38 / 38 |
| Logic and control | 20 | 20 | 20 / 20 |
| Advanced sensors and instrumentation | 11 | 11 | 11 / 11 |
| Pneumatics and hydraulics | 9 | 9 | 9 / 9 |
| HVAC | 6 | 6 | 6 / 6 |
| Solar and renewable energy | 5 | 5 | 5 / 5 |
| Safety and monitoring | 6 | 6 | 6 / 6 |
| Distribution and panel hardware | 7 | 7 | 7 / 7 |
| Wiring and cables | 4 | 4 | 4 / 4 |
| Relays | 46 | 1 | 46 / 46 |
| Transformers | 31 | 1 | 31 / 31 |
| Sensors | 36 | 1 | 36 / 36 |
| PLC and I/O | 36 | 1 | 36 / 36 |
| Timers and counters | 33 | 1 | 33 / 33 |
| Terminal blocks | 37 | 2 | 37 / 37 |
| Measuring and indication | 26 | 1 | 26 / 26 |
| Drives and power electronics | 33 | 1 | 33 / 33 |
| Industrial loads and actuators | 36 | 1 | 36 / 36 |
| Safety and signalling | 1 | 1 | 1 / 1 |
| User symbols | 2 | 2 | 2 / 2 |

The three-pole contactor checkpoint draws linked poles at the existing power anchors and preserves the coil and auxiliary anchors and electrical IDs. Library thumbnails and details reuse the schematic artwork. Detailed previews include terminal designations, and the selected device retains the existing placement controls.

The synthetic performance check indexes 100,000 generated records in test code. One local run indexed them in 44 ms, found an exact order token in 10 ms, and rendered one 40-record category page in 14 ms. These are local server-render timings. Synthetic records contribute zero production parts. Manufacturer identities and ratings require a separate source audit, and this increment adds no manufacturer-verified part records.

Remaining acceptance includes visual and terminal geometry verification family by family, manufacturer provenance by order number, and browser checks for rotation, simulation states and export.

The deployed analog loopback on `968c7bc` loaded in the editor. With simulation running, PLC1 displayed `AI0 0` and `Q0 ON` for `EQ AI0 0; OUT Q0`. Stop and Undo restored the blank test canvas.

On production release `e0eedd9`, the existing Insert command placed a three-phase supply and a generic variable-frequency drive selected through the catalog. Wiring connected supply L1 to drive L1. Wire Properties changed the conductor to `#1565c0` and reconnected its target to drive L2. Editing X moved the drive from 180 to 367 drawing units. After browser reload and File → Load local save, the canvas still showed the drive at X 367, Y 280, and the wire inspector showed the saved color and both terminal IDs. This was a local drafting check with one conductor. Full three-phase operation and pointer drag were outside this check.

On production release `ae8edae` (bundle `index-DAUfie8n.js`), the editable three-phase VFD feeder ran at a 25 Hz command and showed 750 rpm at M1. Removing `L2_VFD` and restarting produced `INPUT SUPPLY INCOMPLETE` at U1 and `STANDBY` at M1. Undo restored the conductor and the motor returned to 750 rpm. Stop and Undo restored the blank workspace. This verifies the generic feeder's simulated frequency and phase continuity through the deployed editor.

Production browser checks on release `26e070c` verified the wired pilot circuit. START closed its blade and lit the lamp; STOP opened its blade and extinguished the lamp; releasing STOP relit it with START held. Stop restored both default blades. Exact order-number search opened the Siemens contactor preview with coil and auxiliary terminal designations, and the wired Siemens DOL example changed KM1 from de-energized to energized on START. The browser check also exposed crowded vertical pole designations, addressed by fitting their labels to the pole pitch in the preview and canvas.
