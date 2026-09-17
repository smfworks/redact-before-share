interface ActionsProps {
  disabled: boolean;
  copyDisabled: boolean;
  busy: "png" | "share" | "copy" | null;
  onDownloadPng: () => void;
  onCopyShare: () => void;
  onCopyRedacted: () => void;
  onReset: () => void;
}

export function Actions({
  disabled,
  copyDisabled,
  busy,
  onDownloadPng,
  onCopyShare,
  onCopyRedacted,
  onReset,
}: ActionsProps) {
  return (
    <div className="actions">
      <button
        type="button"
        className="btn btn-ember"
        disabled={disabled || busy !== null}
        onClick={onDownloadPng}
      >
        {busy === "png" ? "Printing…" : "Download PNG"}
      </button>
      <button
        type="button"
        className="btn"
        disabled={disabled || busy !== null}
        onClick={onCopyShare}
      >
        {busy === "share" ? "Copying…" : "Copy share text"}
      </button>
      <button
        type="button"
        className="btn"
        disabled={copyDisabled || busy !== null}
        onClick={onCopyRedacted}
      >
        {busy === "copy" ? "Copying…" : "Copy redacted transcript"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
