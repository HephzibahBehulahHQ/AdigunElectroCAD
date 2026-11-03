// Nominal Pt100 Callendar–Van Dusen curve; coefficients from NI's SCXI-1503 manual.
// https://docs-be.ni.com/bundle/374271a/raw/resource/enus/374271a.pdf
export function nominalPt100ResistanceOhm(temperatureC: number): number {
  if (!Number.isFinite(temperatureC) || temperatureC < -200 || temperatureC > 850) throw new RangeError("PT100 temperature must be finite and within -200 to 850 °C.");
  const a = 3.9083e-3, b = -5.775e-7, c = -4.183e-12;
  return 100 * (1 + a * temperatureC + b * temperatureC ** 2 + (temperatureC < 0 ? c * (temperatureC - 100) * temperatureC ** 3 : 0));
}
