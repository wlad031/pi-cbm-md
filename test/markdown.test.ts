import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownService } from "../src/domain/markdown.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "pi-cbm-md-test-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Project\n\nIntro\n\n## Install\n\nRun pi.\n", "utf8");
  await writeFile(join(root, "docs", "guide.mdx"), "# Guide\n\n## Frontmatter\n\nUse title.\n", "utf8");
  const projects = { defaultRepoPath: async () => root };
  return { root, service: new MarkdownService(projects as any), ctx: { cwd: root, signal: new AbortController().signal } };
}

describe("MarkdownService", () => {
  it("lists markdown files with heading counts", async () => {
    const { service, ctx } = await fixture();

    const result = await service.listFiles({}, ctx);

    expect(result.details.count).toBe(2);
    expect(result.content[0].text).toContain("README.md");
    expect(result.content[0].text).toContain("docs/guide.mdx");
  });

  it("reads a focused heading section", async () => {
    const { service, ctx } = await fixture();

    const result = await service.read({ path: "README.md", heading: "install" }, ctx);

    expect(result.content[0].text).toContain("## Install");
    expect(result.content[0].text).toContain("Run pi.");
    expect(result.content[0].text).not.toContain("Intro");
  });

  it("searches markdown content with context", async () => {
    const { service, ctx } = await fixture();

    const result = await service.search({ pattern: "title" }, ctx);

    expect(result.details.count).toBe(1);
    expect(result.content[0].text).toContain("docs/guide.mdx");
    expect(result.content[0].text).toContain("Frontmatter");
  });

  it("blocks paths outside the markdown root", async () => {
    const { service, ctx } = await fixture();

    await expect(service.read({ path: "../escape.md" }, ctx)).rejects.toThrow("Path escapes markdown root");
  });
});
