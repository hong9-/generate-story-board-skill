# Generate Story Board Skill

Repo-scoped Codex skill for creating conceptual UX and product storyboards from user scenarios, service flows, screen descriptions, or existing screen images.

The skill can use image generation to produce screen mockups. Generated screens are explicitly treated as concept artifacts for discussing flows, states, and interactions. They are not approved UI designs, pixel-accurate specifications, production visual sources of truth, or evidence of design-system compliance.

Flow metadata remains structured and reviewable:

- `S###` screen IDs
- `T###` action target IDs
- `B###` branch IDs
- Mermaid use-case flows
- HTML/SVG overlays and route controls
- structural validation of IDs, references, and local assets

## Install in a repository

Copy this package's `.agents` directory into the target repository root:

```bash
cp -R .agents /path/to/your/repository/
```

Then ask Codex:

```text
Use $generate-story-board to create a conceptual storyboard for this user flow.
Generate mock screens, mark action targets, provide Mermaid source, and build an
interactive HTML board. Treat generated visuals as non-authoritative concepts.
```

## Install as a personal skill

Copy the skill folder into the Codex personal skills directory:

```bash
cp -R .agents/skills/generate-story-board ~/.codex/skills/
```

Restart Codex after installation so the skill catalog is refreshed.

## Included resources

```text
.agents/skills/generate-story-board/
  SKILL.md
  agents/openai.yaml
  assets/storyboard-template/
  scripts/validate-storyboard.mjs
```

The template is a portable HTML bundle with local screen assets. Replace its `STORYBOARD_DATA` object and mock images while preserving the data contract.

Validate a generated HTML storyboard with:

```bash
node .agents/skills/generate-story-board/scripts/validate-storyboard.mjs \
  path/to/storyboard.html
```

The validator checks structural flow fidelity. Visual layout, label overlap, and image quality still require browser-based review.

## Development

Requires Node.js 20 or newer.

```bash
npm test
npm run validate:template
```

## License

MIT. See [LICENSE](LICENSE).
