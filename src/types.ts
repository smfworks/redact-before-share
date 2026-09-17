export const SCHEMA_VERSION = "redact-before-share/v1" as const;

export type CategoryId =
  | "token_prefix"
  | "bearer"
  | "aws"
  | "assignment"
  | "email"
  | "phone"
  | "card"
  | "private_ip";

export type PreviewView = "original" | "redacted" | "split";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  short: string;
  placeholder: string;
  defaultOn: boolean;
  blurb: string;
}

export interface Hit {
  category: CategoryId;
  placeholder: string;
  start: number;
  end: number;
}

export interface CategoryCount {
  id: CategoryId;
  label: string;
  count: number;
  placeholders: string[];
}

export interface TextSegment {
  text: string;
  hit: Hit | null;
}

/** JSON other tools can emit so Redact Before Share can print a card. */
export interface RedactionResult {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  heuristic: true;
  redactedAt: string;
  originalLength: number;
  total: number;
  categories: CategoryCount[];
  redacted: string;
  hits: Hit[];
  empty: boolean;
  enabled: CategoryId[];
  summary: string;
}

export interface SampleMeta {
  id: string;
  file: string;
  label: string;
  blurb: string;
  text: string;
}

export type EnabledMap = Record<CategoryId, boolean>;
