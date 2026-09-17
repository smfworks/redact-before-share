import { toBlob, toPng } from "html-to-image";

const OPTIONS = {
  pixelRatio: 3,
  cacheBust: true,
  backgroundColor: "#0A0F1F",
} as const;

export async function cardToPngDataUrl(node: HTMLElement): Promise<string> {
  return toPng(node, OPTIONS);
}

export async function cardToPngBlob(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, OPTIONS);
  if (!blob) throw new Error("Could not render the removal receipt image.");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyImageBlob(blob: Blob): Promise<void> {
  const ClipboardItemCtor = window.ClipboardItem;
  if (!navigator.clipboard || !ClipboardItemCtor) {
    throw new Error("Clipboard images are not supported in this browser.");
  }
  try {
    await navigator.clipboard.write([new ClipboardItemCtor({ "image/png": blob })]);
  } catch {
    await navigator.clipboard.write([
      new ClipboardItemCtor({
        "image/png": Promise.resolve(blob) as Promise<Blob>,
      }),
    ]);
  }
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
