import { describe, expect, it } from "vitest";
import {
  buildFacets,
  nameFromTitle,
  parseDescriptor,
  parseDirectoryParams,
  DIRECTORY_PAGE_SIZE,
} from "@/lib/directory";

describe("parseDescriptor", () => {
  it("parses 'profession · location' with the middle-dot separator", () => {
    expect(parseDescriptor("Product Designer · Austin, TX")).toEqual({
      profession: "Product Designer",
      location: "Austin, TX",
    });
  });

  it("parses a pipe separator", () => {
    expect(parseDescriptor("Software Engineer | London, UK")).toEqual({
      profession: "Software Engineer",
      location: "London, UK",
    });
  });

  it("parses a comma separator", () => {
    expect(parseDescriptor("Civil Engineer, Dallas")).toEqual({
      profession: "Civil Engineer",
      location: "Dallas",
    });
  });

  it("treats a single token as profession only", () => {
    expect(parseDescriptor("Photographer")).toEqual({
      profession: "Photographer",
      location: null,
    });
  });

  it("returns nulls for empty/null descriptors", () => {
    expect(parseDescriptor(null)).toEqual({ profession: null, location: null });
    expect(parseDescriptor("")).toEqual({ profession: null, location: null });
    expect(parseDescriptor("   ")).toEqual({ profession: null, location: null });
  });

  it("trims surrounding whitespace", () => {
    expect(parseDescriptor("  Chef  ·  New York ")).toEqual({
      profession: "Chef",
      location: "New York",
    });
  });
});

describe("buildFacets", () => {
  it("collects distinct, sorted professions and locations", () => {
    const descriptors = [
      "Product Designer · Austin, TX",
      "Software Engineer · London, UK",
      "Product Designer · Berlin",
      null,
    ];
    expect(buildFacets(descriptors)).toEqual({
      professions: ["Product Designer", "Software Engineer"],
      locations: ["Austin, TX", "Berlin", "London, UK"],
    });
  });
});

describe("nameFromTitle", () => {
  it("strips a ' — ' descriptor suffix", () => {
    expect(nameFromTitle("Alex Rivera — Product Designer in Austin")).toBe("Alex Rivera");
  });

  it("returns the title as-is when there is no suffix", () => {
    expect(nameFromTitle("Maya Patel")).toBe("Maya Patel");
    expect(nameFromTitle("  John Smith  ")).toBe("John Smith");
  });
});

describe("parseDirectoryParams", () => {
  it("parses q, profession, location, page, and sort from string params", () => {
    expect(
      parseDirectoryParams({
        q: "smith",
        profession: "engineer",
        location: "london",
        page: "3",
        sort: "name",
      })
    ).toEqual({ q: "smith", profession: "engineer", location: "london", page: 3, sort: "name" });
  });

  it("coerces array params to their first value", () => {
    expect(parseDirectoryParams({ q: ["smith", "jones"] })).toMatchObject({ q: "smith" });
  });

  it("defaults page to 1 and clamps negative/zero", () => {
    expect(parseDirectoryParams({})).toMatchObject({ page: 1, sort: "relevant" });
    expect(parseDirectoryParams({ page: "0" })).toMatchObject({ page: 1 });
    expect(parseDirectoryParams({ page: "-5" })).toMatchObject({ page: 1 });
  });

  it("falls back sort to 'relevant' for unknown values", () => {
    expect(parseDirectoryParams({ sort: "bogus" })).toMatchObject({ sort: "relevant" });
  });

  it("trims empty strings", () => {
    expect(parseDirectoryParams({ q: "  ", profession: "" })).toMatchObject({
      q: "",
      profession: "",
    });
  });

  it("defaults page size to the exported constant", () => {
    expect(DIRECTORY_PAGE_SIZE).toBe(12);
  });
});
