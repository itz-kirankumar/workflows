// Imports every workflow in workflows/ into n8n through the public API.
// Usage: N8N_URL=https://n8n.example.com N8N_API_KEY=... node scripts/import.js
const fs = require('fs');
const path = require('path');

const { N8N_URL, N8N_API_KEY } = process.env;
if (!N8N_URL || !N8N_API_KEY) {
  console.error('Set N8N_URL and N8N_API_KEY');
  process.exit(1);
}

(async () => {
  const dir = path.join(__dirname, '..', 'workflows');
  const files = fs.readdirSync(dir).filter((f) => /^\d+-.*\.json$/.test(f)).sort();
  for (const f of files) {
    const wf = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const res = await fetch(`${N8N_URL.replace(/\/$/, '')}/api/v1/workflows`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
    });
    console.log(res.ok ? 'ok ' : `ERR ${res.status}`, f, res.ok ? '' : await res.text());
  }
})();
