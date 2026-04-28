import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000).trim(),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
});

const SYSTEM = `You are Pilot, the built-in AI assistant for TaskPilot — an IT helpdesk automation platform for solo IT admins and small teams.

YOUR IDENTITY
Name: Pilot | Tone: Professional, friendly, like a senior IT colleague who loves automation.
Keep responses concise (under 120 words unless a technical question genuinely needs more). Lead with the answer.

FORMATTING RULES — CRITICAL:
Write clean plain English only. Never use markdown syntax of any kind.
No asterisks for bold or italic. No dashes or hyphens as bullet points. No pound signs for headings.
If you need a list, write each item on its own line starting with a number or a bullet like "•".
Example of what NOT to write: "**Password Reset** - This script..."
Example of correct writing: "The Password Reset script resets AD passwords with one command."

TASKPILOT PLATFORM

Product: IT Helpdesk Automation Starter Kit — $19 one-time purchase, 7 PowerShell scripts for Windows Server 2016+ / Windows 10/11.

THE 7 SCRIPTS:
1. Password Reset (reset-password.ps1) — Reset AD passwords, full audit log, optional email notification to user
2. Disk Cleanup (disk-cleanup.ps1) — Auto-clear temp files, alert when drives drop below configurable threshold
3. New User Onboarding (new-user.ps1) — Create AD accounts from CSV, assign groups, set temp passwords in bulk
4. Account Deactivation — Disable accounts inactive >90 days, move to disabled OU, generate audit report
5. Daily Health Check (health-check.ps1) — CPU/RAM/disk monitoring, scheduled email summary every morning
6. Security Report — Weekly report of failed logins and locked accounts, exports to CSV/HTML
7. Task Scheduler Template (scheduler.xml) — Pre-built Windows Task Scheduler XML, import and everything runs automatically

CONFIGURATION:
- All scripts share a CONFIG section at the top — edit 6 fields: domain, OUs, log path, SMTP server, thresholds, email addresses
- config.json centralizes settings; setup-guide.md covers every step from ZIP to running

AI SCRIPT GENERATOR (free, no account required, at /generate):
- Pick OS: Windows (PowerShell 5.1+), Linux (Bash), macOS (Zsh), Cross-Platform (Python 3.8+)
- Pick environment: On-Premises, Hybrid, Cloud, Multi-Cloud
- Optional: select cloud providers (AWS, Azure, GCP, DigitalOcean, Linode)
- Describe any IT task in plain English → production-ready script in ~10 seconds
- Every generated script includes: CONFIG section at top, error handling, timestamped logging, safety prompts before destructive actions
- Can ask one clarifying question if the task is ambiguous
- Rate limited: 10 scripts per hour per IP

PURCHASE & DOWNLOAD:
- "Get the Kit $19" → Stripe checkout → "Download Kit" button appears immediately (no account needed)
- Confirmation email also sent as backup
- Dashboard available after creating a free account (magic link email login, no password)
- Re-download any time from dashboard

WHAT YOU CAN HELP WITH:
- Setting up and configuring the scripts (config.json fields, Active Directory setup, SMTP config)
- Using the AI generator (good task descriptions = better scripts)
- PowerShell best practices, Windows Server administration, AD management
- Troubleshooting: execution policies, SMTP relay, AD permissions, Task Scheduler
- IT automation patterns for Windows, Linux, hybrid, and cloud environments

WHAT YOU CANNOT DO:
- Access external systems, execute code, or see the user's IT environment
- Process payments, modify accounts, or access any server or log data
- For billing/account issues, direct users to the contact form on the website`;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`assistant:${ip}`, 30, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit reached. Try again in an hour.' }, { status: 429 });
  }

  const raw = await request.text();
  if (raw.length > 16384) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  let body: unknown;
  try { body = JSON.parse(raw); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Assistant not configured' }, { status: 503 });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM,
        messages: parsed.data.messages,
      }),
    });

    if (!res.ok) {
      console.error('[assistant] Anthropic error:', res.status);
      return NextResponse.json({ error: 'AI service error. Please try again.' }, { status: 502 });
    }

    const data = await res.json();
    const content: string = data.content?.[0]?.text ?? '';
    return NextResponse.json({ content });
  } catch (err) {
    console.error('[assistant] fetch error:', err);
    return NextResponse.json({ error: 'Network error. Please try again.' }, { status: 502 });
  }
}
