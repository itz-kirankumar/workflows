// Builds n8n workflow JSON files from scripts/specs.js into workflows/.
// Usage: node scripts/build.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const specs = require('./specs');
const samples = require('./samples');

const OUT = path.join(__dirname, '..', 'workflows');
const uuid = () => crypto.randomUUID();
const DX = 240;

const URL_DEFAULTS = {
  kbUrl: 'https://your-site.com/help-center.txt',
  schedulerApiUrl: 'https://api.your-scheduler.com/posts',
  crmApiUrl: 'https://api.your-crm.com/v1/deals',
  metricsUrl: 'https://api.your-company.com/metrics/weekly',
  projectApiUrl: 'https://api.your-pm-tool.com/projects/123/tasks',
  taskApiUrl: 'https://api.your-task-tool.com/tasks',
  adsMetricsUrl: 'https://api.your-ads-reporting.com/campaigns/yesterday',
};

const sheetRef = () => ({ __rl: true, mode: 'url', value: "={{ $('Config').first().json.spreadsheetUrl }}" });

function build(spec) {
  const nodes = [];
  const connections = {};
  const cred = new Set();
  const add = (node) => { nodes.push({ id: uuid(), ...node }); return node.name; };
  const link = (from, to, outIdx = 0) => {
    connections[from] ??= { main: [] };
    while (connections[from].main.length <= outIdx) connections[from].main.push([]);
    connections[from].main[outIdx].push({ node: to, type: 'main', index: 0 });
  };
  const chain = (names) => names.reduce((a, b) => (link(a, b), b));

  const isWebhook = spec.trigger.type === 'webhook';
  let x = 0;
  const y = 300;
  const pos = (dy = 0) => { x += DX; return [x, y + dy]; };

  // ---- Trigger --------------------------------------------------------
  let trigger;
  if (isWebhook) {
    trigger = add({ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, y], webhookId: uuid(),
      parameters: { httpMethod: 'POST', path: spec.slug, responseMode: 'responseNode', options: {} } });
  } else if (spec.trigger.type === 'schedule') {
    trigger = add({ name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, y],
      parameters: { rule: { interval: [{ field: 'cronExpression', expression: spec.trigger.cron }] } } });
  } else if (spec.trigger.type === 'gmail') {
    cred.add('Gmail OAuth2');
    trigger = add({ name: 'Gmail Trigger', type: 'n8n-nodes-base.gmailTrigger', typeVersion: 1.2, position: [0, y],
      parameters: { pollTimes: { item: [{ mode: 'everyMinute' }] }, simple: false, filters: { readStatus: 'unread', includeSpamTrash: false }, options: {} } });
  } else if (spec.trigger.type === 'form') {
    trigger = add({ name: 'Form Trigger', type: 'n8n-nodes-base.formTrigger', typeVersion: 2.2, position: [0, y], webhookId: uuid(),
      parameters: { formTitle: spec.trigger.title, formDescription: spec.desc,
        formFields: { values: spec.trigger.fields.map((f) => ({ fieldLabel: f.label, fieldType: f.type || 'text', requiredField: true })) },
        options: {} } });
  }

  // ---- Config ----------------------------------------------------------
  const usesSheets = [...spec.yes, ...spec.no].some((a) => a.type === 'sheets') || spec.fetch?.type === 'sheets';
  const cfg = { model: 'gpt-4o-mini' };
  if (usesSheets) cfg.spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit';
  for (const k of [spec.fetch?.urlKey, spec.preAi?.urlKey, ...[...spec.yes, ...spec.no].map((a) => a.urlKey)]) {
    if (k && URL_DEFAULTS[k]) cfg[k] = URL_DEFAULTS[k];
  }
  Object.assign(cfg, spec.config || {});
  const config = add({ name: 'Config', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: pos(),
    parameters: { mode: 'manual', includeOtherFields: true, include: 'all', options: {},
      assignments: { assignments: Object.entries(cfg).map(([name, value]) => ({ id: uuid(), name, value: String(value), type: 'string' })) } } });
  link(trigger, config);
  const settingKeys = Object.keys(cfg).filter((k) => !['model', 'spreadsheetUrl', 'n8nApiUrl', 'githubOwner', 'githubRepo', 'backupPath'].includes(k) && !/Url$|Urls$/.test(k));

  // ---- Data source / pre-processing -------------------------------------
  let last = config;
  let mode = isWebhook ? 'webhook' : spec.trigger.type; // how Prepare Input reads data
  if (spec.fetch?.type === 'sheets') {
    cred.add('Google Sheets OAuth2');
    last = add({ name: 'Fetch Data', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position: pos(),
      parameters: { operation: 'read', documentId: sheetRef(), sheetName: { __rl: true, mode: 'name', value: spec.fetch.sheet }, options: {} } });
    link(config, last);
    mode = spec.fetch.aggregate ? 'aggregate' : 'rows';
  } else if (spec.fetch?.type === 'http') {
    const p = { url: `={{ $('Config').first().json.${spec.fetch.urlKey} }}`, options: { timeout: 60000 } };
    if (spec.fetch.n8nApi) { Object.assign(p, { authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' }); cred.add('Header Auth (X-N8N-API-KEY)'); }
    last = add({ name: 'Fetch Data', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos(), parameters: p });
    link(config, last);
    mode = spec.fetch.n8nApi ? 'n8nApi' : 'aggregate';
  } else if (spec.fetch?.type === 'urlList' && spec.fetch.health) {
    last = add({ name: 'Check Endpoints', type: 'n8n-nodes-base.code', typeVersion: 2, position: pos(),
      parameters: { jsCode: `// Pings every endpoint and only passes on the unhealthy ones (keeps AI cost near zero when all is well).
const urls = $('Config').first().json.${spec.fetch.urlKey}.split(',').map(u => u.trim()).filter(Boolean);
const out = [];
for (const url of urls) {
  const t = Date.now();
  try {
    const r = await this.helpers.httpRequest({ url, method: 'GET', returnFullResponse: true, ignoreHttpStatusErrors: true, timeout: 15000 });
    const ms = Date.now() - t;
    if (r.statusCode >= 400 || ms > 2000) out.push({ json: { url, status_code: r.statusCode, response_ms: ms } });
  } catch (e) {
    out.push({ json: { url, status_code: 0, response_ms: Date.now() - t, error: e.message } });
  }
}
return out;` } });
    link(config, last);
    mode = 'rows';
  } else if (spec.fetch?.type === 'urlList') {
    const split = add({ name: 'Split URLs', type: 'n8n-nodes-base.code', typeVersion: 2, position: pos(),
      parameters: { jsCode: `return $('Config').first().json.${spec.fetch.urlKey}.split(',').map(u => u.trim()).filter(Boolean).map(url => ({ json: { url } }));` } });
    link(config, split);
    last = add({ name: 'Fetch Page', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos(),
      parameters: { url: '={{ $json.url }}', options: { timeout: 30000, response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'html' } } } } });
    link(split, last);
    mode = 'pages';
  } else if (spec.preAi) {
    last = add({ name: spec.preAi.label, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos(),
      parameters: { url: `={{ $('Config').first().json.${spec.preAi.urlKey} }}`, options: { timeout: 30000, response: { response: { responseFormat: 'text', outputPropertyName: 'kb' } } } } });
    link(config, last);
    mode = 'kb';
  } else if (spec.transcribe) {
    cred.add('OpenAI API');
    const dl = add({ name: 'Download Audio', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos(),
      parameters: { url: '={{ $json.body.audioUrl }}', options: { response: { response: { responseFormat: 'file' } } } } });
    link(config, dl);
    last = add({ name: 'Transcribe (Whisper)', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos(),
      parameters: { method: 'POST', url: 'https://api.openai.com/v1/audio/transcriptions', authentication: 'predefinedCredentialType', nodeCredentialType: 'openAiApi',
        sendBody: true, contentType: 'multipart-form-data',
        bodyParameters: { parameters: [{ parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'data' }, { name: 'model', value: 'whisper-1' }] }, options: { timeout: 300000 } } });
    link(dl, last);
    mode = 'transcript';
  }

  // ---- Prepare Input ----------------------------------------------------
  const readers = {
    webhook: `items.map((it, i) => ({ input: it.json.body ?? it.json, i }))`,
    form: `items.map((it, i) => ({ input: it.json, i }))`,
    gmail: `items.map((it, i) => ({ input: { from: it.json.from?.text ?? it.json.From, subject: it.json.subject ?? it.json.Subject, date: it.json.date, text: it.json.text ?? it.json.snippet }, i }))`,
    rows: `items.map((it, i) => ({ input: it.json, i }))`,
    aggregate: `[{ input: { records: items.map(it => it.json) }, i: 0 }]`,
    n8nApi: `[{ input: { workflows: items.flatMap(it => it.json.data ?? [it.json]).map(w => ({ id: w.id, name: w.name, active: w.active, updatedAt: w.updatedAt })) }, i: 0 }]`,
    pages: `items.map((it, i) => ({ input: { url: $('Split URLs').all()[i]?.json.url, page_text: stripHtml(it.json.html) }, i }))`,
    kb: `[{ input: { request: $('Webhook').first().json.body, knowledge_base: it0(items).kb }, i: 0 }]`,
    transcript: `[{ input: { ...$('Webhook').first().json.body, transcript: it0(items).text }, i: 0 }]`,
  };
  const prep = add({ name: 'Prepare AI Input', type: 'n8n-nodes-base.code', typeVersion: 2, position: pos(),
    parameters: { jsCode: `// Packs the incoming data, the current time and relevant settings into one prompt string per item.
const items = $input.all();
const cfg = $('Config').first().json;
const settings = Object.fromEntries(${JSON.stringify(settingKeys)}.map(k => [k, cfg[k]]));
const MAX = 15000;
const clip = s => (s.length > MAX ? s.slice(0, MAX) + ' ...[truncated]' : s);
const stripHtml = h => String(h ?? '').replace(/<script[\\s\\S]*?<\\/script>|<style[\\s\\S]*?<\\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim();
const it0 = arr => arr[0]?.json ?? {};
const packed = ${readers[mode]};
return packed.map(({ input, i }) => ({
  json: { aiInput: clip(JSON.stringify({ now: new Date().toISOString(), settings, input })) },
  pairedItem: { item: i },
}));` } });
  link(last, prep);

  // ---- AI ------------------------------------------------------------------
  cred.add('OpenAI API');
  const system = `${spec.ai.system}\n\nRespond ONLY with a valid JSON object with exactly these keys: ${spec.ai.keys}. Use null for unknown values.`;
  const ai = add({ name: 'AI Analyze', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos(),
    retryOnFail: true, maxTries: 3, waitBetweenTries: 3000,
    parameters: { method: 'POST', url: 'https://api.openai.com/v1/chat/completions', authentication: 'predefinedCredentialType', nodeCredentialType: 'openAiApi',
      sendBody: true, specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({ model: $('Config').first().json.model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [ { role: 'system', content: ${JSON.stringify(system)} }, { role: 'user', content: $json.aiInput } ] }) }}`,
      options: { timeout: 120000 } } });
  link(prep, ai);

  const parse = add({ name: 'Parse AI Output', type: 'n8n-nodes-base.code', typeVersion: 2, position: pos(),
    parameters: { jsCode: `return $input.all().map((item, i) => {
  let out;
  try { out = JSON.parse(item.json.choices[0].message.content); }
  catch (e) { out = { parse_error: true, raw: item.json?.choices?.[0]?.message?.content ?? item.json }; }
  return { json: { ...out, processed_at: new Date().toISOString() }, pairedItem: { item: i } };
});` } });
  link(ai, parse);

  // ---- Respond (webhooks) --------------------------------------------------
  if (isWebhook) {
    if (spec.tts) {
      const tts = add({ name: 'Text to Speech', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [x + DX, y - 300],
        parameters: { method: 'POST', url: 'https://api.openai.com/v1/audio/speech', authentication: 'predefinedCredentialType', nodeCredentialType: 'openAiApi',
          sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ model: 'tts-1', voice: 'alloy', input: $json.reply_text || 'Sorry, I did not catch that.' }) }}",
          options: { response: { response: { responseFormat: 'file' } } } } });
      link(parse, tts);
      const r = add({ name: 'Respond with Audio', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, position: [x + 2 * DX, y - 300],
        parameters: { respondWith: 'binary', options: {} } });
      link(tts, r);
    } else {
      const r = add({ name: 'Respond to Webhook', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, position: [x + DX, y - 300],
        parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify($json) }}', options: {} } });
      link(parse, r);
    }
  }

  // ---- Decision ------------------------------------------------------------
  const c = spec.cond;
  const ops = {
    gte: { type: 'number', operation: 'gte' }, lte: { type: 'number', operation: 'lte' },
    true: { type: 'boolean', operation: 'true', singleValue: true }, false: { type: 'boolean', operation: 'false', singleValue: true },
    equals: { type: 'string', operation: 'equals' }, notEmpty: { type: 'array', operation: 'notEmpty', singleValue: true },
  };
  const condLabel = { gte: '>=', lte: '<=', true: 'is true', false: 'is false', equals: '=', notEmpty: 'has items' }[c.op];
  const ifName = add({ name: `If ${c.left} ${condLabel}${c.right !== undefined ? ' ' + c.right : ''}`, type: 'n8n-nodes-base.if', typeVersion: 2, position: pos(),
    parameters: { conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
      conditions: [{ id: uuid(), leftValue: `={{ $json.${c.left} }}`, rightValue: c.right ?? '', operator: ops[c.op] }], combinator: 'and' },
      looseTypeValidation: true, options: {} } });
  link(parse, ifName);

  // ---- Actions ---------------------------------------------------------------
  const used = {};
  const uniq = (n) => { used[n] = (used[n] || 0) + 1; return used[n] > 1 ? `${n} ${used[n]}` : n; };
  const expr = (s) => (s.startsWith('=') ? s : '=' + s);
  const baseX = x;

  function action(a, ax, ay) {
    switch (a.type) {
      case 'slack': cred.add('Slack');
        return [add({ name: uniq(`Slack ${a.channel}`), type: 'n8n-nodes-base.slack', typeVersion: 2.2, position: [ax, ay],
          parameters: { select: 'channel', channelId: { __rl: true, mode: 'name', value: a.channel }, text: expr(a.text), otherOptions: {} } })];
      case 'gmail': {
        cred.add('Gmail OAuth2');
        const chainNodes = [];
        if (a.onlyIf) chainNodes.push(add({ name: uniq(`Only if ${a.onlyIf}`), type: 'n8n-nodes-base.filter', typeVersion: 2, position: [ax, ay],
          parameters: { conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
            conditions: [{ id: uuid(), leftValue: `={{ $json.${a.onlyIf} }}`, rightValue: '', operator: ops.true }], combinator: 'and' }, looseTypeValidation: true, options: {} } }));
        chainNodes.push(add({ name: uniq('Send Email'), type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: [ax + chainNodes.length * DX, ay],
          parameters: { sendTo: a.to, subject: expr(a.subject), emailType: 'text', message: expr(a.message), options: { appendAttribution: false } } }));
        return chainNodes;
      }
      case 'gmailReply': cred.add('Gmail OAuth2');
        return [add({ name: uniq('Reply to Email'), type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: [ax, ay],
          parameters: { operation: 'reply', messageId: "={{ $('Gmail Trigger').item.json.id }}", emailType: 'text', message: '={{ $json.reply_body }}', options: { appendAttribution: false } } })];
      case 'sheets': {
        cred.add('Google Sheets OAuth2');
        const flat = add({ name: uniq(`Flatten Row (${a.sheet})`), type: 'n8n-nodes-base.code', typeVersion: 2, position: [ax, ay],
          parameters: { jsCode: `// Google Sheets cells can't hold arrays/objects - stringify them.
return $input.all().map((it, i) => ({
  json: Object.fromEntries(Object.entries(it.json).map(([k, v]) => [k, v !== null && typeof v === 'object' ? JSON.stringify(v) : v])),
  pairedItem: { item: i },
}));` } });
        const sh = add({ name: uniq(`Log to ${a.sheet}`), type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position: [ax + DX, ay],
          parameters: { operation: 'append', documentId: sheetRef(), sheetName: { __rl: true, mode: 'name', value: a.sheet },
            columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [] }, options: {} } });
        return [flat, sh];
      }
      case 'http':
        return [add({ name: uniq(`POST to ${a.urlKey.replace(/Url$/, '').replace(/([A-Z])/g, ' $1').trim()} API`), type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [ax, ay],
          parameters: { method: 'POST', url: `={{ $('Config').first().json.${a.urlKey} }}`, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json) }}', options: {} } })];
      case 'gcal': cred.add('Google Calendar OAuth2');
        return [add({ name: uniq('Create Calendar Event'), type: 'n8n-nodes-base.googleCalendar', typeVersion: 1.3, position: [ax, ay],
          parameters: { calendar: { __rl: true, mode: 'list', value: 'primary', cachedResultName: 'primary' }, start: '={{ $json.start }}', end: '={{ $json.end }}',
            additionalFields: { summary: '={{ $json.title }}', attendees: ['={{ $json.email }}'] } } })];
      case 'route':
        return [add({ name: uniq('Forward to Target Workflow'), type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [ax, ay], onError: 'continueRegularOutput',
          parameters: { method: 'POST', url: "={{ $('Config').first().json.baseUrl + JSON.parse($('Config').first().json.routes)[$json.route] }}",
            sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.payload ?? {}) }}', options: {} } })];
      case 'githubBackup': {
        cred.add('GitHub API');
        const gh = (p) => `https://api.github.com/repos/{{ $('Config').first().json.githubOwner }}/{{ $('Config').first().json.githubRepo }}/contents/{{ $('Config').first().json.backupPath }}${p}`;
        const get = add({ name: uniq('Get Existing Backup'), type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [ax, ay], onError: 'continueRegularOutput', alwaysOutputData: true,
          parameters: { url: '=' + gh(''), authentication: 'predefinedCredentialType', nodeCredentialType: 'githubApi', options: {} } });
        const body = add({ name: uniq('Build Commit'), type: 'n8n-nodes-base.code', typeVersion: 2, position: [ax + DX, ay],
          parameters: { jsCode: `const workflows = $('Fetch Data').all().flatMap(it => it.json.data ?? [it.json]);
const summary = $('Parse AI Output').first().json.backup_summary ?? 'n8n backup';
const sha = $input.first().json.sha;
return [{ json: { message: 'n8n backup: ' + summary.slice(0, 60), content: Buffer.from(JSON.stringify(workflows, null, 2)).toString('base64'), ...(sha ? { sha } : {}) } }];` } });
        const put = add({ name: uniq('Commit Backup to GitHub'), type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [ax + 2 * DX, ay],
          parameters: { method: 'PUT', url: '=' + gh(''), authentication: 'predefinedCredentialType', nodeCredentialType: 'githubApi',
            sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json) }}', options: {} } });
        return [get, body, put];
      }
      default: throw new Error('Unknown action ' + a.type);
    }
  }

  const branch = (list, outIdx, dir) => {
    list.forEach((a, k) => {
      const ay = y + dir * (120 + k * 180);
      const names = action(a, baseX + DX, ay);
      link(ifName, names[0], outIdx);
      if (names.length > 1) chain(names);
    });
  };
  branch(spec.yes, 0, -1);
  branch(spec.no, 1, 1);

  // ---- Sticky note -----------------------------------------------------------
  const trig = isWebhook ? `**Trigger:** \`POST /webhook/${spec.slug}\` (JSON body)` :
    spec.trigger.type === 'schedule' ? `**Trigger:** schedule \`${spec.trigger.cron}\`` :
    spec.trigger.type === 'form' ? '**Trigger:** hosted n8n form (open the Form Trigger to get the URL)' : '**Trigger:** new unread Gmail message (polls every minute)';
  const sample = samples[spec.slug] ? `\n\n**Sample payload:**\n\`\`\`json\n${JSON.stringify(samples[spec.slug], null, 1)}\n\`\`\`` : '';
  const credsList = [...cred].sort();
  add({ name: 'About', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [0, -260],
    parameters: { width: 520, height: 460, color: 4,
      content: `## ${String(spec.n).padStart(2, '0')} · ${spec.name}\n${spec.desc}\n\n${trig}\n\n**Setup**\n1. Edit the **Config** node (model, sheet URL, endpoints).\n2. Connect credentials: ${credsList.join(', ')}.\n3. Pick Slack channels / sheet tabs on the action nodes.\n4. Activate.${sample}` } });

  return {
    name: `${String(spec.n).padStart(2, '0')} - ${spec.name}`,
    nodes,
    connections,
    settings: { executionOrder: 'v1' },
    _meta: { slug: spec.slug, category: spec.cat, description: spec.desc, trigger: spec.trigger.type, credentials: credsList },
  };
}

fs.mkdirSync(OUT, { recursive: true });
const index = [];
for (const spec of specs) {
  const wf = build(spec);
  const meta = wf._meta;
  delete wf._meta;
  const file = `${String(spec.n).padStart(2, '0')}-${spec.slug}.json`;
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(wf, null, 2) + '\n');
  index.push({ n: spec.n, name: spec.name, file, ...meta });
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`Built ${index.length} workflows into ${OUT}`);
