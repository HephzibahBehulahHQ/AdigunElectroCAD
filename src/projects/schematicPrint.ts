import { paperDimensions, type PrintLayout } from "../cad/printLayout";

export function schematicPrintHtml(svg: string, layout?: PrintLayout): string {
  const paper = layout ? paperDimensions(layout) : { width: 1100 * 25.4 / 96, height: 780 * 25.4 / 96 };
  const width = `${paper.width}mm`, height = `${paper.height}mm`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>AdigunElectroCAD schematic</title>
<style>
@page { size: ${width} ${height}; margin: 0; }
html, body { margin: 0; padding: 0; }
svg { position: absolute; top: 0; left: 0; display: block; width: ${width}; height: ${height}; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
</style></head><body>${svg}</body></html>`;
}
