# 50 AI Automations for n8n

Fifty ready-to-import n8n workflows covering sales, marketing, support, finance, HR, operations and IT.
Every workflow follows the same pattern:

```
Trigger -> Config -> (fetch data) -> Prepare AI Input -> AI Analyze (OpenAI, JSON mode) -> Parse AI Output -> If -> actions
```

- **Config node**: model (default `gpt-4o-mini`), Google Sheet URL, API endpoints and other settings. Edit this first.
- **AI Analyze**: OpenAI Chat Completions with a task-specific system prompt and a strict JSON output schema.
- **If**: one business rule (for example, lead score >= 70) decides which actions run.
- **Actions**: Slack, Gmail, Google Sheets, Google Calendar or a generic HTTP API.
- Webhook workflows respond with the AI result as JSON.
- Each workflow has an **About** sticky note with setup steps and a sample payload.

## Workflows

| # | Workflow | Area | Trigger | What it does |
|---|----------|------|---------|--------------|
| 01 | [AI Lead Qualification System](workflows/01-lead-qualification.json) | Sales | Webhook `/webhook/lead-qualification` | Scores inbound leads 0-100 with AI, alerts sales on hot leads and logs every lead to Google Sheets. |
| 02 | [AI Appointment Scheduler](workflows/02-appointment-scheduler.json) | Sales | Webhook `/webhook/appointment-scheduler` | Reads free-text booking requests, extracts date/time with AI, creates a Google Calendar event and emails a confirmation (or asks for missing details). |
| 03 | [AI Email Responder](workflows/03-email-responder.json) | Communication | Gmail (new email) | Watches the inbox, classifies each unread email, auto-replies to routine ones and escalates sensitive ones to Slack. |
| 04 | [AI Follow-Up Automation](workflows/04-follow-up.json) | Sales | Schedule | Every morning reviews leads in Google Sheets and sends personalised follow-up emails to contacts that went quiet. |
| 05 | [AI Proposal Generator](workflows/05-proposal-generator.json) | Sales | Webhook `/webhook/proposal-generator` | Turns discovery-call notes into a structured sales proposal, emails the draft to the account owner and logs it. |
| 06 | [AI Invoice Automation](workflows/06-invoice-automation.json) | Finance | Webhook `/webhook/invoice-automation` | Extracts line items, totals and due dates from invoice text/OCR, validates the maths and books valid invoices to Sheets. |
| 07 | [AI Payment Reminder System](workflows/07-payment-reminders.json) | Finance | Schedule | Daily scan of unpaid invoices; AI writes reminders with tone matched to how overdue they are and escalates 30+ days. |
| 08 | [AI Customer Onboarding](workflows/08-customer-onboarding.json) | Customer Success | Webhook `/webhook/customer-onboarding` | When a new customer signs up, AI builds a personalised onboarding plan and welcome email; enterprise accounts get a CSM alert. |
| 09 | [AI Support Ticket Triage](workflows/09-ticket-triage.json) | Support | Webhook `/webhook/ticket-triage` | Classifies incoming tickets by category, priority and sentiment, routes urgent ones to on-call and posts a suggested first reply. |
| 10 | [AI Knowledge Base Assistant](workflows/10-knowledge-base.json) | Support | Webhook `/webhook/knowledge-base` | Answers questions from your knowledge-base content (fetched from a URL) and flags gaps when the KB has no answer. |
| 11 | [AI Social Media Scheduler](workflows/11-social-scheduler.json) | Marketing | Schedule | Daily picks the next topic from a content calendar sheet, writes platform-specific posts and queues them via your scheduling API (e.g. Buffer). |
| 12 | [AI Content Repurposer](workflows/12-content-repurposer.json) | Marketing | Webhook `/webhook/content-repurposer` | Takes a blog post or transcript and repurposes it into a newsletter, LinkedIn post, X thread, short-video script and quote cards. |
| 13 | [AI Review Manager](workflows/13-review-manager.json) | Marketing | Webhook `/webhook/review-manager` | Analyses new customer reviews, drafts on-brand responses and escalates negative reviews to the team. |
| 14 | [AI Data Entry Automation](workflows/14-data-entry.json) | Operations | Webhook `/webhook/data-entry` | Converts unstructured text (emails, forms, notes) into clean structured records and appends them to Google Sheets. |
| 15 | [AI Document Classifier](workflows/15-document-classifier.json) | Operations | Webhook `/webhook/document-classifier` | Classifies documents (invoice, contract, resume, receipt...) from their text, extracts key metadata and routes them. |
| 16 | [AI Meeting Notes Assistant](workflows/16-meeting-notes.json) | Productivity | Webhook `/webhook/meeting-notes` | Turns a meeting transcript into a summary, decisions and owner-assigned action items, then shares them on Slack and email. |
| 17 | [AI CRM Updater](workflows/17-crm-updater.json) | Sales | Webhook `/webhook/crm-updater` | Reads call notes or email threads and pushes structured updates (stage, next step, deal value) to your CRM API. |
| 18 | [AI Pipeline Management](workflows/18-pipeline-management.json) | Sales | Schedule | Weekly review of every open deal: AI flags stalled or at-risk deals and recommends next actions to the sales channel. |
| 19 | [AI Inventory Monitor](workflows/19-inventory-monitor.json) | Operations | Schedule | Checks stock levels every 6 hours, predicts stock-out dates from sales velocity and recommends reorder quantities. |
| 20 | [AI Order Processing](workflows/20-order-processing.json) | E-commerce | Webhook `/webhook/order-processing` | Validates incoming orders, scores fraud risk, confirms good orders to the customer and holds risky ones for review. |
| 21 | [AI Shipping Automation](workflows/21-shipping-automation.json) | E-commerce | Webhook `/webhook/shipping-automation` | Interprets carrier tracking events, writes customer-friendly status updates and flags delays or exceptions. |
| 22 | [AI Expense Categorizer](workflows/22-expense-categorizer.json) | Finance | Webhook `/webhook/expense-categorizer` | Categorises expenses/receipts against your chart of accounts, flags policy violations and logs to the expense sheet. |
| 23 | [AI Report Generator](workflows/23-report-generator.json) | Analytics | Schedule | Every Monday pulls metrics from your data endpoint and writes an executive weekly report with highlights and risks. |
| 24 | [AI Sales Assistant](workflows/24-sales-assistant.json) | Sales | Webhook `/webhook/sales-assistant` | Chat-style webhook that answers prospect questions about your product, captures buying signals and hands off hot prospects. |
| 25 | [AI Upsell Recommender](workflows/25-upsell-recommender.json) | Sales | Webhook `/webhook/upsell-recommender` | Analyses a customer usage/purchase profile and recommends the best upsell or cross-sell with a tailored pitch. |
| 26 | [AI Churn Prediction](workflows/26-churn-prediction.json) | Customer Success | Schedule | Daily scores every account for churn risk from usage and support signals and alerts CS on high-risk accounts. |
| 27 | [AI Feedback Analyzer](workflows/27-feedback-analyzer.json) | Product | Webhook `/webhook/feedback-analyzer` | Analyses product feedback for sentiment, themes and feature requests and routes critical bugs to the product team. |
| 28 | [AI Survey Automation](workflows/28-survey-automation.json) | Product | n8n Form | Hosts a survey form, analyses each response with AI (NPS, sentiment, themes) and follows up with detractors. |
| 29 | [AI Webinar Automation](workflows/29-webinar-automation.json) | Marketing | Webhook `/webhook/webinar-automation` | Handles webinar registrations: personalised confirmation, lead scoring from registration answers and sales alerts. |
| 30 | [AI Job Application Screener](workflows/30-job-screener.json) | HR | Webhook `/webhook/job-screener` | Scores CVs against the job description, summarises strengths/gaps and fast-tracks strong candidates. |
| 31 | [AI Interview Scheduler](workflows/31-interview-scheduler.json) | HR | Webhook `/webhook/interview-scheduler` | Proposes interview slots from interviewer availability, books the calendar event and emails the candidate. |
| 32 | [AI Employee Onboarding](workflows/32-employee-onboarding.json) | HR | Webhook `/webhook/employee-onboarding` | Creates a role-specific onboarding plan and welcome email for new hires and notifies IT/manager of setup tasks. |
| 33 | [AI Timesheet Collector](workflows/33-timesheet-collector.json) | HR | Schedule | Every Friday reviews timesheets, chases missing entries with friendly reminders and flags overtime anomalies. |
| 34 | [AI Compliance Checker](workflows/34-compliance-checker.json) | Legal | Webhook `/webhook/compliance-checker` | Checks policies, marketing copy or contracts against GDPR/brand/regulatory rules and reports violations with fixes. |
| 35 | [AI Contract Analyzer](workflows/35-contract-analyzer.json) | Legal | Webhook `/webhook/contract-analyzer` | Extracts parties, dates, value and key clauses from contracts and highlights risky terms for legal review. |
| 36 | [AI Project Status Reporter](workflows/36-project-status.json) | Productivity | Schedule | Every Friday pulls tasks from your PM tool API and writes a RAG-status project report for stakeholders. |
| 37 | [AI Task Automation](workflows/37-task-automation.json) | Productivity | Webhook `/webhook/task-automation` | Turns free-text requests ("remind Priya to send the deck by Thursday") into structured, prioritised tasks in your task tool. |
| 38 | [AI File Organizer](workflows/38-file-organizer.json) | Operations | Webhook `/webhook/file-organizer` | Suggests a clean file name, folder path and tags for every uploaded file based on its name and content preview. |
| 39 | [AI Transcription Automation](workflows/39-transcription.json) | Productivity | Webhook `/webhook/transcription` | Transcribes audio from a URL with OpenAI Whisper, then summarises it and extracts action items. |
| 40 | [AI Language Translator](workflows/40-translator.json) | Communication | Webhook `/webhook/translator` | Translates text into one or more target languages preserving tone and formatting, with a quality self-check. |
| 41 | [AI Voice Assistant](workflows/41-voice-assistant.json) | Communication | Webhook `/webhook/voice-assistant` | Accepts a voice note URL, transcribes it with Whisper, answers/acts on the request and returns a spoken MP3 reply via OpenAI TTS. |
| 42 | [AI Competitor Monitor](workflows/42-competitor-monitor.json) | Marketing | Schedule | Daily fetches competitor pages, has AI compare against the last snapshot and reports meaningful changes. |
| 43 | [AI Price Monitoring](workflows/43-price-monitoring.json) | E-commerce | Schedule | Every 4 hours checks product pages for prices, compares with your price and recommends adjustments. |
| 44 | [AI Local SEO Monitor](workflows/44-local-seo.json) | Marketing | Schedule | Weekly audits your local business listing / landing page for NAP consistency, keywords and review signals, with fixes. |
| 45 | [AI Ad Performance Monitor](workflows/45-ad-performance.json) | Marketing | Schedule | Daily pulls ad campaign metrics, detects wasted spend and anomalies and recommends budget shifts. |
| 46 | [AI Client Communication Hub](workflows/46-client-comms-hub.json) | Communication | Webhook `/webhook/client-comms-hub` | One inbox webhook for every client channel (email, WhatsApp, chat, forms): AI classifies, drafts replies and routes to the right owner. |
| 47 | [AI Backup Automation](workflows/47-backup-automation.json) | IT | Schedule | Nightly exports every n8n workflow via the n8n API to a GitHub repo and has AI summarise what changed. |
| 48 | [AI System Health Monitor](workflows/48-system-health.json) | IT | Schedule | Pings your endpoints every 5 minutes; AI diagnoses failures/slow responses and alerts with likely causes. |
| 49 | [AI Workflow Orchestrator](workflows/49-workflow-orchestrator.json) | IT | Webhook `/webhook/workflow-orchestrator` | A single smart entry point: AI reads any incoming request and routes it to the right automation webhook (lead, ticket, invoice, meeting notes...). |
| 50 | [AI Business Insights Dashboard](workflows/50-business-insights.json) | Analytics | Schedule | Daily combines sales, marketing, support and finance metrics into an AI-written insights digest and logs KPIs for a dashboard. |

## Setup

1. Import: *Workflows -> Import from File* in n8n, or run the bulk import script below.
2. Create these credentials in n8n and select them on the nodes that use them:
   OpenAI API, Slack, Gmail OAuth2, Google Sheets OAuth2, Google Calendar OAuth2, plus GitHub API and Header Auth (`X-N8N-API-KEY`) for #47.
3. Open the **Config** node and fill in your Google Sheet URL and endpoints. Give each sheet tab a header row.
4. Test with the sample payload from the sticky note, then activate the workflow.

### Bulk import through the n8n API

```bash
N8N_URL=https://n8n.praxel.in N8N_API_KEY=xxxx node scripts/import.js
```

### Regenerate

Workflows are generated from `scripts/specs.js` (prompts, rules, actions) by `scripts/build.js`:

```bash
node scripts/build.js && node scripts/readme.js
```
