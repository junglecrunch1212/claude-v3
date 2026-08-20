#!/usr/bin/env node
// Reads harness.toml and emits GitHub Actions outputs.
// Deliberately dependency-free: this runs before `npm ci`, so it cannot import
// a TOML library. It parses the subset this file actually uses — tables,
// strings, integers, booleans, and arrays of strings.
//
//   node scripts/harness-config.mjs            -> writes all keys to $GITHUB_OUTPUT
//   node scripts/harness-config.mjs agents.reviewer   -> prints one value
//
// Every workflow calls this instead of hardcoding behaviour, so harness.toml
// stays the only control surface.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.GITHUB_WORKSPACE || process.cwd();
const FILE = path.join(ROOT, "harness.toml");

function stripComment(line) {
  let out = "";
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inStr = !inStr;
    if (c === "#" && !inStr) break;
    out += c;
  }
  return out;
}

function parseScalar(raw) {
  const v = raw.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^".*"$/.test(v)) return v.slice(1, -1);
  return v;
}

export function parseToml(text) {
  const root = {};
  let table = root;
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    let line = stripComment(lines[i]).trim();
    if (!line) continue;

    const tableMatch = /^\[([A-Za-z0-9_.]+)\]$/.exec(line);
    if (tableMatch) {
      table = tableMatch[1].split(".").reduce((acc, part) => {
        acc[part] = acc[part] || {};
        return acc[part];
      }, root);
      continue;
    }

    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Multi-line array: keep consuming until the closing bracket.
    if (value.startsWith("[") && !value.includes("]")) {
      let buf = value;
      while (++i < lines.length) {
        buf += " " + stripComment(lines[i]).trim();
        if (buf.includes("]")) break;
      }
      value = buf;
    }

    if (value.startsWith("[")) {
      const inner = value.slice(value.indexOf("[") + 1, value.lastIndexOf("]"));
      table[key] = inner
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => parseScalar(s));
    } else {
      table[key] = parseScalar(value);
    }
  }
  return root;
}

export function loadConfig(file = FILE) {
  if (!fs.existsSync(file)) {
    throw new Error(`harness.toml not found at ${file}`);
  }
  return parseToml(fs.readFileSync(file, "utf8"));
}

function get(cfg, dotted) {
  return dotted.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), cfg);
}

// Flattened keys the workflows consume. Kept explicit so a typo in a workflow
// fails loudly here rather than silently producing an empty string.
const OUTPUTS = {
  stage: "stage",
  owner: "owner",
  project_name: "project_name",
  implementer: "agents.implementer",
  reviewer: "agents.reviewer",
  repairer: "agents.repairer",
  autonomy_mode: "autonomy.mode",
  max_repair_attempts: "autonomy.max_repair_attempts",
  max_open_agent_prs: "autonomy.max_open_agent_prs",
  max_turns_implement: "limits.max_turns_implement",
  max_turns_review: "limits.max_turns_review",
  max_turns_repair: "limits.max_turns_repair",
  max_prs_per_day: "limits.max_prs_per_day",
  deploy_target: "deploy.target",
  // Consumed by the app-exists probe in 00-checks.yml and 50-release.yml.
  // Emitted rather than hardcoded in the YAML so that changing it here cannot
  // silently turn every check into a SKIP that passes while testing nothing.
  app_dir: "stack.app_dir",
};

function main() {
  const cfg = loadConfig();
  const arg = process.argv[2];

  if (arg) {
    const value = get(cfg, arg);
    if (value === undefined) {
      console.error(`harness.toml: no key '${arg}'`);
      process.exit(1);
    }
    process.stdout.write(String(value));
    return;
  }

  const lines = [];
  for (const [name, dotted] of Object.entries(OUTPUTS)) {
    const value = get(cfg, dotted);
    if (value === undefined) {
      console.error(`harness.toml: missing required key '${dotted}'`);
      process.exit(1);
    }
    lines.push(`${name}=${value}`);
  }

  const out = process.env.GITHUB_OUTPUT;
  if (out) fs.appendFileSync(out, lines.join("\n") + "\n");
  else console.log(lines.join("\n"));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
