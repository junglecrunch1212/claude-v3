// Turns the reviewer's file into two step outputs, applying the two rules the
// workflow must not be able to argue with:
//
//   1. A missing or unparseable verdict is a fail. Silence is not consent.
//   2. Red deterministic checks are a fail whatever the reviewer said. Never
//      talk a failing compiler out of its result.
import fs from "node:fs";

const checks = process.env.CHECK_STATUS || "skip";
const reviewer = process.env.REVIEWER || "off";

let verdict = "fail";
let summary = "";

if (reviewer === "off") {
  verdict = checks === "fail" ? "fail" : "pass";
  summary = `review is off; the verdict follows the deterministic checks (${checks})`;
} else {
  try {
    const v = JSON.parse(fs.readFileSync(".harness/verdict.json", "utf8"));
    verdict = v.verdict === "pass" ? "pass" : "fail";
    summary = String(v.summary ?? "");
    const p1 = (Array.isArray(v.findings) ? v.findings : []).filter((f) => f.severity === "P1");
    if (p1.length) {
      verdict = "fail";
      if (!summary) summary = `${p1.length} P1 finding(s)`;
    }
  } catch (e) {
    verdict = "fail";
    summary = `no readable .harness/verdict.json (${e.message}) — read as fail`;
  }
}

if (checks === "fail") {
  verdict = "fail";
  summary = `deterministic checks failed. ${summary}`;
}

// One line, no newlines, bounded — this lands in a step output and then in a
// PR comment.
summary = summary.replace(/\s+/g, " ").trim().slice(0, 400);

const out = process.env.GITHUB_OUTPUT;
const lines = `verdict=${verdict}\nsummary=${summary}\n`;
if (out) fs.appendFileSync(out, lines);
else process.stdout.write(lines);
console.log(`round verdict: ${verdict} — ${summary}`);
