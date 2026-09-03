---
name: openalex-literature-search
description: Search OpenAlex for interdisciplinary scholarly works and lawful open-access full text. Use for literature discovery, citation metadata, DOI verification, citation counts, year filtering, or locating OA PDF links.
compatibility: Requires Node.js 20+ and the pi-web-access fetch_content tool for full-text extraction.
---

# OpenAlex literature search

Resolve `scripts/openalex.mjs` relative to this `SKILL.md`, then run:

```bash
node "/resolved/skill/path/scripts/openalex.mjs" "search terms"
```

Options:

```text
-n, --limit <1-20>       Results, default 10
--from-year <year>       Earliest publication year
--to-year <year>         Latest publication year
--open-access            Return only OpenAlex OA works
```

Examples:

```bash
node "/resolved/skill/path/scripts/openalex.mjs" "dust cloud tomography complex plasma" -n 10
node "/resolved/skill/path/scripts/openalex.mjs" "dust cloud tomography" --from-year 2019 --open-access
```

## Workflow

1. Search broadly first. Do not use `--open-access` for a literature review unless user explicitly wants OA-only results; OA-only filtering can omit important closed works.
2. Rank by relevance to question, not citation count alone. Check title, year, venue, DOI, retraction flag, and authors.
3. Treat OpenAlex metadata as discovery evidence. Verify critical bibliographic details against DOI/publisher page before final citation.
4. For lawful full text, call installed `fetch_content` with `pdf_url`; otherwise try `oa_url`, then `landing_page_url`.
5. If extracted PDF is saved as Markdown, use `grep` and bounded `read` for exact passages. Do not rely on `get_search_content` as PDF full-text index.
6. If no OA location exists, report that. Never use Sci-Hub or bypass access controls.

Helper returns bounded JSON and has no dependencies. Optional `OPENALEX_EMAIL` adds `mailto` for OpenAlex identification.
