import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { GridPreview } from "./components/GridPreview";
import { ImageDropzone } from "./components/ImageDropzone";
import type { AnalysisOptions, Grid, GridPoint, PathRenderMode, PreviewColors } from "./types";
import {
  exportPdf,
  exportPng,
  exportSvg,
  getDefaultExportBaseName,
  hasVisiblePathPoint,
} from "./utils/export";
import { TILE_SIZE_MAX, TILE_SIZE_MIN, analyzeMazeImage, autoTuneAnalysisOptions } from "./utils/imageProcessing";
import { formatGridAsAscii, formatGridAsJson, formatGridAsMatrix } from "./utils/grid";
import {
  applyBoundaryOpenings,
  generateMaze,
  getBoundaryOpenings,
  moveBoundaryOpening,
  sealMazeBoundary,
  sortBoundaryOpenings,
} from "./utils/mazeGenerator";
import { findMazePath } from "./utils/pathfinding";

const defaultOptions: AnalysisOptions = {
  tileSize: 12,
  threshold: 128,
  invert: false,
  normalizePathWidth: true,
};

const defaultPreviewColors: PreviewColors = {
  path: "#ef4444",
  wall: "#0f172a",
  walkable: "#ecfeff",
};

function pointsEqual(left: GridPoint, right: GridPoint): boolean {
  return left.row === right.row && left.column === right.column;
}

function scaleBoundaryIndex(value: number, previousMax: number, nextMax: number): number {
  if (previousMax <= 0 || nextMax <= 0) {
    return 0;
  }

  return Math.round((value / previousMax) * nextMax);
}

function remapBoundaryOpening(
  opening: GridPoint,
  previousRows: number,
  previousColumns: number,
  nextRows: number,
  nextColumns: number,
): GridPoint {
  if (opening.row === 0) {
    return {
      row: 0,
      column: scaleBoundaryIndex(opening.column, previousColumns - 1, nextColumns - 1),
    };
  }

  if (opening.row === previousRows - 1) {
    return {
      row: nextRows - 1,
      column: scaleBoundaryIndex(opening.column, previousColumns - 1, nextColumns - 1),
    };
  }

  if (opening.column === 0) {
    return {
      row: scaleBoundaryIndex(opening.row, previousRows - 1, nextRows - 1),
      column: 0,
    };
  }

  return {
    row: scaleBoundaryIndex(opening.row, previousRows - 1, nextRows - 1),
    column: nextColumns - 1,
  };
}

export default function App() {
  const [inputTab, setInputTab] = useState<"generate" | "upload">("generate");
  const [sourceMode, setSourceMode] = useState<"none" | "image" | "generated">("none");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const [gridPreviewUrl, setGridPreviewUrl] = useState<string>("");
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [grid, setGrid] = useState<Grid>([]);
  const [generatedBaseGrid, setGeneratedBaseGrid] = useState<Grid>([]);
  const [path, setPath] = useState<GridPoint[] | null>(null);
  const [generatedOpenings, setGeneratedOpenings] = useState<GridPoint[]>([]);
  const [options, setOptions] = useState<AnalysisOptions>(defaultOptions);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoTuning, setIsAutoTuning] = useState(false);
  const [showSourcePanels, setShowSourcePanels] = useState(false);
  const [showPath, setShowPath] = useState(true);
  const [pathRenderMode, setPathRenderMode] = useState<PathRenderMode>("center");
  const [snakeSpeed, setSnakeSpeed] = useState(100);
  const [snakeAnimationProgress, setSnakeAnimationProgress] = useState(0);
  const [previewColors, setPreviewColors] = useState<PreviewColors>(defaultPreviewColors);
  const [isExporting, setIsExporting] = useState(false);
  const [mazeWidth, setMazeWidth] = useState(31);
  const [mazeHeight, setMazeHeight] = useState(31);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const lastSnakeFrameTimeRef = useRef<number | null>(null);
  const snakeSpeedRef = useRef(snakeSpeed);

  useEffect(() => {
    if (sourceMode !== "image") {
      if (sourceMode === "none") {
        setProcessedUrl("");
        setGridPreviewUrl("");
        setPreviewSize(null);
        setGrid([]);
        setGeneratedBaseGrid([]);
        setPath(null);
        setGeneratedOpenings([]);
      }
      return;
    }

    if (!imageUrl) {
      setProcessedUrl("");
      setGridPreviewUrl("");
      setPreviewSize(null);
      setGrid([]);
      setGeneratedBaseGrid([]);
      setPath(null);
      setGeneratedOpenings([]);
      return;
    }

    let cancelled = false;

    const runAnalysis = async () => {
      setIsProcessing(true);
      setError("");

      try {
        const result = await analyzeMazeImage(imageUrl, options);

        if (!cancelled) {
          setProcessedUrl(result.processedDataUrl);
          setPreviewSize({ width: result.width, height: result.height });
          setGrid(result.grid);
          setGeneratedBaseGrid([]);
          setPath(findMazePath(result.grid));
          setGeneratedOpenings([]);
        }
      } catch (analysisError) {
        if (!cancelled) {
          setError(
            analysisError instanceof Error ? analysisError.message : "Ukjent feil under prosessering.",
          );
          setProcessedUrl("");
          setGridPreviewUrl("");
          setPreviewSize(null);
          setGrid([]);
          setGeneratedBaseGrid([]);
          setPath(null);
          setGeneratedOpenings([]);
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    };

    void runAnalysis();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, options, sourceMode]);

  useEffect(() => {
    if (grid.length === 0) {
      setGridPreviewUrl("");
      setPath(null);
      return;
    }

    const rows = grid.length;
    const columns = grid[0]?.length ?? 0;

    if (columns === 0) {
      setGridPreviewUrl("");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = columns;
    canvas.height = rows;

    const context = canvas.getContext("2d");

    if (!context) {
      setGridPreviewUrl("");
      return;
    }

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        context.fillStyle = grid[rowIndex][columnIndex] === 1 ? previewColors.wall : previewColors.walkable;
        context.fillRect(columnIndex, rowIndex, 1, 1);
      }
    }

    setGridPreviewUrl(canvas.toDataURL("image/png"));
  }, [grid, previewColors]);

  useEffect(() => {
    return () => {
      if (imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    snakeSpeedRef.current = snakeSpeed;
  }, [snakeSpeed]);

  useEffect(() => {
    if (pathRenderMode !== "snake" || !path || path.length < 2) {
      lastSnakeFrameTimeRef.current = null;
      setSnakeAnimationProgress(0);
      return;
    }

    let frameId = 0;
    lastSnakeFrameTimeRef.current = null;
    setSnakeAnimationProgress(0);

    const animate = (nextTime: number) => {
      if (lastSnakeFrameTimeRef.current === null) {
        lastSnakeFrameTimeRef.current = nextTime;
      }

      const deltaSeconds = (nextTime - lastSnakeFrameTimeRef.current) / 1000;
      lastSnakeFrameTimeRef.current = nextTime;
      setSnakeAnimationProgress((current) => current + deltaSeconds * snakeSpeedRef.current);
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      lastSnakeFrameTimeRef.current = null;
      window.cancelAnimationFrame(frameId);
    };
  }, [path, pathRenderMode]);

  useEffect(() => {
    if (!isPreviewExpanded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewExpanded(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPreviewExpanded]);

  const runAutoTune = (targetImageUrl: string, baseOptions: AnalysisOptions = options) => {
    setIsAutoTuning(true);
    setError("");

    return autoTuneAnalysisOptions(targetImageUrl, baseOptions)
      .then((nextOptions) => {
        if (!nextOptions) {
          setError("Fant ingen gyldig maze med auto-innstillingene.");
          setOptions(baseOptions);
          return;
        }

        setOptions(nextOptions);
      })
      .catch(() => {
        setOptions(baseOptions);
        setError("Auto-innstilling feilet.");
      })
      .finally(() => {
        setIsAutoTuning(false);
      });
  };

  const handleFileSelect = (file: File) => {
    const nextUrl = URL.createObjectURL(file);

    setError("");
    setProcessedUrl("");
    setGrid([]);
    setGeneratedBaseGrid([]);
    setGeneratedOpenings([]);
    setIsAutoTuning(true);
    setInputTab("upload");
    setSourceMode("image");
    setImageUrl((previousUrl) => {
      if (previousUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }

      return nextUrl;
    });

    void runAutoTune(nextUrl, {
      ...defaultOptions,
      invert: options.invert,
      normalizePathWidth: options.normalizePathWidth,
    });
  };

  const copyToClipboard = async (value: string, errorMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError(errorMessage);
    }
  };

  const handleUseProcessedAsInput = () => {
    if (!processedUrl) {
      return;
    }

    setError("");
    setGrid([]);
    setSourceMode("image");
    void runAutoTune(processedUrl);
    setImageUrl((previousUrl) => {
      if (previousUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }

      return processedUrl;
    });
  };

  const handleUseGridAsInput = () => {
    if (!gridPreviewUrl) {
      return;
    }

    setError("");
    setGrid([]);
    setSourceMode("image");
    void runAutoTune(gridPreviewUrl);
    setImageUrl((previousUrl) => {
      if (previousUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }

      return gridPreviewUrl;
    });
  };

  const handleGenerateMaze = () => {
    const rawMaze = generateMaze(mazeWidth, mazeHeight);
    const fallbackOpenings = getBoundaryOpenings(rawMaze).slice(0, 2);
    const baseGrid = sealMazeBoundary(rawMaze);
    const previousRows = generatedBaseGrid.length;
    const previousColumns = generatedBaseGrid[0]?.length ?? 0;
    const nextRows = baseGrid.length;
    const nextColumns = baseGrid[0]?.length ?? 0;
    const nextOpenings =
      generatedOpenings.length >= 2 && previousRows > 0 && previousColumns > 0
        ? sortBoundaryOpenings(
            generatedOpenings.slice(0, 2).map((opening) =>
              remapBoundaryOpening(opening, previousRows, previousColumns, nextRows, nextColumns),
            ),
          )
        : fallbackOpenings;
    const openings =
      nextOpenings.length >= 2 && !pointsEqual(nextOpenings[0], nextOpenings[1])
        ? sortBoundaryOpenings(nextOpenings)
        : fallbackOpenings;
    const nextMaze = applyBoundaryOpenings(baseGrid, openings);

    setError("");
    setInputTab("generate");
    setIsAutoTuning(false);
    setIsProcessing(false);
    setSourceMode("generated");
    setShowSourcePanels(false);
    setProcessedUrl("");
    setPreviewSize({ width: nextMaze[0].length, height: nextMaze.length });
    setGeneratedBaseGrid(baseGrid);
    setGrid(nextMaze);
    setPath(findMazePath(nextMaze));
    setGeneratedOpenings(openings);
    setImageUrl((previousUrl) => {
      if (previousUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }

      return "";
    });
  };

  const handleExport = async (format: "svg" | "png" | "pdf") => {
    if (grid.length === 0) {
      return;
    }

    const baseName = getDefaultExportBaseName(sourceMode);
    const exportPath = hasVisiblePathPoint(path, showPath);

    setError("");
    setIsExporting(true);

    try {
      if (format === "svg") {
        exportSvg(grid, exportPath, previewColors, pathRenderMode, `${baseName}.svg`);
        return;
      }

      if (format === "png") {
        await exportPng(grid, exportPath, previewColors, pathRenderMode, `${baseName}.png`);
        return;
      }

      await exportPdf(grid, exportPath, previewColors, pathRenderMode, `${baseName}.pdf`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Kunne ikke eksportere maze.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleMoveOpening = (openingIndex: number, target: GridPoint) => {
    if (sourceMode !== "generated" || generatedBaseGrid.length === 0 || generatedOpenings.length < 2) {
      return;
    }

    const moved = moveBoundaryOpening(generatedBaseGrid, generatedOpenings, openingIndex, target);
    setGeneratedOpenings(moved.openings);
    setGrid(moved.grid);
    setPath(findMazePath(moved.grid));
  };

  const pathPoints = new Set(
    (showPath ? path ?? [] : []).map((point) => `${point.row}:${point.column}`),
  );
  const asciiGrid = formatGridAsAscii(grid);
  const matrixGrid = formatGridAsMatrix(grid);
  const gridRows = grid.length;
  const gridColumns = grid[0]?.length ?? 0;
  const openings = sourceMode === "generated" ? generatedOpenings : [];
  const hasSourceImages = Boolean(imageUrl || processedUrl);
  const isPreviewBusy = sourceMode === "image" && (isProcessing || isAutoTuning);
  const previewStatus = isAutoTuning
    ? "Finner gode standardinnstillinger for bildet..."
    : "Prosesserer bilde...";

  return (
    <main className="app-shell">
      <section className="hero panel compact-panel">
        <div className="hero-copy">
          <p className="eyebrow">Client-side maze analysis</p>
          <h1>Maze Image To Grid</h1>
          <p>Last opp et maze-bilde og få et grid der `1 = wall` og `0 = walkable` uten backend.</p>
        </div>
      </section>

      <section className="workspace">
        <aside className="sidebar input-column">
          <section className="panel controls-panel input-panel">
            <div className="section-head">
              <h2>Input</h2>
            </div>

            <div className="tab-row input-tab-row" role="tablist" aria-label="Input-modus">
              <button
                type="button"
                role="tab"
                aria-selected={inputTab === "generate"}
                className={`tab-button ${inputTab === "generate" ? "is-active" : ""}`}
                aria-controls="input-tab-panel"
                onClick={() => setInputTab("generate")}
              >
                Lag maze
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inputTab === "upload"}
                className={`tab-button ${inputTab === "upload" ? "is-active" : ""}`}
                aria-controls="input-tab-panel"
                onClick={() => setInputTab("upload")}
              >
                Last opp
              </button>
            </div>

            <div
              id="input-tab-panel"
              role="tabpanel"
              className={`tab-panel ${inputTab === "generate" ? "is-generate" : "is-upload"}`}
            >
              {inputTab === "generate" ? (
                <div className="sidebar-group">
                  <label>
                    <div className="field-head">
                      <span>Bredde</span>
                      <strong>{mazeWidth}</strong>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="500"
                      step="1"
                      value={mazeWidth}
                      onChange={(event) => setMazeWidth(Number(event.target.value) || 5)}
                    />
                  </label>

                  <label>
                    <div className="field-head">
                      <span>Høyde</span>
                      <strong>{mazeHeight}</strong>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="500"
                      step="1"
                      value={mazeHeight}
                      onChange={(event) => setMazeHeight(Number(event.target.value) || 5)}
                    />
                  </label>

                  <button type="button" onClick={handleGenerateMaze}>
                    Lag maze
                  </button>
                </div>
              ) : (
                <div className="sidebar-group">
                  <ImageDropzone hasImage={Boolean(imageUrl)} onFileSelect={handleFileSelect} />

                  {imageUrl ? (
                    <>
                      <div className="sidebar-divider" aria-hidden="true" />

                      <div className="sidebar-group">
                        <p className="sidebar-label">Analyseinnstillinger</p>
                        <label>
                          <div className="field-head">
                            <span className="field-label">
                              <span>Tile size</span>
                              <span
                                className="info-tooltip"
                                data-tooltip="Hvor store bildepiksler som slås sammen til én grid-celle. Lavere verdi gir mer detalj, høyere verdi gir grovere grid."
                                aria-label="Info om tile size"
                              >
                                i
                              </span>
                            </span>
                            <strong>{options.tileSize}px</strong>
                          </div>
                          <input
                            type="range"
                            min={TILE_SIZE_MIN}
                            max={TILE_SIZE_MAX}
                            value={options.tileSize}
                            onChange={(event) =>
                              setOptions((current) => ({
                                ...current,
                                tileSize: Number(event.target.value),
                              }))
                            }
                          />
                        </label>

                        <label>
                          <div className="field-head">
                            <span className="field-label">
                              <span>Threshold</span>
                              <span
                                className="info-tooltip"
                                data-tooltip="Lysstyrkegrensen som avgjør hva som tolkes som vegg eller åpen vei. Lavere verdi gir færre vegger, høyere verdi gir flere."
                                aria-label="Info om threshold"
                              >
                                i
                              </span>
                            </span>
                            <strong>{options.threshold}</strong>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="255"
                            value={options.threshold}
                            onChange={(event) =>
                              setOptions((current) => ({
                                ...current,
                                threshold: Number(event.target.value),
                              }))
                            }
                          />
                        </label>

                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={options.invert}
                            onChange={(event) =>
                              setOptions((current) => ({
                                ...current,
                                invert: event.target.checked,
                              }))
                            }
                          />
                          <span>Invert</span>
                        </label>

                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={options.normalizePathWidth}
                            onChange={(event) =>
                              setOptions((current) => ({
                                ...current,
                                normalizePathWidth: event.target.checked,
                              }))
                            }
                          />
                          <span>1-celle paths</span>
                        </label>

                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => imageUrl && void runAutoTune(imageUrl)}
                          disabled={!imageUrl || isAutoTuning || isProcessing}
                        >
                          {isAutoTuning ? "Finner beste innstillinger..." : "Finn beste innstillinger"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="panel-note">Analyseinnstillinger vises når et bilde er lastet opp.</p>
                  )}
                </div>
              )}
            </div>
          </section>

          {error ? <section className="panel compact-panel error">{error}</section> : null}
        </aside>

        <section className="content preview-column">
          <section className="panel primary-preview">
            <div className="section-head primary-head">
              <div>
                <h2>Grid Preview</h2>
                <p className="section-meta">
                  {gridRows > 0 && gridColumns > 0
                    ? `${gridRows} x ${gridColumns} cells`
                    : "Last opp et bilde eller generer et maze for å starte."}
                </p>
              </div>
              <div className="action-row">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setIsPreviewExpanded(true)}
                  disabled={grid.length === 0}
                >
                  Åpne stort
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowSourcePanels((current) => !current)}
                  disabled={!hasSourceImages}
                >
                  {showSourcePanels ? "Skjul kilder" : "Vis kilder"}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleUseGridAsInput}
                  disabled={!gridPreviewUrl || isProcessing}
                >
                  Bruk som input
                </button>
              </div>
            </div>

            <div className="preview-stage">
              <GridPreview
                grid={grid}
                path={showPath ? path : null}
                pathRenderMode={pathRenderMode}
                animationProgress={snakeAnimationProgress}
                colors={previewColors}
                openings={openings}
                showOpeningHandles={showPath}
                openingsDraggable={sourceMode === "generated"}
                onMoveOpening={handleMoveOpening}
                previewWidth={previewSize?.width}
                previewHeight={previewSize?.height}
              />

              {isPreviewBusy ? (
                <div className="preview-processing-overlay">
                  <div className="processing-chip">
                    <span className="processing-dot" aria-hidden="true" />
                    {previewStatus}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {showSourcePanels && hasSourceImages ? (
            <section className="source-strip">
              {imageUrl ? (
                <article className="panel collapsible-panel source-card">
                  <div className="section-head">
                    <h2>Original</h2>
                  </div>
                  <img src={imageUrl} alt="Original maze upload" className="preview-image" />
                </article>
              ) : null}

              {processedUrl ? (
                <article className="panel collapsible-panel source-card">
                  <div className="section-head">
                    <h2>Processed B/W</h2>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleUseProcessedAsInput}
                      disabled={!processedUrl || isProcessing}
                    >
                      Bruk som input
                    </button>
                  </div>
                  <img src={processedUrl} alt="Processed maze" className="preview-image" />
                </article>
              ) : null}
            </section>
          ) : null}
        </section>

        {isPreviewExpanded && grid.length > 0 ? (
          <div
            className="preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Stor grid preview"
            onClick={() => setIsPreviewExpanded(false)}
          >
            <div className="preview-modal-dialog" onClick={(event) => event.stopPropagation()}>
              <div className="section-head preview-modal-head">
                <div>
                  <h2>Grid Preview</h2>
                  <p className="section-meta">
                    {gridRows > 0 && gridColumns > 0 ? `${gridRows} x ${gridColumns} cells` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setIsPreviewExpanded(false)}
                >
                  Lukk
                </button>
              </div>

              <GridPreview
                grid={grid}
                path={showPath ? path : null}
                pathRenderMode={pathRenderMode}
                animationProgress={snakeAnimationProgress}
                colors={previewColors}
                openings={openings}
                showOpeningHandles={false}
                openingsDraggable={false}
                previewWidth={previewSize?.width}
                previewHeight={previewSize?.height}
                className="is-expanded"
              />
            </div>
          </div>
        ) : null}

        <aside className="output-column">
          <section className="panel controls-panel">
            <div className="section-head">
              <h2>Visning</h2>
            </div>

            <button
              type="button"
              className={`toggle-button ${showPath ? "is-active" : ""}`}
              aria-pressed={showPath}
              onClick={() => setShowPath((current) => !current)}
            >
              <span>Show path</span>
              <span className="toggle-pill" aria-hidden="true">
                <span className="toggle-thumb" />
              </span>
            </button>

            <div className="display-mode-row" role="group" aria-label="Path-tegning">
              <span className="display-mode-label">Path-tegning</span>
              <div className="display-mode-group">
                <button
                  type="button"
                  className={`display-mode-button ${pathRenderMode === "center" ? "is-active" : ""}`}
                  onClick={() => setPathRenderMode("center")}
                >
                  Rett
                </button>
                <button
                  type="button"
                  className={`display-mode-button ${pathRenderMode === "snake" ? "is-active" : ""}`}
                  onClick={() => setPathRenderMode("snake")}
                >
                  Slange
                </button>
              </div>
            </div>

            {pathRenderMode === "snake" ? (
              <label>
                <div className="field-head">
                  <span>Slangefart</span>
                  <strong>{snakeSpeed}</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="1000"
                  step="1"
                  value={snakeSpeed}
                  onChange={(event) => setSnakeSpeed(Number(event.target.value))}
                />
              </label>
            ) : null}

            <div className="swatch-grid">
              <label className="swatch-field">
                <input
                  type="color"
                  aria-label="Path-farge"
                  value={previewColors.path}
                  onChange={(event) =>
                    setPreviewColors((current) => ({
                      ...current,
                      path: event.target.value,
                    }))
                  }
                />
                <span>Path</span>
              </label>

              <label className="swatch-field">
                <input
                  type="color"
                  aria-label="Veggfarge"
                  value={previewColors.wall}
                  onChange={(event) =>
                    setPreviewColors((current) => ({
                      ...current,
                      wall: event.target.value,
                    }))
                  }
                />
                <span>Vegger</span>
              </label>

              <label className="swatch-field">
                <input
                  type="color"
                  aria-label="Farge for åpen vei"
                  value={previewColors.walkable}
                  onChange={(event) =>
                    setPreviewColors((current) => ({
                      ...current,
                      walkable: event.target.value,
                    }))
                  }
                />
                <span>Åpen vei</span>
              </label>
            </div>
          </section>

          <section className="panel controls-panel">
            <div className="section-head">
              <h2>Eksport</h2>
            </div>

            <div className="export-grid">
              <button
                type="button"
                className="ghost-button export-button"
                onClick={() => void handleExport("svg")}
                disabled={grid.length === 0 || isExporting}
              >
                SVG
              </button>
              <button
                type="button"
                className="ghost-button export-button"
                onClick={() => void handleExport("png")}
                disabled={grid.length === 0 || isExporting}
              >
                PNG
              </button>
              <button
                type="button"
                className="ghost-button export-button"
                onClick={() => void handleExport("pdf")}
                disabled={grid.length === 0 || isExporting}
              >
                PDF
              </button>
            </div>

            <p className="panel-note">
              Eksporterer dagens visning med valgte farger{showPath && path ? " og path" : ""}.
            </p>
          </section>

          <section className="results-stack">
            <details className="panel output-panel matrix-panel">
              <summary className="output-header matrix-summary">
                <div className="summary-title">
                  <span className="summary-caret" aria-hidden="true" />
                  <h2>ASCII</h2>
                </div>
                <div className="summary-actions">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void copyToClipboard(asciiGrid, "Kunne ikke kopiere ASCII til utklippstavlen.");
                    }}
                    disabled={grid.length === 0}
                  >
                    Kopier
                  </button>
                </div>
              </summary>
              <pre className="ascii-output" style={{ "--ascii-path-color": previewColors.path } as CSSProperties}>
                {grid.length === 0
                  ? "Ingen ASCII tilgjengelig ennå."
                  : grid.map((row, rowIndex) => (
                      <Fragment key={rowIndex}>
                        {row.map((cell, columnIndex) => {
                          const key = `${rowIndex}:${columnIndex}`;

                          if (cell === 1) {
                            return "#";
                          }

                          if (pathPoints.has(key)) {
                            return (
                              <span key={key} className="ascii-path-dot">
                                .
                              </span>
                            );
                          }

                          return ".";
                        })}
                        {rowIndex < grid.length - 1 ? "\n" : null}
                      </Fragment>
                    ))}
              </pre>
              <p className="output-note">`#` vegg, `.` gang, farget `.` sti.</p>
            </details>

            <details className="panel output-panel matrix-panel">
              <summary className="output-header matrix-summary">
                <div className="summary-title">
                  <span className="summary-caret" aria-hidden="true" />
                  <h2>Grid Matrix</h2>
                </div>
                <div className="summary-actions">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void copyToClipboard(
                        formatGridAsJson(grid),
                        "Kunne ikke kopiere grid til utklippstavlen.",
                      );
                    }}
                    disabled={grid.length === 0}
                  >
                    Kopier
                  </button>
                </div>
              </summary>
              <pre className="matrix-output">{matrixGrid || "Ingen grid tilgjengelig ennå."}</pre>
              <p className="output-note">Vises som matrise for lesbarhet, kopieres som gyldig 2D-array.</p>
            </details>
          </section>
        </aside>
      </section>
    </main>
  );
}
