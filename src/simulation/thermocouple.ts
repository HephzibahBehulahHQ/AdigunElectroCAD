// NIST ITS-90 Type K forward reference, degrees Celsius -> millivolts.
// https://its90.nist.gov/downloadFiles/type_k.tab.txt
const negative = [0, .394501280250e-1, .236223735980e-4, -.328589067840e-6, -.499048287770e-8, -.675090591730e-10, -.574103274280e-12, -.310888728940e-14, -.104516093650e-16, -.198892668780e-19, -.163226974860e-22];
const positive = [-.176004136860e-1, .389212049750e-1, .185587700320e-4, -.994575928740e-7, .318409457190e-9, -.560728448890e-12, .560750590590e-15, -.320207200030e-18, .971511471520e-22, -.121047212750e-25];

function referenceEmf(temperatureC: number): number {
  if (!Number.isFinite(temperatureC) || temperatureC < -270 || temperatureC > 1372) throw new RangeError("Type K junction temperatures must be finite and within -270 to 1372 °C.");
  if (temperatureC === 0) return 0;
  const coefficients = temperatureC < 0 ? negative : positive;
  const polynomial = coefficients.reduceRight((sum, coefficient) => sum * temperatureC + coefficient, 0);
  return temperatureC < 0 ? polynomial : polynomial + .1185976 * Math.exp(-.1183432e-3 * (temperatureC - 126.9686) ** 2);
}

/** Terminal EMF relative to the specified reference junction, not an absolute-temperature reading. */
export function typeKThermocoupleMillivolt(temperatureC: number, referenceJunctionC = 0): number {
  return referenceEmf(temperatureC) - referenceEmf(referenceJunctionC);
}
