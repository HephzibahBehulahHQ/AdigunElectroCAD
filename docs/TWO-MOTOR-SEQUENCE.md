# Two-motor staggered starter

The dedicated library project connects a shared three-phase source and Q1 breaker to two actual KM/F/M branches. A fresh START edge latches PLC Q0; M1 starts immediately and M2 follows after a three-second on-delay. STOP, opening Q1 or manually tripping either overload removes the shared run permit. Restoring the permit while START remains held cannot restart either motor: release START, then press it again.

Q1's `Q CLOSED` terminal is logical state feedback, not a claim that every catalog breaker includes a physical auxiliary accessory. The overload's main sensing paths remain conductive when tripped; its NC permit opens and drops the contactors. Removing any required motor phase prevents that branch from running despite its control command.

The project uses explicit educational assumptions: 400 V/50 Hz source; 32 A Q1; 18 A contactors with 24 V coil metadata; two 7.5 kW, 1440 rpm, 15.2 A nominal motors; and 15.2 A overload settings. These are example values, not manufacturer selections or a verified protection-coordination study. Control signals are Boolean; coil-voltage/return circuits, thermal trip curves, acceleration, load torque and physical commissioning are not modeled here. Protective-earth continuity is not part of this project's execution model.

Saved wire bend points now drive orthogonal rendering. Vertical power-terminal layout is opt-in per instance, preserving older project anchor layouts. Power conductors use solid dark red and controls use dashed purple; these styles distinguish conductor types and do not show live energization.

Automated coverage includes timed start, STOP/release, held-START breaker restoration, independent overload trips/reset, missing motor phase, all declared library sequence steps, saved-design immutability and rotated/moved anchors. A geometry regression checks route clearance around component bodies and labels. In the local browser, M1 started first, M2 changed from standby to running after the delay, and opening Q1 stopped both. Closing Q1 with START held left both in standby.
