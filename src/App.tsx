import { SAMPLES, sampleById } from "./data/samples";
import { defaultEnabled } from "./data/categories";
import { redact } from "./lib/redact";
import { copyText, downloadBlob, cardToPngBlob } from "./lib/exportImage";
import { formatCompactStats, formatShareText, slugify } from "./lib/share";
import type { EnabledMap, PreviewView } from "./types";
import { Actions } from "./components/Actions";
import { Composer } from "./components/Composer";
import { Header } from "./components/Header";
import { PreviewPanes } from "./components/PreviewPanes";
import { ReceiptCard } from "./components/ReceiptCard";
import { SisterStrip } from "./components/SisterStrip";
import { HandoffBanner } from "./components/HandoffBanner";
import { Toast } from "./components/Toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";

export default function App() {
  const [raw, setRaw] = useState("");
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<EnabledMap>(() => defaultEnabled());
  const [view, setView] = useState<PreviewView>("split");
  const [maskOriginal, setMaskOriginal] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<"png" | "share" | "copy" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const frameRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const loadSample = useCallback((id: string) => {
    const sample = sampleById(id);
    if (!sample) return;
    setRaw(sample.text);
    setSampleId(sample.id);
    setNow(new Date());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sample = params.get("sample");
    const shot = params.get("shot");
    const requestedView = params.get("view");
    const mask = params.get("mask");
    if (shot === "card" || shot === "og") {
      document.body.classList.add(`shot-${shot}`);
    }
    if (requestedView === "split" || requestedView === "original" || requestedView === "redacted") {
      setView(requestedView);
    }
    if (mask === "0" || mask === "off") setMaskOriginal(false);
    if (mask === "1" || mask === "on") setMaskOriginal(true);
    loadSample(sampleById(sample)?.id ?? SAMPLES[0].id);
  }, [loadSample]);

  const result = useMemo(() => redact(raw, enabled, now), [raw, enabled, now]);
  const ready = !result.empty;

  const onRawChange = useCallback((value: string) => {
    setSampleId(null);
    setNow(new Date());
    setRaw(value);
  }, []);

  const onToggle = useCallback((id: keyof EnabledMap) => {
    setEnabled((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const onFile = useCallback(async (file: File) => {
    const text = await file.text();
    setSampleId(null);
    setNow(new Date());
    setRaw(text);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files[0];
      if (!file) {
        const dropped = event.dataTransfer.getData("text/plain");
        if (dropped) onRawChange(dropped);
        return;
      }
      const name = file.name.toLowerCase();
      if (
        !name.endsWith(".md") &&
        !name.endsWith(".markdown") &&
        !name.endsWith(".txt") &&
        !name.endsWith(".json") &&
        !name.endsWith(".log")
      ) {
        showToast("Drop a .txt, .md, .json, or .log file.");
        return;
      }
      void onFile(file);
    },
    [onFile, onRawChange, showToast],
  );

  const reset = useCallback(() => {
    setRaw("");
    setSampleId(null);
    setEnabled(defaultEnabled());
    setView("split");
    setMaskOriginal(true);
    setNow(new Date());
    showToast("Cleared.");
  }, [showToast]);

  const withFrame = useCallback(async () => {
    const node = frameRef.current;
    if (!node || result.empty) throw new Error("Nothing to print yet.");
    node.classList.add("is-exporting");
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    try {
      return await cardToPngBlob(node);
    } finally {
      node.classList.remove("is-exporting");
    }
  }, [result.empty]);

  const downloadPng = useCallback(async () => {
    if (!ready) return;
    setBusy("png");
    try {
      const blob = await withFrame();
      downloadBlob(blob, `redact-before-share-${slugify(sampleId ?? result.id)}.png`);
      showToast("PNG downloaded.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "PNG export failed.");
    } finally {
      setBusy(null);
    }
  }, [ready, result.id, sampleId, showToast, withFrame]);

  const copyShare = useCallback(async () => {
    if (!ready) return;
    setBusy("share");
    try {
      await copyText(formatShareText(result));
      showToast("Share text copied.");
    } catch {
      showToast("Could not copy share text.");
    } finally {
      setBusy(null);
    }
  }, [ready, result, showToast]);

  const copyRedacted = useCallback(async () => {
    if (!ready) return;
    setBusy("copy");
    try {
      await copyText(result.redacted);
      showToast("Redacted transcript copied.");
    } catch {
      showToast("Could not copy transcript.");
    } finally {
      setBusy(null);
    }
  }, [ready, result.redacted, showToast]);

  const live = ready ? formatCompactStats(result) : "Waiting for a transcript";

  return (
    <div className="page">
      <div className="ambient" aria-hidden="true" />
      <Header />
      <SisterStrip current="redact-before-share" payload={result?.redacted || raw} />
      <HandoffBanner onPaste={(text) => { setRaw(text); setSampleId(null); }} />
      <main className="layout">
        <div className="left-col">
          <Composer
            raw={raw}
            sampleId={sampleId}
            dragging={dragging}
            enabled={enabled}
            view={view}
            maskOriginal={maskOriginal}
            onRawChange={onRawChange}
            onSample={loadSample}
            onToggle={onToggle}
            onView={setView}
            onMask={setMaskOriginal}
            onPickFile={() => fileRef.current?.click()}
            onDragState={setDragging}
            onDrop={onDrop}
          />
          <PreviewPanes
            original={raw}
            result={result}
            view={view}
            maskOriginal={maskOriginal}
          />
        </div>
        <section className="stage" aria-label="Removal receipt">
          <p className="sr-only" aria-live="polite">
            {live}
          </p>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept=".md,.markdown,.txt,.json,.log,text/markdown,text/plain,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
              event.target.value = "";
            }}
          />
          <div className="stage-scroll">
            <div ref={frameRef} className="export-frame">
              <ReceiptCard result={result} />
            </div>
          </div>
          {ready ? <p className="stage-stats">{formatCompactStats(result)}</p> : null}
          <Actions
            disabled={!ready}
            copyDisabled={!ready}
            busy={busy}
            onDownloadPng={() => void downloadPng()}
            onCopyShare={() => void copyShare()}
            onCopyRedacted={() => void copyRedacted()}
            onReset={reset}
          />
        </section>
      </main>
      <footer className="site-foot">
        <p>Redact Before Share · SMF Works</p>
        <p>
          Sister apps:{" "}
          <a href="https://github.com/smfworks/paste-to-skill" rel="noreferrer" target="_blank">
            Paste → Skill
          </a>
          {" — create · "}
          <a href="https://github.com/smfworks/skill-card" rel="noreferrer" target="_blank">
            Skill Card
          </a>
          {" — one-pager · "}
          <a href="https://github.com/smfworks/skill-lint" rel="noreferrer" target="_blank">
            Skill Lint
          </a>
          {" — grade · "}
          <a href="https://github.com/smfworks/refuse-card" rel="noreferrer" target="_blank">
            Refuse Card
          </a>
          {" — the gate · "}
          <a href="https://github.com/smfworks/agent-receipt" rel="noreferrer" target="_blank">
            Agent Receipt
          </a>
          {" — what ran · "}
          <a href="https://github.com/smfworks/prompt-diff" rel="noreferrer" target="_blank">
            Prompt Diff
          </a>
          {" — what changed."}
        </p>
        <p>Intelligence is abundant. Judgment is the product.</p>
        <p>
          Heuristic scrubber (US-ish phones, Luhn cards, known token prefixes). Not an audit.
        </p>
        <p>
          MIT · Built by{" "}
          <a href="https://smfworks.com" rel="noreferrer" target="_blank">
            SMF Works
          </a>
          {" · "}
          <a href="https://github.com/smfworks/redact-before-share" rel="noreferrer" target="_blank">
            GitHub
          </a>
          {" · "}
          <a href="https://x.com/MichaelGannotti" rel="noreferrer" target="_blank">
            @MichaelGannotti
          </a>
        </p>
        <p className="fineprint">
          Lab demo / heuristic — not a compliance product. It will miss things and
          it will over-redact. Never paste real production secrets into a random
          site. This app does not upload your transcript (no backend, no auth, no
          API keys), but a compromised machine or a screenshot of the unmasked
          original can still leak. Read the redacted text before you share it.
        </p>
      </footer>
      <Toast message={toast} />
    </div>
  );
}
