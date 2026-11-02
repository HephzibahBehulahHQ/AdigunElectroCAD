# Nominal PT100 resistance model

The PT100 component now uses the Callendar–Van Dusen nominal platinum curve instead of a constant linear coefficient. Coefficients A = 3.9083×10⁻³, B = −5.775×10⁻⁷ and C = −4.183×10⁻¹² are documented in the [NI SCXI-1503 manual](https://docs-be.ni.com/bundle/374271a/raw/resource/enus/374271a.pdf). Independent rounded resistance checkpoints come from the [SAB Bröckskes PT100 table](https://www.sab-cable.com/cables-wires-harnessing-temperature-measurement/technical-data/temperature-measurement-technical-data-instructions/resistance-thermometers/basic-values-of-the-rtds.html).

For nonnegative temperature t, resistance is 100(1 + At + Bt²) Ω. Below zero it also includes 100C(t − 100)t³. The supported nominal curve runs from −200 to 850 °C; zero gives exactly 100 Ω. At 500 °C the result is approximately 280.98 Ω rather than the former linear approximation's 292.5 Ω. This curve does not establish the operating range or accuracy class of a particular physical probe.

The displayed resistance and SIG output use the same calculation. The existing signal contract remains ohms. Numeric comparators can consume it; the 4–20 mA ADC is not an RTD input and must not receive an ohm signal directly. Finite numeric temperatures within the supported range are required. Invalid values show an error and use draft #65's signal-fault propagation to suppress downstream modeled outputs. Correcting the input clears the derived fault on the next evaluation. Saved design properties are unchanged by evaluation.

Tests compare eight rounded published checkpoints from −200 through 850 °C, check monotonic behavior and exact zero-temperature resistance, reject invalid/malformed inputs, and exercise a wired PT100 → comparator → coil chain. Its 285 Ω threshold distinguishes the corrected 500 °C curve from the previous approximation. The chain also covers fault suppression and recovery without saved-design mutation.

The local workspace's 291 tests and production build passed; it also contains separate draft work. Browser checks displayed 107.79 Ω at 20 °C, 18.52 Ω at −200 °C, 280.98 Ω at 500 °C and 390.48 Ω at 850 °C. At −201 °C the panel showed a supported-range error. Undo and reload restored the original two-sheet project.

This is a nominal sensor transfer function. Probe calibration, tolerance classes, lead resistance/three-wire compensation, excitation and self-heating, thermal dynamics, physical current solving and inverse temperature conversion are not modeled. Production behavior remains unverified.
