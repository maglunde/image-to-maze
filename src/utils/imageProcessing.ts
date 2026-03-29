import type { AnalysisOptions, AnalysisResult, Grid } from "../types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = src;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getLuminancePixels(source: ImageData): Uint8Array {
  const luminancePixels = new Uint8Array(source.width * source.height);

  for (let index = 0; index < source.data.length; index += 4) {
    const pixelIndex = index / 4;
    const red = source.data[index];
    const green = source.data[index + 1];
    const blue = source.data[index + 2];
    luminancePixels[pixelIndex] = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
  }

  return luminancePixels;
}

function computeOtsuThreshold(luminancePixels: Uint8Array): number {
  const histogram = new Array<number>(256).fill(0);

  for (const luminance of luminancePixels) {
    histogram[luminance] += 1;
  }

  const totalPixels = luminancePixels.length;
  let totalSum = 0;

  for (let level = 0; level < histogram.length; level += 1) {
    totalSum += level * histogram[level];
  }

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let maxVariance = -1;
  let bestThreshold = 128;

  for (let level = 0; level < histogram.length; level += 1) {
    backgroundWeight += histogram[level];

    if (backgroundWeight === 0) {
      continue;
    }

    const foregroundWeight = totalPixels - backgroundWeight;

    if (foregroundWeight === 0) {
      break;
    }

    backgroundSum += level * histogram[level];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (totalSum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = level;
    }
  }

  return bestThreshold;
}

function collectRunLengths(binaryPixels: Uint8Array, width: number, height: number): number[] {
  const runLengths: number[] = [];
  const rowStep = Math.max(1, Math.floor(height / 24));
  const columnStep = Math.max(1, Math.floor(width / 24));

  for (let y = 0; y < height; y += rowStep) {
    let previous = binaryPixels[y * width];
    let length = 1;

    for (let x = 1; x < width; x += 1) {
      const current = binaryPixels[y * width + x];

      if (current === previous) {
        length += 1;
      } else {
        if (length >= 2) {
          runLengths.push(length);
        }
        previous = current;
        length = 1;
      }
    }

    if (length >= 2) {
      runLengths.push(length);
    }
  }

  for (let x = 0; x < width; x += columnStep) {
    let previous = binaryPixels[x];
    let length = 1;

    for (let y = 1; y < height; y += 1) {
      const current = binaryPixels[y * width + x];

      if (current === previous) {
        length += 1;
      } else {
        if (length >= 2) {
          runLengths.push(length);
        }
        previous = current;
        length = 1;
      }
    }

    if (length >= 2) {
      runLengths.push(length);
    }
  }

  return runLengths.filter((length) => length <= 64);
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 12;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * ratio)));
  return sorted[index];
}

function getBinaryValue(luminance: number, threshold: number, invert: boolean): number {
  const isWall = invert ? luminance > threshold : luminance < threshold;
  return isWall ? 1 : 0;
}

function buildProcessedImageData(
  source: ImageData,
  width: number,
  height: number,
  threshold: number,
  invert: boolean,
): { imageData: ImageData; binaryPixels: Uint8Array } {
  const output = new ImageData(width, height);
  const binaryPixels = new Uint8Array(width * height);
  const luminancePixels = getLuminancePixels(source);

  for (let index = 0; index < source.data.length; index += 4) {
    const pixelIndex = index / 4;
    const luminance = luminancePixels[pixelIndex];
    const binaryValue = getBinaryValue(luminance, threshold, invert);
    const color = binaryValue === 1 ? 0 : 255;

    output.data[index] = color;
    output.data[index + 1] = color;
    output.data[index + 2] = color;
    output.data[index + 3] = 255;
    binaryPixels[pixelIndex] = binaryValue;
  }

  return { imageData: output, binaryPixels };
}

function buildGrid(binaryPixels: Uint8Array, width: number, height: number, tileSize: number): Grid {
  const columns = Math.ceil(width / tileSize);
  const rows = Math.ceil(height / tileSize);
  const grid: Grid = [];

  for (let row = 0; row < rows; row += 1) {
    const currentRow: number[] = [];

    for (let column = 0; column < columns; column += 1) {
      const startX = column * tileSize;
      const startY = row * tileSize;
      const endX = Math.min(startX + tileSize, width);
      const endY = Math.min(startY + tileSize, height);

      let wallCount = 0;
      let totalPixels = 0;

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          wallCount += binaryPixels[y * width + x];
          totalPixels += 1;
        }
      }

      currentRow.push(wallCount >= totalPixels / 2 ? 1 : 0);
    }

    grid.push(currentRow);
  }

  return grid;
}

function rowsEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function normalizeGridThickness(grid: Grid): Grid {
  if (grid.length === 0 || grid[0].length === 0) {
    return grid;
  }

  const collapsedRows = grid.filter((row, index) => index === 0 || !rowsEqual(row, grid[index - 1]));
  const collapsedColumns = collapsedRows[0]
    .map((_, columnIndex) => collapsedRows.map((row) => row[columnIndex]))
    .filter((column, index, columns) => index === 0 || !rowsEqual(column, columns[index - 1]));

  return collapsedRows.map((_, rowIndex) => collapsedColumns.map((column) => column[rowIndex]));
}

export async function analyzeMazeImage(
  imageUrl: string,
  options: AnalysisOptions,
): Promise<AnalysisResult> {
  const image = await loadImage(imageUrl);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const sourceCanvas = createCanvas(width, height);
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas 2D context is not available.");
  }

  sourceContext.drawImage(image, 0, 0, width, height);
  const sourceImageData = sourceContext.getImageData(0, 0, width, height);
  const { imageData, binaryPixels } = buildProcessedImageData(
    sourceImageData,
    width,
    height,
    options.threshold,
    options.invert,
  );

  const processedCanvas = createCanvas(width, height);
  const processedContext = processedCanvas.getContext("2d");

  if (!processedContext) {
    throw new Error("Canvas 2D context is not available.");
  }

  processedContext.putImageData(imageData, 0, 0);

  const grid = buildGrid(binaryPixels, width, height, options.tileSize);

  return {
    width,
    height,
    processedDataUrl: processedCanvas.toDataURL("image/png"),
    grid: options.normalizePathWidth ? normalizeGridThickness(grid) : grid,
  };
}

export async function estimateAnalysisOptions(
  imageUrl: string,
  currentOptions: AnalysisOptions,
): Promise<AnalysisOptions> {
  const image = await loadImage(imageUrl);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const sourceCanvas = createCanvas(width, height);
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas 2D context is not available.");
  }

  sourceContext.drawImage(image, 0, 0, width, height);
  const sourceImageData = sourceContext.getImageData(0, 0, width, height);
  const luminancePixels = getLuminancePixels(sourceImageData);
  const threshold = computeOtsuThreshold(luminancePixels);

  let darkCount = 0;

  for (const luminance of luminancePixels) {
    if (luminance < threshold) {
      darkCount += 1;
    }
  }

  const lightCount = luminancePixels.length - darkCount;
  const invert = darkCount > lightCount;
  const binaryPixels = new Uint8Array(width * height);

  for (let index = 0; index < luminancePixels.length; index += 1) {
    binaryPixels[index] = getBinaryValue(luminancePixels[index], threshold, invert);
  }

  const runLengths = collectRunLengths(binaryPixels, width, height);
  const tileSize = clamp(Math.round(percentile(runLengths, 0.3)), 2, 16);

  return {
    ...currentOptions,
    threshold,
    invert,
    tileSize,
  };
}
