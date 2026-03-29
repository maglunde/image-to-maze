import type { Grid, GridPoint, PreviewColors } from "../types";

const EXPORT_CELL_SIZE = 12;
const EXPORT_PADDING_CELLS = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getExportSize(grid: Grid, cellSize = EXPORT_CELL_SIZE): { width: number; height: number } {
  const columns = grid[0]?.length ?? 0;
  const rows = grid.length;

  return {
    width: (columns + EXPORT_PADDING_CELLS * 2) * cellSize,
    height: (rows + EXPORT_PADDING_CELLS * 2) * cellSize,
  };
}

function buildSvgMarkup(
  grid: Grid,
  path: GridPoint[] | null,
  colors: PreviewColors,
  cellSize = EXPORT_CELL_SIZE,
): string {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  const { width, height } = getExportSize(grid, cellSize);
  const offset = EXPORT_PADDING_CELLS * cellSize;
  const rects: string[] = [
    `<rect width="${width}" height="${height}" fill="${escapeXml(colors.walkable)}" />`,
  ];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (grid[row][column] === 1) {
        rects.push(
          `<rect x="${offset + column * cellSize}" y="${offset + row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${escapeXml(colors.wall)}" />`,
        );
      }
    }
  }

  const overlays: string[] = [];

  if (path && path.length > 0) {
    const pathData = path
      .map((point, index) => {
        const x = offset + point.column * cellSize + cellSize / 2;
        const y = offset + point.row * cellSize + cellSize / 2;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    overlays.push(
      `<path d="${pathData}" fill="none" stroke="${escapeXml(colors.path)}" stroke-width="${Math.max(
        2,
        Math.round(cellSize * 0.35),
      )}" stroke-linecap="round" stroke-linejoin="round" />`,
    );

    const radius = Math.max(2, cellSize * 0.28);
    const start = path[0];
    const end = path[path.length - 1];
    overlays.push(
      `<circle cx="${offset + start.column * cellSize + cellSize / 2}" cy="${offset + start.row * cellSize + cellSize / 2}" r="${radius}" fill="${escapeXml(colors.path)}" />`,
    );
    overlays.push(
      `<circle cx="${offset + end.column * cellSize + cellSize / 2}" cy="${offset + end.row * cellSize + cellSize / 2}" r="${radius}" fill="${escapeXml(colors.path)}" />`,
    );
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">`,
    ...rects,
    ...overlays,
    `</svg>`,
  ].join("");
}

function createExportCanvas(
  grid: Grid,
  path: GridPoint[] | null,
  colors: PreviewColors,
  cellSize = EXPORT_CELL_SIZE,
): HTMLCanvasElement {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  const { width, height } = getExportSize(grid, cellSize);
  const offset = EXPORT_PADDING_CELLS * cellSize;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  context.fillStyle = colors.walkable;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (grid[row][column] === 1) {
        context.fillStyle = colors.wall;
        context.fillRect(offset + column * cellSize, offset + row * cellSize, cellSize, cellSize);
      }
    }
  }

  if (path && path.length > 0) {
    context.strokeStyle = colors.path;
    context.fillStyle = colors.path;
    context.lineWidth = Math.max(2, cellSize * 0.35);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();

    path.forEach((point, index) => {
      const x = offset + point.column * cellSize + cellSize / 2;
      const y = offset + point.row * cellSize + cellSize / 2;

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });

    context.stroke();

    const radius = Math.max(2, cellSize * 0.28);
    const endpoints = [path[0], path[path.length - 1]];

    endpoints.forEach((point) => {
      context.beginPath();
      context.arc(
        offset + point.column * cellSize + cellSize / 2,
        offset + point.row * cellSize + cellSize / 2,
        radius,
        0,
        Math.PI * 2,
      );
      context.fill();
    });
  }

  return canvas;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Kunne ikke opprette eksportfil."));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

function encodePdfStreamParts(parts: Array<string | Uint8Array>): Uint8Array {
  const chunks = parts.map((part) => (typeof part === "string" ? new TextEncoder().encode(part) : part));
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function buildPdfBlob(canvas: HTMLCanvasElement): Blob {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  const width = canvas.width;
  const height = canvas.height;
  const imageData = context.getImageData(0, 0, width, height);
  const rgbBytes = new Uint8Array(width * height * 3);

  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < imageData.data.length; sourceIndex += 4) {
    rgbBytes[targetIndex] = imageData.data[sourceIndex];
    rgbBytes[targetIndex + 1] = imageData.data[sourceIndex + 1];
    rgbBytes[targetIndex + 2] = imageData.data[sourceIndex + 2];
    targetIndex += 3;
  }

  const pageWidth = clamp(width, 1, 14400);
  const pageHeight = clamp(height, 1, 14400);
  const imageObject = [
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${rgbBytes.length} >>\nstream\n`,
    rgbBytes,
    `\nendstream`,
  ];
  const contentStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  const objects: Array<string | Uint8Array> = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    encodePdfStreamParts(imageObject),
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
  ];

  const header = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const parts: Array<string | Uint8Array> = [header];
  const offsets: number[] = [0];
  let offset = new TextEncoder().encode(header).length;

  objects.forEach((object, index) => {
    offsets.push(offset);
    const objectHeader = `${index + 1} 0 obj\n`;
    const objectFooter = `\nendobj\n`;
    parts.push(objectHeader, object, objectFooter);
    offset +=
      new TextEncoder().encode(objectHeader).length +
      (typeof object === "string" ? new TextEncoder().encode(object).length : object.length) +
      new TextEncoder().encode(objectFooter).length;
  });

  const xrefOffset = offset;
  const xrefEntries = offsets
    .map((entry, index) =>
      index === 0 ? "0000000000 65535 f \n" : `${String(entry).padStart(10, "0")} 00000 n \n`,
    )
    .join("");

  parts.push(
    `xref\n0 ${offsets.length}\n${xrefEntries}`,
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );

  const blobParts = parts.map((part) =>
    typeof part === "string"
      ? part
      : new Uint8Array(part).slice().buffer,
  );

  return new Blob(blobParts, { type: "application/pdf" });
}

export function exportSvg(
  grid: Grid,
  path: GridPoint[] | null,
  colors: PreviewColors,
  filename = "maze-export.svg",
): void {
  const svg = buildSvgMarkup(grid, path, colors);
  triggerDownload(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename);
}

export async function exportPng(
  grid: Grid,
  path: GridPoint[] | null,
  colors: PreviewColors,
  filename = "maze-export.png",
): Promise<void> {
  const canvas = createExportCanvas(grid, path, colors);
  const blob = await blobFromCanvas(canvas, "image/png");
  triggerDownload(blob, filename);
}

export async function exportPdf(
  grid: Grid,
  path: GridPoint[] | null,
  colors: PreviewColors,
  filename = "maze-export.pdf",
): Promise<void> {
  const canvas = createExportCanvas(grid, path, colors, 10);
  const blob = buildPdfBlob(canvas);
  triggerDownload(blob, filename);
}

export function getDefaultExportBaseName(sourceMode: "none" | "image" | "generated"): string {
  if (sourceMode === "generated") {
    return "generated-maze";
  }

  if (sourceMode === "image") {
    return "analyzed-maze";
  }

  return "maze-export";
}

export function hasVisiblePathPoint(path: GridPoint[] | null, showPath: boolean): GridPoint[] | null {
  return showPath && path && path.length > 1 ? path : null;
}
