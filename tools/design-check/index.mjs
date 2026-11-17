#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASELINE = join(ROOT, "tools", "design-check", "baseline.json");
const SCOPES = ["apps/web/components", "apps/web/app"];
const EXT = /\.(tsx?|jsx?)$/;

const LINE_RULES = [
  {
    id: "hex",
    test: /(^|[^\w&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/,
    message: "Literal hex colour. Use a nocturne token.",
  },
  {
    id: "rgb",
    test: /\b(?:rgba?|hsla?)\(\s*\d/,
    message: "Literal rgb/hsl colour. Use a nocturne token or color-mix on one.",
  },
  {
    id: "emoji",
    test: /(?![©®™])\p{Extended_Pictographic}/u,
    message: "Emoji in UI. Use an icon from components/icons.",
  },
  {
    id: "inline-style",
    test: /\bstyle=\{\{/,
    message: "Inline style object. Use a styled component or a transient prop.",
  },
  {
    id: "raw-img",
    test: /<img\b/,
    message: "Raw <img>. Use next/image; raw <img> only for blob: previews.",
  },
  {
    id: "layout-transition",
    test: /transition(?:-property)?\s*:[^;`]*(?<![-\w])(?:top|left|right|bottom|width|height|margin(?:-\w+)?)\b(?!-)/,
    message: "Transition on a layout property. Animate transform or opacity.",
  },
  {
    id: "icon-lib",
    test: /from\s+["'](?:lucide-react|react-icons[^"']*|@heroicons\/[^"']+|@phosphor-icons\/[^"']+|[^"']*landing\/icons)["']/,
    message: "Icon from outside components/icons.",
  },
  {
    id: "console-log",
    test: /\bconsole\.log\(/,
    message: "console.log left in code.",
  },
  {
    id: "window-confirm",
    test: /\bwindow\.(?:confirm|alert)\(/,
    message: "Native dialog. Use useConfirm from components/ui/ConfirmPop.",
  },
];

const KEYFRAME_LAYOUT = /(?:^|[{;\s])(?:top|left|right|bottom|width|height|margin(?:-\w+)?)\s*:/;

function toRel(p) {
  return relative(ROOT, resolve(p)).split(sep).join("/");
}

function inScope(rel) {
  return EXT.test(rel) && SCOPES.some((s) => rel === s || rel.startsWith(s + "/"));
}

function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(toRel(full));
  }
  return out;
}

function checkFile(rel) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const lines = text.split(/\r?\n/);
  const found = [];
  let tagged = false;
  let depth = 0;
  const braces = (s) => (s.match(/\{/g) ?? []).length - (s.match(/\}/g) ?? []).length;
  lines.forEach((line, i) => {
    for (const rule of LINE_RULES) {
      if (rule.test.test(line)) found.push({ file: rel, line: i + 1, rule: rule.id, message: rule.message });
    }
    const opensTagged = /\bkeyframes`/.test(line);
    const opensAt = /@keyframes\b/.test(line);
    if (opensTagged) tagged = true;
    if (opensAt) depth = Math.max(depth, 0) + braces(line.slice(line.indexOf("@keyframes")));
    else if (depth > 0) depth += braces(line);
    if ((tagged || depth > 0 || opensAt) && KEYFRAME_LAYOUT.test(line)) {
      found.push({ file: rel, line: i + 1, rule: "layout-keyframe", message: "Keyframe on a layout property. Animate transform or opacity." });
    }
    if (tagged && !opensTagged && /`/.test(line)) tagged = false;
    if (depth < 0) depth = 0;
  });
  if (rel.startsWith("apps/web/app/(site)/") && /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(text)) {
    const at = lines.findIndex((l) => /force-dynamic/.test(l));
    found.push({ file: rel, line: at + 1, rule: "site-dynamic", message: "force-dynamic on a public (site) route. Keep it static." });
  }
  return found;
}

function tally(violations) {
  const counts = {};
  for (const v of violations) {
    counts[v.file] ??= {};
    counts[v.file][v.rule] = (counts[v.file][v.rule] ?? 0) + 1;
  }
  return counts;
}

function loadBaseline() {
  return existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};
}

function regressions(violations, baseline) {
  const counts = tally(violations);
  const over = [];
  for (const [file, rules] of Object.entries(counts)) {
    for (const [rule, n] of Object.entries(rules)) {
      const allowed = baseline[file]?.[rule] ?? 0;
      if (n > allowed) over.push({ file, rule, count: n, allowed });
    }
  }
  return over;
}

function report(files, { json, quiet }) {
  const baseline = loadBaseline();
  const violations = files.flatMap(checkFile);
  const over = regressions(violations, baseline);
  const newFindings = violations.filter((v) => over.some((o) => o.file === v.file && o.rule === v.rule));
  const result = {
    files: files.length,
    total: violations.length,
    baselineTotal: Object.entries(baseline)
      .filter(([f]) => files.includes(f))
      .reduce((s, [, r]) => s + Object.values(r).reduce((a, b) => a + b, 0), 0),
    regressions: over,
    findings: newFindings,
  };
  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else if (!quiet || over.length) {
    for (const v of newFindings) console.error(`${v.file}:${v.line}  ${v.rule}  ${v.message}`);
    for (const o of over) console.error(`  ${o.file}: ${o.rule} ${o.count} (baseline ${o.allowed})`);
    console.error(`design-check: ${files.length} files, ${violations.length} findings, baseline ${result.baselineTotal}, ${over.length} regressions`);
  }
  return over.length === 0;
}

function readStdin() {
  try {
    return readFileSync(0, "utf8").replace(/^﻿/, "");
  } catch {
    return "";
  }
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const paths = args.filter((a) => !a.startsWith("--"));
const all = () => SCOPES.flatMap((s) => walk(join(ROOT, s), []));

if (flags.has("--write-baseline")) {
  const counts = tally(all().flatMap(checkFile));
  const sorted = Object.fromEntries(Object.keys(counts).sort().map((k) => [k, counts[k]]));
  writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + "\n");
  const total = Object.values(counts).reduce((s, r) => s + Object.values(r).reduce((a, b) => a + b, 0), 0);
  console.error(`design-check: baseline written, ${Object.keys(counts).length} files, ${total} findings`);
  process.exit(0);
}

if (flags.has("--hook")) {
  let file = "";
  try {
    const input = JSON.parse(readStdin() || "{}");
    file = input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "";
  } catch {
    process.exit(0);
  }
  const rel = file ? toRel(file) : "";
  if (!rel || !inScope(rel) || !existsSync(join(ROOT, rel))) process.exit(0);
  process.exit(report([rel], { json: false, quiet: true }) ? 0 : 2);
}

const files = paths.length ? paths.map(toRel).filter(inScope).filter((f) => existsSync(join(ROOT, f))) : all();
process.exit(report(files, { json: flags.has("--json"), quiet: false }) ? 0 : 1);
