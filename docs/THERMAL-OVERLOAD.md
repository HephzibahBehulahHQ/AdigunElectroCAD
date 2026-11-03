# Current-driven thermal overload — implementation in progress

The thermal primitive is implemented and tested; it is **not yet connected to the application circuit clock, feeder current, inspector or project library**. Production retains manual overload trip/reset until that integration is complete and verified. M04a remains open.

## Model contract

The educational model retains normalized heat `h`; `h = 1` is the trip threshold. With a constant RMS current, the steady thermal target is `q = (I / settingA / overloadFactor)^2`. The exact interval update is `h(t + dt) = q + (h(t) - q) exp(-dt / tau)`. Heating uses `heatingTimeSeconds`; zero-current cooling uses `coolingTimeSeconds`. A factor of one permits rated current indefinitely without crossing the asymptote. A trip latches until a fresh reset edge is requested with zero current and heat at or below `resetLevel`. A held rejected reset does not become an automatic reset while cooling. Reset retains heat.

`secondsUntilThermalTrip` returns the analytic event time. The circuit integration must stop at that event, open 95–96, settle the wired coils and recalculate current for the remaining interval. The primitive deliberately does not assume a trip breaks the power path: an overload relay cannot interrupt current when its auxiliary contact is bypassed or not wired into the contactor coil.

Parameters are explicit; no manufacturer calibration or IEC trip-class conformity is claimed. This is a single retained thermal state, without separate rotor/stator heating, ambient compensation, phase-unbalance heating, inrush or electromagnetic motor dynamics. ABB's [motor thermal protection operation principle](https://techdoc.relays.protection-control.abb/r/REX615-Technical-Manual/PCL1/en-US/MPTTR-Operation-principle) describes current-squared heating and condition-dependent time constants; it motivates this simplified model but does not validate these application parameters or certify this implementation.

## Evidence and remaining integration

Nine focused tests cover analytic cold/hot trip timing, the rated-current asymptote across repeated intervals, exponential cooling, latched reset rejection, a fresh cool reset, continuing heating when current persists after trip, coarse/fine constant-current agreement and invalid input rejection. The original state is not mutated.

Remaining: trace current through actual supported feeder paths (reject ambiguous parallel paths instead of inventing a split), couple thermal events to control continuity and motor supply, retain/reset runtime fields without changing saved designs, expose heat/current/trip/reset state, add a loadable example, then run regression and local/live acceptance through the configured publication workflow.
