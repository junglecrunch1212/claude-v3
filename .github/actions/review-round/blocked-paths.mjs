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

// -z keeps paths with spaces or quotes intact; the porcelain status line is
// "XY <path>", so the first three characters are the status, not the name.
const raw = execSync("git status --porcelain -z", { cwd: root, encoding: "utf8" });
const changed = raw
  .split("\0")
  .filter(Boolean)
  .map((entry) => entry.slice(3))
  .filter(Boolean);

const blocked = changed.filter((p) => {
  const r = classify([p], wide);
  return r.lane === "blocked" && r.hits.some((h) => h.rule !== "narrow-mode");
});

process.stdout.write(blocked.join("\n") + (blocked.length ? "\n" : ""));
