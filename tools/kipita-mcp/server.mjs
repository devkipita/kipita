#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DESIGN_FILE = join(ROOT, "docs", "design", "kipita-design-system.html");
const NOCTURNE_FILE = join(ROOT, "apps", "web", "lib", "nocturne.ts");
const MOTION_FILE = join(ROOT, "apps", "web", "lib", "motion.ts");
const LAUNCH_FILE = join(ROOT, "docs", "LAUNCH.md");
const CHECKER = join(ROOT, "tools", "design-check", "index.mjs");

const ROLE_TO_NOCTURNE = {
  background: "bg",
  onBackground: "cream",
  onSurface: "cream",
  onSurfaceVariant: "muted",
  mutedText: "muted2",
  outlineVariant: "line",
  surfaceContainerLowest: "surface",
  surfaceContainerHigh: "surface3",
  cta: "ctaBg",
  onCta: "ctaFg",
  tan: "tan",
};

function readDesignSystem() {
  const html = readFileSync(DESIGN_FILE, "utf8");
  const match = html.match(/const K=(\{[\s\S]*?\});<\/script>/);
  if (!match) throw new Error("Token block `const K={...}` not found in the design file.");
  return JSON.parse(match[1]);
}

function readNocturne() {
  const src = readFileSync(NOCTURNE_FILE, "utf8");
  const block = (name) => {
    const m = src.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\} as const;`));
    const out = {};
    if (!m) return out;
    for (const [, k, v] of m[1].matchAll(/"(--n-[\w-]+)":\s*"([^"]+)"/g)) out[k] = v;
    return out;
  };
  const names = {};
  const m = src.match(/export const nocturne = \{([\s\S]*?)\} as const;/);
  if (m) for (const [, k, v] of m[1].matchAll(/(\w+):\s*"var\((--n-[\w-]+)\)"/g)) names[k] = v;
  const motion = existsSync(MOTION_FILE) ? readFileSync(MOTION_FILE, "utf8") : "";
  const pickFrom = (text, re) => {
    const mm = text.match(re);
    const out = {};
    if (mm) for (const [, k, s, n] of mm[1].matchAll(/(\w+):\s*(?:"([^"]*)"|([\d.]+))/g)) out[k] = s ?? Number(n);
    return out;
  };
  return {
    names,
    light: block("nocturneLight"),
    dark: block("nocturneDark"),
    ease: (() => {
      const mm = motion.match(/export const curve = \{([\s\S]*?)\} as const/);
      const out = {};
      if (mm) for (const [, k, c] of mm[1].matchAll(/(\w+):\s*\[([^\]]+)\]/g)) out[k] = `cubic-bezier(${c.split(",").map((s) => s.trim()).join(", ")})`;
      return out;
    })(),
    dur: pickFrom(motion, /export const dur = \{([\s\S]*?)\} as const;/),
  };
}

function designTokens({ group, role } = {}) {
  const k = readDesignSystem();
  const n = readNocturne();
  const roles = Object.keys(k.LIGHT).map((r) => {
    const token = ROLE_TO_NOCTURNE[r] ?? null;
    const cssVar = token ? n.names[token] : null;
    return {
      role: r,
      light: k.LIGHT[r],
      dark: k.DARK[r],
      nocturne: token,
      code: cssVar ? { light: n.light[cssVar], dark: n.dark[cssVar] } : null,
      drift: cssVar
        ? n.light[cssVar]?.toLowerCase() !== k.LIGHT[r].toLowerCase() || n.dark[cssVar]?.toLowerCase() !== k.DARK[r].toLowerCase()
        : null,
    };
  });
  const all = {
    roles,
    type: k.TYPE.map(([name, fam, weight, size, line, track, use]) => ({ name, family: k.FAM[fam], weight, size, line, tracking: track, use })),
    space: Object.fromEntries(k.SPACE),
    radius: k.RADIUS.map(([name, px, use]) => ({ name, px, use })),
    elevation: k.ELEV.map(([level, name, shadow, dp, use]) => ({ level, name, shadow, use })),
    motion: { designFile: { ease: k.EASE, durations: k.DUR }, code: { ease: n.ease, dur: n.dur } },
    alerts: k.ALERT.map(([id, label, icon, hex]) => ({ id, label, icon, hex })),
    brand: k.BRAND.map(([name, hex, use]) => ({ name, hex, use })),
    icons: k.ICONS,
    nocturneNames: n.names,
  };
  if (role) return roles.filter((r) => r.role.toLowerCase() === String(role).toLowerCase() || r.nocturne === role);
  if (group) {
    if (!(group in all)) throw new Error(`Unknown group "${group}". Use one of: ${Object.keys(all).join(", ")}.`);
    return all[group];
  }
  return all;
}

function checkDesignRules({ paths = [], strict = false } = {}) {
  const run = spawnSync(process.execPath, [CHECKER, "--json", ...(strict ? ["--strict"] : []), ...paths], { cwd: ROOT, encoding: "utf8" });
  if (!run.stdout) throw new Error(run.stderr || "design-check produced no output");
  return JSON.parse(run.stdout);
}

function launchGates({ status } = {}) {
  if (!existsSync(LAUNCH_FILE)) throw new Error("docs/LAUNCH.md not found.");
  const lines = readFileSync(LAUNCH_FILE, "utf8").split(/\r?\n/);
  const sections = [];
  let heading = "";
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^##\s+(.*)/);
    if (h) heading = h[1].trim();
    if (!/^\|/.test(lines[i]) || !/^\|[\s:-]+\|/.test(lines[i + 1] ?? "")) continue;
    const cells = (l) => l.split("|").slice(1, -1).map((c) => c.trim());
    const head = cells(lines[i]).map((c) => c.toLowerCase());
    if (!head.includes("status")) continue;
    const rows = [];
    i += 2;
    while (i < lines.length && /^\|/.test(lines[i])) {
      const c = cells(lines[i]);
      rows.push(Object.fromEntries(head.map((h2, j) => [h2, c[j] ?? ""])));
      i++;
    }
    sections.push({ section: heading, rows });
  }
  const filtered = status
    ? sections.map((s) => ({ ...s, rows: s.rows.filter((r) => r.status.toLowerCase().includes(String(status).toLowerCase())) }))
    : sections;
  const summary = filtered.map((s) => {
    const counts = {};
    for (const r of s.rows) counts[r.status.toLowerCase()] = (counts[r.status.toLowerCase()] ?? 0) + 1;
    return { section: s.section, counts };
  });
  return { summary, sections: filtered };
}

const TOOLS = {
  design_tokens: {
    description:
      "Kipita design tokens from docs/design/kipita-design-system.html, mapped to apps/web/lib/nocturne.ts names, with drift flags where code and design disagree. Optional `role` (e.g. \"mutedText\" or \"muted2\") or `group` (roles, type, space, radius, elevation, motion, alerts, brand, icons, nocturneNames).",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string", description: "A design role or nocturne name" },
        group: { type: "string", description: "One token group" },
      },
    },
    run: designTokens,
  },
  check_design_rules: {
    description:
      "Run the Kipita design checker on apps/web files or directories: colour literals, emoji, inline styles, raw <img>, layout animation, foreign icons, native dialogs, plus the docs/DESIGN.md Guards (edge stripes, pill or oversized chips, ungated or moving hover, icon-tint hover, missing focus/press states, tiny icons and text, off-grid spacing, literal motion, ease-in, transition: all, scale(0), generic labels, skeleton source). Compares against the baseline; paths in tools/design-check/strict.json and `strict: true` allow zero. Omit `paths` to check the whole app.",
    inputSchema: {
      type: "object",
      properties: {
        paths: { type: "array", items: { type: "string" }, description: "Repo-relative or absolute file or directory paths" },
        strict: { type: "boolean", description: "Ignore the baseline; every finding fails" },
      },
    },
    run: checkDesignRules,
  },
  launch_gates: {
    description: "Read the launch gate tables from docs/LAUNCH.md and summarise status per section. Optional `status` filter (open, in progress, done, blocked).",
    inputSchema: { type: "object", properties: { status: { type: "string" } } },
    run: launchGates,
  },
};

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function handle(req) {
  const { id, method, params } = req;
  if (method === "initialize") {
    return {
      protocolVersion: params?.protocolVersion ?? "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "kipita", version: "1.0.0" },
    };
  }
  if (method === "ping") return {};
  if (method === "tools/list") {
    return { tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema })) };
  }
  if (method === "tools/call") {
    const tool = TOOLS[params?.name];
    if (!tool) throw Object.assign(new Error(`Unknown tool ${params?.name}`), { code: -32602 });
    try {
      const result = tool.run(params.arguments ?? {});
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e.message ?? e) }], isError: true };
    }
  }
  if (id === undefined) return undefined;
  throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 });
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (raw) => {
  const line = raw.replace(/^﻿/, "");
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  try {
    const result = handle(req);
    if (req.id !== undefined && result !== undefined) send({ jsonrpc: "2.0", id: req.id, result });
  } catch (e) {
    if (req.id !== undefined) send({ jsonrpc: "2.0", id: req.id, error: { code: e.code ?? -32603, message: e.message } });
  }
});
