import { maskSecret, segmentText } from "../lib/redact";
import type { PreviewView, RedactionResult } from "../types";

interface PreviewPanesProps {
  original: string;
  result: RedactionResult;
  view: PreviewView;
  maskOriginal: boolean;
}

function OriginalBody({
  original,
  result,
  maskOriginal,
}: {
  original: string;
  result: RedactionResult;
  maskOriginal: boolean;
}) {
  if (!original.trim()) {
    return <p className="preview-empty">Original appears here. Hits can be masked.</p>;
  }
  const segments = segmentText(original, result.hits);
  return (
    <pre className="preview-pre">
      {segments.map((segment, index) =>
        segment.hit ? (
          <mark
            key={index}
            className={maskOriginal ? "hit is-masked" : "hit"}
            title={segment.hit.placeholder}
          >
            {maskOriginal ? maskSecret(segment.text) : segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </pre>
  );
}

export function PreviewPanes({ original, result, view, maskOriginal }: PreviewPanesProps) {
  const showOriginal = view === "original" || view === "split";
  const showRedacted = view === "redacted" || view === "split";

  return (
    <div className={view === "split" ? "preview-grid is-split" : "preview-grid"}>
      {showOriginal ? (
        <article className="preview-pane">
          <header>
            <strong>Original</strong>
            <span>{maskOriginal ? "masked hits" : "hits highlighted"}</span>
          </header>
          <OriginalBody original={original} result={result} maskOriginal={maskOriginal} />
        </article>
      ) : null}
      {showRedacted ? (
        <article className="preview-pane">
          <header>
            <strong>Redacted</strong>
            <span>clean export</span>
          </header>
          {result.empty ? (
            <p className="preview-empty">Clean text lands here after a paste.</p>
          ) : (
            <pre className="preview-pre">{result.redacted}</pre>
          )}
        </article>
      ) : null}
    </div>
  );
}
