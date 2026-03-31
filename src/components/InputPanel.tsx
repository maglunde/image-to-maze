import type { Dispatch, SetStateAction } from "react";
import type { AnalysisOptions } from "../types";
import { TILE_SIZE_MAX, TILE_SIZE_MIN } from "../utils/imageProcessing";
import { ImageDropzone } from "./ImageDropzone";

type InputPanelProps = {
  inputTab: "generate" | "upload";
  onInputTabChange: (tab: "generate" | "upload") => void;
  mazeWidth: number;
  mazeHeight: number;
  onMazeWidthChange: (value: number) => void;
  onMazeHeightChange: (value: number) => void;
  onGenerateMaze: () => void;
  imageUrl: string;
  options: AnalysisOptions;
  setOptions: Dispatch<SetStateAction<AnalysisOptions>>;
  onFileSelect: (file: File) => void;
  onAutoTune: () => void;
  isAutoTuning: boolean;
  isProcessing: boolean;
};

export function InputPanel({
  inputTab,
  onInputTabChange,
  mazeWidth,
  mazeHeight,
  onMazeWidthChange,
  onMazeHeightChange,
  onGenerateMaze,
  imageUrl,
  options,
  setOptions,
  onFileSelect,
  onAutoTune,
  isAutoTuning,
  isProcessing,
}: InputPanelProps) {
  return (
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
          onClick={() => onInputTabChange("generate")}
        >
          Lag maze
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={inputTab === "upload"}
          className={`tab-button ${inputTab === "upload" ? "is-active" : ""}`}
          aria-controls="input-tab-panel"
          onClick={() => onInputTabChange("upload")}
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
                onChange={(event) => onMazeWidthChange(Number(event.target.value) || 5)}
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
                onChange={(event) => onMazeHeightChange(Number(event.target.value) || 5)}
              />
            </label>

            <button type="button" onClick={onGenerateMaze}>
              Lag maze
            </button>
          </div>
        ) : (
          <div className="sidebar-group">
            <ImageDropzone hasImage={Boolean(imageUrl)} onFileSelect={onFileSelect} />

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
                    onClick={onAutoTune}
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
  );
}
