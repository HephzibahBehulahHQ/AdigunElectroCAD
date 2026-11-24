interface DeviceEnvelope {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  sourceUrl: string;
}

const deviceEnvelopes = new Map<string, DeviceEnvelope>([
  ["iec.motor-starter.01", {
    widthMm: 45, heightMm: 85, depthMm: 107,
    sourceUrl: "https://www.standardelectricsupply.com/userfiles/ad/documents/SIRIUS_3RT2025_1BB40_Specification_Sheet.pdf",
  }],
  ["iec.industrial-miniature-breaker.01", {
    widthMm: 54, heightMm: 90, depthMm: 76,
    sourceUrl: "https://media.distributordatasolutions.com/siemenscomplete/2023q2/documents/97edcf029631bb32841ceedf2c9fd94e388e8402.pdf",
  }],
  ["schneider.acti9.a9f74416", {
    widthMm: 72, heightMm: 85, depthMm: 78.5,
    sourceUrl: "https://eshop.se.com/sg/ic60n-miniature-circuit-breaker-4p-16a-c-curve-a9f74416.html",
  }],
]);

export function deviceEnvelope(definitionId: string): DeviceEnvelope | undefined {
  return deviceEnvelopes.get(definitionId);
}
