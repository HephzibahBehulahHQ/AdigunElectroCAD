interface DeviceEnvelope {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  sourceUrl: string;
  railMountedDepths?: readonly { rail: string; depthMm: number }[];
  installationClearanceMm?: { above: number; below: number; forward: number; lateral?: number; sourceUrl?: string };
}

const deviceEnvelopes = new Map<string, DeviceEnvelope>([
  ["siemens.sm1223.6es7223-1bh32-0xb0", {
    widthMm: 45, heightMm: 100, depthMm: 75,
    sourceUrl: "https://cache.industry.siemens.com/dl/files/167/109744167/att_920955/v1/simatic-st70-complete-english-2017.pdf",
    installationClearanceMm: { above: 25, below: 25, forward: 25,
      sourceUrl: "https://cache.industry.siemens.com/dl/files/829/109814829/att_1120874/v1/s71200_system_manual_en-US_en-US.pdf?download=true" },
  }],
  ["phoenix-contact.pttb.3210567", {
    widthMm: 5.2, heightMm: 68.2, depthMm: 45.9,
    sourceUrl: "https://www.phoenixcontact.com/en-us/products/multi-level-terminal-block-pttb-25-3210567?type=pdf",
    railMountedDepths: [
      { rail: "NS 35/7.5", depthMm: 47.4 },
      { rail: "NS 35/15", depthMm: 54.9 },
    ],
  }],
  ["finder.38.51.7.024.0050", {
    // Overall side depth includes the 3.5 mm projection in the outline drawing.
    widthMm: 6.2, heightMm: 87.8, depthMm: 75.6,
    sourceUrl: "https://cdn.findernet.com/app/uploads/S38EN.pdf#page=17",
  }],
  ["overload.thermal", {
    // Exact 3RU2126-4AB0 device dimensions. The mounted assembly includes a separate contactor.
    widthMm: 45, heightMm: 85, depthMm: 85,
    sourceUrl: "https://media.distributordatasolutions.com/siemenscomplete/2021q3/documents/37926da566bb730826ec467ba7324ce384d9ea17.pdf#page=2",
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
