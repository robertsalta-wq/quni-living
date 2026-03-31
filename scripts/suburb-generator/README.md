# Suburb SEO Generator

This script generates SEO landing-page JSON content for Sydney student accommodation suburbs using the Anthropic API and Wikimedia image links.

## Setup

1. Install dependencies from the project root:

```bash
npm install
```

2. In this folder (`scripts/suburb-generator`), create a `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

## Run

From `scripts/suburb-generator`:

```bash
node generate.js
```

Or from the project root:

```bash
npm run generate:suburbs
```

## Output

Generated files are saved to:

`scripts/suburb-generator/output/`
