import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultEnabled } from "../data/categories.ts";
import { SAMPLES } from "../data/samples.ts";
import { redact } from "./redact.ts";
import { formatCompactStats, formatShareText, formatStampTime, slugify } from "./share.ts";

const NOW = new Date("2026-09-17T11:20:00Z");

const FAKE_SECRETS = [
  "sk-test-FAKESECRET_a2b3c4d5e6f7g8h9i0j1",
  "ghp_demoFakeTokenNotReal000111222333444",
  "AKIAIOSFODNN7EXAMPLE",
  "alex.demo@smfworks.example",
  "4111 1111 1111 1111",
];

describe("formatShareText", () => {
  it("prints counts, placeholders, and the SMF footer — never secret values", () => {
    const result = redact(SAMPLES[0].text, defaultEnabled(), NOW);
    const text = formatShareText(result);
    assert.match(text, /^🧾 Redact Before Share · RB-/);
    assert.match(text, /\[REDACTED_API_KEY\]/);
    assert.match(text, /Heuristic demo/);
    assert.match(text, /https:\/\/github.com\/smfworks\/redact-before-share/);
    for (const secret of FAKE_SECRETS) {
      assert.equal(text.includes(secret), false, `share text leaked ${secret}`);
    }
  });

  it("handles a clean paste", () => {
    const result = redact("hello from the lab", defaultEnabled(), NOW);
    const text = formatShareText(result);
    assert.match(text, /No heuristic matches/);
  });
});

describe("formatCompactStats", () => {
  it("summarizes removals", () => {
    const result = redact(SAMPLES[0].text, defaultEnabled(), NOW);
    const stats = formatCompactStats(result);
    assert.match(stats, /\d+ removals? · \d+ categor/);
    assert.match(stats, /RB-[0-9A-F]{4}/);
  });
});

describe("formatStampTime", () => {
  it("prints a UTC lab stamp", () => {
    assert.equal(formatStampTime("2026-09-17T11:20:00Z"), "17 Sep 2026 · 11:20 UTC");
  });
});

describe("slugify", () => {
  it("kebabs a title", () => {
    assert.equal(slugify("Leaky Cursor"), "leaky-cursor");
  });
});
