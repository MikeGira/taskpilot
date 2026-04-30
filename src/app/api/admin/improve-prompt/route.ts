import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!rateLimit(`improve-prompt:${user.id}`, 10, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const db = getAdminClient();
  const { data: feedback } = await db
    .from('generation_feedback')
    .select('os, environment, language, rating, comment, created_at')
    .eq('rating', -1)
    .order('created_at', { ascending: false })
    .limit(30);

  if (!feedback || feedback.length === 0) {
    return NextResponse.json(
      { error: 'No negative feedback yet. Once users submit 👎 ratings, this will analyze patterns and suggest improvements.' },
      { status: 400 }
    );
  }

  const feedbackLines = feedback
    .map((f, i) => {
      const date = new Date(f.created_at as string).toLocaleDateString();
      return `${i + 1}. OS: ${f.os} | Env: ${f.environment} | Language: ${f.language ?? 'unknown'} | Date: ${date}\n   Comment: "${f.comment ?? '(no comment)'}"`;
    })
    .join('\n\n');

  const prompt = `You are a senior AI product engineer analyzing user feedback for ScriptPilot — an AI assistant embedded in TaskPilot that generates production-ready IT automation scripts.

TOOL PURPOSE:
ScriptPilot generates PowerShell (Windows), Bash (Linux), Zsh (macOS), and Python (cross-platform) scripts for IT professionals in on-premises, hybrid, cloud, and multi-cloud environments. Scripts must include: a CONFIG section at the top, proper error handling, timestamped logging, and safety confirmation prompts before destructive operations. Claude asks at most one clarifying question when truly needed, then generates.

NEGATIVE FEEDBACK FROM USERS (${feedback.length} entries):
${feedbackLines}

Analyze the patterns and return ONLY valid JSON — no markdown fences, no text outside the JSON:
{
  "summary": "2-3 sentence summary of the main issues found in the negative feedback",
  "patterns": [
    "Specific pattern 1 with concrete detail",
    "Specific pattern 2 with concrete detail"
  ],
  "improvements": [
    {
      "issue": "What the current prompt gets wrong or misses",
      "suggestion": "Exact wording to add or change in the system prompt",
      "priority": "high"
    },
    {
      "issue": "Another issue",
      "suggestion": "Suggested prompt change",
      "priority": "medium"
    }
  ]
}

Priority levels: "high" = breaking/wrong output, "medium" = quality issue, "low" = polish.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'AI analysis failed. Try again.' }, { status: 502 });
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const result = JSON.parse(match[0]);
    return NextResponse.json({ ...result, analyzedCount: feedback.length });
  } catch (err) {
    console.error('[improve-prompt]', err);
    return NextResponse.json({ error: 'Analysis failed. Try again.' }, { status: 502 });
  }
}
