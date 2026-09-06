import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { buildToolTextResult, type ToolTextResult } from "../cbm/result.js";
import type { ProjectService, ToolExecutionContext } from "./project.js";

const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx", ".markdown"]);
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo", ".cache", ".venv", "__pycache__"]);
const DEFAULT_MAX_FILES = 500;
const DEFAULT_MAX_BYTES = 256 * 1024;

type MarkdownFile = {
  path: string;
  size_bytes: number;
  headings: number;
  title?: string;
};

type Heading = {
  level: number;
  title: string;
  line: number;
  slug: string;
};

type SearchMatch = {
  path: string;
  line: number;
  text: string;
  heading?: string;
  context?: string[];
};

export class MarkdownService {
  constructor(private readonly projects: ProjectService) {}

  async listFiles(params: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolTextResult> {
    const root = await this.root(params, ctx);
    const maxFiles = numberParam(params.max_files, DEFAULT_MAX_FILES);
    const files = await this.markdownFiles(root, maxFiles, ctx.signal);
    const result: MarkdownFile[] = [];

    for (const file of files) {
      const content = await readFile(file.absolute, "utf8");
      const headings = extractHeadings(content);
      result.push({
        path: file.relative,
        size_bytes: Buffer.byteLength(content, "utf8"),
        headings: headings.length,
        title: headings[0]?.level === 1 ? headings[0].title : undefined,
      });
    }

    return buildToolTextResult("Markdown files", { root, count: result.length, files: result }, { root, count: result.length });
  }

  async outline(params: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolTextResult> {
    const { root, path } = await this.resolveMarkdownPath(params, ctx);
    const content = await readFile(path, "utf8");
    const headings = extractHeadings(content);
    return buildToolTextResult("Markdown outline", { path: relativePath(root, path), headings }, { path: relativePath(root, path), count: headings.length });
  }

  async read(params: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolTextResult> {
    const { root, path } = await this.resolveMarkdownPath(params, ctx);
    const content = await readFile(path, "utf8");
    const heading = stringParam(params.heading);
    const maxBytes = numberParam(params.max_bytes, DEFAULT_MAX_BYTES);
    const data = heading ? sectionByHeading(content, heading) : { content };
    const compacted = compactContent(data.content, maxBytes);
    return buildToolTextResult(
      "Markdown content",
      { path: relativePath(root, path), heading: data.heading, start_line: data.startLine, end_line: data.endLine, content: compacted.content, truncated: compacted.truncated },
      { path: relativePath(root, path), truncated: compacted.truncated },
    );
  }

  async search(params: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolTextResult> {
    const root = await this.root(params, ctx);
    const pattern = requiredString(params.pattern, "pattern");
    const regex = Boolean(params.regex);
    const caseSensitive = Boolean(params.case_sensitive);
    const contextLines = numberParam(params.context, 2);
    const limit = numberParam(params.limit, 50);
    const maxFiles = numberParam(params.max_files, DEFAULT_MAX_FILES);
    const matcher = makeMatcher(pattern, regex, caseSensitive);
    const files = await this.markdownFiles(root, maxFiles, ctx.signal);
    const matches: SearchMatch[] = [];

    for (const file of files) {
      const content = await readFile(file.absolute, "utf8");
      const lines = content.split(/\r?\n/);
      const headingAtLine = headingLookup(extractHeadings(content));
      for (let index = 0; index < lines.length; index += 1) {
        if (!matcher(lines[index] ?? "")) continue;
        const from = Math.max(0, index - contextLines);
        const to = Math.min(lines.length, index + contextLines + 1);
        matches.push({
          path: file.relative,
          line: index + 1,
          text: lines[index] ?? "",
          heading: headingAtLine(index + 1),
          context: lines.slice(from, to).map((line, offset) => `${from + offset + 1}: ${line}`),
        });
        if (matches.length >= limit) break;
      }
      if (matches.length >= limit) break;
    }

    return buildToolTextResult("Markdown search results", { root, pattern, regex, count: matches.length, matches }, { root, pattern, count: matches.length });
  }

  private async root(params: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
    const requestedRoot = stringParam(params.root);
    const base = await this.projects.defaultRepoPath(ctx.cwd, ctx.signal);
    if (!requestedRoot) return resolve(base);
    const root = resolve(base, requestedRoot);
    assertInside(base, root);
    return root;
  }

  private async resolveMarkdownPath(params: Record<string, unknown>, ctx: ToolExecutionContext): Promise<{ root: string; path: string }> {
    const root = await this.root(params, ctx);
    const requestedPath = requiredString(params.path, "path");
    const path = resolve(root, requestedPath);
    assertInside(root, path);
    if (!isMarkdownPath(path)) throw new Error(`Not a markdown file: ${requestedPath}`);
    const info = await stat(path);
    if (!info.isFile()) throw new Error(`Not a file: ${requestedPath}`);
    return { root, path };
  }

  private async markdownFiles(root: string, maxFiles: number, signal?: AbortSignal): Promise<Array<{ absolute: string; relative: string }>> {
    const files: Array<{ absolute: string; relative: string }> = [];
    const visit = async (directory: string) => {
      signal?.throwIfAborted();
      if (files.length >= maxFiles) return;
      const entries = await readdir(directory, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (files.length >= maxFiles) return;
        const absolute = resolve(directory, entry.name);
        if (entry.isDirectory()) {
          if (!IGNORED_DIRECTORIES.has(entry.name)) await visit(absolute);
          continue;
        }
        if (entry.isFile() && isMarkdownPath(entry.name)) files.push({ absolute, relative: relativePath(root, absolute) });
      }
    };
    await visit(root);
    return files;
  }
}

function extractHeadings(content: string): Heading[] {
  return content.split(/\r?\n/).flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) return [];
    const title = match[2]?.trim() ?? "";
    return [{ level: match[1]!.length, title, line: index + 1, slug: slug(title) }];
  });
}

function sectionByHeading(content: string, requestedHeading: string): { content: string; heading?: string; startLine?: number; endLine?: number } {
  const lines = content.split(/\r?\n/);
  const headings = extractHeadings(content);
  const needle = requestedHeading.trim().toLowerCase();
  const foundIndex = headings.findIndex((heading) => heading.title.toLowerCase() === needle || heading.slug === slug(needle));
  if (foundIndex < 0) throw new Error(`Heading not found: ${requestedHeading}`);
  const found = headings[foundIndex]!;
  const next = headings.slice(foundIndex + 1).find((heading) => heading.level <= found.level);
  const start = found.line;
  const end = next ? next.line - 1 : lines.length;
  return { content: lines.slice(start - 1, end).join("\n"), heading: found.title, startLine: start, endLine: end };
}

function headingLookup(headings: Heading[]): (line: number) => string | undefined {
  return (line: number) => {
    let current: Heading | undefined;
    for (const heading of headings) {
      if (heading.line > line) break;
      current = heading;
    }
    return current?.title;
  };
}

function makeMatcher(pattern: string, regex: boolean, caseSensitive: boolean): (line: string) => boolean {
  if (regex) {
    const expression = new RegExp(pattern, caseSensitive ? "" : "i");
    return (line) => expression.test(line);
  }
  const needle = caseSensitive ? pattern : pattern.toLowerCase();
  return (line) => (caseSensitive ? line : line.toLowerCase()).includes(needle);
}

function compactContent(content: string, maxBytes: number): { content: string; truncated: boolean } {
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes <= maxBytes) return { content, truncated: false };
  return { content: `${content.slice(0, maxBytes)}\n\n[truncated at ${maxBytes} bytes]`, truncated: true };
}

function requiredString(value: unknown, name: string): string {
  const result = stringParam(value);
  if (!result) throw new Error(`${name} is required`);
  return result;
}

function stringParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberParam(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function isMarkdownPath(path: string): boolean {
  const normalized = path.toLowerCase();
  return [...MARKDOWN_EXTENSIONS].some((extension) => normalized.endsWith(extension));
}

function assertInside(root: string, target: string): void {
  const relativeTarget = relative(resolve(root), resolve(target));
  if (relativeTarget.startsWith("..") || relativeTarget === ".." || relativeTarget.split(sep).includes("..")) {
    throw new Error(`Path escapes markdown root: ${target}`);
  }
}

function relativePath(root: string, target: string): string {
  return relative(root, target).replaceAll("\\", "/") || ".";
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
