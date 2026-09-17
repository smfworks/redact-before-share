import type { CategoryDef, CategoryId, EnabledMap } from "../types.ts";

export const CATEGORIES: CategoryDef[] = [
  {
    id: "token_prefix",
    label: "Token prefixes",
    short: "sk- / ghp_ / xoxb-",
    placeholder: "[REDACTED_API_KEY]",
    defaultOn: true,
    blurb: "sk-, ghp_, github_pat_, xoxb-, npm_, AIza",
  },
  {
    id: "bearer",
    label: "Bearer / JWT",
    short: "Bearer · eyJ",
    placeholder: "[REDACTED_BEARER]",
    defaultOn: true,
    blurb: "Authorization Bearer tokens and JWT-shaped strings",
  },
  {
    id: "aws",
    label: "AWS-ish keys",
    short: "AKIA…",
    placeholder: "[REDACTED_AWS_KEY]",
    defaultOn: true,
    blurb: "AKIA / ASIA access-key patterns",
  },
  {
    id: "assignment",
    label: "Assignments",
    short: "password= · secret=",
    placeholder: "[REDACTED_SECRET]",
    defaultOn: true,
    blurb: "password= / secret= / api_key= values",
  },
  {
    id: "email",
    label: "Emails",
    short: "@",
    placeholder: "[REDACTED_EMAIL]",
    defaultOn: true,
    blurb: "address-shaped strings",
  },
  {
    id: "phone",
    label: "Phones",
    short: "555-…",
    placeholder: "[REDACTED_PHONE]",
    defaultOn: true,
    blurb: "phone-ish number runs",
  },
  {
    id: "card",
    label: "Card-ish",
    short: "4111…",
    placeholder: "[REDACTED_CARD]",
    defaultOn: true,
    blurb: "13–19 digit runs, grouped or Luhn-ish",
  },
  {
    id: "private_ip",
    label: "Private IPs",
    short: "10.x / 192.168",
    placeholder: "[REDACTED_PRIVATE_IP]",
    defaultOn: false,
    blurb: "RFC1918 + loopback — off by default",
  },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((item) => [item.id, item]),
) as Record<CategoryId, CategoryDef>;

export function defaultEnabled(): EnabledMap {
  return Object.fromEntries(CATEGORIES.map((item) => [item.id, item.defaultOn])) as EnabledMap;
}

export function enabledList(map: EnabledMap): CategoryId[] {
  return CATEGORIES.filter((item) => map[item.id]).map((item) => item.id);
}
