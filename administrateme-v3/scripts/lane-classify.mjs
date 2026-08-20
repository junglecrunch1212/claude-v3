#!/usr/bin/env node
// Decides whether a pull request may merge without a human.
//
//   node scripts/lane-classify.mjs <file-with-changed-paths>
//   ... | node scripts/lane-classify.mjs -
//
// Emits `lane=open|blocked`, `reason=...`, `blocking_paths=...` to
// $GITHUB_OUTPUT and exits 0 either way. A blocked lane is a normal outcome,
// not a failure — the gate workflow reads the output and labels the PR.
//
// Design note: this is deliberately a deterministic script and not a model
// judgement. "Is this change allowed to merge itself" is exactly the kind of
// question that must be answered by code, because a model asked the same
// question can be argued out of its answer by the diff it is reading.

import fs from "node:fs";
import { loadConfig } from "./harness-config.mjs";

// Minimal glob -> RegExp. Supports ** (crosses separators), * (does not) and ?.
// Character classes are NOT supported — [ and ] match literally.
//
// Matching is case-insensitive on purpose. Several blocked patterns exist to
// catch a file by name rather than by location (`**/*secret*`, `**/.env*`), and
// a case-sensitive match would sail straight past `Secrets.ts` and `.ENV`.
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // `**/` should also match zero directories, so a/**/b matches a/b.
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$", "i");
}

export function classify(changedPaths, cfg) {
  const mode = cfg.autonomy?.mode ?? "shadow";
  const blocked = cfg.autonomy?.blocked_paths ?? [];
  const matchers = blocked.map((g) => [g, globToRegExp(g)]);

  const hits = [];
  for (const p of changedPaths) {
    for (const [glob, re] of matchers) {
      if (re.test(p)) {
        hits.push({ path: p, rule: glob });
        break;
      }
    }
  }

  if (hits.length) {
    return {
      lane: "blocked",
      reason: `touches ${hits.length} protected path(s)`,
      hits,
    };
  }

  if (mode === "shadow") {
    return {
      lane: "blocked",
      reason: "autonomy mode is 'shadow' — reporting only, merging nothing",
      hits: [],
    };
  }

  if (mode === "narrow") {
    const frontend = [
      "app/**",
      "**/*.css",
      "**/*.tsx",
      "tests/e2e/**",
      "docs/**",
    ].map(globToRegExp);
    const outside = changedPaths.filter((p) => !frontend.some((re) => re.test(p)));
    if (outside.length) {
      return {
        lane: "blocked",
        reason: `autonomy mode is 'narrow' and ${outside.length} path(s) are outside the frontend lane`,
        hits: outside.map((p) => ({ path: p, rule: "narrow-mode" })),
      };
    }
  }

  return { lane: "open", reason: `${changedPaths.length} path(s), all in the open lane`, hits: [] };
}

function main() {
  const src = process.argv[2];
  if (!src) {
    console.error("usage: lane-classify.mjs <file|->");
    process.exit(2);
  }
  const raw = src === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(src, "utf8");
  const paths = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  const result = classify(paths, loadConfig());

  const lines = [
    `lane=${result.lane}`,
    `reason=${result.reason}`,
    `blocking_paths=${result.hits.map((h) => h.path).join(" ")}`,
  ];
  const out = process.env.GITHUB_OUTPUT;
  if (out) fs.appendFileSync(out, lines.join("\n") + "\n");

  console.log(`lane: ${result.lane}`);
  console.log(`reason: ${result.reason}`);
  for (const h of result.hits) console.log(`  ${h.path}  (rule: ${h.rule})`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
