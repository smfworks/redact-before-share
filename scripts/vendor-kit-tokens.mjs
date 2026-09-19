#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const url =
  process.env.SMF_KIT_SECRETS_URL ||
  "https://raw.githubusercontent.com/smfworks/smf-kit-secrets/main/src/tokens.ts";
const res = await fetch(url);
if (!res.ok) {
  throw new Error(`vendor:secrets failed: ${res.status} ${url}`);
}
const source = await res.text();
const header =
  "/** Vendored from smfworks/smf-kit-secrets via `npm run vendor:secrets`. Do not edit by hand. */\n";
const body = header + source.replace(/^\/\*\* Vendored from[\s\S]*?\*\/\n/, "");
const out = join(dirname(fileURLToPath(import.meta.url)), "../src/lib/kit-tokens.ts");
writeFileSync(out, body);
console.log(`wrote ${out}`);
