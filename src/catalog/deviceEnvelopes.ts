interface DeviceEnvelope {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  sourceUrl: string;
  installationClearanceMm?: { above: number; below: number; forward: number; lateral?: number; sourceUrl?: string };
}

const deviceEnvelopes = new Map<string, DeviceEnvelope>([
  ["siemens.sm1223.6es7223-1bh32-0xb0", {
    widthMm: 45, heightMm: 100, depthMm: 75,
    sourceUrl: "https://cache.industry.siemens.com/dl/files/167/109744167/att_920955/v1/simatic-st70-complete-english-2017.pdf",
    installationClearanceMm: { above: 25, below: 25, forward: 25,
      sourceUrl: "https://cache.industry.siemens.com/dl/files/829/109814829/att_1120874/v1/s71200_system_manual_en-US_en-US.pdf?download=true" },
  }],
  ["iec.motor-starter.01", {
    widthMm: 45, heightMm: 85, depthMm: 107,
    installationClearanceMm: { above: 10, below: 10, forward: 10, lateral: 0 },
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

export function frontEnvelopeClearance(definitionId: string, width: number, height: number) {
  const envelope = deviceEnvelope(definitionId);
  if (envelope && Math.abs(width - envelope.widthMm) < 1e-8 && Math.abs(height - envelope.heightMm) < 1e-8) {
    return envelope.installationClearanceMm;
  }
}
