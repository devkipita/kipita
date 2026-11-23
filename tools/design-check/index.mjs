#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASELINE = join(ROOT, "tools", "design-check", "baseline.json");
const STRICT_LIST = join(ROOT, "tools", "design-check", "strict.json");
const SCOPES = ["apps/web/components", "apps/web/app"];
const EXT = /\.(tsx?|jsx?)$/;

const SPACING_PROP = /\b(?:padding|margin|gap|row-gap|column-gap)(?:-[a-z]+)?\s*:\s*([^;`]+)/;

function offGrid(line) {
  const m = line.match(SPACING_PROP);
  if (!m) return false;
  const values = [...m[1].matchAll(/(?<![\w.$])-?(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]));
  return values.some((v) => v > 2 && v % 4 !== 0);
}

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
  {
    id: "accent-stripe",
    test: /border-(?:left|right|inline-start|inline-end)\s*:\s*(?:[2-9]|\d{2,})(?:\.\d+)?px\s+solid|box-shadow\s*:[^;`]*\binset\s+-?(?:[2-9]|\d{2,})px\s+0(?![.\d])/,
    message: "Coloured stripe on the edge of a card or row. Separate with a tone step or a hairline; status is an icon plus a word.",
  },
  {
    id: "transition-all",
    test: /transition(?:-property)?\s*:\s*all\b/,
    message: "transition: all. Name each property.",
  },
  {
    id: "ease-in",
    test: /\bease-in\b(?!-out)/,
    message: "ease-in on UI feels late. Use ease.enter, ease.exit or ease.standard.",
  },
  {
    id: "scale-zero",
    test: /scale\(\s*0\s*\)|\bscale\s*:\s*0(?![.\d])/,
    message: "Entering from scale(0). Start at scale(0.95) with opacity 0.",
  },
  {
    id: "literal-motion",
    test: /cubic-bezier\(|(?:transition|animation)(?:-duration|-delay)?\s*:[^;`]*(?<![\w.$-])\d+(?:\.\d+)?m?s\b/,
    message: "Literal duration or curve. Use dur.* and ease.* from lib/nocturne.",
  },
  {
    id: "gradient-text",
    test: /background-clip\s*:\s*text/,
    message: "Gradient text. Ink is one token colour.",
  },
  {
    id: "uppercase",
    test: /text-transform\s*:\s*uppercase/,
    message: "Uppercase label. Sentence case everywhere.",
  },
  {
    id: "tiny-text",
    test: /font-size\s*:\s*(?:(?:[0-9]|1[01])(?:\.\d+)?px|0?\.(?:[0-6]\d*|7(?:[0-4]\d*)?(?!\d))rem)\b/,
    message: "Text below 12px.",
  },
  {
    id: "tiny-icon",
    test: /<[A-Z]\w*\b[^>]*?\bsize=\{(?:[0-9]|1[0-5])\}/,
    message: "Icon under 16px. 16 inline with text, 20 in controls, 24 standalone.",
  },
  {
    id: "generic-label",
    test: />\s*(?:Cancel|Submit|OK|Ok|Yes|No|Confirm|Close|Save|Done|Click here|Learn more|Read more)\s*</,
    message: "Label names no action. Say what happens: \"Cancel ride\", \"Save alert\".",
  },
  {
    id: "raw-count",
    test: (line) =>
      !/RollingNumber|aria-|title=|label/.test(line)
      && (/(?<![$\w])formatCompactNumber\(/.test(line) || /(?<![$=])\{\s*[\w.]*(?:_count|Count|\.length)\s*\}/.test(line)),
    message: "Count rendered as a static number. Counts roll with RollingNumber from ui/Counter.",
  },
  {
    id: "off-grid",
    test: offGrid,
    message: "Spacing off the 4px grid. Use 4, 8, 12, 16, 20, 24...",
  },
];

const KEYFRAME_LAYOUT = /(?:^|[{;\s])(?:top|left|right|bottom|width|height|margin(?:-\w+)?)\s*:/;
const TEMPLATE_START = /(?:const|let)\s+(\w+)\s*=\s*styled(?:\.(\w+)|\(\s*([\w.]+)\s*\))(?:\.attrs\([^)]*\))?(?:<[^`]*?>)?`|\bcss`/g;
const CHIP_NAME = /(?:Chip|Pill|Tag|Badge)$/;
const INTERACTIVE_TAG = new Set(["button", "a"]);
const INTERACTIVE_BASE = /^(?:Link|\w*Button)$/;
const STATE_MIXIN = /\$\{\s*(?:pressable\(|\w*(?:[Pp]ress|[Ii]nteractive)\w*\s*[}(])/;
const HOVER_MEDIA = /@media[^{]*\(hover:\s*hover\)/;
const HOVER_MOVES = /translate(?:Y|3d)?\(\s*(?:[^,)]*,\s*)?-|scale\(\s*1\.\d*[1-9]|rotate\(/;
const COLOR_TOKEN = /\$\w+|nocturne\.\w+|theme\.color\.\w+|var\(--[\w-]+\)/g;

function skipString(text, i) {
  const quote = text[i];
  i++;
  while (i < text.length && text[i] !== quote) i += text[i] === "\\" ? 2 : 1;
  return i + 1;
}

function skipExpr(text, i) {
  let depth = 1;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      i = skipString(text, i);
      continue;
    }
    if (c === "`") {
      i = skipTemplate(text, i + 1) + 1;
      continue;
    }
    if (c === "{") depth++;
    if (c === "}" && --depth === 0) return i + 1;
    i++;
  }
  return i;
}

function skipTemplate(text, i) {
  while (i < text.length) {
    const c = text[i];
    if (c === "\\") i += 2;
    else if (c === "`") return i;
    else if (c === "$" && text[i + 1] === "{") i = skipExpr(text, i + 2);
    else i++;
  }
  return i;
}

function maskInterpolations(raw) {
  let out = "";
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === "\\") {
      out += raw.slice(i, i + 2);
      i += 2;
    } else if (raw[i] === "$" && raw[i + 1] === "{") {
      const end = skipExpr(raw, i + 2);
      out += "§" + raw.slice(i + 1, end).replace(/[^\n]/g, " ");
      i = end;
    } else {
      out += raw[i];
      i++;
    }
  }
  return out;
}

function cssBlocks(masked) {
  const blocks = [];
  const stack = [];
  let boundary = 0;
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (c === "{") {
      stack.push({ selector: masked.slice(boundary, i).trim(), start: i + 1 });
      boundary = i + 1;
    } else if (c === "}") {
      const open = stack.pop();
      if (open) blocks.push({ ...open, end: i, ancestors: stack.map((s) => s.selector) });
      boundary = i + 1;
    } else if (c === ";") {
      boundary = i + 1;
    }
  }
  return blocks;
}

function topLevel(text, blocks) {
  const chars = text.split("");
  for (const b of blocks) {
    if (b.ancestors.length) continue;
    for (let i = b.start; i < b.end; i++) if (chars[i] !== "\n") chars[i] = " ";
  }
  return chars.join("");
}

function pxOver(text, pattern, limit) {
  const m = text.match(pattern);
  return m ? Number(m[1]) > limit : false;
}

function checkTemplate(rel, text, match, push) {
  const [, name, tag, base] = match;
  const start = match.index + match[0].length;
  const end = skipTemplate(text, start);
  const raw = text.slice(start, end);
  const masked = maskInterpolations(raw);
  const firstLine = text.slice(0, start).split(/\r?\n/).length;
  const lineAt = (offset) => firstLine + (masked.slice(0, offset).match(/\n/g) ?? []).length;
  const blocks = cssBlocks(masked);

  for (const b of blocks) {
    const body = masked.slice(b.start, b.end);
    const rawBody = raw.slice(b.start, b.end);
    const chain = [...b.ancestors, b.selector];
    const hovering = chain.some((s) => /:hover/.test(s) && !s.startsWith("@"));
    if (/:hover/.test(b.selector) && !chain.some((s) => HOVER_MEDIA.test(s) || /prefers-reduced-motion/.test(s))) {
      push(lineAt(b.start), "hover-ungated", "Hover outside @media (hover: hover). Touch taps leave it stuck on.");
    }
    if (hovering && !chain.some((s) => /prefers-reduced-motion/.test(s)) && HOVER_MOVES.test(body)) {
      push(lineAt(b.start), "hover-moves", "Hover lifts, grows or spins the element. Hover changes tone only; press scales 0.97.");
    }
    if (hovering) {
      const color = rawBody.match(/(?:^|[;\s{])color\s*:\s*([^;]+);/);
      const bg = rawBody.match(/background(?:-color)?\s*:\s*([^;]+);/);
      if (color && bg && /color-mix\(/.test(bg[1]) && /transparent/.test(bg[1])) {
        const tokens = (color[1].match(COLOR_TOKEN) ?? []).filter((t) => !/^(?:nocturne\.cream|var\(--n-cream\))$/.test(t));
        if (tokens.some((t) => bg[1].includes(t))) {
          push(lineAt(b.start), "hover-tint", "Hover tints the background with the icon's own colour, so the icon sinks into it. Use the neutral state layer and keep full ink.");
        }
      }
    }
    if (/::?(?:before|after)/.test(b.selector) && /\bwidth\s*:\s*[2-6]px/.test(body)
      && /\b(?:left|right|inset-inline-start|inset-inline-end)\s*:\s*0\b|\binset\s*:\s*0\s+auto\s+0\s+0/.test(body)
      && /\btop\s*:\s*0\b|\bbottom\s*:\s*0\b|\bheight\s*:\s*100%/.test(body)) {
      push(lineAt(b.start), "accent-stripe", "Pseudo-element stripe on the edge of a card or row. Separate with a tone step or a hairline.");
    }
  }

  if (!name) return;
  const decl = topLevel(masked, blocks);
  const rawDecl = topLevel(raw, blocks);
  const at = firstLine;

  if (CHIP_NAME.test(name)) {
    if (/border-radius\s*:\s*(?:9{3,}px|50%|[1-9]\d{2,}px)|border-radius\s*:\s*\$\{[^}]*radius\.pill/.test(rawDecl)) {
      push(at, "chip-pill", `${name}: chip shaped as a pill. Chips are 8px rounded rectangles; pills are buttons.`);
    }
    const outlined = /(?:^|[;\s])border\s*:\s*\d(?:\.\d+)?px\s+solid(?!\s+transparent)/.test(rawDecl);
    const noFill = !/(?:^|[;\s])background(?:-color)?\s*:/.test(rawDecl) || /(?:^|[;\s])background(?:-color)?\s*:\s*(?:transparent|none)\s*;/.test(rawDecl);
    if (outlined && noFill) {
      push(at, "chip-outline", `${name}: outlined chip with no fill. Chips carry a soft tonal fill from their meaning.`);
    }
    const tall = pxOver(decl, /(?:^|[;\s])(?:min-)?height\s*:\s*(\d+)px/, 32);
    const padTop = pxOver(decl, /(?:^|[;\s])padding(?:-top|-block(?:-start)?)?\s*:\s*(\d+)px/, 5);
    const bigText = pxOver(decl, /font-size\s*:\s*(\d+(?:\.\d+)?)px/, 14) || /font-size\s*:\s*(?:0?\.(?:8[89]|9)\d*|[1-9](?:\.\d+)?)rem/.test(decl);
    if (tall || padTop || bigText) {
      push(at, "chip-size", `${name}: chip too big. Vertical padding 4px (5px max), height 32px max, text 13-14px.`);
    }
  }

  const interactive = INTERACTIVE_TAG.has(tag) || (base && INTERACTIVE_BASE.test(base));
  if (interactive && !STATE_MIXIN.test(raw)) {
    if (!/:focus-visible/.test(masked)) push(at, "state-focus", `${name}: no :focus-visible state.`);
    if (!/:active/.test(masked)) push(at, "state-press", `${name}: no :active press state.`);
  }
}

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
  const push = (line, rule, message) => found.push({ file: rel, line, rule, message });
  let tagged = false;
  let depth = 0;
  const braces = (s) => (s.match(/\{/g) ?? []).length - (s.match(/\}/g) ?? []).length;
  lines.forEach((line, i) => {
    for (const rule of LINE_RULES) {
      const hit = typeof rule.test === "function" ? rule.test(line) : rule.test.test(line);
      if (hit) push(i + 1, rule.id, rule.message);
    }
    const opensTagged = /\bkeyframes`/.test(line);
    const opensAt = /@keyframes\b/.test(line);
    if (opensTagged) tagged = true;
    if (opensAt) depth = Math.max(depth, 0) + braces(line.slice(line.indexOf("@keyframes")));
    else if (depth > 0) depth += braces(line);
    if ((tagged || depth > 0 || opensAt) && KEYFRAME_LAYOUT.test(line)) {
      push(i + 1, "layout-keyframe", "Keyframe on a layout property. Animate transform or opacity.");
    }
    if (tagged && !opensTagged && /`/.test(line)) tagged = false;
    if (depth < 0) depth = 0;
  });
  for (const match of text.matchAll(TEMPLATE_START)) checkTemplate(rel, text, match, push);
  if (/(?:Skeleton\w*\.tsx|\/loading\.tsx)$/.test(rel) && !/Shimmer|Skeleton["']/.test(text)) {
    push(1, "skeleton-source", "Skeleton not built from ui/Shimmer or a surface skeleton.");
  }
  if (rel.startsWith("apps/web/app/(site)/") && /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(text)) {
    const at = lines.findIndex((l) => /force-dynamic/.test(l));
    push(at + 1, "site-dynamic", "force-dynamic on a public (site) route. Keep it static.");
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

function loadJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
}

function strictPaths() {
  return loadJson(STRICT_LIST, { paths: [] }).paths ?? [];
}

function isStrict(file, forced) {
  return forced || strictPaths().some((p) => file === p || file.startsWith(p.replace(/\/$/, "") + "/"));
}

function regressions(violations, baseline, forced) {
  const counts = tally(violations);
  const over = [];
  for (const [file, rules] of Object.entries(counts)) {
    const strict = isStrict(file, forced);
    for (const [rule, n] of Object.entries(rules)) {
      const allowed = strict ? 0 : baseline[file]?.[rule] ?? 0;
      if (n > allowed) over.push({ file, rule, count: n, allowed, strict });
    }
  }
  return over;
}

function byRule(violations) {
  const counts = {};
  for (const v of violations) counts[v.rule] = (counts[v.rule] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function report(files, { json, quiet, strict }) {
  const baseline = loadJson(BASELINE, {});
  const violations = files.flatMap(checkFile);
  const over = regressions(violations, baseline, strict);
  const newFindings = violations.filter((v) => over.some((o) => o.file === v.file && o.rule === v.rule));
  const result = {
    files: files.length,
    total: violations.length,
    baselineTotal: Object.entries(baseline)
      .filter(([f]) => files.includes(f))
      .reduce((s, [, r]) => s + Object.values(r).reduce((a, b) => a + b, 0), 0),
    byRule: Object.fromEntries(byRule(violations)),
    regressions: over,
    findings: newFindings,
  };
  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else if (!quiet || over.length) {
    for (const v of newFindings) console.error(`${v.file}:${v.line}  ${v.rule}  ${v.message}`);
    for (const o of over) console.error(`  ${o.file}: ${o.rule} ${o.count} (${o.strict ? "strict, 0 allowed" : `baseline ${o.allowed}`})`);
    if (!quiet) console.error(`by rule: ${byRule(violations).map(([r, n]) => `${r} ${n}`).join(", ")}`);
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
  const counts = tally(all().filter((f) => !isStrict(f, false)).flatMap(checkFile));
  const sorted = Object.fromEntries(Object.keys(counts).sort().map((k) => [k, counts[k]]));
  writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + "\n");
  const total = Object.values(counts).reduce((s, r) => s + Object.values(r).reduce((a, b) => a + b, 0), 0);
  console.error(`design-check: baseline written, ${Object.keys(counts).length} files, ${total} findings (strict paths excluded)`);
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
  process.exit(report([rel], { json: false, quiet: true, strict: false }) ? 0 : 2);
}

const expand = (p) => {
  const rel = toRel(p);
  const full = join(ROOT, rel);
  if (existsSync(full) && statSync(full).isDirectory()) return walk(full, []);
  return [rel];
};
const files = paths.length ? paths.flatMap(expand).filter(inScope).filter((f) => existsSync(join(ROOT, f))) : all();
process.exit(report(files, { json: flags.has("--json"), quiet: false, strict: flags.has("--strict") }) ? 0 : 1);
