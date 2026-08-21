#!/usr/bin/env node
// Validates the harness itself before it is trusted to validate anything else.
// Runs on every PR and every push to main. Cheap, dependency-free, and the
// thing that catches a typo in harness.toml before it silently disables a gate.

import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./harness-config.mjs";
import { classify, globToRegExp } from "./lane-classify.mjs";

const problems = [];
const ok = (msg) => console.log(`  ok    ${msg}`);
const bad = (msg) => { problems.push(msg); console.log(`  FAIL  ${msg}`); };

console.log("harness self-check");

// --- 1. Config loads and is internally coherent -----------------------------
let cfg;
try {
  cfg = loadConfig();
  ok("harness.toml parses");
} catch (e) {
  bad(`harness.toml does not parse: ${e.message}`);
  process.exit(1);
}

const STAGES = ["bootstrap", "scaffolded", "operating"];
if (!STAGES.includes(cfg.stage)) bad(`stage '${cfg.stage}' is not one of ${STAGES.join(", ")}`);
else ok(`stage = ${cfg.stage}`);

const MODES = ["shadow", "narrow", "wide"];
if (!MODES.includes(cfg.autonomy?.mode)) bad(`autonomy.mode '${cfg.autonomy?.mode}' is not one of ${MODES.join(", ")}`);
else ok(`autonomy.mode = ${cfg.autonomy.mode}`);

let rolesOk = true;
for (const role of ["implementer", "reviewer", "repairer"]) {
  const v = cfg.agents?.[role];
  if (!["claude", "codex", "off"].includes(v)) { bad(`agents.${role} = '${v}' is not claude|codex|off`); rolesOk = false; }
}
if (rolesOk) ok("agent roles are valid");

// A reviewer from the same family as the implementer shares its blind spots.
// Not fatal — plenty of people only have one key — but say so out loud.
if (cfg.agents?.implementer === cfg.agents?.reviewer && cfg.agents?.reviewer !== "off") {
  console.log(`  note  implementer and reviewer are both '${cfg.agents.reviewer}'. Same model family means shared blind spots; set one to the other vendor when you have both keys.`);
}

const attempts = cfg.autonomy?.max_repair_attempts;
if (!Number.isInteger(attempts) || attempts < 0) {
  bad(`autonomy.max_repair_attempts must be a non-negative integer, got ${attempts}`);
} else {
  // The rounds are unrolled in the workflow, so the config value and the YAML
  // must agree. A config claiming 4 attempts against 2 wired rounds is a
  // documented promise the machine does not keep.
  const yml = fs.existsSync(".github/workflows/10-pipeline.yml")
    ? fs.readFileSync(".github/workflows/10-pipeline.yml", "utf8")
    : "";
  // Count `repair:` inputs rather than the literal string "true": round 1
  // gates on max_repair_attempts with an expression, so a literal-only match
  // would under-report the wired rounds and pass vacuously.
  const repairInputs = yml.match(/^\s*repair:.*$/gm) || [];
  const verdictOnly = repairInputs.filter((l) => /repair:\s*["']?false["']?\s*$/.test(l));
  const repairRounds = repairInputs.length - verdictOnly.length;
  if (attempts > repairRounds) {
    bad(`max_repair_attempts is ${attempts} but 10-pipeline.yml wires only ${repairRounds} repair round(s) — raising the number means adding a round in the same change`);
  } else {
    ok(`max_repair_attempts = ${attempts}, within the ${repairRounds} wired round(s)`);
  }
  if (verdictOnly.length === 0) {
    bad("10-pipeline.yml has no verdict-only final round — the last repair would never be judged");
  } else {
    ok("a verdict-only final round exists, so the last repair is judged");
  }
}

let limitsOk = true;
for (const [k, v] of Object.entries(cfg.limits ?? {})) {
  if (!Number.isInteger(v) || v <= 0) { bad(`limits.${k} must be a positive integer, got ${v}`); limitsOk = false; }
}
if (limitsOk) ok("limits are positive integers");

// --- 2. Placeholders were actually replaced ---------------------------------
for (const key of ["owner", "project_name"]) {
  if (String(cfg[key] ?? "").startsWith("@") && String(cfg[key]).toUpperCase() === String(cfg[key])) {
    bad(`${key} is still the placeholder '${cfg[key]}' — replace it during bootstrap`);
  }
}

// --- 3. The blocked lane is not accidentally empty --------------------------
// The two categories that must never merge themselves, whatever else changes.
const MUST_BLOCK = [
  { probe: ".github/workflows/10-pipeline.yml", why: "the loop must not be able to rewrite the loop" },
  { probe: "kernel/auth/grants.ts", why: "authorization must not merge itself" },
  { probe: "app/session.auth.ts", why: "authorization must not merge itself, wherever the file lands" },
  { probe: "db/migrations/001_init.sql", why: "migrations must not merge themselves" },
  { probe: "harness.toml", why: "the control surface must not merge itself" },
];
// Evaluate these against the WIDEST mode, not the configured one. At
// mode="shadow" classify() blocks everything, so asserting lane === "blocked"
// would pass even with an empty blocked_paths list — a check that cannot fail
// is not a check. Forcing 'wide' asserts the path is blocked on its own merits.
const wideCfg = { ...cfg, autonomy: { ...cfg.autonomy, mode: "wide" } };
let allBlocked = true;
for (const { probe, why } of MUST_BLOCK) {
  const r = classify([probe], wideCfg);
  const byRule = r.lane === "blocked" && r.hits.some((h) => h.rule !== "narrow-mode");
  if (!byRule) { bad(`'${probe}' is not blocked by an explicit rule — ${why}`); allBlocked = false; }
}
if (allBlocked) ok("protected paths are blocked by explicit rules, independent of mode");

let manifestsBlocked = true;
for (const probe of ["package.json", "app/package.json", "packages/ui/package-lock.json"]) {
  if (classify([probe], wideCfg).lane !== "blocked") {
    bad(`'${probe}' is not blocked — an agent could rewrite the \`ci\` script and neutralise every gate`);
    manifestsBlocked = false;
  }
}
if (manifestsBlocked) ok("manifests are blocked at every depth");

// A path that should sail through, so we know the lane is not blocking everything.
const openProbe = classify(["app/components/Table.tsx"], cfg);
if (cfg.autonomy.mode !== "shadow" && openProbe.lane !== "open") {
  bad(`a plain frontend file classifies as ${openProbe.lane} at mode '${cfg.autonomy.mode}' — the lane is stuck shut`);
} else {
  ok(`ordinary frontend change classifies as ${openProbe.lane}`);
}

// --- 4. Case-insensitive name-based blocks ----------------------------------
// These patterns exist to catch a file by NAME. A case-sensitive matcher walks
// straight past the capitalised spelling, which is the one an agent is most
// likely to produce.
let allCaseBlocked = true;
for (const probe of ["app/Secrets.ts", "src/.ENV.local", "lib/Credentials.ts"]) {
  if (classify([probe], wideCfg).lane !== "blocked") {
    bad(`'${probe}' is not blocked — the name-based patterns are case-sensitive`);
    allCaseBlocked = false;
  }
}
if (allCaseBlocked) ok("name-based blocks are case-insensitive");

// --- 5. Glob engine sanity --------------------------------------------------
const globCases = [
  ["**/migrations/**", "db/migrations/001.sql", true],
  ["**/migrations/**", "src/deep/migrations/a/b.sql", true],
  ["**/migrations/**", "src/migrationsX/a.sql", false],
  ["kernel/auth/**", "kernel/auth/x.ts", true],
  ["kernel/auth/**", "kernel/authz.ts", false],
  ["**/*.auth.ts", "app/session.auth.ts", true],
  [".github/**", ".github/workflows/a.yml", true],
];
let globsOk = true;
for (const [glob, sample, expected] of globCases) {
  const got = globToRegExp(glob).test(sample);
  if (got !== expected) { bad(`glob '${glob}' vs '${sample}': expected ${expected}, got ${got}`); globsOk = false; }
}
if (globsOk) ok("glob matching behaves");

// --- 6. Files the workflows reference must exist ----------------------------
const REQUIRED = [
  "AGENTS.md",
  // The agent prompts in the workflows load these by name. A bootstrap that
  // dropped one would otherwise exit 0, and fail later mid-run on a model that
  // quietly proceeded without the source of truth.
  "docs/ARCHITECTURE.md",
  "docs/SCHEMA.sql",
  "docs/COLD-START.md",
  "docs/TOPOLOGY.md",
  "docs/OPERATIONS-SCARS.md",
  "playbooks/00-bootstrap-repo.md",
  "playbooks/10-file-a-change.md",
  "playbooks/20-zero-the-queue.md",
  "playbooks/21-propose-a-rule.md",
  "scripts/harness-config.mjs",
  "scripts/lane-classify.mjs",
  "scripts/growth-gate.mjs",
  ".github/workflows/00-checks.yml",
  ".github/workflows/10-pipeline.yml",
  ".github/workflows/50-release.yml",
  ".github/actions/review-round/action.yml",
  "playbooks/05-implement-change.md",
  "playbooks/06-review-change.md",
  "playbooks/07-repair-change.md",
];
let allPresent = true;
for (const f of REQUIRED) {
  // Build-time docs retire to docs/archive/ after P7 (the context diet);
  // either location satisfies the requirement.
  const archived = f.startsWith("docs/") ? f.replace("docs/", "docs/archive/") : null;
  const present = fs.existsSync(path.join(process.cwd(), f)) ||
    (archived && fs.existsSync(path.join(process.cwd(), archived)));
  if (!present) { bad(`missing required file ${f}`); allPresent = false; }
}
if (allPresent) ok("required files present");

// --- 7. The convergence budget ----------------------------------------------
// Run the growth gate from here rather than as a separate workflow step, so
// wiring it cannot be forgotten: every caller of the self-check gets it. It
// exits 0 when no origin/main base exists (fresh repo, shallow clone), and
// fails only over-budget-AND-growing — a shrinking change always passes.
try {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [path.join(process.cwd(), "scripts/growth-gate.mjs")], { stdio: "inherit" });
  ok("growth gate");
} catch {
  bad("growth gate failed — over budget and growing. See harness.toml [budget].");
}

console.log("");
if (problems.length) {
  console.log(`${problems.length} problem(s). The harness will not behave as documented until these are fixed.`);
  process.exit(1);
}
console.log("harness self-check passed.");
