#!/usr/bin/env node

import assert from "node:assert/strict";
import { parseArgs } from "node:util";

const SELECT = "id,doi,display_name,publication_year,publication_date,type,cited_by_count,is_retracted,open_access,authorships,primary_location,best_oa_location";

function integer(value, name, min, max) {
  if (!/^\d+$/.test(value ?? "")) throw new Error(`${name} must be an integer`);
  const number = Number(value);
  if (number < min || number > max) throw new Error(`${name} must be ${min}-${max}`);
  return number;
}

function options(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      limit: { type: "string", short: "n", default: "10" },
      "from-year": { type: "string" },
      "to-year": { type: "string" },
      "open-access": { type: "boolean", default: false },
      "self-test": { type: "boolean", default: false },
    },
  });
  if (values["self-test"]) return { selfTest: true };

  const query = positionals.join(" ").trim();
  if (!query) throw new Error("search query is required");
  if (query.length > 500) throw new Error("search query must be at most 500 characters");

  const limit = integer(values.limit, "limit", 1, 20);
  const fromYear = values["from-year"] ? integer(values["from-year"], "from-year", 1000, 3000) : undefined;
  const toYear = values["to-year"] ? integer(values["to-year"], "to-year", 1000, 3000) : undefined;
  if (fromYear && toYear && fromYear > toYear) throw new Error("from-year must not exceed to-year");

  return { query, limit, fromYear, toYear, openAccess: values["open-access"] };
}

function urlFor(input) {
  const url = new URL("https://api.openalex.org/works");
  const doi = input.query.match(/^(?:https?:\/\/doi\.org\/)?(10\.\d{4,9}\/\S+)$/i)?.[1];
  if (doi) url.searchParams.set("filter", `doi:https://doi.org/${doi}`);
  else url.searchParams.set("search", input.query);
  url.searchParams.set("per-page", String(input.limit));
  url.searchParams.set("select", SELECT);
  const filters = doi ? [url.searchParams.get("filter")] : [];
  if (input.fromYear) filters.push(`from_publication_date:${input.fromYear}-01-01`);
  if (input.toYear) filters.push(`to_publication_date:${input.toYear}-12-31`);
  if (input.openAccess) filters.push("is_oa:true");
  if (filters.length) url.searchParams.set("filter", filters.join(","));
  if (process.env.OPENALEX_EMAIL) url.searchParams.set("mailto", process.env.OPENALEX_EMAIL);
  return url;
}

function normalize(work) {
  const authors = (work.authorships ?? []).map(({ author }) => author?.display_name).filter(Boolean);
  const oa = work.open_access ?? {};
  const best = work.best_oa_location ?? {};
  const primary = work.primary_location ?? {};
  return {
    title: work.display_name,
    authors: authors.slice(0, 20),
    authors_truncated: authors.length > 20,
    year: work.publication_year,
    publication_date: work.publication_date,
    type: work.type,
    venue: primary.source?.display_name ?? best.source?.display_name ?? null,
    doi: work.doi,
    openalex_id: work.id,
    cited_by_count: work.cited_by_count,
    is_retracted: work.is_retracted,
    is_oa: Boolean(oa.is_oa),
    oa_status: oa.oa_status ?? null,
    license: best.license ?? null,
    pdf_url: best.pdf_url ?? null,
    oa_url: oa.oa_url ?? null,
    landing_page_url: best.landing_page_url ?? primary.landing_page_url ?? null,
  };
}

function selfTest() {
  const input = options(["dust", "tomography", "-n", "5", "--from-year", "2020", "--open-access"]);
  const url = urlFor(input);
  assert.equal(input.query, "dust tomography");
  assert.equal(url.searchParams.get("per-page"), "5");
  assert.equal(url.searchParams.get("filter"), "from_publication_date:2020-01-01,is_oa:true");
  assert.equal(urlFor({ query: "https://doi.org/10.1234/test", limit: 1 }).searchParams.get("filter"), "doi:https://doi.org/10.1234/test");
  assert.equal(normalize({ authorships: [], open_access: { is_oa: true } }).is_oa, true);
  assert.throws(() => options(["query", "--limit", "21"]), /limit must be 1-20/);
  console.log("openalex self-test: PASS");
}

async function main() {
  const input = options(process.argv.slice(2));
  if (input.selfTest) return selfTest();

  // ponytail: one page/max 20; add cursor pagination only when batch reviews require it.
  const response = await fetch(urlFor(input), {
    headers: { Accept: "application/json", "User-Agent": "pi-openalex-skill/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`OpenAlex HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  const results = (data.results ?? []).map(normalize);
  console.log(JSON.stringify({ query: input.query, total_matches: data.meta?.count ?? null, returned: results.length, results }, null, 2));
}

main().catch((error) => {
  console.error(`OpenAlex search failed: ${error.message}`);
  process.exitCode = 1;
});
