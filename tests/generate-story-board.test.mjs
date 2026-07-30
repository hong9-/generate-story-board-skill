import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const skillDir = path.join(root, ".agents", "skills", "generate-story-board");
const skillPath = path.join(skillDir, "SKILL.md");
const validatorPath = path.join(skillDir, "scripts", "validate-storyboard.mjs");
const templateDir = path.join(skillDir, "assets", "storyboard-template");
const templatePath = path.join(templateDir, "storyboard.html");

const runValidator = (filePath) =>
  spawnSync(process.execPath, [validatorPath, filePath], {
    cwd: root,
    encoding: "utf8"
  });

test("skill declares generated screens as conceptual and non-authoritative", () => {
  const skill = fs.readFileSync(skillPath, "utf8");
  assert.match(skill, /Concept mockup — not production design/);
  assert.match(skill, /not an approved UI design/);
  assert.match(skill, /Never promote an imagegen output beyond `conceptual`/);
});

test("bundled storyboard template passes structural validation", () => {
  const result = runValidator(templatePath);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Storyboard is structurally valid/);
});

test("bundled storyboard inline JavaScript has valid syntax", () => {
  const html = fs.readFileSync(templatePath, "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0][1]));
});

test("validator rejects a missing local screen asset", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "storyboard-skill-test-"));
  fs.cpSync(templateDir, tempDir, { recursive: true });
  const copiedTemplate = path.join(tempDir, "storyboard.html");
  const invalid = fs
    .readFileSync(copiedTemplate, "utf8")
    .replace('"screens/S002.svg"', '"screens/missing.svg"');
  fs.writeFileSync(copiedTemplate, invalid);

  const result = runValidator(copiedTemplate);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /image does not exist/);
});

test("validator rejects a conceptual board without the required notice", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "storyboard-skill-test-"));
  fs.cpSync(templateDir, tempDir, { recursive: true });
  const copiedTemplate = path.join(tempDir, "storyboard.html");
  const invalid = fs
    .readFileSync(copiedTemplate, "utf8")
    .replaceAll("Concept mockup — not production design", "Draft flow board");
  fs.writeFileSync(copiedTemplate, invalid);

  const result = runValidator(copiedTemplate);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /conceptNotice must be exactly/);
});
