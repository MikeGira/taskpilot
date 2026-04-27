import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const GenerateSchema = z.object({
  os: z.enum(['windows', 'linux', 'macos', 'cross-platform']),
  environment: z.enum(['on-premises', 'hybrid', 'cloud', 'multi-cloud']),
  cloudProviders: z.array(z.string().max(50)).max(5).optional(),
  taskDescription: z.string().min(10).max(2000).trim(),
  clarificationAnswer: z.string().max(1000).trim().optional(),
  previousQuestion: z.string().max(500).trim().optional(),
});

export interface GenerateResult {
  needsClarification: boolean;
  question: string | null;
  script: string | null;
  filename: string | null;
  language: 'powershell' | 'bash' | 'python' | 'zsh' | null;
  title: string | null;
  explanation: string | null;
  configNotes: string[] | null;
}

const OS_LABELS: Record<string, string> = {
  windows: 'Windows (Server 2016/2019/2022 or Windows 10/11)',
  linux: 'Linux (Ubuntu/Debian, RHEL/CentOS, or Amazon Linux)',
  macos: 'macOS (12+ Monterey or later)',
  'cross-platform': 'Cross-platform (must work on Windows, Linux, and macOS)',
};

const ENV_LABELS: Record<string, string> = {
  'on-premises': 'Fully on-premises (Active Directory, local servers, no cloud dependency)',
  hybrid: 'Hybrid (mix of on-premises infrastructure and cloud services)',
  cloud: 'Cloud-native (infrastructure fully in the cloud)',
  'multi-cloud': 'Multi-cloud (resources across multiple cloud providers)',
};

function buildSystemPrompt(
  os: string,
  environment: string,
  cloudProviders: string[] | undefined
): string {
  const cloudLine =
    cloudProviders && cloudProviders.length > 0
      ? `- Cloud Provider(s): ${cloudProviders.join(', ')}`
      : '';

  return `You are ScriptPilot, an expert IT automation engineer embedded in TaskPilot.

TARGET ENVIRONMENT:
- Operating System: ${OS_LABELS[os] ?? os}
- Infrastructure: ${ENV_LABELS[environment] ?? environment}
${cloudLine}

YOUR TASK: Generate a production-ready automation script precisely matched to the user's environment and request.

NON-NEGOTIABLE SCRIPT STANDARDS:
1. CONFIG SECTION AT TOP — every value that needs customization (IPs, domains, paths, thresholds, credentials) must be a named variable at the top. Never hardcode these inline.
2. ERROR HANDLING — wrap every external call, file operation, and command in proper error handling. Scripts must fail gracefully and informatively.
3. LOGGING — write timestamped entries for every significant action, success, and failure to a log file.
4. SAFETY — add confirmation prompts or dry-run flags before any destructive operation (deleting, disabling accounts, modifying configs).
5. SCRIPTING LANGUAGE:
   - Windows → PowerShell 5.1+ (start with #Requires -Version 5.1, use cmdlets and modules)
   - Linux → Bash (#!/bin/bash, strict mode: set -euo pipefail)
   - macOS → Zsh (#!/bin/zsh) or Bash, prefer built-in tools
   - Cross-platform → Python 3.8+ (compatible with Windows and Unix, use pathlib, subprocess)
6. CLOUD TOOLING (use only if environment includes cloud):
   - AWS → AWS CLI v2 (assume installed and configured with appropriate IAM role/profile)
   - Azure → Azure CLI (az) or Az PowerShell module
   - GCP → gcloud CLI (assume authenticated)
   - On-premises → native OS tools, AD cmdlets (Get-ADUser etc.) where applicable

CLARIFICATION RULE: If you cannot write a genuinely useful script without one critical missing detail, ask exactly one specific, concise question. Otherwise, make reasonable assumptions, document them in configNotes, and generate the script.

RESPOND WITH VALID JSON ONLY — no markdown fences, no text before or after the JSON object.

If generating a script:
{
  "needsClarification": false,
  "question": null,
  "script": "# complete script here",
  "filename": "descriptive-kebab-name.ps1",
  "language": "powershell",
  "title": "One-line description of what the script does",
  "explanation": "2-3 sentences: what the script does, what it automates, key behaviors.",
  "configNotes": ["VARIABLE_NAME: what to replace it with", "ANOTHER_VAR: explanation"]
}

If you need clarification:
{
  "needsClarification": true,
  "question": "One specific, concise question",
  "script": null,
  "filename": null,
  "language": null,
  "title": null,
  "explanation": null,
  "configNotes": null
}`;
}

function buildUserMessage(
  taskDescription: string,
  clarificationAnswer?: string,
  previousQuestion?: string
): string {
  if (clarificationAnswer && previousQuestion) {
    return `Original request: ${taskDescription}

You asked: ${previousQuestion}
My answer: ${clarificationAnswer}

Now please generate the script.`;
  }
  return taskDescription;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 8192) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  const ip = getClientIp(request);
  const limit = rateLimit(`generate:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit reached. You can generate up to 10 scripts per hour. Try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
      { status: 400 }
    );
  }

  const { os, environment, cloudProviders, taskDescription, clarificationAnswer, previousQuestion } =
    parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[generate] ANTHROPIC_API_KEY not configured');
    return NextResponse.json({ error: 'Script generation is not configured yet.' }, { status: 503 });
  }

  const systemPrompt = buildSystemPrompt(os, environment, cloudProviders);
  const userMessage = buildUserMessage(taskDescription, clarificationAnswer, previousQuestion);

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errData = await anthropicResponse.json().catch(() => ({}));
      console.error('[generate] Anthropic error:', anthropicResponse.status, errData);
      return NextResponse.json(
        { error: 'Script generation failed. Please try again.' },
        { status: 502 }
      );
    }

    const data = await anthropicResponse.json();
    const text: string = data.content?.[0]?.text ?? '';

    // Parse the JSON response from Claude
    let result: GenerateResult;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      result = JSON.parse(jsonMatch[0]) as GenerateResult;
    } catch {
      console.error('[generate] Failed to parse Claude response:', text.slice(0, 200));
      return NextResponse.json(
        { error: 'Unexpected response format. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[generate] Fetch error:', err);
    return NextResponse.json(
      { error: 'Network error reaching AI service. Please try again.' },
      { status: 502 }
    );
  }
}
