# Educational dual-channel reset model

Both safety relay catalog models start inhibited. Run the clock with both channels healthy and Reset released, then press Reset to enable the output. Releasing Reset retains enable. Opening either channel clears enable and reset readiness; restoring the channel cannot restart the output. Reset held during startup or channel recovery is rejected. Release Reset with both channels healthy and press it again to re-enable.

Catalog relay channel inputs are S11/S12; the functional dual relay uses IN A/IN B. Both models have a RESET control input. Boolean source wires override local channel/reset parameters. The output can command another Boolean block, relay, actuator or contactor. Use the selected component's live Operate controls to change unwired parameters without resetting the whole simulation. Live channel faults clear enable even while the clock is paused.

The runtime samples reset transitions at 100 ms. Stop discards runtime memory and leaves the relay inhibited. Saved design parameters remain unchanged by live operations.

This model does not simulate physical contact redundancy, welded-contact detection, feedback/EDM, cross-circuit faults, channel discrepancy timing, physical reset wiring voltages, or a certified safety category, PL or SIL. Its enable output is an educational Boolean signal.
