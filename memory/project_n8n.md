---
name: project-taskpilot-n8n
description: "n8n Workflow Generator is a live TaskPilot feature at /workflow — details and current status"
metadata:
  type: project
---

TaskPilot has a live **n8n Workflow Generator** at `/workflow`. This is NOT a planned feature — it is fully deployed and working.

**Why:** Workflow automation complement to the script generator. TaskPilot is not competing with n8n — it's a workflow accelerator for n8n users (they still need n8n to run the output). Marketing angle: "go from idea to running workflow in 2 minutes instead of 2 hours."

**How to apply:** All references to TaskPilot capabilities (system prompts, README, LinkedIn posts) must include this feature. Both the Pilot AI (`src/app/api/assistant/route.ts`) and Phoenix AI (`api/chat.js` in Bio repo) now include it in their system prompts (updated 2026-05-18).

---

## Feature Details

| Property | Value |
|----------|-------|
| URL | `/workflow` |
| AI model | claude-sonnet-4-6 |
| API route | `src/app/api/workflow/generate/route.ts` |
| AI name | WorkflowPilot |
| Rate limit | 10 workflows/hour per IP |
| Download | Two files: `{slug}.json` + `{slug}-guide.md` |

**Trigger types:** Webhook, Schedule/Cron, Manual, Email, Form Submission, Database Change

**Complexity levels:** Simple (2–4 nodes), Standard (5–10 nodes), Complex (10–15 nodes)

**30+ integrations:** Slack, Gmail, Notion, GitHub, Stripe, PostgreSQL, Supabase, HTTP Request, Claude AI, Google Sheets, Airtable, Discord, Microsoft Teams, Jira, Trello, HubSpot, Salesforce, Twilio, Telegram, WhatsApp, Linear, Asana, PagerDuty, Datadog, AWS S3, Dropbox, SendGrid, Mailchimp, RSS Feed

## Full Generator Inventory

| Generator | URL | Status | AI |
|-----------|-----|--------|----|
| AI Script Generator | `/generate` | Live | claude-sonnet-4-6 |
| n8n Workflow Generator | `/workflow` | Live | claude-sonnet-4-6 |
| Pilot AI Co-Pilot Chat | (widget, all pages) | Live | claude-haiku-4-5-20251001 |
| Starter Kit (9 scripts) | `/checkout` $19 | Live | — |

## Download pattern (both generators)
Sequential anchor triggers with 150ms gap — no dependencies. Script generator: `buildDownloadContent` + `buildScriptGuide` from `src/lib/utils.ts`. Workflow generator: `buildWorkflowGuide` local to `src/components/workflow/workflow-generator.tsx`.
