export const CODEBASE_MEMORY_PROMPT = `

pi-cbm-md guidance:
- pi-cbm-md does not auto-index codebase-memory-mcp; it can coexist with pi-cbm without duplicate indexing.
- For Markdown/docs work, prefer markdown tools before raw shell/file reads.
- Use list_markdown_files to inventory README, docs, notes, and MDX files.
- Use outline_markdown before reading long docs; then read_markdown with heading for focused sections.
- Use search_markdown for exact phrases, headings, frontmatter keys, links, TODOs, and docs text.
- Use regex search only when needed; literal search safer by default.
- Paths are resolved inside current repository; escapes are blocked.
- For source-code graph work, prefer original pi-cbm common names when installed; pi-cbm-md also exposes coinstall-safe aliases prefixed with md_ (for example md_search_graph).
- pi-cbm-md graph aliases require existing/manual codebase-memory-mcp index; pi-cbm can provide auto-indexing when coinstalled.
`;
