import type { DragEvent } from "react";
import { CATEGORIES } from "../data/categories";
import { PASTE_PLACEHOLDER, SAMPLES } from "../data/samples";
import type { EnabledMap, PreviewView } from "../types";

interface ComposerProps {
  raw: string;
  sampleId: string | null;
  dragging: boolean;
  enabled: EnabledMap;
  view: PreviewView;
  maskOriginal: boolean;
  onRawChange: (value: string) => void;
  onSample: (id: string) => void;
  onToggle: (id: keyof EnabledMap) => void;
  onView: (view: PreviewView) => void;
  onMask: (value: boolean) => void;
  onPickFile: () => void;
  onDragState: (value: boolean) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export function Composer({
  raw,
  sampleId,
  dragging,
  enabled,
  view,
  maskOriginal,
  onRawChange,
  onSample,
  onToggle,
  onView,
  onMask,
  onPickFile,
  onDragState,
  onDrop,
}: ComposerProps) {
  return (
    <section
      className={`composer${dragging ? " is-dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragState(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        onDragState(false);
      }}
      onDrop={onDrop}
    >
      <div className="composer-head">
        <h2>Transcript</h2>
        <p>Pick a fake sample, paste a log, or drop a `.txt` / `.md` / `.json`.</p>
      </div>
      <div className="sample-row" role="list">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            role="listitem"
            className={sampleId === sample.id ? "chip is-on" : "chip"}
            onClick={() => onSample(sample.id)}
          >
            <span className="chip-top">{sample.label}</span>
            <small>{sample.blurb}</small>
          </button>
        ))}
      </div>

      <p className="editor-label">Heuristic categories</p>
      <div className="cat-row" role="group" aria-label="Redaction categories">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={enabled[category.id] ? "cat-chip is-on" : "cat-chip"}
            aria-pressed={enabled[category.id]}
            title={category.blurb}
            onClick={() => onToggle(category.id)}
          >
            {category.label}
            {category.defaultOn ? null : <em>opt</em>}
          </button>
        ))}
      </div>

      <label className="editor-label" htmlFor="transcript-input">
        Paste
      </label>
      <textarea
        id="transcript-input"
        value={raw}
        onChange={(event) => onRawChange(event.target.value)}
        placeholder={PASTE_PLACEHOLDER}
        spellCheck={false}
        autoComplete="off"
      />
      <div className="composer-foot">
        <button type="button" className="text-btn" onClick={onPickFile}>
          Upload transcript
        </button>
        <span>
          {raw.trim()
            ? `${raw.length.toLocaleString()} chars · stays in this tab`
            : "Client-side only · no API"}
        </span>
      </div>

      <div className="view-row">
        <div className="view-toggle" role="group" aria-label="Preview">
          {(["original", "redacted", "split"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={view === item ? "view-chip is-on" : "view-chip"}
              aria-pressed={view === item}
              onClick={() => onView(item)}
            >
              {item === "original" ? "Original" : item === "redacted" ? "Redacted" : "Split"}
            </button>
          ))}
        </div>
        <label className="mask-toggle">
          <input
            type="checkbox"
            checked={maskOriginal}
            onChange={(event) => onMask(event.target.checked)}
          />
          Mask original preview
        </label>
      </div>

      <p className="disclaimer">
        Heuristic demo. Not a security audit, not compliance, not legal advice.
        Judgment stays human. Never paste real production secrets into a random
        site — this one is local-only, and still.
      </p>
    </section>
  );
}
