// Runs every supabase/tests/*.sql file and checks each result against its
// "(expect ...)" label. Exits 1 if anything fails, so CI can show a red X.
//
//   node scripts/run-db-tests.mjs --local    # local Supabase (Docker), as in CI
//   node scripts/run-db-tests.mjs --linked   # the real project (tests roll back)
//
// Each test file is one DO block that logs lines like
//   "04 friend: add the stranger (expect blocked): blocked - ..."
// and ends with RAISE EXCEPTION, which rolls everything back and carries the
// log out in the error message.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const target = process.argv.includes("--linked") ? "--linked" : "--local";
const testsDir = join("supabase", "tests");
const files = readdirSync(testsDir).filter((f) => f.endsWith(".sql")).sort();

if (files.length === 0) {
  console.error(`No test files found in ${testsDir}`);
  process.exit(1);
}

console.log(`Running ${files.length} database test files against ${target.slice(2)} Supabase\n`);

let totalPassed = 0;
let totalFailed = 0;

for (const file of files) {
  const path = join(testsDir, file);
  const source = readFileSync(path, "utf8");
  // How many checks the file defines: lines like  E'\n07 ...
  const expectedCount = new Set(source.match(/E'\\n(\d{2}) /g) ?? []).size;

  const run = spawnSync(`npx supabase db query ${target} -f "${path}"`, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;

  const results = parseResults(output);
  const failures = [];
  for (const r of results) {
    if (!matches(r.expect, r.got)) failures.push(r);
  }
  if (results.length !== expectedCount) {
    failures.push({
      num: "--",
      label: `expected ${expectedCount} checks to report, got ${results.length}`,
      expect: "",
      got: results.length === 0 ? output.trim().slice(-800) : "",
    });
  }

  const passed = results.length - failures.filter((f) => f.num !== "--").length;
  totalPassed += passed;
  totalFailed += failures.length;

  console.log(`${failures.length ? "FAIL" : "ok  "}  ${file.padEnd(40)} ${passed}/${expectedCount}`);
  for (const f of failures) {
    console.log(`        ${f.num} ${f.label}`);
    if (f.expect) console.log(`           expected: ${f.expect}`);
    if (f.got) console.log(`           got:      ${f.got}`);
  }
}

console.log(`\n${totalPassed} passed, ${totalFailed} failed`);
process.exit(totalFailed === 0 ? 0 : 1);

// Pull the "NN label (expect X): result" lines out of the error message.
// The message arrives escaped differently depending on the target, so
// normalize newlines and quotes first.
function parseResults(output) {
  const start = output.indexOf("TEST RESULTS");
  if (start < 0) return [];
  const text = output
    .slice(start)
    .split("CONTEXT")[0] // --linked: Postgres context follows the message
    .split('"}}')[0] // --local: the message ends inside a JSON object
    .replace(/(\\)+n/g, "\n")
    .replace(/(\\)+"/g, '"');

  const results = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(\d{2}) (.*?) \(expect ([^)]*)\): (.*?)[\\\s]*$/);
    if (m) results.push({ num: m[1], label: m[2], expect: m[3], got: m[4].trim() });
  }
  return results;
}

// Compare a result with its expectation:
//   "blocked..."  -> result starts with "blocked"
//   "allowed..."  -> result is exactly "allowed"
//   "1 row", "0", "US", "2: Netflix + Hulu", "Forrest Gump=0, Heat=1" -> leading value matches
function matches(expect, got) {
  if (expect.startsWith("blocked")) return got.startsWith("blocked");
  if (expect.startsWith("allowed")) return got === "allowed";
  const wanted = expect.includes("=") ? expect.trim() : expect.split(/[,:]/)[0].trim();
  if (got === wanted) return true;
  // "1 row" vs "1 rows", "2" vs "2: Netflix + Hulu" -> compare the first word
  return got.split(" ")[0] === wanted.split(" ")[0];
}
