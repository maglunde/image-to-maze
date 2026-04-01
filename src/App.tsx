import { useEffect, useRef, useState } from "react";
import { InputPanel } from "./components/InputPanel";
import { OutputSidebar } from "./components/OutputSidebar";
import { PreviewPanel } from "./components/PreviewPanel";
import { defaultAnalysisOptions, defaultPreviewColors } from "./constants/mazeDefaults";
import type { AnalysisOptions, Grid, GridPoint, PathRenderMode, PreviewColors } from "./types";
import {
  exportPdf,
  exportPng,
  exportSvg,
  getDefaultExportBaseName,
  hasVisiblePathPoint,
} from "./utils/export";
import { formatGridAsAscii, formatGridAsJson, formatGridAsMatrix } from "./utils/grid";
import { buildGeneratedMazeState } from "./utils/generatedMaze";
import { analyzeMazeImage, autoTuneAnalysisOptions } from "./utils/imageProcessing";
import { moveBoundaryOpening } from "./utils/mazeGenerator";
import { findMazePath } from "./utils/pathfinding";

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
  const [options, setOptions] = useState<AnalysisOptions>(defaultAnalysisOptions);
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
      ...defaultAnalysisOptions,
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
    setInputTab("upload");
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
    setInputTab("upload");
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
    const nextMazeState = buildGeneratedMazeState(
      mazeWidth,
      mazeHeight,
      generatedBaseGrid,
      generatedOpenings,
    );

    setError("");
    setInputTab("generate");
    setIsAutoTuning(false);
    setIsProcessing(false);
    setSourceMode("generated");
    setShowSourcePanels(false);
    setProcessedUrl("");
    setPreviewSize({ width: nextMazeState.grid[0].length, height: nextMazeState.grid.length });
    setGeneratedBaseGrid(nextMazeState.baseGrid);
    setGrid(nextMazeState.grid);
    setPath(findMazePath(nextMazeState.grid));
    setGeneratedOpenings(nextMazeState.openings);
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
          <InputPanel
            inputTab={inputTab}
            onInputTabChange={setInputTab}
            mazeWidth={mazeWidth}
            mazeHeight={mazeHeight}
            onMazeWidthChange={setMazeWidth}
            onMazeHeightChange={setMazeHeight}
            onGenerateMaze={handleGenerateMaze}
            imageUrl={imageUrl}
            options={options}
            setOptions={setOptions}
            onFileSelect={handleFileSelect}
            onAutoTune={() => imageUrl && void runAutoTune(imageUrl)}
            isAutoTuning={isAutoTuning}
            isProcessing={isProcessing}
          />

          {error ? <section className="panel compact-panel error">{error}</section> : null}
        </aside>

        <PreviewPanel
          grid={grid}
          path={path}
          showPath={showPath}
          pathRenderMode={pathRenderMode}
          snakeAnimationProgress={snakeAnimationProgress}
          previewColors={previewColors}
          openings={openings}
          sourceMode={sourceMode}
          onMoveOpening={handleMoveOpening}
          previewSize={previewSize}
          isPreviewBusy={isPreviewBusy}
          previewStatus={previewStatus}
          showSourcePanels={showSourcePanels}
          onShowSourcePanelsChange={setShowSourcePanels}
          hasSourceImages={hasSourceImages}
          canUseGridAsInput={Boolean(gridPreviewUrl)}
          imageUrl={imageUrl}
          processedUrl={processedUrl}
          onUseGridAsInput={handleUseGridAsInput}
          onUseProcessedAsInput={handleUseProcessedAsInput}
          isProcessing={isProcessing}
          isPreviewExpanded={isPreviewExpanded}
          onPreviewExpandedChange={setIsPreviewExpanded}
        />

        <OutputSidebar
          showPath={showPath}
          onShowPathChange={setShowPath}
          pathRenderMode={pathRenderMode}
          onPathRenderModeChange={setPathRenderMode}
          snakeSpeed={snakeSpeed}
          onSnakeSpeedChange={setSnakeSpeed}
          previewColors={previewColors}
          setPreviewColors={setPreviewColors}
          grid={grid}
          isExporting={isExporting}
          onExport={handleExport}
          path={path}
          asciiGrid={asciiGrid}
          matrixGrid={matrixGrid}
          pathPoints={pathPoints}
          onCopyAscii={() => void copyToClipboard(asciiGrid, "Kunne ikke kopiere ASCII til utklippstavlen.")}
          onCopyGridJson={() =>
            void copyToClipboard(formatGridAsJson(grid), "Kunne ikke kopiere grid til utklippstavlen.")
          }
        />
      </section>
    </main>
  );
}
