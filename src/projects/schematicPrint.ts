import { paperDimensions, type PrintLayout } from "../cad/printLayout";

const schematicPaper = (layout?: PrintLayout) => layout ? paperDimensions(layout) : { width: 1100 * 25.4 / 96, height: 780 * 25.4 / 96 };

export function schematicPrintHtml(svg: string, layout?: PrintLayout): string {
  const paper = schematicPaper(layout);
  const width = `${paper.width}mm`, height = `${paper.height}mm`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>AdigunElectroCAD schematic</title>
<style>
@page { size: ${width} ${height}; margin: 0; }
html, body { margin: 0; padding: 0; }
svg { position: absolute; top: 0; left: 0; display: block; width: ${width}; height: ${height}; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
</style></head><body>${svg}</body></html>`;
}

export function workbookPrintHtml(pages: readonly { svg: string; layout?: PrintLayout }[]): string {
  const styles = pages.map(({ layout }, index) => {
    const paper = schematicPaper(layout);
    const width = `${paper.width}mm`, height = `${paper.height}mm`;
    return `@page sheet${index} { size: ${width} ${height}; margin: 0; }
.sheet${index} { page: sheet${index}; width: ${width}; height: ${height}; }`;
  }).join("\n");
  const sheets = pages.map(({ svg }, index) => `<section class="sheet${index}">${svg}</section>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>AdigunElectroCAD project</title>
<style>
html, body { margin: 0; padding: 0; }
section { position: relative; break-inside: avoid; overflow: hidden; }
section + section { break-before: page; }
section > svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
${styles}
</style></head><body>${sheets}</body></html>`;
}
