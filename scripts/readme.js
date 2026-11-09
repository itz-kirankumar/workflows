// Regenerates README.md from workflows/index.json. Usage: node scripts/readme.js
const fs = require('fs');
const path = require('path');
const idx = require('../workflows/index.json');

const trig = (w) => ({ webhook: `Webhook \`/webhook/${w.slug}\``, schedule: 'Schedule', gmail: 'Gmail (new email)', form: 'n8n Form' }[w.trigger]);
const rows = idx.map((w) => `| ${String(w.n).padStart(2, '0')} | [${w.name}](workflows/${w.file}) | ${w.category} | ${trig(w)} | ${w.description} |`).join('\n');
const fence = '```';

const md = `# 50 AI Automations for n8n

Fifty ready-to-import n8n workflows covering sales, marketing, support, finance, HR, operations and IT.
Every workflow follows the same pattern:

${fence}
Trigger -> Config -> (fetch data) -> Prepare AI Input -> AI Analyze (OpenAI, JSON mode) -> Parse AI Output -> If -> actions
${fence}

- **Config node**: model (default \`gpt-4o-mini\`), Google Sheet URL, API endpoints and other settings. Edit this first.
- **AI Analyze**: OpenAI Chat Completions with a task-specific system prompt and a strict JSON output schema.
- **If**: one business rule (for example, lead score >= 70) decides which actions run.
- **Actions**: Slack, Gmail, Google Sheets, Google Calendar or a generic HTTP API.
- Webhook workflows respond with the AI result as JSON.
- Each workflow has an **About** sticky note with setup steps and a sample payload.

## Workflows

| # | Workflow | Area | Trigger | What it does |
|---|----------|------|---------|--------------|
${rows}

## Setup

1. Import: *Workflows -> Import from File* in n8n, or run the bulk import script below.
2. Create these credentials in n8n and select them on the nodes that use them:
   OpenAI API, Slack, Gmail OAuth2, Google Sheets OAuth2, Google Calendar OAuth2, plus GitHub API and Header Auth (\`X-N8N-API-KEY\`) for #47.
3. Open the **Config** node and fill in your Google Sheet URL and endpoints. Give each sheet tab a header row.
4. Test with the sample payload from the sticky note, then activate the workflow.

### Bulk import through the n8n API

${fence}bash
N8N_URL=https://n8n.praxel.in N8N_API_KEY=xxxx node scripts/import.js
${fence}

### Regenerate

Workflows are generated from \`scripts/specs.js\` (prompts, rules, actions) by \`scripts/build.js\`:

${fence}bash
node scripts/build.js && node scripts/readme.js
${fence}
`;
fs.writeFileSync(path.join(__dirname, '..', 'README.md'), md);
console.log('README.md written');
