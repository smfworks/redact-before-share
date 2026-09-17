import type { RedactionResult } from "../types.ts";

const SHARE_URL = "https://github.com/smfworks/redact-before-share";

export function formatStampTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${dd} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} · ${hh}:${mm} UTC`;
}

export function formatShareText(result: RedactionResult): string {
  const lines = [
    `🧾 Redact Before Share · ${result.id}`,
    `${result.total} removal${result.total === 1 ? "" : "s"} · ${result.categories.length} categor${result.categories.length === 1 ? "y" : "ies"}`,
    "",
  ];
  if (!result.total) {
    lines.push("No heuristic matches. Still read it.");
  } else {
    for (const row of result.categories) {
      const samples = row.placeholders.join(" ");
      lines.push(`${row.count}× ${row.label} → ${samples}`);
    }
  }
  lines.push(
    "",
    "Heuristic demo · not a security audit · values never appear on the receipt",
    "Redact Before Share · SMF Works",
    SHARE_URL,
  );
  return lines.join("\n");
}

export function formatCompactStats(result: RedactionResult): string {
  if (result.empty) return "Waiting for a transcript";
  return `${result.total} removal${result.total === 1 ? "" : "s"} · ${result.categories.length} categor${result.categories.length === 1 ? "y" : "ies"} · ${result.id}`;
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "receipt";
}
