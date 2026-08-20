// Prints, one per line, the paths in the working tree that an agent changed
// and is not allowed to change. The caller reverts each one.
//
// Classification is evaluated at mode "wide" deliberately: this asks "is this
// path protected on its own merits", which is a different question from "may
// this pull request merge itself". At mode "shadow" every path is blocked, and
// reverting the entire change would be nonsense.
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const { loadConfig } = await import(pathToFileURL(path.join(root, "scripts/harness-config.mjs")));
const { classify } = await import(pathToFileURL(path.join(root, "scripts/lane-classify.mjs")));

const cfg = loadConfig(path.join(root, "harness.toml"));
const wide = { ...cfg, autonomy: { ...cfg.autonomy, mode: "wide" } };

// Two lists rather than `git status`, and both NUL-separated:
//
//   * `git status --porcelain` collapses a new directory to `db/`, so a
//     migration written into a directory that did not exist would never match
//     `**/migrations/**` and would sail into the commit. `ls-files --others`
//     names every untracked file individually.
//   * a rename entry in porcelain output carries two paths in one record,
//     which a naive parse turns into a garbage path.
function paths(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .split("\0")
    .map((s) => s.trim())
    .filter(Boolean);
}

const changed = [
  ...paths("git diff --name-only -z HEAD"),
  ...paths("git ls-files --others --exclude-standard -z"),
];

const blocked = changed.filter((p) => {
  const r = classify([p], wide);
  return r.lane === "blocked" && r.hits.some((h) => h.rule !== "narrow-mode");
});

process.stdout.write(blocked.join("\n") + (blocked.length ? "\n" : ""));
