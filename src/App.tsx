import { useEffect, useState } from "react";
import { GridPreview } from "./components/GridPreview";
import { ImageDropzone } from "./components/ImageDropzone";
import type { AnalysisOptions, Grid, GridPoint } from "./types";
import { analyzeMazeImage, estimateAnalysisOptions } from "./utils/imageProcessing";
import { formatGridAsAscii, formatGridAsJson, formatGridAsMatrix } from "./utils/grid";
import { findMazePath } from "./utils/pathfinding";

const defaultOptions: AnalysisOptions = {
  tileSize: 12,
  threshold: 128,
  invert: false,
  normalizePathWidth: true,
};

export default function App() {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const [gridPreviewUrl, setGridPreviewUrl] = useState<string>("");
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [grid, setGrid] = useState<Grid>([]);
  const [path, setPath] = useState<GridPoint[] | null>(null);
  const [options, setOptions] = useState<AnalysisOptions>(defaultOptions);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoTuning, setIsAutoTuning] = useState(false);
  const [showSourcePanels, setShowSourcePanels] = useState(false);
  const [showPath, setShowPath] = useState(true);

  useEffect(() => {
    if (!imageUrl) {
      setProcessedUrl("");
      setGridPreviewUrl("");
      setPreviewSize(null);
      setGrid([]);
      setPath(null);
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
          setPath(findMazePath(result.grid));
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
          setPath(null);
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
  }, [imageUrl, options]);

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
        context.fillStyle = grid[rowIndex][columnIndex] === 1 ? "#ecfeff" : "#0f172a";
        context.fillRect(columnIndex, rowIndex, 1, 1);
      }
    }

    setGridPreviewUrl(canvas.toDataURL("image/png"));
  }, [grid]);

  useEffect(() => {
    return () => {
      if (imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleFileSelect = (file: File) => {
    const nextUrl = URL.createObjectURL(file);

    setError("");
    setProcessedUrl("");
    setGrid([]);
    setIsAutoTuning(true);
    setImageUrl((previousUrl) => {
      if (previousUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }

      return nextUrl;
    });

    void estimateAnalysisOptions(nextUrl, defaultOptions)
      .then((nextOptions) => {
        setOptions(nextOptions);
      })
      .catch(() => {
        setOptions(defaultOptions);
      })
      .finally(() => {
        setIsAutoTuning(false);
      });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatGridAsJson(grid));
    } catch {
      setError("Kunne ikke kopiere grid til utklippstavlen.");
    }
  };

  const handleUseProcessedAsInput = () => {
    if (!processedUrl) {
      return;
    }

    setError("");
    setGrid([]);
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
    setImageUrl((previousUrl) => {
      if (previousUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }

      return gridPreviewUrl;
    });
  };

  const asciiGrid = formatGridAsAscii(grid);
  const matrixGrid = formatGridAsMatrix(grid);
  const gridRows = grid.length;
  const gridColumns = grid[0]?.length ?? 0;

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
        <aside className="sidebar">
          <section className="panel compact-panel">
            <div className="section-head">
              <h2>Fil</h2>
            </div>
            <ImageDropzone hasImage={Boolean(imageUrl)} onFileSelect={handleFileSelect} />
          </section>

          <section className="panel controls-panel">
            <div className="section-head">
              <h2>Innstillinger</h2>
            </div>

            <label>
              <span>Tile size</span>
              <input
                type="range"
                min="2"
                max="16"
                value={options.tileSize}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    tileSize: Number(event.target.value),
                  }))
                }
              />
              <strong>{options.tileSize}px</strong>
            </label>

            <label>
              <span>Threshold</span>
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
              <strong>{options.threshold}</strong>
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

            <label className="checkbox">
              <input
                type="checkbox"
                checked={showPath}
                onChange={(event) => setShowPath(event.target.checked)}
              />
              <span>Show path</span>
            </label>
          </section>

          {(error || isProcessing || isAutoTuning) && (
            <section className={`panel compact-panel ${error ? "error" : "status-panel"}`}>
              {error
                ? error
                : isAutoTuning
                  ? "Finner gode standardinnstillinger for bildet..."
                  : "Prosesserer bilde..."}
            </section>
          )}
        </aside>

        <section className="content">
          <section className="panel primary-preview">
            <div className="section-head primary-head">
              <div>
                <h2>Grid Preview</h2>
                <p className="section-meta">
                  {gridRows > 0 && gridColumns > 0
                    ? `${gridRows} x ${gridColumns} cells`
                    : "Last opp et bilde for å generere grid."}
                </p>
              </div>
              <div className="action-row">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowSourcePanels((current) => !current)}
                >
                  {showSourcePanels ? "Skjul kildebilder" : "Vis kildebilder"}
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
            <GridPreview
              grid={grid}
              path={showPath ? path : null}
              previewWidth={previewSize?.width}
              previewHeight={previewSize?.height}
            />
          </section>

          {showSourcePanels ? (
            <section className="secondary-row">
              <article className="panel collapsible-panel">
                <div className="section-head">
                  <h2>Original</h2>
                </div>
                {imageUrl ? (
                  <img src={imageUrl} alt="Original maze upload" className="preview-image" />
                ) : (
                  <div className="empty-state">Ingen bilde lastet opp.</div>
                )}
              </article>

              <article className="panel collapsible-panel">
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
                {processedUrl ? (
                  <img src={processedUrl} alt="Processed maze" className="preview-image" />
                ) : (
                  <div className="empty-state">Ingen prosessert versjon ennå.</div>
                )}
              </article>
            </section>
          ) : null}

          <section className="results-stack">
            <article className="panel output-panel">
              <div className="section-head">
                <h2>ASCII</h2>
              </div>
              <pre>{asciiGrid || "Ingen ASCII tilgjengelig ennå."}</pre>
            </article>

            <details className="panel output-panel matrix-panel">
              <summary className="output-header matrix-summary">
                <h2>Grid Matrix</h2>
                <div className="summary-actions">
                  <span className="summary-hint">Kollapsbar</span>
                  <button type="button" onClick={handleCopy} disabled={grid.length === 0}>
                    Kopier som array
                  </button>
                </div>
              </summary>
              <pre className="matrix-output">{matrixGrid || "Ingen grid tilgjengelig ennå."}</pre>
              <p className="output-note">Vises som matrise for lesbarhet, kopieres som gyldig 2D-array.</p>
            </details>
          </section>
        </section>
      </section>
    </main>
  );
}
