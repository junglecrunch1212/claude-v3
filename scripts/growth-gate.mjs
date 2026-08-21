#!/usr/bin/env node
// The anti-bloat mechanism, as code instead of advice.
//
// This product CONVERGES: seven tables, four buttons, ~six screens, done.
// Past-budget growth is how repos exceed what a fresh agent context can hold,
// which is how progress grinds to a halt. So: a size budget with a SLOPE rule.
//
//   under budget                      -> pass
//   over budget and the PR SHRINKS it -> pass (deletion always has a green path)
//   over budget and the PR GROWS it   -> fail, telling you to file a deletion
//
// It can never lock the repo: a shrinking change always passes. It only ever
// refuses to make an oversized thing bigger.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadConfig } from "./harness-config.mjs";

const APP_DIRS = ["app", "server", "db", "adapters", "policy", "tests"];
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".sql", ".html"]);

function countLoc(dir) {
  let n = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      n += countLoc(p);
    } else if (CODE_EXT.has(path.extname(e.name)) && e.name !== "package-lock.json") {
      n += fs.readFileSync(p, "utf8").split("\n").length;
    }
  }
  return n;
}

function countDocs() {
  // Top-level docs only. docs/archive/ is free: archiving is how docs retire.
  if (!fs.existsSync("docs")) return 0;
  return fs.readdirSync("docs", { withFileTypes: true }).filter((e) => e.isFile()).length;
}

function netDelta(paths) {
  // Sum of (added - deleted) lines vs origin/main. Null when there is no
  // usable base (fresh repo, first push, shallow clone) — then only the
  // absolute budget is reported, never enforced, so bootstrap can't go red.
  try {
    execSync("git rev-parse --verify origin/main", { stdio: "pipe" });
    const head = execSync("git rev-parse HEAD", { stdio: "pipe" }).toString().trim();
    const base = execSync("git rev-parse origin/main", { stdio: "pipe" }).toString().trim();
    if (head === base) return null;
    const out = execSync(`git diff --numstat origin/main...HEAD -- ${paths.join(" ")}`, { stdio: "pipe" }).toString();
    let d = 0;
    for (const line of out.trim().split("\n").filter(Boolean)) {
      const [a, r] = line.split("\t");
      if (a !== "-" && r !== "-") d += Number(a) - Number(r);
    }
    return d;
  } catch {
    return null;
  }
}

const cfg = loadConfig();
const budget = cfg.budget ?? {};
const maxLoc = budget.max_app_loc ?? 12000;
const maxDocs = budget.max_doc_files ?? 15;

const loc = APP_DIRS.reduce((n, d) => n + countLoc(d), 0);
const docs = countDocs();
const codeDelta = netDelta(APP_DIRS);
const docsDelta = netDelta(["docs"]);

console.log(`growth gate: app ${loc}/${maxLoc} lines, docs ${docs}/${maxDocs} files`);
if (codeDelta !== null) console.log(`  this change: code ${codeDelta >= 0 ? "+" : ""}${codeDelta} lines, docs ${docsDelta >= 0 ? "+" : ""}${docsDelta}`);

let fail = false;
if (loc > maxLoc && codeDelta !== null && codeDelta > 0) {
  console.log(`  FAIL: the app is over its size budget AND this change grows it.`);
  console.log(`  The next issue is a deletion, not a feature — a shrinking change`);
  console.log(`  passes this gate immediately. Budget lives in harness.toml [budget].`);
  fail = true;
}
if (docs > maxDocs && docsDelta !== null && docsDelta > 0) {
  console.log(`  FAIL: docs/ is over budget AND this change adds to it. Retire a`);
  console.log(`  build-time doc to docs/archive/ (free) or fold two docs into one.`);
  fail = true;
}
if (!fail) console.log("  ok — " + (loc > maxLoc || docs > maxDocs ? "over budget but not growing" : "within budget"));
process.exit(fail ? 1 : 0);
