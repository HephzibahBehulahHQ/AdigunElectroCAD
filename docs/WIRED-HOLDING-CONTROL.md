# Wired START/STOP holding starter

This free-sheet example uses an isolated ideal 230 V AC control source. Actual wires through STOP, overload 95–96 and START connect A1; A2 must return to the same supply. Contactor 13–14 closes with its coil and holds the path after START is released. The contactor main poles gate the separate three-phase motor feed.

Load **Wired START/STOP holding starter** from the project library. Select S1 and check/uncheck **Live Pressed**. KM1 should read **230 V · ENERGIZED** and M1 **1440 rpm / 7.5 kW**. Select S0 and press/release: M1 remains STANDBY. Restart, release START, then trip/reset F1: M1 remains STANDBY until another START. Live controls preserve scan state; editing design parameters or Stop clears it. Saved project parameters are not mutated by runtime operation.

The eight-step recorded sequence checks these motor outputs. Automated regressions additionally remove the A2 return and each holding wire, check a brief overload pulse, reject a coil-rating mismatch and detect a control-source short. Nominal rating equality is required: this increment does not model pickup/dropout thresholds, coil impedance/current, leakage, arc behavior, contact bounce, physical isolation ratings or thermal overload curves. Multiple attached control supplies and unsettled contacts inhibit the evaluated coils and report errors.

The control source is independent of the main breaker. Opening only the main breaker removes motor power but can leave the coil held; restoring that power can restart the motor. Holding START during recovery can also restart this conventional circuit. This is not an anti-restart or safety-rated controller. Reversing interlock contacts remain a separate milestone.

Local browser acceptance verified START/release holding, coil voltage, motor output, STOP/release, and overload trip/reset. Test edits were undone and the original two-sheet local project restored. Wire routes were moved away from the sheet caption and component reference labels. Production acceptance is pending; this document is not proof of live deployment.
