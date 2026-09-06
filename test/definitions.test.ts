import { describe, expect, it } from "vitest";
import { toolDefinitions } from "../src/pi-tools/definitions.js";

describe("tool definitions", () => {
  it("keeps markdown tools bare and graph tools namespaced for co-install safety", () => {
    const names = toolDefinitions.map((definition) => definition.name);

    expect(names).toContain("search_markdown");
    expect(names).toContain("md_search_graph");
    expect(names).not.toContain("search_graph");
  });
});
