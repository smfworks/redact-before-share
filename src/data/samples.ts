import type { SampleMeta } from "../types.ts";

export const PASTE_PLACEHOLDER = `Paste an agent / chat transcript.

FAKE DEMO ONLY — never paste real production secrets into a random site.
This app stays in your browser, but judgment stays human.

user: ship the PR
assistant: export OPENAI_API_KEY=sk-test-FAKESECRET_not_real_000111
`;

/** All samples are invented. Prefixes look real; payloads are labeled fake. */
export const SAMPLES: SampleMeta[] = [
  {
    id: "leaky-cursor",
    file: "/samples/leaky-cursor.txt",
    label: "Leaky Cursor",
    blurb: "sk- · ghp_ · password= · AKIA",
    text: `# Cursor session · FAKE DEMO SECRETS — not real credentials

user: ship the LAR hardening PR
assistant: opening the repo. I will not publish .env.

[tool: Shell]
$ export OPENAI_API_KEY=sk-test-FAKESECRET_a2b3c4d5e6f7g8h9i0j1
$ export GITHUB_TOKEN=ghp_demoFakeTokenNotReal000111222333444
$ git push origin cursor/lar-hardening

user: ping me at alex.demo@smfworks.example if it fails

assistant: noted. I will not. Also found this in the log:

password=demo-not-a-real-password-99

[tool: Read] .env.example
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# End of fake transcript. Do not treat these as live secrets.
`,
  },
  {
    id: "openclaw-inbox",
    file: "/samples/openclaw-inbox.txt",
    label: "OpenClaw inbox",
    blurb: "email · phone · xoxb-",
    text: `# OpenClaw inbox triage · FAKE DEMO SECRETS — not real credentials

system: triage unread mail. Do not send. Do not echo tokens.

[tool: inbox.list]
from: jordan.demo@example.com
subject: vendor Slack invite
body: join with xoxb-123456789012-FAKESECRET_c3d4e5f6g7h8i9j0k1l2
call me at +1 555 010 0199 or (555) 010-4477

[tool: contacts.read]
Jordan Demo <jordan.demo@example.com>
ops-pager@smfworks.example

assistant: HOLD — public post / send mail needs a human.
I will draft, not send. Token looks live-shaped; treating as secret.

# End of fake transcript.
`,
  },
  {
    id: "hermes-boot",
    file: "/samples/hermes-boot.txt",
    label: "Hermes boot",
    blurb: "JWT · Bearer · private IP",
    text: `# Hermes-on-Omarchy boot · FAKE DEMO SECRETS — not real credentials

[tool: journalctl] ollama.service
Started user unit. Healthcheck 200 from 10.0.0.42:11434
peer 192.168.1.20 also up. loopback 127.0.0.1 ignored for humans.

[tool: curl]
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJpc3MiOiJzbWZ3b3Jrcy1sYWIifQ.fakeDemoSignatureNotReal
X-Internal-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoib3BzLWRlbW8ifQ.anotherFakeSigXX

assistant: local boot succeeded. I will not paste the bearer into a gist.

# End of fake transcript. Private IPs are optional — toggle the chip.
`,
  },
  {
    id: "checkout-bot",
    file: "/samples/checkout-bot.txt",
    label: "Checkout bot",
    blurb: "card-ish · email · secret=",
    text: `# Checkout bot session · FAKE DEMO SECRETS — not real credentials
# Test PAN from Stripe / Visa docs. Not a real card. Do not charge it.

user: refund the demo order
assistant: I need a human for money movement.

[tool: stripe.customers.retrieve]
email: buyer.demo@example.com
phone: 555-010-2211
card: 4111 1111 1111 1111
alt: 5555555555554444

[tool: env]
STRIPE_SECRET_KEY=sk-test-FAKESECRET_stripe_demo_only_xx
secret=demo_webhook_secret_not_real

assistant: HOLD. I will not refund, capture, or log the PAN.

# End of fake transcript.
`,
  },
];

export function sampleById(id: string | null | undefined): SampleMeta | undefined {
  if (!id) return undefined;
  return SAMPLES.find((item) => item.id === id);
}
