export const paperFormats = {
  A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189],
} as const;

export interface PrintLayout {
  format: keyof typeof paperFormats | "custom";
  orientation: "portrait" | "landscape";
  customWidthMm: number;
  customHeightMm: number;
  marginMm: number;
  unitsPerMm: number;
  x: number;
  y: number;
  visible: boolean;
  title: string;
}

export const defaultPrintLayout: PrintLayout = {
  format: "A4", orientation: "landscape", customWidthMm: 210, customHeightMm: 297,
  marginMm: 10, unitsPerMm: 4, x: 0, y: 0, visible: true, title: "",
};

export function paperDimensions(layout: PrintLayout) {
  const [a, b] = layout.format === "custom" ? [layout.customWidthMm, layout.customHeightMm] : paperFormats[layout.format];
  const [short, long] = [Math.min(a, b), Math.max(a, b)];
  return layout.orientation === "portrait" ? { width: short, height: long } : { width: long, height: short };
}

export function printFrameBounds(layout: PrintLayout) {
  const { width, height } = paperDimensions(layout);
  return { x: layout.x, y: layout.y, width: width * layout.unitsPerMm, height: height * layout.unitsPerMm };
}

export function validPrintLayout(layout: PrintLayout): boolean {
  if (!(layout.format === "custom" || Object.hasOwn(paperFormats, layout.format)) || !["portrait", "landscape"].includes(layout.orientation)) return false;
  if (![layout.x, layout.y, layout.unitsPerMm, layout.marginMm, layout.customWidthMm, layout.customHeightMm].every(Number.isFinite)) return false;
  if ([layout.customWidthMm, layout.customHeightMm].some(value => value < 20 || value > 3000)) return false;
  const { width, height } = paperDimensions(layout);
  return layout.unitsPerMm >= .01 && layout.unitsPerMm <= 1000 && layout.marginMm >= 0 && layout.marginMm < Math.min(width, height) / 2
    && typeof layout.visible === "boolean" && typeof layout.title === "string" && layout.title.length <= 80;
}
