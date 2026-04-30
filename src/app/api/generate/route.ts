import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const VALID_TOOLS = [
  'powershell', 'bash', 'python',
  'terraform', 'ansible', 'puppet',
  'github-actions', 'gitlab-ci',
  'docker', 'kubernetes',
] as const;

const GenerateSchema = z.object({
  os: z.enum(['windows', 'linux', 'macos', 'cross-platform']),
  environment: z.enum(['on-premises', 'hybrid', 'cloud', 'multi-cloud']),
  cloudProviders: z.array(z.string().max(50)).max(5).optional(),
  tool: z.enum(VALID_TOOLS).optional(),
  taskDescription: z.string().min(10).max(2000).trim(),
  clarificationAnswer: z.string().max(1000).trim().optional(),
  previousQuestion: z.string().max(500).trim().optional(),
});

export interface GenerateResult {
  needsClarification: boolean;
  question: string | null;
  script: string | null;
  filename: string | null;
  language: 'powershell' | 'bash' | 'python' | 'zsh' | 'terraform' | 'yaml' | 'puppet' | 'dockerfile' | null;
  title: string | null;
  explanation: string | null;
  configNotes: string[] | null;
}

function extractJson(raw: string): GenerateResult {
  let text = raw.trim();

  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) text = fenced[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object found');

  const candidate = text.slice(start, end + 1);

  try { return JSON.parse(candidate) as GenerateResult; } catch { /* continue */ }

  try {
    const fixed = fixLiteralNewlinesInJsonStrings(candidate);
    return JSON.parse(fixed) as GenerateResult;
  } catch { /* continue */ }

  return extractFieldsByRegex(text);
}

function extractFieldsByRegex(text: string): GenerateResult {
  const boolMatch = /"needsClarification"\s*:\s*(true|false)/i.exec(text);
  if (!boolMatch) throw new Error('Cannot extract needsClarification');

  const needsClarification = boolMatch[1] === 'true';

  const getString = (field: string): string | null => {
    const m = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i').exec(text);
    if (!m) return null;
    return m[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  };

  if (needsClarification) {
    return { needsClarification: true, question: getString('question'), script: null, filename: null, language: null, title: null, explanation: null, configNotes: null };
  }

  let script: string | null = null;
  const scriptKeyIdx = text.indexOf('"script"');
  if (scriptKeyIdx !== -1) {
    const openQuote = text.indexOf('"', text.indexOf(':', scriptKeyIdx) + 1);
    if (openQuote !== -1) {
      const rest = text.slice(openQuote + 1);
      const fieldEnd = /","(?:filename|language|title|explanation|configNotes)"/.exec(rest);
      if (fieldEnd) {
        script = rest.slice(0, fieldEnd.index)
          .replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
    }
  }

  return {
    needsClarification: false,
    question: null,
    script,
    filename: getString('filename'),
    language: getString('language') as GenerateResult['language'],
    title: getString('title'),
    explanation: getString('explanation'),
    configNotes: null,
  };
}

function fixLiteralNewlinesInJsonStrings(json: string): string {
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
  return result;
}

const OS_LABELS: Record<string, string> = {
  windows: 'Windows (Server 2016/2019/2022 or Windows 10/11)',
  linux: 'Linux (Ubuntu/Debian, RHEL/CentOS, or Amazon Linux)',
  macos: 'macOS (12+ Monterey or later)',
  'cross-platform': 'Cross-platform (must work on Windows, Linux, and macOS)',
};

const ENV_LABELS: Record<string, string> = {
  'on-premises': 'On-premises (Active Directory, local servers)',
  hybrid: 'Hybrid (mix of on-premises and cloud)',
  cloud: 'Cloud-native (infrastructure fully in the cloud)',
  'multi-cloud': 'Multi-cloud (resources across multiple providers)',
};

function buildToolSection(tool: string | undefined): string {
  switch (tool) {
    case 'powershell':
      return `TOOL: PowerShell (5.1+ or PowerShell 7+)
LANGUAGE VALUE: "powershell" | FILE EXTENSION: .ps1
STANDARDS:
- Open with #Requires -Version 5.1 (or -RunAsAdministrator when needed)
- CONFIG section at the top: named variables for every customizable value (domain, OU, paths, thresholds, email recipients)
- Strict mode: Set-StrictMode -Version Latest; $ErrorActionPreference = 'Stop'
- Logging: timestamped entries to a .log file using a Write-Log function
- Dry-run support: -WhatIf parameter or $DryRun flag before any destructive operation
- Credentials: use Get-Credential, SecureString, or Windows Credential Manager — never plain-text passwords
- Use approved PowerShell verbs; prefer cmdlets over calling external executables
- Wrap operations in try/catch/finally; surface meaningful error messages`;

    case 'bash':
      return `TOOL: Bash / Shell Script
LANGUAGE VALUE: "bash" | FILE EXTENSION: .sh
STANDARDS:
- Shebang: #!/usr/bin/env bash
- Strict mode at line 2: set -euo pipefail
- Trap for cleanup: trap 'cleanup_func' EXIT INT TERM
- CONFIG section: readonly VARIABLE="value" for all customizable values
- Logging: log() function that writes "YYYY-MM-DD HH:MM:SS [LEVEL] message" to both stdout and a log file
- Dependency check: verify all required commands exist (command -v tool || die "tool not found") before doing any work
- Quote all variable expansions: "\${var}" not $var
- Use mktemp for temp files; clean them up in the trap handler
- Check return codes explicitly for critical operations
- Idempotency: check current state before making changes`;

    case 'python':
      return `TOOL: Python (3.8+ compatible)
LANGUAGE VALUE: "python" | FILE EXTENSION: .py
STANDARDS:
- Type hints on all function signatures (PEP 484)
- Use the logging module (NOT print): logging.basicConfig with timestamp format
- Specific exception handling (not bare except:); log and re-raise or handle meaningfully
- All config from environment variables (os.environ.get) or a config dataclass — never hardcoded
- Use pathlib.Path for all file paths
- Use dataclasses or TypedDict for structured data
- argparse for CLI flags (--dry-run, --verbose at minimum)
- Requirements listed in configNotes (e.g., "pip install boto3 requests")
- CRITICAL: NEVER use triple-quoted strings (""") anywhere in the script — they break JSON serialization. Use # comments only.`;

    case 'terraform':
      return `TOOL: Terraform (1.x)
LANGUAGE VALUE: "terraform" | FILE EXTENSION: .tf
STANDARDS:
- Output main.tf as the script field. List variables.tf, outputs.tf, and terraform.tfvars.example content in configNotes.
- Required terraform block with required_providers and version constraints
- Remote backend block (S3 with DynamoDB lock / Azure Blob / GCS) — commented with instructions to fill in
- All sensitive variables: sensitive = true
- Standard resource tags: Environment, Owner, Project, ManagedBy = "terraform"
- IAM/RBAC: least-privilege — explicit resource ARNs, no wildcards on sensitive actions
- Use data sources (data "aws_vpc" etc.) instead of hardcoding IDs
- terraform.tfvars.example in configNotes — never commit real secrets
- configNotes must include: terraform init, plan, apply commands and required provider versions`;

    case 'ansible':
      return `TOOL: Ansible (2.9+ / ansible-core 2.12+)
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .yml
STANDARDS:
- Full playbook structure: - name, hosts, become, gather_facts, vars, pre_tasks, tasks, handlers, post_tasks
- Use ansible.builtin.* namespaced modules (not short names)
- Idempotency: prefer Ansible modules over shell/command; use state: present/absent
- Handlers: triggered via notify for service restarts — never restart services directly in tasks
- Secrets: reference ansible-vault encrypted vars (note in configNotes how to encrypt)
- Tags on every task for selective execution (--tags deploy, --tags config, etc.)
- Register task results and assert/check them: failed_when, changed_when
- Block/rescue/always for error handling in complex task groups
- pre_tasks: verify target OS, free disk space, connectivity
- post_tasks: smoke-test that the change worked
- configNotes must list: ansible-galaxy requirements, vault setup, how to run with --check (dry-run)`;

    case 'puppet':
      return `TOOL: Puppet (7+)
LANGUAGE VALUE: "puppet" | FILE EXTENSION: .pp
STANDARDS:
- Proper class or defined type structure with parameters
- Resource ordering: require => and before => or Puppet chaining arrows
- Hiera for all data separation — never hardcode values in manifests; note hiera.yaml structure in configNotes
- Use Puppet Forge modules where available (declare in Puppetfile) rather than exec resources
- exec resources: always include onlyif/unless/creates for idempotency
- File resources: explicit owner, group, mode
- notify => Service[] to trigger service restarts from file/package changes
- configNotes: list required Puppet modules from Forge with exact versions`;

    case 'github-actions':
      return `TOOL: GitHub Actions
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .yml (path: .github/workflows/<name>.yml)
STANDARDS:
- Top-level: name, on (triggers), permissions (minimal — default to contents: read)
- Pin ALL actions to full commit SHAs, not mutable tags (supply chain security)
  Example: uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
- Secrets: \${{ secrets.SECRET_NAME }} — never hardcode credentials
- permissions block: grant only what each job actually needs
- Security scanning jobs included by default:
    - Container images: aquasecurity/trivy-action
    - Code (Python/JS): github/codeql-action/analyze or semgrep
- Cache dependencies: actions/cache for npm/pip/go modules
- Separate jobs with clear dependencies (needs:)
- jobs.<name>.timeout-minutes set on every job
- configNotes: list required secrets and how to add them in repo settings`;

    case 'gitlab-ci':
      return `TOOL: GitLab CI/CD
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .gitlab-ci.yml
STANDARDS:
- stages: defined at top (e.g., build, test, security, deploy)
- Variables: use CI/CD project/group variables for secrets — never hardcode
- Use rules: (not deprecated only:/except:) with appropriate conditions
- Include GitLab security templates where applicable:
    include: - template: Security/SAST.gitlab-ci.yml
             - template: Security/Dependency-Scanning.gitlab-ci.yml
- cache: with key and paths for dependencies
- artifacts: with expire_in and paths for test results
- retry: 2 on transient failures
- timeout: set on each job
- image: pin to specific digest, not :latest
- configNotes: required CI/CD variables and how to set them`;

    case 'docker':
      return `TOOL: Docker
LANGUAGE VALUE: "dockerfile" | FILE EXTENSION: Dockerfile
STANDARDS:
- Multi-stage build: separate builder and final runtime stages
- Pin base image to specific digest or versioned tag — never :latest
  Example: FROM python:3.12-slim@sha256:<digest>
- Non-root user: RUN useradd -r -u 1001 appuser && USER appuser
- COPY --chown=appuser:appuser for file ownership
- No secrets in any layer — use runtime secrets (Docker secrets, env vars at run time)
- HEALTHCHECK instruction with appropriate interval/timeout/retries
- Minimal final image: only runtime dependencies, no build tools
- .dockerignore: exclude .git, node_modules, tests, docs
- EXPOSE only needed ports
- If including docker-compose.yml: put it in configNotes with resource limits (mem_limit), restart policies, and named volumes`;

    case 'kubernetes':
      return `TOOL: Kubernetes / Helm
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .yml
STANDARDS:
- Output a complete manifest set: Deployment (or StatefulSet), Service, ConfigMap, and a Secret template
- resources: requests and limits on every container (CPU and memory)
- readinessProbe and livenessProbe on every container
- securityContext on pod AND container level:
    runAsNonRoot: true, runAsUser: 1000
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities: drop: [ALL]
- NetworkPolicy to restrict ingress/egress to only required peers
- PodDisruptionBudget if replicas > 1
- Labels: app, version, environment, managed-by on all resources
- Secrets: reference from secretKeyRef — never hardcode values in manifests
- If Helm: include Chart.yaml, values.yaml with comments, and one sample template
- configNotes: kubectl apply order, namespace setup, required secrets`;

    default:
      return `TOOL: Auto-detect from context
Select the most appropriate scripting language and format based on the OS, environment, and task:
- Windows tasks → PowerShell (.ps1)
- Linux/Unix tasks → Bash (.sh)
- Cross-platform or API-heavy tasks → Python (.py)
- Infrastructure provisioning → Terraform (.tf)
- Configuration management → Ansible YAML (.yml)
- CI/CD pipeline → GitHub Actions YAML (.yml)
- Container tasks → Dockerfile`;
  }
}

function buildSystemPrompt(
  os: string,
  environment: string,
  cloudProviders: string[] | undefined,
  tool: string | undefined,
): string {
  const cloudLine = cloudProviders && cloudProviders.length > 0
    ? `- Cloud Provider(s): ${cloudProviders.join(', ')}`
    : '';

  return `You are ScriptPilot, a senior DevSecOps engineer and IT automation expert embedded in TaskPilot. You have 15+ years of experience across enterprise IT, cloud infrastructure, security hardening, and automation. You write production-ready, security-hardened automation artifacts that real engineers can deploy with confidence.

TARGET ENVIRONMENT:
- Operating System / Target: ${OS_LABELS[os] ?? os}
- Infrastructure: ${ENV_LABELS[environment] ?? environment}
${cloudLine}

${buildToolSection(tool)}

UNIVERSAL STANDARDS — apply to every output regardless of tool:
1. SECURITY HARDENING IS NON-NEGOTIABLE:
   - Principle of least privilege: minimal permissions, explicit scopes, no wildcards on sensitive operations
   - Zero hardcoded secrets: credentials, API keys, tokens, and passwords always come from environment variables, secret managers (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault), or encrypted vaults
   - Encrypted connections everywhere: TLS/HTTPS, no plaintext protocols
   - Audit logging: every significant action, success, and failure is logged with timestamp and actor
   - Input validation: validate and sanitize inputs before use

2. IDEMPOTENCY: the artifact must be safe to run multiple times. Check current state before making changes. Running it twice must not break a working system.

3. ERROR HANDLING: never silently ignore errors. Fail explicitly with a clear message indicating what went wrong and where. Clean up partial state on failure.

4. PREREQUISITES IN configNotes: list every tool, version, permission, and environment variable required before the script can run.

5. CLOUD TOOLING (use only when environment includes cloud):
   - AWS → AWS CLI v2 with named profiles or IAM roles (never access key in script)
   - Azure → Azure CLI (az) or Az PowerShell module with service principal or managed identity
   - GCP → gcloud CLI authenticated via service account or Workload Identity
   - DigitalOcean → doctl CLI or DO API via curl/requests with token from environment variable

CLARIFICATION RULE: Ask for clarification only if one critical piece of information is missing that makes the script impossible to write. Otherwise make reasonable assumptions, document them in configNotes, and generate the script. One question maximum.

OUTPUT FORMAT — STRICT:
- Return a single raw JSON object. No markdown, no prose, nothing outside the JSON.
- Escape all newlines as \\n, double-quotes as \\", backslashes as \\\\ inside string values.
- The "script" field is a single JSON string — never embed literal newline characters.
- language values: "powershell" | "bash" | "python" | "terraform" | "yaml" | "puppet" | "dockerfile" | null

If generating:
{"needsClarification":false,"question":null,"script":"# full content — newlines as \\n","filename":"descriptive-kebab-name.ext","language":"bash","title":"Short description of what this does","explanation":"2-3 sentences on what the script does and any key design decisions.","configNotes":["Prerequisite or config note 1","Prerequisite or config note 2"]}

If clarification needed:
{"needsClarification":true,"question":"One specific question","script":null,"filename":null,"language":null,"title":null,"explanation":null,"configNotes":null}`;
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

  const { os, environment, cloudProviders, tool, taskDescription, clarificationAnswer, previousQuestion } =
    parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[generate] ANTHROPIC_API_KEY not configured');
    return NextResponse.json({ error: 'Script generation is not configured yet.' }, { status: 503 });
  }

  const systemPrompt = buildSystemPrompt(os, environment, cloudProviders, tool);
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
        max_tokens: 16384,
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

    let result: GenerateResult;
    try {
      result = extractJson(text);
    } catch {
      console.error('[generate] Failed to parse Claude response:', text.slice(0, 300));
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
