import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkFreeTextInputs, buildUserMessage, callAnthropicCollected, aiFailureResponse, ONE_HOUR_MS, checkRateLimit, parseRequestBody } from '@/lib/api-utils';

export const maxDuration = 300;

const VALID_TRIGGERS = ['webhook', 'schedule', 'manual', 'email', 'form', 'database'] as const;
const VALID_COMPLEXITY = ['simple', 'standard', 'complex'] as const;

const VALID_INTEGRATIONS = [
  'Slack', 'Gmail', 'Notion', 'GitHub', 'Stripe', 'PostgreSQL', 'Supabase',
  'HTTP Request', 'Claude AI', 'Google Sheets', 'Airtable', 'Discord',
  'Microsoft Teams', 'Jira', 'Trello', 'HubSpot', 'Salesforce', 'Twilio',
  'Telegram', 'WhatsApp', 'Linear', 'Asana', 'PagerDuty', 'Datadog',
  'AWS S3', 'Dropbox', 'SendGrid', 'Mailchimp', 'RSS Feed', 'Webhook Out',
] as const;

const WorkflowSchema = z.object({
  triggerType: z.enum(VALID_TRIGGERS),
  integrations: z.array(z.enum(VALID_INTEGRATIONS)).max(8),
  complexity: z.enum(VALID_COMPLEXITY),
  taskDescription: z.string().min(10).max(2000).trim(),
  clarificationAnswer: z.string().max(1000).trim().optional(),
  previousQuestion: z.string().max(500).trim().optional(),
});

export interface WorkflowResult {
  needsClarification: boolean;
  question: string | null;
  workflow: Record<string, unknown> | null;
  workflowName: string | null;
  nodeCount: number | null;
  description: string | null;
  credentials: string[] | null;
  importInstructions: string[] | null;
}

function extractWorkflowJson(raw: string): WorkflowResult {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object found');
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as WorkflowResult;
  } catch {
    return fixAndParse(candidate);
  }
}

function fixAndParse(json: string): WorkflowResult {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString && ch === '\n') { result += '\\n'; continue; }
    if (inString && ch === '\r') { result += '\\r'; continue; }
    if (inString && ch === '\t') { result += '\\t'; continue; }
    result += ch;
  }
  return JSON.parse(result) as WorkflowResult;
}

const TRIGGER_LABELS: Record<string, string> = {
  webhook:  'HTTP Webhook — triggered by an incoming HTTP request',
  schedule: 'Schedule / Cron — runs on a time interval (e.g. every day at 9am)',
  manual:   'Manual — triggered by clicking "Execute" in the n8n UI',
  email:    'Email Trigger — triggered when a new email arrives in an inbox',
  form:     'Form Submission — triggered by a web form (n8n Form Trigger or Typeform)',
  database: 'Database Change — triggered by new/updated rows in a database table',
};

const COMPLEXITY_LABELS: Record<string, string> = {
  simple:   'Simple (2–4 nodes) — linear flow, minimal branching',
  standard: 'Standard (5–10 nodes) — includes conditionals, transformations, and error handling',
  complex:  'Complex (10–15 nodes) — multi-branch, AI-powered, or multi-step data processing',
};

function buildSystemPrompt(
  triggerType: string,
  integrations: string[],
  complexity: string,
): string {
  return `You are WorkflowPilot, a senior n8n workflow architect embedded in TaskPilot. You build production-ready, importable n8n workflow JSON for IT admins and DevOps engineers. You have deep knowledge of n8n's node library, connection schema, and best practices.

TARGET WORKFLOW:
- Trigger type: ${TRIGGER_LABELS[triggerType] ?? triggerType}
- Complexity: ${COMPLEXITY_LABELS[complexity] ?? complexity}
${integrations.length > 0 ? `- Required integrations: ${integrations.join(', ')}` : ''}

AVAILABLE NODE TYPES (use ONLY these real n8n node type strings):

TRIGGERS:
- n8n-nodes-base.webhook (typeVersion: 2)
- n8n-nodes-base.scheduleTrigger (typeVersion: 1.2)
- n8n-nodes-base.emailReadImap (typeVersion: 2)
- n8n-nodes-base.formTrigger (typeVersion: 2.2)
- n8n-nodes-base.manualTrigger (typeVersion: 1)
- n8n-nodes-base.postgres (operation: "select", for polling — typeVersion: 2.5)

LOGIC & DATA:
- n8n-nodes-base.if (typeVersion: 2)
- n8n-nodes-base.switch (typeVersion: 3)
- n8n-nodes-base.merge (typeVersion: 3)
- n8n-nodes-base.set (typeVersion: 3.4)
- n8n-nodes-base.code (typeVersion: 2)
- n8n-nodes-base.splitInBatches (typeVersion: 3)
- n8n-nodes-base.aggregate (typeVersion: 1)
- n8n-nodes-base.filter (typeVersion: 1)
- n8n-nodes-base.limit (typeVersion: 1)
- n8n-nodes-base.noOp (typeVersion: 1)

HTTP & API:
- n8n-nodes-base.httpRequest (typeVersion: 4.2)

AI / LANGCHAIN:
- @n8n/n8n-nodes-langchain.lmChatAnthropic (typeVersion: 1.3)
- @n8n/n8n-nodes-langchain.agent (typeVersion: 1.7)
- @n8n/n8n-nodes-langchain.chainLlm (typeVersion: 1.4)
- @n8n/n8n-nodes-langchain.outputParserStructured (typeVersion: 1.2)

INTEGRATIONS:
- n8n-nodes-base.slack (typeVersion: 2.2)
- n8n-nodes-base.gmail (typeVersion: 2.1)
- n8n-nodes-base.sendEmail (typeVersion: 2.1)
- n8n-nodes-base.notion (typeVersion: 2.2)
- n8n-nodes-base.github (typeVersion: 1)
- n8n-nodes-base.stripe (typeVersion: 1)
- n8n-nodes-base.postgres (typeVersion: 2.5)
- n8n-nodes-base.supabase (typeVersion: 1)
- n8n-nodes-base.googleSheets (typeVersion: 4.5)
- n8n-nodes-base.airtable (typeVersion: 2.1)
- n8n-nodes-base.discord (typeVersion: 2)
- n8n-nodes-base.microsoftTeams (typeVersion: 2)
- n8n-nodes-base.jira (typeVersion: 1)
- n8n-nodes-base.trello (typeVersion: 1)
- n8n-nodes-base.hubspot (typeVersion: 2.1)
- n8n-nodes-base.salesforce (typeVersion: 1)
- n8n-nodes-base.twilio (typeVersion: 1)
- n8n-nodes-base.telegram (typeVersion: 1.2)
- n8n-nodes-base.linear (typeVersion: 1)
- n8n-nodes-base.asana (typeVersion: 1)
- n8n-nodes-base.pagerDuty (typeVersion: 1)
- n8n-nodes-base.datadog (typeVersion: 1)
- n8n-nodes-base.awsS3 (typeVersion: 1)
- n8n-nodes-base.dropbox (typeVersion: 1)
- n8n-nodes-base.sendGrid (typeVersion: 1)
- n8n-nodes-base.mailchimp (typeVersion: 1)
- n8n-nodes-base.rssFeedRead (typeVersion: 1.1)

NODE POSITIONING: Start at [250, 300]. Space nodes 220px horizontally. For branches, offset vertically by ±150px.

CONNECTIONS FORMAT:
"connections": {
  "Node Name": {
    "main": [[{"node": "Next Node Name", "type": "main", "index": 0}]]
  }
}
For IF nodes: index 0 = true branch, index 1 = false branch.
For nodes with no output: omit from connections.

WORKFLOW SETTINGS: Always include:
"settings": { "executionOrder": "v1" }

SECURITY STANDARDS:
- Never hardcode credentials — use credential references (e.g., "credentials": {"slackApi": {"id": "1", "name": "Slack account"}})
- Use expressions like {{ $json.field }} for dynamic data
- Add error handling: include a noOp or Set node on false branches
- For webhooks: use "responseMode": "responseNode" and add a Respond to Webhook node

CLARIFICATION RULE: Ask for clarification only if one critical piece is truly missing. One question max.

OUTPUT FORMAT — STRICT JSON, nothing outside:
If generating:
{"needsClarification":false,"question":null,"workflow":{...valid n8n workflow object...},"workflowName":"Descriptive Workflow Name","nodeCount":N,"description":"2-3 sentence description of what this workflow does.","credentials":["Credential type 1 needed","Credential type 2 needed"],"importInstructions":["Open n8n → top-right menu → Import workflow","Paste the JSON or upload the file","Configure credentials in Settings → Credentials","Activate the workflow with the toggle"]}

If clarification needed:
{"needsClarification":true,"question":"One specific question","workflow":null,"workflowName":null,"nodeCount":null,"description":null,"credentials":null,"importInstructions":null}`;
}

export async function POST(request: Request) {
  const rlResult = checkRateLimit(request, 'workflow', 10, ONE_HOUR_MS);
  if (!rlResult.ok) return rlResult.response;
  const { ip } = rlResult;

  const raw = await request.text();
  const bodyResult = parseRequestBody(raw, WorkflowSchema, 8192);
  if (!bodyResult.ok) return bodyResult.response;

  const { triggerType, integrations, complexity, taskDescription, clarificationAnswer, previousQuestion } = bodyResult.data;

  const injectionCheck = checkFreeTextInputs([taskDescription, clarificationAnswer, previousQuestion], ip, '[workflow]');
  if (!injectionCheck.ok) return injectionCheck.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[workflow/generate] ANTHROPIC_API_KEY not configured');
    return NextResponse.json({ error: 'Workflow generation is not configured yet.' }, { status: 503 });
  }

  const systemPrompt = buildSystemPrompt(triggerType, integrations, complexity);
  const userMessage = buildUserMessage(taskDescription, 'Now please generate the n8n workflow.', clarificationAnswer, previousQuestion);

  // Streamed + accumulated — same rationale as /api/generate: a 16k-token generation can exceed a
  // non-streaming timeout, and Anthropic warns against large max_tokens without streaming. The
  // timeout tracks maxDuration (300s) with headroom so long workflows finish instead of failing.
  const ai = await callAnthropicCollected({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-sonnet-4-6',
    maxTokens: 16384,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    timeoutMs: 280_000,
    logPrefix: '[workflow/generate]',
  });

  if (!ai.ok) {
    return aiFailureResponse(ai, { upstream: 'Workflow generation failed. Please try again.' });
  }

  let result: WorkflowResult;
  try {
    result = extractWorkflowJson(ai.text);
  } catch {
    console.error('[workflow/generate] Failed to parse Claude response:', ai.text.slice(0, 300));
    return NextResponse.json({ error: 'Unexpected response format. Please try again.' }, { status: 502 });
  }

  return NextResponse.json(result);
}
