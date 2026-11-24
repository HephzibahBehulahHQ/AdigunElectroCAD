import { omronEncoderCatalog } from "./omronEncoderCatalog";
import { hbkLoadCellCatalog } from "./hbkLoadCellCatalog";

interface DeviceEnvelope {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  sourceUrl: string;
  railMountedDepths?: readonly { rail: string; depthMm: number }[];
  topBores?: readonly { fromLeftMm: number; diameterMm: number; name: string }[];
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

const hbkBodySource = "https://www.hbm.com/fileadmin/mediapool/hbmdoc/technical/B01010.pdf#page=1";
const loadCellBores = (mounting: readonly [number, number], load: number, mountingDiameter: number, loadDiameter: number) => [
  ...mounting.map((fromLeftMm, index) => ({ fromLeftMm, diameterMm: mountingDiameter, name: `Mounting bore ${index + 1}` })),
  { fromLeftMm: load, diameterMm: loadDiameter, name: "Load application bore" },
];
const hbkCompactBody: DeviceEnvelope = { widthMm: 123, heightMm: 42, depthMm: 42, sourceUrl: hbkBodySource, topBores: loadCellBores([13, 31], 113, 8.2, 8.2) };
const hbkCompact500Body: DeviceEnvelope = { ...hbkCompactBody, topBores: loadCellBores([13, 31], 113, 10.5, 11.1) };
const hbkLargeBody: DeviceEnvelope = { widthMm: 210, heightMm: 60, depthMm: 60, sourceUrl: hbkBodySource, topBores: loadCellBores([15, 55], 188, 13, 11.1) };
for (const { id, propertiesSchema } of hbkLoadCellCatalog) {
  const largeBody = id === "hbk.z6gc3.500kg" || propertiesSchema.capacityKg === 1000;
  deviceEnvelopes.set(id, largeBody ? hbkLargeBody : propertiesSchema.capacityKg === 500 ? hbkCompact500Body : hbkCompactBody);
}

export function deviceEnvelope(definitionId: string): DeviceEnvelope | undefined {
  return deviceEnvelopes.get(definitionId);
}

const omronEncoderIds = new Set(omronEncoderCatalog.map(({ id }) => id));
const omronEncoderFace = {
  diameterMm: 40,
  side: { bodyLengthMm: 39, pilotLengthMm: 5, pilotDiameterMm: 20, exposedShaftLengthMm: 10, shaftDiameterMm: 6 },
  mountingPitchDiameterMm: 30,
  thread: "M3",
  nominalThreadDiameterMm: 3,
  threadDepthMm: 7,
  mountingHoleCount: 3,
  sourceUrl: "https://www.ia.omron.com/products/family/487/dimension.html",
};

export function roundDeviceFace(definitionId: string) {
  return omronEncoderIds.has(definitionId) ? omronEncoderFace : undefined;
}

export function frontEnvelopeClearance(definitionId: string, width: number, height: number) {
  const envelope = deviceEnvelope(definitionId);
  if (envelope && Math.abs(width - envelope.widthMm) < 1e-8 && Math.abs(height - envelope.heightMm) < 1e-8) {
    return envelope.installationClearanceMm;
  }
}
