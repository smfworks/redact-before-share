/** Vendored from smfworks/smf-kit-secrets. Edit that repo, then copy. */
/** Canonical token / key prefixes for SMF viral apps. Keep Redact and Skill Lint on this file. */

export type TokenKind =
  | "sk-token"
  | "xai-token"
  | "github-pat"
  | "slack"
  | "npm-token"
  | "google-key"
  | "aws-key"
  | "bearer"
  | "jwt"
  | "private-key";

export interface TokenSpec {
  kind: TokenKind;
  placeholder: string;
  regex: RegExp;
  group?: number;
}

export interface TokenHit {
  kind: TokenKind;
  placeholder: string;
  start: number;
  end: number;
}

export const TOKEN_SPECS: TokenSpec[] = [
  {
    kind: "sk-token",
    placeholder: "[REDACTED_API_KEY]",
    regex: /\bsk-(?:svcacct|live|test|proj|ant|admin)?-?[A-Za-z0-9_-]{12,}\b/g,
  },
  {
    kind: "xai-token",
    placeholder: "[REDACTED_API_KEY]",
    regex: /\bxai-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    kind: "github-pat",
    placeholder: "[REDACTED_GITHUB_TOKEN]",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    kind: "slack",
    placeholder: "[REDACTED_SLACK_TOKEN]",
    regex: /\bxox[baprs]-[\dA-Za-z_-]{10,}\b/g,
  },
  {
    kind: "npm-token",
    placeholder: "[REDACTED_API_KEY]",
    regex: /\bnpm_[A-Za-z0-9]{20,}\b/g,
  },
  {
    kind: "google-key",
    placeholder: "[REDACTED_API_KEY]",
    regex: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  },
  {
    kind: "aws-key",
    placeholder: "[REDACTED_AWS_KEY]",
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    kind: "bearer",
    placeholder: "[REDACTED_BEARER]",
    regex: /\bBearer\s+([A-Za-z0-9._\-+=/]{20,})/gi,
    group: 1,
  },
  {
    kind: "jwt",
    placeholder: "[REDACTED_JWT]",
    regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  },
  {
    kind: "private-key",
    placeholder: "[REDACTED_PRIVATE_KEY]",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
];

const PLACEHOLDER =
  /^(?:YOUR[_-]?[A-Z0-9_]+|REPLACE[_-]?ME|REDACTED|TODO|CHANGEME|xxx+)$/i;

export function findTokenHits(source: string): TokenHit[] {
  const hits: TokenHit[] = [];
  for (const spec of TOKEN_SPECS) {
    spec.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = spec.regex.exec(source))) {
      const raw = match[0];
      let start = match.index;
      let end = match.index + raw.length;
      if (spec.group != null) {
        const piece = match[spec.group];
        if (!piece || PLACEHOLDER.test(piece)) continue;
        const inner = raw.indexOf(piece);
        if (inner < 0) continue;
        start = match.index + inner;
        end = start + piece.length;
      } else if (PLACEHOLDER.test(raw)) {
        continue;
      }
      hits.push({ kind: spec.kind, placeholder: spec.placeholder, start, end });
      if (spec.regex.lastIndex === match.index) spec.regex.lastIndex += 1;
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: TokenHit[] = [];
  for (const hit of hits) {
    const last = merged[merged.length - 1];
    if (last && hit.start < last.end) continue;
    merged.push(hit);
  }
  return merged;
}
