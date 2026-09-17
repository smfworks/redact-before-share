import type { RedactionResult } from "../types";
import { formatStampTime } from "../lib/share";

interface ReceiptCardProps {
  result: RedactionResult;
}

function barcodeBars(id: string): number[] {
  const bars: number[] = [];
  for (let i = 0; i < 28; i += 1) {
    const code = id.charCodeAt(i % id.length) + i * 7;
    bars.push(1 + (code % 4));
  }
  return bars;
}

export function ReceiptCard({ result }: ReceiptCardProps) {
  const empty = result.empty;
  const rows = result.categories;

  return (
    <article className={empty ? "receipt is-empty" : "receipt"}>
      <header className="r-top">
        <p className="r-kicker">SMF Works</p>
        <h2>Redact Before Share</h2>
        <p className="r-sub">Human-AI lab · removal receipt</p>
      </header>

      <div className="r-meta">
        <span>NO. {result.id}</span>
        <span>{empty ? "READY" : formatStampTime(result.redactedAt)}</span>
      </div>

      <div className="perforation" aria-hidden="true">
        <span />
      </div>

      <section className="r-hero">
        <p className="r-label">Work scrubbed</p>
        <h3>
          {empty
            ? "Waiting for a transcript"
            : `${result.total} removal${result.total === 1 ? "" : "s"}`}
        </h3>
        <p className="r-summary">{result.summary}</p>
      </section>

      <div className="r-rule" />

      <section className="r-lines">
        <div className="r-cols">
          <span>QTY</span>
          <span>KIND</span>
          <span>TOKEN</span>
        </div>
        {rows.length ? (
          rows.map((row) => (
            <div className="r-line" key={row.id}>
              <span className="qty">{row.count}</span>
              <span className="item">{row.label}</span>
              <span className="ph">{row.placeholders[0]}</span>
            </div>
          ))
        ) : (
          <div className="r-line muted">
            <span className="qty">0</span>
            <span className="item">no heuristic matches</span>
            <span className="ph">—</span>
          </div>
        )}
        <div className="r-line r-total">
          <span className="qty">{result.total}</span>
          <span className="item">total removals</span>
          <span className="ph" />
        </div>
      </section>

      <section className="coupon">
        <p className="r-label">Lab note</p>
        <p className="coupon-line">
          Heuristic demo. Not an audit. Values never appear on this card.
        </p>
      </section>

      <div className="perforation" aria-hidden="true">
        <span />
      </div>

      <div className="barcode" aria-hidden="true">
        {barcodeBars(result.id).map((width, index) => (
          <i key={index} style={{ width }} />
        ))}
      </div>

      <footer className="r-foot">
        <p>SMF Works · Redact Before Share</p>
        <p className="r-link">smfworks.com</p>
        <p className="r-motto">Judgment stays human.</p>
      </footer>
    </article>
  );
}
