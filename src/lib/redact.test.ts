import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATEGORIES, defaultEnabled } from "../data/categories.ts";
import { SAMPLES } from "../data/samples.ts";
import type { EnabledMap } from "../types.ts";
import { applyHits, findHits, receiptId, redact, segmentText } from "./redact.ts";

const NOW = new Date("2026-09-17T11:20:00Z");

const FAKE_SECRETS = [
  "sk-test-FAKESECRET_a2b3c4d5e6f7g8h9i0j1",
  "ghp_demoFakeTokenNotReal000111222333444",
  "demo-not-a-real-password-99",
  "AKIAIOSFODNN7EXAMPLE",
  "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "alex.demo@smfworks.example",
  "xoxb-123456789012-FAKESECRET_c3d4e5f6g7h8i9j0k1l2",
  "jordan.demo@example.com",
  "+1 555 010 0199",
  "(555) 010-4477",
  "fakeDemoSignatureNotReal",
  "4111 1111 1111 1111",
  "5555555555554444",
  "sk-test-FAKESECRET_stripe_demo_only_xx",
  "demo_webhook_secret_not_real",
  "buyer.demo@example.com",
  "555-010-2211",
];

function allOn(): EnabledMap {
  return Object.fromEntries(CATEGORIES.map((item) => [item.id, true])) as EnabledMap;
}

function allOff(): EnabledMap {
  return Object.fromEntries(CATEGORIES.map((item) => [item.id, false])) as EnabledMap;
}

describe("redact empty", () => {
  it("returns an empty receipt for blank paste", () => {
    const result = redact("   \n", defaultEnabled(), NOW);
    assert.equal(result.empty, true);
    assert.equal(result.id, "RB-0000");
    assert.equal(result.total, 0);
    assert.equal(result.heuristic, true);
    assert.match(result.summary, /Paste a transcript/);
  });
});

describe("token prefixes", () => {
  it("redacts sk- / ghp_ / xoxb- style prefixes", () => {
    const source = [
      "key sk-test-FAKESECRET_a2b3c4d5e6f7g8h9i0j1",
      "tok ghp_demoFakeTokenNotReal000111222333444",
      "slack xoxb-123456789012-FAKESECRET_c3d4e5f6g7h8i9j0k1l2",
    ].join("\n");
    const result = redact(source, defaultEnabled(), NOW);
    assert.equal(result.total, 3);
    assert.ok(result.redacted.includes("[REDACTED_API_KEY]"));
    assert.ok(result.redacted.includes("[REDACTED_GITHUB_TOKEN]"));
    assert.ok(result.redacted.includes("[REDACTED_SLACK_TOKEN]"));
    assert.equal(result.redacted.includes("sk-test-"), false);
    assert.equal(result.redacted.includes("ghp_"), false);
    assert.equal(result.redacted.includes("xoxb-"), false);
  });

  it("leaves prefixes in place when the token chip is off", () => {
    const enabled = { ...defaultEnabled(), token_prefix: false };
    const source = "sk-test-FAKESECRET_a2b3c4d5e6f7g8h9i0j1";
    const result = redact(source, enabled, NOW);
    assert.equal(result.redacted.includes("sk-test-FAKESECRET_a2b3c4d5e6f7g8h9i0j1"), true);
  });
});

describe("bearer / JWT", () => {
  it("redacts Bearer tokens and standalone JWTs", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJpc3MiOiJzbWZ3b3Jrcy1sYWIifQ.fakeDemoSignatureNotReal";
    const source = `Authorization: Bearer ${jwt}\nX-Other: ${jwt}`;
    const result = redact(source, defaultEnabled(), NOW);
    assert.ok(result.total >= 2);
    assert.ok(result.redacted.includes("[REDACTED_BEARER]") || result.redacted.includes("[REDACTED_JWT]"));
    assert.equal(result.redacted.includes("fakeDemoSignatureNotReal"), false);
    assert.equal(result.redacted.includes("eyJhbGci"), false);
  });
});

describe("AWS-ish keys", () => {
  it("redacts AKIA access keys", () => {
    const result = redact("AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE", defaultEnabled(), NOW);
    assert.ok(result.redacted.includes("[REDACTED_AWS_KEY]"));
    assert.equal(result.redacted.includes("AKIAIOSFODNN7EXAMPLE"), false);
  });
});

describe("assignments", () => {
  it("redacts password= / secret= values, not the keys", () => {
    const source = "password=demo-not-a-real-password-99\nsecret=demo_webhook_secret_not_real";
    const result = redact(source, defaultEnabled(), NOW);
    assert.ok(result.redacted.includes("password=[REDACTED_SECRET]"));
    assert.ok(result.redacted.includes("secret=[REDACTED_SECRET]"));
    assert.equal(result.redacted.includes("demo-not-a-real-password-99"), false);
  });

  it("prefers a token-prefix match over assignment when they overlap", () => {
    const source = "OPENAI_API_KEY=sk-test-FAKESECRET_a2b3c4d5e6f7g8h9i0j1";
    const result = redact(source, defaultEnabled(), NOW);
    assert.ok(result.redacted.includes("[REDACTED_API_KEY]"));
    const tokenRow = result.categories.find((row) => row.id === "token_prefix");
    assert.ok(tokenRow);
    assert.equal(tokenRow.count, 1);
  });
});

describe("email / phone", () => {
  it("redacts emails and skips git@ hosts", () => {
    const source = "write alex.demo@smfworks.example and git@github.com:smfworks/lab.git";
    const result = redact(source, defaultEnabled(), NOW);
    assert.ok(result.redacted.includes("[REDACTED_EMAIL]"));
    assert.equal(result.redacted.includes("alex.demo@smfworks.example"), false);
    assert.ok(result.redacted.includes("git@github.com"));
  });

  it("redacts phone-ish numbers", () => {
    const source = "call +1 555 010 0199 or (555) 010-4477 or 555-010-2211";
    const result = redact(source, defaultEnabled(), NOW);
    assert.ok(result.total >= 3);
    assert.equal(result.redacted.includes("555 010 0199"), false);
    assert.equal(result.redacted.includes("010-4477"), false);
    assert.equal(result.redacted.includes("555-010-2211"), false);
    assert.ok(result.redacted.includes("[REDACTED_PHONE]"));
  });
});

describe("cards", () => {
  it("redacts grouped and Luhn-valid card-ish runs", () => {
    const source = "pan 4111 1111 1111 1111 alt 5555555555554444";
    const result = redact(source, defaultEnabled(), NOW);
    assert.equal(result.categories.some((row) => row.id === "card" && row.count === 2), true);
    assert.equal(result.redacted.includes("4111"), false);
    assert.equal(result.redacted.includes("5555555555554444"), false);
  });

  it("does not treat a non-Luhn 16-digit run as a card", () => {
    const source = "id 1234567890123456";
    const result = redact(source, defaultEnabled(), NOW);
    assert.equal(result.redacted.includes("1234567890123456"), true);
  });

  it("does not treat a non-Luhn grouped run as a card", () => {
    const source = "invoice 1234 5678 9012 3456";
    const result = redact(source, defaultEnabled(), NOW);
    assert.equal(result.redacted.includes("1234 5678 9012 3456"), true);
  });
});

describe("xAI / service-account prefixes", () => {
  it("redacts xai- and sk-svcacct- keys", () => {
    const source = [
      "xai-abcdefghijklmnopqrstuvwxyz0123456789ABCD",
      "sk-svcacct-abcdefghijklmnopqrstuvwxyz012345",
    ].join("\n");
    const result = redact(source, defaultEnabled(), NOW);
    assert.ok(result.redacted.includes("[REDACTED_API_KEY]"));
    assert.equal(result.redacted.includes("xai-abcdefghijklmnopqrstuvwxyz0123456789ABCD"), false);
    assert.equal(result.redacted.includes("sk-svcacct-"), false);
  });
});

describe("private IPs", () => {
  it("are off by default", () => {
    const source = "peer 10.0.0.42 and 192.168.1.20 and 8.8.8.8";
    const result = redact(source, defaultEnabled(), NOW);
    assert.ok(result.redacted.includes("10.0.0.42"));
    assert.ok(result.redacted.includes("192.168.1.20"));
    assert.ok(result.redacted.includes("8.8.8.8"));
  });

  it("redact RFC1918 + loopback when enabled, not public IPs", () => {
    const source = "peer 10.0.0.42 and 192.168.1.20 and 127.0.0.1 and 8.8.8.8";
    const result = redact(source, allOn(), NOW);
    assert.equal(result.redacted.includes("10.0.0.42"), false);
    assert.equal(result.redacted.includes("192.168.1.20"), false);
    assert.equal(result.redacted.includes("127.0.0.1"), false);
    assert.ok(result.redacted.includes("8.8.8.8"));
    assert.ok(result.redacted.includes("[REDACTED_PRIVATE_IP]"));
  });
});

describe("merge / apply / segment", () => {
  it("does not leak values into the redacted text", () => {
    const source = SAMPLES.map((item) => item.text).join("\n\n");
    const result = redact(source, allOn(), NOW);
    for (const secret of FAKE_SECRETS) {
      assert.equal(
        result.redacted.includes(secret),
        false,
        `leaked ${secret}`,
      );
    }
  });

  it("is deterministic for the same paste and clock", () => {
    const paste = SAMPLES[0].text;
    const a = redact(paste, defaultEnabled(), NOW);
    const b = redact(paste, defaultEnabled(), NOW);
    assert.deepEqual(a, b);
    assert.match(a.id, /^RB-[0-9A-F]{4}$/);
  });

  it("receipt ids change when enabled categories change", () => {
    const paste = SAMPLES[0].text;
    const a = receiptId(paste, ["token_prefix"]);
    const b = receiptId(paste, ["token_prefix", "email"]);
    assert.notEqual(a, b);
  });

  it("segments original text with hit ranges", () => {
    const source = "hi sk-test-FAKESECRET_a2b3c4d5e6f7g8h9i0j1 bye";
    const hits = findHits(source, defaultEnabled());
    const segments = segmentText(source, hits);
    assert.ok(segments.some((item) => item.hit && item.text.startsWith("sk-test-")));
    assert.equal(applyHits(source, hits).includes("sk-test-"), false);
  });

  it("disabling every category is a no-op", () => {
    const paste = SAMPLES[0].text;
    const result = redact(paste, allOff(), NOW);
    assert.equal(result.total, 0);
    assert.equal(result.redacted, paste);
  });
});

describe("samples", () => {
  it("ships four fake transcripts", () => {
    assert.equal(SAMPLES.length, 4);
    for (const sample of SAMPLES) {
      assert.match(sample.text, /FAKE DEMO SECRETS/);
    }
  });

  it("leaky-cursor hits tokens, assignment, aws, and email", () => {
    const result = redact(SAMPLES[0].text, defaultEnabled(), NOW);
    const ids = result.categories.map((row) => row.id);
    assert.ok(ids.includes("token_prefix"));
    assert.ok(ids.includes("assignment"));
    assert.ok(ids.includes("aws"));
    assert.ok(ids.includes("email"));
    assert.ok(result.total >= 5);
  });

  it("openclaw-inbox hits slack, email, and phone", () => {
    const result = redact(SAMPLES[1].text, defaultEnabled(), NOW);
    const ids = result.categories.map((row) => row.id);
    assert.ok(ids.includes("token_prefix"));
    assert.ok(ids.includes("email"));
    assert.ok(ids.includes("phone"));
  });

  it("hermes-boot hits bearer/JWT and optional private IPs", () => {
    const off = redact(SAMPLES[2].text, defaultEnabled(), NOW);
    assert.ok(off.categories.some((row) => row.id === "bearer"));
    assert.equal(off.categories.some((row) => row.id === "private_ip"), false);
    const on = redact(SAMPLES[2].text, allOn(), NOW);
    assert.ok(on.categories.some((row) => row.id === "private_ip"));
    assert.ok(on.total > off.total);
  });

  it("checkout-bot hits card-ish digits", () => {
    const result = redact(SAMPLES[3].text, defaultEnabled(), NOW);
    assert.ok(result.categories.some((row) => row.id === "card"));
    assert.ok(result.categories.some((row) => row.id === "email"));
    assert.equal(result.redacted.includes("4111 1111 1111 1111"), false);
  });

  it("scores well under a second on concatenated samples", () => {
    const paste = SAMPLES.map((item) => item.text).join("\n").repeat(20);
    const started = performance.now();
    const result = redact(paste, allOn(), NOW);
    const elapsed = performance.now() - started;
    assert.ok(result.total > 0);
    assert.ok(elapsed < 1000, `redacted in ${elapsed}ms`);
  });
});
