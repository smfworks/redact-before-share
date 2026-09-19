import { CATEGORIES, CATEGORY_BY_ID } from "../data/categories.ts";
import type {
  CategoryCount,
  CategoryId,
  EnabledMap,
  Hit,
  RedactionResult,
  TextSegment,
} from "../types.ts";
import { SCHEMA_VERSION } from "../types.ts";

const PRIORITY: Record<CategoryId, number> = {
  token_prefix: 0,
  aws: 1,
  bearer: 2,
  assignment: 3,
  card: 4,
  email: 5,
  phone: 6,
  private_ip: 7,
};

const SKIP_VALUE =
  /^(?:YOUR[_-]?[A-Z0-9_]+|REPLACE[_-]?ME|REDACTED|TODO|CHANGEME|xxx+|\[REDACTED[^\]]*\])$/i;

interface Pattern {
  category: CategoryId;
  placeholder: string;
  regex: RegExp;
  group?: number;
}

/** Keep token prefixes in sync with skill-lint/src/lib/secrets.ts. */
const TOKEN_PATTERNS: Pattern[] = [
  {
    category: "token_prefix",
    placeholder: "[REDACTED_API_KEY]",
    regex: /\bsk-(?:svcacct|live|test|proj|ant|admin)?-?[A-Za-z0-9_-]{12,}\b/g,
  },
  {
    category: "token_prefix",
    placeholder: "[REDACTED_API_KEY]",
    regex: /\bxai-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    category: "token_prefix",
    placeholder: "[REDACTED_GITHUB_TOKEN]",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g,
  },
  {
    category: "token_prefix",
    placeholder: "[REDACTED_GITHUB_TOKEN]",
    regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    category: "token_prefix",
    placeholder: "[REDACTED_SLACK_TOKEN]",
    regex: /\bxox[baprs]-[\dA-Za-z_-]{10,}\b/g,
  },
  {
    category: "token_prefix",
    placeholder: "[REDACTED_API_KEY]",
    regex: /\bnpm_[A-Za-z0-9]{20,}\b/g,
  },
  {
    category: "token_prefix",
    placeholder: "[REDACTED_API_KEY]",
    regex: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  },
  {
    category: "aws",
    placeholder: "[REDACTED_AWS_KEY]",
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    category: "bearer",
    placeholder: "[REDACTED_BEARER]",
    regex: /\bBearer\s+([A-Za-z0-9._\-+=/]{20,})/gi,
    group: 1,
  },
  {
    category: "bearer",
    placeholder: "[REDACTED_JWT]",
    regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  },
  {
    category: "assignment",
    placeholder: "[REDACTED_SECRET]",
    regex:
      /((?:password|passwd|pwd|secret|api[_-]?key|secret[_-]?key|access[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret|webhook[_-]?secret)(?:[_-][A-Za-z0-9]+)*)\s*[=:]\s*(['"]?)([^\s'"]{4,})\2/gi,
    group: 3,
  },
  {
    category: "email",
    placeholder: "[REDACTED_EMAIL]",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
];

function collectRegexHits(source: string, enabled: EnabledMap): Hit[] {
  const hits: Hit[] = [];
  for (const pattern of TOKEN_PATTERNS) {
    if (!enabled[pattern.category]) continue;
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(source))) {
      const raw = match[0];
      if (pattern.category === "email" && /^git@/i.test(raw)) continue;
      let start = match.index;
      let end = match.index + raw.length;
      if (pattern.group != null) {
        const piece = match[pattern.group];
        if (!piece) continue;
        const inner = raw.indexOf(piece);
        if (inner < 0) continue;
        start = match.index + inner;
        end = start + piece.length;
        if (SKIP_VALUE.test(piece)) continue;
      } else if (SKIP_VALUE.test(raw)) {
        continue;
      }
      hits.push({
        category: pattern.category,
        placeholder: pattern.placeholder,
        start,
        end,
      });
      if (pattern.regex.lastIndex === match.index) pattern.regex.lastIndex += 1;
    }
  }
  return hits;
}

function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function findCards(source: string): Hit[] {
  const hits: Hit[] = [];
  const grouped =
    /\b(?:\d{4}[ -]){3}\d{3,4}\b|\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b/g;
  let match: RegExpExecArray | null;
  while ((match = grouped.exec(source))) {
    const digits = match[0].replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) continue;
    if (!luhn(digits)) continue;
    hits.push({
      category: "card",
      placeholder: "[REDACTED_CARD]",
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  const ungrouped = /\b\d{13,19}\b/g;
  while ((match = ungrouped.exec(source))) {
    if (!luhn(match[0])) continue;
    hits.push({
      category: "card",
      placeholder: "[REDACTED_CARD]",
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return hits;
}

function findPhones(source: string): Hit[] {
  const hits: Hit[] = [];
  const patterns = [
    /\+\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    /\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
  ];
  for (const regex of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source))) {
      const digits = match[0].replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) continue;
      hits.push({
        category: "phone",
        placeholder: "[REDACTED_PHONE]",
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  return hits;
}

function findPrivateIps(source: string): Hit[] {
  const hits: Hit[] = [];
  const regex = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    const octets = match.slice(1, 5).map(Number);
    if (octets.some((n) => n > 255)) continue;
    const [a, b] = octets;
    const privateIp =
      a === 10 ||
      a === 127 ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31);
    if (!privateIp) continue;
    hits.push({
      category: "private_ip",
      placeholder: "[REDACTED_PRIVATE_IP]",
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return hits;
}

function mergeHits(hits: Hit[]): Hit[] {
  const sorted = [...hits].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const pa = PRIORITY[a.category];
    const pb = PRIORITY[b.category];
    if (pa !== pb) return pa - pb;
    return b.end - b.start - (a.end - a.start);
  });
  const merged: Hit[] = [];
  for (const hit of sorted) {
    const last = merged[merged.length - 1];
    if (last && hit.start < last.end) continue;
    merged.push(hit);
  }
  return merged;
}

export function receiptId(source: string, enabled: CategoryId[]): string {
  const seed = `${source}\0${enabled.join(",")}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `RB-${(hash >>> 0).toString(16).toUpperCase().padStart(4, "0").slice(-4)}`;
}

export function applyHits(source: string, hits: Hit[]): string {
  if (!hits.length) return source;
  let output = "";
  let cursor = 0;
  for (const hit of hits) {
    output += source.slice(cursor, hit.start);
    output += hit.placeholder;
    cursor = hit.end;
  }
  output += source.slice(cursor);
  return output;
}

export function segmentText(source: string, hits: Hit[]): TextSegment[] {
  if (!hits.length) return [{ text: source, hit: null }];
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start > cursor) {
      segments.push({ text: source.slice(cursor, hit.start), hit: null });
    }
    segments.push({ text: source.slice(hit.start, hit.end), hit });
    cursor = hit.end;
  }
  if (cursor < source.length) {
    segments.push({ text: source.slice(cursor), hit: null });
  }
  return segments;
}

function countCategories(hits: Hit[]): CategoryCount[] {
  const map = new Map<CategoryId, CategoryCount>();
  for (const hit of hits) {
    const existing = map.get(hit.category);
    if (existing) {
      existing.count += 1;
      if (!existing.placeholders.includes(hit.placeholder)) {
        existing.placeholders.push(hit.placeholder);
      }
    } else {
      map.set(hit.category, {
        id: hit.category,
        label: CATEGORY_BY_ID[hit.category].label,
        count: 1,
        placeholders: [hit.placeholder],
      });
    }
  }
  return CATEGORIES.map((item) => map.get(item.id)).filter(
    (item): item is CategoryCount => Boolean(item),
  );
}

function summarize(total: number, categories: CategoryCount[]): string {
  if (total === 0) {
    return "No heuristic matches. Still read it. This is not an audit.";
  }
  const kinds = categories.length;
  return `Scrubbed ${total} item${total === 1 ? "" : "s"} across ${kinds} categor${kinds === 1 ? "y" : "ies"}.`;
}

export function findHits(source: string, enabled: EnabledMap): Hit[] {
  const hits = collectRegexHits(source, enabled);
  if (enabled.card) hits.push(...findCards(source));
  if (enabled.phone) hits.push(...findPhones(source));
  if (enabled.private_ip) hits.push(...findPrivateIps(source));
  return mergeHits(hits);
}

export function redact(
  source: string,
  enabled: EnabledMap,
  now = new Date(),
): RedactionResult {
  const trimmedEmpty = source.trim().length === 0;
  const enabledIds = CATEGORIES.filter((item) => enabled[item.id]).map((item) => item.id);
  if (trimmedEmpty) {
    return {
      schemaVersion: SCHEMA_VERSION,
      id: "RB-0000",
      heuristic: true,
      redactedAt: now.toISOString(),
      originalLength: 0,
      total: 0,
      categories: [],
      redacted: "",
      hits: [],
      empty: true,
      enabled: enabledIds,
      summary: "Paste a transcript. Scrub secrets. Share the receipt — not the keys.",
    };
  }
  const hits = findHits(source, enabled);
  const redacted = applyHits(source, hits);
  const categories = countCategories(hits);
  return {
    schemaVersion: SCHEMA_VERSION,
    id: receiptId(source, enabledIds),
    heuristic: true,
    redactedAt: now.toISOString(),
    originalLength: source.length,
    total: hits.length,
    categories,
    redacted,
    hits,
    empty: false,
    enabled: enabledIds,
    summary: summarize(hits.length, categories),
  };
}

export function maskSecret(text: string): string {
  const n = Math.min(28, Math.max(8, text.length));
  return "█".repeat(n);
}
