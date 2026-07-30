#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const [, , input] = process.argv;

if (!input) {
  console.error("Usage: node validate-storyboard.mjs <storyboard.html>");
  process.exit(2);
}

const htmlPath = path.resolve(input);
const baseDir = path.dirname(htmlPath);
const errors = [];

if (!fs.existsSync(htmlPath) || !fs.statSync(htmlPath).isFile()) {
  console.error(`Storyboard file not found: ${htmlPath}`);
  process.exit(2);
}

const html = fs.readFileSync(htmlPath, "utf8");
const match = html.match(/const\s+STORYBOARD_DATA\s*=\s*(\{[\s\S]*?\n\s*\});/);

if (!match) {
  console.error("Could not find a JSON-compatible const STORYBOARD_DATA = { ... }; block.");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(match[1]);
} catch (error) {
  console.error(`STORYBOARD_DATA must be valid JSON syntax: ${error.message}`);
  process.exit(1);
}

const collections = {
  screens: { pattern: /^S\d{3}$/, items: data.screens ?? [] },
  branches: { pattern: /^B\d{3}$/, items: data.branches ?? [] },
  targets: { pattern: /^T\d{3}$/, items: data.targets ?? [] },
  edges: { pattern: /^E\d{3}$/, items: data.edges ?? [] }
};

for (const [name, collection] of Object.entries(collections)) {
  const seen = new Set();
  for (const item of collection.items) {
    if (!collection.pattern.test(item.id ?? "")) {
      errors.push(`${name}: invalid ID "${item.id ?? ""}"`);
    }
    if (seen.has(item.id)) {
      errors.push(`${name}: duplicate ID "${item.id}"`);
    }
    seen.add(item.id);
  }
}

const screenIds = new Set(collections.screens.items.map((item) => item.id));
const branchIds = new Set(collections.branches.items.map((item) => item.id));
const nodeIds = new Set([...screenIds, ...branchIds]);
const targetIds = new Set(collections.targets.items.map((item) => item.id));
const allowedStatuses = new Set(["conceptual", "reference", "authoritative"]);
const allowedRoutes = new Set(["success", "recovery"]);

for (const screen of collections.screens.items) {
  if (!allowedStatuses.has(screen.sourceStatus)) {
    errors.push(`screens: ${screen.id} has invalid sourceStatus "${screen.sourceStatus ?? ""}"`);
  }

  if (typeof screen.image !== "string" || screen.image.length === 0) {
    errors.push(`screens: ${screen.id} has no image path`);
    continue;
  }

  if (/^[a-z]+:\/\//i.test(screen.image) || path.isAbsolute(screen.image)) {
    errors.push(`screens: ${screen.id} image must be a relative local path or data URL`);
    continue;
  }

  if (!screen.image.startsWith("data:")) {
    const resolved = path.resolve(baseDir, screen.image);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      errors.push(`screens: ${screen.id} image does not exist: ${screen.image}`);
    }
  }
}

for (const target of collections.targets.items) {
  if (!screenIds.has(target.screenId)) {
    errors.push(`targets: ${target.id} references missing screen "${target.screenId}"`);
  }
}

for (const edge of collections.edges.items) {
  if (!nodeIds.has(edge.source)) {
    errors.push(`edges: ${edge.id} references missing source "${edge.source}"`);
  }
  if (!nodeIds.has(edge.target)) {
    errors.push(`edges: ${edge.id} references missing target "${edge.target}"`);
  }
  if (edge.targetId && !targetIds.has(edge.targetId)) {
    errors.push(`edges: ${edge.id} references missing action target "${edge.targetId}"`);
  }
  if (!allowedRoutes.has(edge.route)) {
    errors.push(`edges: ${edge.id} has unsupported route "${edge.route ?? ""}"`);
  }
  if (typeof edge.path !== "string" || !edge.path.trim()) {
    errors.push(`edges: ${edge.id} has no SVG path`);
  }
}

const hasConceptualScreens = collections.screens.items.some(
  (screen) => screen.sourceStatus === "conceptual"
);
const requiredNotice = "Concept mockup — not production design";

if (hasConceptualScreens && data.conceptNotice !== requiredNotice) {
  errors.push(`conceptNotice must be exactly "${requiredNotice}" when conceptual screens are present`);
}
if (hasConceptualScreens && !html.includes(requiredNotice)) {
  errors.push("The HTML must visibly include the concept mockup notice");
}

if (collections.screens.items.length === 0) {
  errors.push("At least one screen is required");
}
if (!html.includes('id="arrow-layer"') || !html.includes('id="screen-layer"')) {
  errors.push("Expected storyboard layer containers are missing");
}

if (errors.length > 0) {
  console.error(`Storyboard validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Storyboard is structurally valid: ${collections.screens.items.length} screen(s), ` +
  `${collections.branches.items.length} branch(es), ${collections.targets.items.length} target(s), ` +
  `${collections.edges.items.length} edge(s).`
);
console.log("Visual overlap and rendered image quality still require browser review.");

