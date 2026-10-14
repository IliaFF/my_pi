import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDocument } from "yaml";

const parsed = parseDocument(readFileSync(".github/workflows/test.yml", "utf8"));
assert.deepEqual(parsed.errors, []);
const workflow = parsed.toJS();
assert.ok("push" in workflow.on && "pull_request" in workflow.on);
assert.equal(workflow.permissions.contents, "read");
const steps = workflow.jobs.test.steps;
assert.ok(steps.some((step) => step.run === "npm test"), "CI must call the same gate, not a reduced suite");
assert.ok(steps.some((step) => step.run?.includes("npm ci") && step.run.includes("--prefix npm")));
assert.ok(steps.some((step) => step.uses?.startsWith("actions/upload-artifact@") && step.if === "always()" && step.with.path === "test-results/"));
console.log("PASS CI YAML, same gate, locked install and unconditional artifacts; remote job not exercised");
