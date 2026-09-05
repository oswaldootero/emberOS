import { describe, expect, it } from "vitest";
import {
  normalizeCandidates,
  normalizeHashtagBrief,
  parseFollowers,
  parseModelJson,
} from "./scout-parse";

describe("parseModelJson", () => {
  it("handles fenced and prose-wrapped JSON", () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseModelJson('Here you go: {"a":[1,2]} hope that helps')).toEqual({ a: [1, 2] });
    expect(parseModelJson("nothing here")).toBeNull();
  });
});

describe("parseFollowers", () => {
  it("expands shorthand and strips separators", () => {
    expect(parseFollowers("12.4K")).toBe(12400);
    expect(parseFollowers("1.2M followers")).toBe(1200000);
    expect(parseFollowers("12,400")).toBe(12400);
    expect(parseFollowers(980)).toBe(980);
    expect(parseFollowers("unknown")).toBeNull();
    expect(parseFollowers(null)).toBeNull();
  });
});

describe("normalizeCandidates", () => {
  it("cleans handles, dedups, classifies, and accepts either array or {accounts}", () => {
    const out = normalizeCandidates({
      accounts: [
        { handle: "@Cigar.Lounge", name: "Cigar Lounge Tampa", kind: "lounge", followers: "3.1K", location: "Tampa, FL" },
        { instagramUrl: "https://instagram.com/cigar.lounge/", name: "dupe" },
        { username: "smokeguy", type: "creator", why: "reviews", followers: 52000 },
        { name: "Website Only Cigars", kind: "business", website: "https://wo.example", instagramUrl: null },
        { name: "website only cigars", kind: "business" },
        {},
      ],
    });
    expect(out).toHaveLength(3);
    expect(out[2]).toMatchObject({ handle: null, name: "Website Only Cigars", url: "https://wo.example", website: "https://wo.example" });
    expect(out[0]).toMatchObject({
      handle: "Cigar.Lounge",
      kind: "BUSINESS",
      followersApprox: 3100,
      location: "Tampa, FL",
      url: "https://instagram.com/Cigar.Lounge",
    });
    expect(out[1]).toMatchObject({ handle: "smokeguy", kind: "INFLUENCER", summary: "reviews", followersApprox: 52000 });
  });
  it("returns an empty list for junk", () => {
    expect(normalizeCandidates("nope")).toEqual([]);
    expect(normalizeCandidates(null)).toEqual([]);
  });
});

describe("normalizeHashtagBrief", () => {
  it("normalizes tags, dedups, defaults use/volume, keeps accounts", () => {
    const b = normalizeHashtagBrief({
      summary: "Cigar Aficionado's picks are trending.",
      hashtags: [
        { tag: "#CigarLife", why: "big evergreen", use: "monitor", volume: "high" },
        { hashtag: "cigarlife", why: "dupe" },
        { tag: "botl", why: "brothers of the leaf", use: "weird", volume: "?" },
        { tag: "not valid!", why: "" },
      ],
      accountsToWatch: [{ handle: "@cigaraficionado", why: "industry press" }, { why: "no handle" }],
    });
    expect(b?.hashtags.map((h) => h.tag)).toEqual(["cigarlife", "botl"]);
    expect(b?.hashtags[1]).toMatchObject({ use: "both", volume: "medium" });
    expect(b?.accountsToWatch).toEqual([{ handle: "cigaraficionado", why: "industry press" }]);
  });
  it("returns null with no usable hashtags", () => {
    expect(normalizeHashtagBrief({ hashtags: [] })).toBeNull();
    expect(normalizeHashtagBrief(null)).toBeNull();
  });
});
