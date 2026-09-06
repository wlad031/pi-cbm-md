# pi-cbm-md

Markdown-focused Pi extension built from [`pi-cbm`](https://github.com/alexykn/pi-cbm). It keeps the Pi extension structure, but registers docs-heavy tools only: list Markdown files, inspect outlines, read focused heading sections, and search Markdown/MDX content with context.

## Why this fork

`pi-cbm` is code-symbol focused. `pi-cbm-md` is docs focused:

- **Markdown-first tools** for README, docs, notes, prompts, specs, and MDX.
- **Heading-aware reads** so agents can inspect outlines first, then load only relevant sections.
- **Safe path handling**: requested docs paths stay inside current repository/root.
- **Literal-first search** across `.md`, `.mdx`, and `.markdown`, with regex optional.
- **Coexists with `pi-cbm`**: Markdown tools use unique names, graph tools are exposed as `md_*` aliases, and no duplicate CBM auto-indexer runs.

## Install

```sh
pi install git:git@github.com:wlad031/pi-cbm-md.git
```

Or from a local checkout:

```sh
pi install /path/to/pi-cbm-md
```

Or test for one run:

```sh
pi -e git:git@github.com:wlad031/pi-cbm-md.git
```

## Markdown tools

Registers these Markdown-focused tools:

- `list_markdown_files` — list Markdown/MDX files with size, title, and heading count.
- `outline_markdown` — extract heading outline from one Markdown/MDX file.
- `read_markdown` — read whole file or one heading section.
- `search_markdown` — literal/regex search across Markdown/MDX files with line context.

Typical flow:

```text
List markdown files.
Outline docs/guide.md.
Read section "Configuration" from docs/guide.md.
Search markdown for "frontmatter".
```

## Coexistence with `pi-cbm`

`pi-cbm-md` does not auto-index `codebase-memory-mcp` and does not register bare `pi-cbm` graph tool names. Use `pi-cbm-md` for Markdown/docs work and install original `pi-cbm` separately for common graph names and auto-indexing.

For convenience, `pi-cbm-md` also registers coinstall-safe graph aliases with `md_` prefix:

- `md_search_graph`
- `md_get_architecture`
- `md_resolve_symbol`
- `md_read_symbol`
- `md_read_symbols`
- `md_search_code`
- `md_get_code_snippet`
- `md_get_code_snippets`
- `md_search_and_read_symbols`
- `md_trace_path`
- `md_query_graph`
- `md_detect_changes`
- `md_get_graph_schema`

These aliases require an existing/manual `codebase-memory-mcp` index. Co-installed `pi-cbm` can provide that index automatically.

## Command

### `/cbm-md`

Show status:

- `/cbm-md status` — show enabled Markdown tools and confirm CBM auto-indexing is disabled.

## Security

Pi extensions run with local user permissions. Install extensions only from trusted sources.
