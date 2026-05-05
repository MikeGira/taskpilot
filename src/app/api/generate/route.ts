import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

export const maxDuration = 60;

const VALID_TOOLS = [
  // Scripting
  'powershell', 'bash', 'python',
  // Infrastructure as Code
  'terraform', 'pulumi', 'aws-cdk', 'azure-bicep', 'arm-templates', 'packer',
  // Configuration Management
  'ansible', 'puppet',
  // CI/CD & GitOps
  'github-actions', 'gitlab-ci', 'jenkins', 'azure-devops', 'argocd',
  // Containers & Orchestration
  'docker', 'kubernetes',
  // Security & Compliance
  'cis-hardening', 'vault', 'security-scanning',
  // AI / ML & Data
  'mlops', 'langchain',
  // Monitoring & Observability
  'prometheus-grafana', 'elk-stack',
  // Database & Storage
  'database-admin',
  // Network Automation
  'network-automation',
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
  language: 'powershell' | 'bash' | 'python' | 'zsh' | 'terraform' | 'yaml' | 'puppet' | 'dockerfile' | 'groovy' | 'typescript' | 'bicep' | 'json' | null;
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
  return { needsClarification: false, question: null, script, filename: getString('filename'), language: getString('language') as GenerateResult['language'], title: getString('title'), explanation: getString('explanation'), configNotes: null };
}

function fixLiteralNewlinesInJsonStrings(json: string): string {
  let result = ''; let inString = false; let escaped = false;
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

    // ── SCRIPTING ─────────────────────────────────────────────────────────────

    case 'powershell':
      return `TOOL: PowerShell (5.1+ or PowerShell 7+)
LANGUAGE VALUE: "powershell" | FILE EXTENSION: .ps1
STANDARDS:
- Open with #Requires -Version 5.1 (or -RunAsAdministrator when needed)
- CONFIG section at top: named variables for every customizable value (domain, OU, paths, thresholds, email recipients)
- Strict mode: Set-StrictMode -Version Latest; $ErrorActionPreference = 'Stop'
- Logging: timestamped Write-Log function writing to a .log file
- Dry-run: -WhatIf parameter or $DryRun flag before any destructive operation
- Credentials: Get-Credential, SecureString, or Windows Credential Manager — never plain-text passwords
- Use approved PowerShell verbs; prefer cmdlets over calling external executables
- Wrap operations in try/catch/finally with meaningful error messages`;

    case 'bash':
      return `TOOL: Bash / Shell Script
LANGUAGE VALUE: "bash" | FILE EXTENSION: .sh
STANDARDS:
- Shebang: #!/usr/bin/env bash
- Strict mode at line 2: set -euo pipefail
- Trap for cleanup: trap 'cleanup_func' EXIT INT TERM
- CONFIG section: readonly VARIABLE="value" for all customizable values
- Logging: log() function writing "YYYY-MM-DD HH:MM:SS [LEVEL] message" to stdout and log file
- Dependency check: command -v tool || { echo "tool not found"; exit 1; } before doing any work
- Quote all variable expansions: "\${var}" not $var
- mktemp for temp files; clean them up in trap handler
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
- argparse for CLI flags (--dry-run, --verbose at minimum)
- Requirements listed in configNotes (pip install ...)
- CRITICAL: NEVER use triple-quoted strings (""") anywhere — they break JSON serialization. Use # comments only.`;

    // ── INFRASTRUCTURE AS CODE ────────────────────────────────────────────────

    case 'terraform':
      return `TOOL: Terraform (1.x)
LANGUAGE VALUE: "terraform" | FILE EXTENSION: .tf
STANDARDS:
- Output main.tf as the script. List variables.tf, outputs.tf, terraform.tfvars.example content in configNotes.
- Required terraform block with required_providers and version constraints
- Remote backend block (S3+DynamoDB / Azure Blob / GCS) — commented with instructions to fill in
- All sensitive variables: sensitive = true
- Standard resource tags: Environment, Owner, Project, ManagedBy = "terraform"
- IAM/RBAC: least-privilege — explicit resource ARNs, no wildcards on sensitive actions
- Use data sources instead of hardcoding IDs
- configNotes must include: terraform init/plan/apply commands, required provider versions, tfvars.example`;

    case 'pulumi':
      return `TOOL: Pulumi (TypeScript — default; note Python alternative in explanation if relevant)
LANGUAGE VALUE: "typescript" | FILE EXTENSION: .ts (index.ts)
STANDARDS:
- Full Pulumi program: import * as pulumi from "@pulumi/pulumi"; with provider SDKs
- Config and Secrets: const config = new pulumi.Config(); config.requireSecret() for sensitive values
- Stack outputs: export const name = resource.property; for all key values consumed by other stacks
- Resource naming: use pulumi.getProject() and pulumi.getStack() for unique, environment-aware names
- Resource options: protect: true on stateful resources (databases, storage buckets) in prod
- Stack references for cross-stack dependencies instead of hardcoding
- configNotes: pulumi up, pulumi preview, pulumi stack init commands; npm install for required provider packages`;

    case 'aws-cdk':
      return `TOOL: AWS CDK v2 (TypeScript)
LANGUAGE VALUE: "typescript" | FILE EXTENSION: .ts
STANDARDS:
- CDK v2: import { App, Stack, StackProps, ... } from 'aws-cdk-lib'; single import namespace
- Full Stack class extending cdk.Stack with typed props interface
- Use L2/L3 constructs (not Cfn-prefixed L1 escape hatches) wherever available
- IAM: inline policies with explicit resource ARNs; Grant methods (bucket.grantRead(role)) preferred
- RemovalPolicy.RETAIN on production databases and S3 buckets; DESTROY only for ephemeral dev resources
- Tags: cdk.Tags.of(this).add('Environment', props.env) pattern for all stacks
- CfnOutput for all values needed post-deploy (endpoints, ARNs, queue URLs)
- configNotes: cdk bootstrap <account>/<region>, cdk synth, cdk deploy; required npm packages`;

    case 'azure-bicep':
      return `TOOL: Azure Bicep (Azure-native IaC)
LANGUAGE VALUE: "bicep" | FILE EXTENSION: .bicep (main.bicep)
STANDARDS:
- targetScope declaration at top when scope is not resourceGroup (subscription/managementGroup/tenant)
- @description() decorator on every parameter and output — Bicep is self-documenting
- @secure() decorator on every sensitive parameter (passwords, keys, connection strings, tokens)
- @minLength/@maxLength/@allowed decorators for input validation
- Parameterize everything: no hardcoded resource names, locations, SKUs, or tier values
- Naming: use uniqueString(resourceGroup().id, deployment().name) for globally unique names (storage, Key Vault)
- Tags: define a tags parameter object; apply to every resource — Environment, Owner, Project, CostCenter
- Module structure: main.bicep orchestrates; modules/<resource>.bicep for reusable, composable components
- Conditions: resource foo 'Microsoft.Type/resource@version' = if(condition) { ... } for optional resources
- Loops: [for item in items: { ... }] with index when needed for multiple similar resources
- Outputs: export all values consumers need — resource IDs, endpoints, connection strings
- existing keyword: reference pre-existing resources (Key Vaults, VNets) without re-deploying them
- Security: deploy Key Vault with enableSoftDelete and purgeProtection; use references not inline secrets
- configNotes: "az bicep install", "az login --tenant <tenantId>", required RBAC role (Contributor minimum),
  "az deployment group create --resource-group <rg> --template-file main.bicep --parameters @params.json",
  parameter file format: { "paramName": { "value": "..." } }`;

    case 'arm-templates':
      return `TOOL: Azure ARM Templates (Azure Resource Manager JSON)
LANGUAGE VALUE: "json" | FILE EXTENSION: azuredeploy.json
STANDARDS:
- Full canonical structure: $schema, contentVersion, parameters, variables, resources, outputs
- $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#"
- parameters: every param needs type, defaultValue (where safe), allowedValues (where applicable),
  minValue/maxValue for numbers, and metadata.description — treat parameters as the API surface
- Sensitive parameters: "type": "securestring" or "secureObject" — NEVER "string" for passwords/keys
- variables: compute derived values, resource names, and repeated expressions to reduce duplication;
  use ARM functions: concat(), resourceId(), reference(), uniqueString(), substring(), toLower()
- resources: apiVersion pinned to a specific stable date (e.g., "2023-09-01") — never "latest";
  dependsOn array for explicit ordering; condition property for optional resources
- Copy loops: "copy" element with "name", "count", and "input" for creating multiple similar resources
- Linked/nested templates: use nested deployments (type: Microsoft.Resources/deployments) for modularity
- Tags: parameters.tags object of type object; applied consistently to every top-level resource
- outputs: use resourceId(), reference().primaryEndpoints, listKeys() to export consumed values
- What-if before deploy: az deployment group what-if validates before making changes
- configNotes: "az login", required RBAC role (Contributor or custom), az deployment group create command,
  azuredeploy.parameters.json template: { "$schema": "...", "contentVersion": "1.0.0.0", "parameters": {} },
  note: consider migrating to Bicep for new projects — Bicep is the modern Azure IaC standard`;

    case 'packer':
      return `TOOL: HashiCorp Packer (HCL2)
LANGUAGE VALUE: "terraform" | FILE EXTENSION: .pkr.hcl
STANDARDS:
- HCL2 format only (not legacy JSON): packer { required_plugins { ... } } block at top
- source block: fully parameterized — all AMI filters, instance types, regions, and base images as variables
- build block: chained provisioners in logical order — shell (update/install), shell (harden), file (copy configs)
- Security hardening in provisioners: remove SSH authorized keys, clear shell history, disable root login, run OS security updates, set strict file permissions
- variable blocks for all customizable values; sensitive = true for any secret values
- post-processor: manifest to track build artifact IDs across runs
- configNotes: packer init, packer validate, packer build commands; required plugin versions; how to use produced AMI/image`;

    // ── CONFIGURATION MANAGEMENT ──────────────────────────────────────────────

    case 'ansible':
      return `TOOL: Ansible (2.9+ / ansible-core 2.12+)
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .yml
STANDARDS:
- Full playbook structure: - name, hosts, become, gather_facts, vars, pre_tasks, tasks, handlers, post_tasks
- Use ansible.builtin.* namespaced modules (not short names)
- Idempotency: prefer Ansible modules over shell/command; use state: present/absent
- Handlers: triggered via notify for service restarts — never restart services directly in tasks
- Secrets: reference ansible-vault encrypted vars_files; note vault setup in configNotes
- Tags on every task for selective execution (--tags deploy, --tags config, etc.)
- Register task results and check them: failed_when, changed_when
- Block/rescue/always for error handling in complex task groups
- pre_tasks: verify OS, disk space; post_tasks: smoke-test the change
- configNotes: ansible-galaxy requirements, vault setup, --check (dry-run) command`;

    case 'puppet':
      return `TOOL: Puppet (7+)
LANGUAGE VALUE: "puppet" | FILE EXTENSION: .pp
STANDARDS:
- Proper class or defined type structure with typed parameters
- Resource ordering: require => and before => or chaining arrows (->)
- Hiera for all data separation — no hardcoded values in manifests; include hiera.yaml structure in configNotes
- Use Puppet Forge modules (list in Puppetfile) rather than exec resources wherever possible
- exec resources: always include onlyif/unless/creates for idempotency
- File resources: explicit owner, group, mode on every file resource
- notify => Service[] to trigger service restarts from file/package changes
- configNotes: Puppetfile module list with versions, r10k/librarian-puppet setup, test with --noop`;

    // ── CI/CD & GITOPS ────────────────────────────────────────────────────────

    case 'github-actions':
      return `TOOL: GitHub Actions
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .yml (path: .github/workflows/<name>.yml)
STANDARDS:
- Top-level: name, on (triggers), permissions: { contents: read } as default minimal permission
- Pin ALL actions to full commit SHAs, not mutable tags (supply chain security)
  Format: uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
- Secrets: \${{ secrets.SECRET_NAME }} — never hardcode credentials
- permissions block: grant only what each job actually needs (contents/packages/id-token)
- Security jobs included: aquasecurity/trivy-action for images, github/codeql-action for code
- Cache: actions/cache for npm/pip/go/maven dependencies
- timeout-minutes on every job to prevent runaway builds
- configNotes: required repository secrets, how to add them, required GitHub permissions`;

    case 'gitlab-ci':
      return `TOOL: GitLab CI/CD
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .gitlab-ci.yml
STANDARDS:
- stages: at top (build, test, security, deploy)
- Variables: CI/CD project/group variables for all secrets — never hardcode
- Use rules: (not deprecated only:/except:) with if/changes conditions
- Include GitLab security templates:
    include: [{ template: 'Security/SAST.gitlab-ci.yml' }, { template: 'Security/Dependency-Scanning.gitlab-ci.yml' }]
- cache: with key and paths for dependencies
- artifacts: with expire_in and paths for test results and reports
- retry: 2 on transient failures; timeout: on each job
- Image: pin to specific digest, not :latest
- configNotes: required CI/CD variables and how to set them in GitLab project settings`;

    case 'jenkins':
      return `TOOL: Jenkins (Declarative Pipeline)
LANGUAGE VALUE: "groovy" | FILE EXTENSION: Jenkinsfile
STANDARDS:
- Declarative syntax only: pipeline { agent { ... } stages { stage('...') { steps { ... } } } }
- withCredentials([usernamePassword(...), string(...)]) for ALL secret access — never hardcode
- Parallel stages for independent work: parallel { stage('Unit Tests') {...} stage('Lint') {...} }
- post { always { junit '...'; cleanWs() } success { ... } failure { slackSend(...) } }
- timeout(time: 30, unit: 'MINUTES') on pipeline and individual stages
- Security stage: sh 'trivy image ...' for containers; dependencyCheck for libraries; SonarQube for SAST
- archiveArtifacts and publishHTML for test reports
- configNotes: required Jenkins plugins (Pipeline, Credentials, SonarQube, etc.), Jenkins credentials to configure`;

    case 'azure-devops':
      return `TOOL: Azure DevOps Pipelines (YAML)
LANGUAGE VALUE: "yaml" | FILE EXTENSION: azure-pipelines.yml
STANDARDS:
- Full structure: trigger, pr, variables, stages with jobs and steps
- Variable groups: reference as group: my-variable-group; use \$(variableName) syntax
- Service connections for Azure subscriptions, ACR, GitHub — never inline credentials
- Secrets: AzureKeyVault@2 task or library variable groups marked as secret
- Matrix strategy: for multi-platform or multi-framework testing
- PublishTestResults and PublishCodeCoverageResults tasks
- Security: CredScan, OWASP Dependency Check, container image scanning tasks
- Environment resources with approval gates and branch protection for production
- configNotes: required service connections, variable groups to create, agent pool requirements`;

    case 'argocd':
      return `TOOL: ArgoCD (GitOps Continuous Delivery)
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .yml
STANDARDS:
- Application manifest: apiVersion: argoproj.io/v1alpha1; kind: Application with full spec
- source: repoURL, targetRevision (branch/tag/SHA), path to manifests or Helm chart
- destination: server, namespace with explicit cluster reference
- syncPolicy.automated: { prune: true, selfHeal: true } for full GitOps automation
- syncPolicy.syncOptions: [CreateNamespace=true, PrunePropagationPolicy=foreground]
- App-of-Apps pattern: root Application pointing to a directory of Application manifests
- AppProject: sourceRepos allowlist, destinations allowlist, clusterResourceWhitelist for RBAC
- Sync waves: argocd.argoproj.io/sync-wave annotation for ordered multi-resource deployment
- configNotes: ArgoCD namespace setup, RBAC roles needed, repo credentials, image updater setup if needed`;

    // ── CONTAINERS & ORCHESTRATION ────────────────────────────────────────────

    case 'docker':
      return `TOOL: Docker
LANGUAGE VALUE: "dockerfile" | FILE EXTENSION: Dockerfile
STANDARDS:
- Multi-stage build: separate builder and final runtime stages to minimize image size
- Pin base image to versioned tag (or digest for maximum reproducibility) — never :latest
- Non-root user: RUN useradd -r -u 1001 -g 1001 appuser && USER appuser:appuser
- COPY --chown=appuser:appuser for proper file ownership
- No secrets in any layer — use runtime secrets (Docker secrets, environment variables at run time only)
- HEALTHCHECK with appropriate interval/timeout/retries/start-period
- Minimal final stage: only runtime dependencies, no compilers or build tools
- .dockerignore: exclude .git, node_modules, tests, .env files
- EXPOSE only needed ports with comments explaining each
- docker-compose.yml (in configNotes if needed): resource limits, restart policies, named volumes, health checks`;

    case 'kubernetes':
      return `TOOL: Kubernetes / Helm
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .yml
STANDARDS:
- Complete manifest set: Deployment/StatefulSet + Service + ConfigMap + Secret template + HPA
- resources: requests and limits on every container (both CPU and memory)
- readinessProbe and livenessProbe on every container; startupProbe for slow-starting apps
- securityContext at pod AND container level:
    pod: runAsNonRoot: true, runAsUser: 1000, fsGroup: 2000, seccompProfile: RuntimeDefault
    container: allowPrivilegeEscalation: false, readOnlyRootFilesystem: true, capabilities: { drop: [ALL] }
- NetworkPolicy: deny-all ingress/egress by default; allow only required peers
- PodDisruptionBudget: minAvailable: 1 for any workload with replicas > 1
- Labels: app.kubernetes.io/name, app.kubernetes.io/version, environment, managed-by on all resources
- Secrets: reference with secretKeyRef — never plaintext values in manifests (use sealed-secrets or external-secrets)
- configNotes: kubectl apply order, namespace creation, required CRDs, secrets injection method`;

    // ── SECURITY & COMPLIANCE ─────────────────────────────────────────────────

    case 'cis-hardening':
      return `TOOL: CIS Security Hardening (Bash for Linux / PowerShell for Windows)
LANGUAGE VALUE: "bash" or "powershell" based on OS | FILE EXTENSION: .sh or .ps1
STANDARDS:
- CIS Benchmark aligned: reference specific CIS control IDs in comments (e.g., # CIS 5.2.4)
- For Linux: SSH hardening (sshd_config: PermitRootLogin no, MaxAuthTries 4, Protocol 2),
  file permissions (umask 027, /etc/passwd mode 644), sysctl hardening (net.ipv4.tcp_syncookies=1),
  auditd rules for sudo/privileged commands, PAM password complexity, disable unused services/protocols
- For Windows: Account lockout policies, audit policy (AuditPol), registry hardening
  (SMB signing, NTLM restrictions, LM hash disabled), Windows Firewall baseline,
  service hardening (disable Telnet/FTP/etc.), PowerShell constrained language mode
- Backup before modifying: save original config with timestamp before every change
- Idempotency: read current value, compare, apply only if needed
- Dry-run flag (--check / -WhatIf): report WOULD-change without making changes
- Summary report at end: list all changes applied and any skipped items
- configNotes: CIS Benchmark document version referenced, backup location, rollback procedure`;

    case 'vault':
      return `TOOL: HashiCorp Vault (Secrets Management)
LANGUAGE VALUE: "bash" | FILE EXTENSION: .sh
STANDARDS:
- Use Vault CLI (vault) with VAULT_ADDR and VAULT_TOKEN from environment — never root token in scripts
- Auth methods: AppRole (machine auth), AWS IAM, or Kubernetes service account — choose based on environment
- Policy-first: create minimal Vault policy before provisioning any secrets or tokens
  path "secret/data/app/*" { capabilities = ["read"] } — never path "*" { capabilities = ["*"] }
- Secret engines: KV v2 for static secrets, PKI for TLS certificates, database for dynamic DB creds
- Dynamic secrets preferred over static: database engine rotates credentials automatically
- Leases and TTLs: set appropriate TTLs; implement lease renewal for long-running processes
- Audit backend: vault audit enable file file_path=/var/log/vault_audit.log — first step in any setup
- Token wrapping: use response-wrapping for delivering initial credentials to applications
- configNotes: Vault initialization/unseal process, required policies, auth method setup steps, renewal procedure`;

    case 'security-scanning':
      return `TOOL: Security Scanning & SAST Automation
LANGUAGE VALUE: "bash" | FILE EXTENSION: .sh (standalone) or .yml (CI integration)
STANDARDS:
- Multi-layer scanning pipeline:
    1. Secrets detection: gitleaks detect or trufflehog filesystem for hardcoded credentials
    2. Dependency vulnerabilities: npm audit / pip-audit / trivy fs for SCA
    3. SAST: semgrep --config=auto for multi-language static analysis; bandit for Python
    4. Container images: trivy image <name> or grype for CVE scanning
    5. IaC misconfigurations: checkov -d . for Terraform/K8s/Docker; tfsec for Terraform
    6. Web application: OWASP ZAP baseline scan (for running services)
- Severity gates: exit 1 on CRITICAL or HIGH findings; log MEDIUM for review
- SARIF output: --format sarif for GitHub/GitLab code scanning UI integration
- Allowlist/baseline file: maintain .trivyignore / .semgrepignore for accepted false positives with justification
- Artifact: save JSON report + HTML summary for compliance evidence
- configNotes: tool installation commands (brew/apt/pip), baseline file location, how to update allowlists, CI integration snippet`;

    // ── AI / ML & DATA ────────────────────────────────────────────────────────

    case 'mlops':
      return `TOOL: AI/ML Operations (MLOps)
LANGUAGE VALUE: "python" | FILE EXTENSION: .py
STANDARDS:
- MLflow for experiment tracking: mlflow.set_experiment(), log_params(), log_metrics(), log_artifacts()
- Model registry: mlflow.register_model(); stage transitions (Staging → Production) with validation gate
- Model serving: FastAPI wrapper with /health and /predict endpoints; Pydantic schemas for input/output
- Data validation: reject malformed inputs before inference; log rejected samples for analysis
- Monitoring: log prediction latency, confidence distributions, and data drift metrics each inference
- Reproducibility: log requirements.txt, random seeds, dataset version/hash with every experiment run
- Security: authenticate model endpoints (API key or JWT); rate-limit inference endpoints;
  sanitize text inputs to prevent prompt injection on LLM endpoints
- GPU resource management: set cuda device explicitly; handle CUDA OOM with graceful error response
- Cost tracking: log token counts and compute time per request for billing and optimization
- CRITICAL: NEVER use triple-quoted strings (""") — use # comments only
- configNotes: pip requirements, MLflow tracking server URI, model registry permissions, GPU requirements`;

    case 'langchain':
      return `TOOL: AI Pipeline — LangChain / RAG / LLM Integration
LANGUAGE VALUE: "python" | FILE EXTENSION: .py
STANDARDS:
- LangChain v0.3+ imports: from langchain_anthropic import ChatAnthropic (not deprecated paths)
- RAG pipeline: DocumentLoader → RecursiveCharacterTextSplitter → Embeddings → VectorStore → Retriever → LLM chain
- Vector stores: Chroma (local dev/test), pgvector/Pinecone/Weaviate (production with persistence)
- LLM abstraction: model name always from environment variable (ANTHROPIC_MODEL, OPENAI_MODEL) — never hardcoded
- API keys: ANTHROPIC_API_KEY / OPENAI_API_KEY from os.environ only — never in code
- Streaming: use .stream() for user-facing responses; async .astream() in async contexts
- Memory: ConversationBufferWindowMemory with configurable window size from env var
- Prompt injection defense: separate system/user prompts strictly; validate/sanitize user inputs;
  never concatenate raw user input into system prompts
- Cost control: tiktoken for token estimation before call; log usage (prompt_tokens, completion_tokens) per request
- Error handling: implement retry with exponential backoff for rate limit and transient errors
- CRITICAL: NEVER use triple-quoted strings (""") — use # comments only
- configNotes: pip requirements (langchain, langchain-anthropic, chromadb, tiktoken), vector DB setup, API key config`;

    // ── MONITORING & OBSERVABILITY ────────────────────────────────────────────

    case 'prometheus-grafana':
      return `TOOL: Prometheus & Grafana (Monitoring as Code)
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .yml
STANDARDS:
- Prometheus prometheus.yml: global scrape_interval, scrape_configs with proper job_name,
  static_configs or service discovery (kubernetes_sd_configs / file_sd_configs), TLS and basic_auth
- AlertManager alertmanager.yml: route tree with group_by, group_wait, receivers
  (Slack webhook, PagerDuty, email) with proper inhibit_rules to prevent alert storms
- PrometheusRule CRDs (for Kubernetes): alert rules with expr (PromQL), for (pending duration),
  labels.severity, and annotations.summary + annotations.runbook_url
- Recording rules: pre-compute expensive aggregations as new metric names for dashboard performance
- Alert fatigue prevention: meaningful for: durations (not instant), actionable severity levels,
  SLO-based burn rate alerts rather than raw thresholds where possible
- Grafana dashboard JSON: variables for environment/cluster, templated queries, alerting thresholds on panels
- Security: Prometheus basic auth + TLS; Grafana API keys with minimal scope; restrict datasource access
- configNotes: docker-compose or Helm values to deploy the stack, scrape target configuration requirements`;

    case 'elk-stack':
      return `TOOL: ELK Stack — Elasticsearch, Logstash, Kibana (Elastic Stack 8.x)
LANGUAGE VALUE: "yaml" | FILE EXTENSION: .yml (.conf for Logstash pipelines)
STANDARDS:
- Logstash pipeline (.conf): input (beats/syslog/kafka with TLS) → filter (grok with named patterns,
  mutate for field normalization, geoip for IP enrichment, date for timestamp parsing) → output
  (elasticsearch with index template reference, retry on failure)
- Index template: proper mappings (keyword vs text, date format), index lifecycle policy assignment
- ILM policy: hot (active write) → warm (replica reduction, force-merge) → cold (frozen) → delete phases
  with data-appropriate retention per tier
- Security (Elastic Stack 8 has security enabled by default): TLS between all components;
  API key auth for Logstash→ES communication; role-based access in Kibana (viewer/analyst/admin)
- Filebeat/Metricbeat config: modules enabled, output.elasticsearch with API key, processors for enrichment
- Kibana Alerts: threshold-based and ML anomaly detection rules for security events (failed logins, spike in errors)
- Performance: JVM heap = 50% of RAM (max 32GB); disable swap; set vm.max_map_count=262144
- configNotes: resource requirements per node role, TLS certificate generation steps, snapshot repository setup (S3/GCS)`;

    // ── DATABASE & STORAGE ────────────────────────────────────────────────────

    case 'database-admin':
      return `TOOL: Database Administration (PostgreSQL / MySQL / MariaDB)
LANGUAGE VALUE: "bash" | FILE EXTENSION: .sh
STANDARDS:
- Connection security: SSL/TLS required; connection string ONLY from environment variable (DATABASE_URL or PGPASSWORD)
- PostgreSQL: use psql with PGPASSWORD env var or .pgpass file — never -p password on command line (visible in ps aux)
- MySQL/MariaDB: --defaults-extra-file=~/.my.cnf for credentials — never -p on command line
- Backup: pg_dump / mysqldump with --compress; verify every backup by checking file size and header integrity;
  test restore to a separate schema/database monthly (note in configNotes)
- Replication monitoring: check replica lag, replication status, alert when lag exceeds threshold
- Maintenance windows: VACUUM ANALYZE / REINDEX (PG), OPTIMIZE TABLE / ANALYZE (MySQL) during low traffic
- User management: CREATE USER with minimum required privileges; GRANT only necessary permissions;
  document each user's purpose; revoke unused grants
- Audit logging: enable pg_audit extension (PG) or general_log / audit_log (MySQL) for compliance
- Connection pooling: PgBouncer pool_mode=transaction (PG) or ProxySQL configuration notes
- configNotes: DB permissions required to run the script, connection string format, backup storage path, restore test procedure`;

    // ── NETWORK AUTOMATION ────────────────────────────────────────────────────

    case 'network-automation':
      return `TOOL: Network Automation (Python netmiko / NAPALM / Nornir)
LANGUAGE VALUE: "python" | FILE EXTENSION: .py
STANDARDS:
- Use netmiko for multi-vendor SSH automation; NAPALM for config management and diff/validation;
  Nornir for parallel execution across device fleets
- Device inventory: read from YAML or JSON file — never hardcode hostnames/IPs in script
- Credentials: from environment variables or HashiCorp Vault — never in script or inventory file
- Connection management: context managers (with ConnectHandler(...) as conn:) for guaranteed session cleanup
- Idempotency: retrieve current running config, diff against desired state, apply only changed sections
- Backup before change: save running-config to timestamped local file before any modification
- Rollback: save rollback config snippet; implement --rollback flag to restore previous state
- Validation: test connectivity and authentication on all devices before bulk operations; skip and log failures
- Multi-vendor support: detect OS type (Cisco IOS/NXOS, Junos, EOS, FortiOS) and use correct driver
- CRITICAL: NEVER use triple-quoted strings (""") — use # comments only
- configNotes: pip requirements (netmiko, napalm, nornir, pyyaml), inventory file format example, supported vendor OS types`;

    // ── DEFAULT ───────────────────────────────────────────────────────────────

    default:
      return `TOOL: Auto-detect from context
Select the most appropriate language and format based on the OS, environment, and task:
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
   - Zero hardcoded secrets: credentials, API keys, tokens always come from environment variables, secret managers, or encrypted vaults
   - Encrypted connections everywhere: TLS/HTTPS, no plaintext protocols
   - Audit logging: every significant action, success, and failure logged with timestamp
   - Input validation: validate and sanitize all inputs before use
2. IDEMPOTENCY: safe to run multiple times without breaking a working system
3. ERROR HANDLING: never silently ignore errors; fail explicitly with clear messages; clean up partial state
4. PREREQUISITES IN configNotes: every tool, version, permission, and env var required before running
5. CLOUD TOOLING (only when environment includes cloud):
   - AWS → AWS CLI v2 with named profiles or IAM roles (never access key inline)
   - Azure → Azure CLI or Az PowerShell with service principal or managed identity
   - GCP → gcloud CLI with service account or Workload Identity Federation
   - DigitalOcean → doctl CLI with token from environment variable

CLARIFICATION RULE: Ask for clarification only if one critical piece of information is truly missing. Otherwise make reasonable assumptions, document them in configNotes, and generate. One question maximum.

OUTPUT FORMAT — STRICT:
- Return a single raw JSON object. No markdown, no prose, nothing outside the JSON.
- Escape all newlines as \\n, double-quotes as \\", backslashes as \\\\ inside string values.
- The "script" field is a single JSON string — never embed literal newline characters.
- language values: "powershell" | "bash" | "python" | "terraform" | "bicep" | "json" | "yaml" | "puppet" | "dockerfile" | "groovy" | "typescript" | null

If generating:
{"needsClarification":false,"question":null,"script":"# full content — newlines as \\n","filename":"descriptive-kebab-name.ext","language":"bash","title":"Short description","explanation":"2-3 sentences on what this does and key design decisions.","configNotes":["Prerequisite or note 1","Prerequisite or note 2"]}

If clarification needed:
{"needsClarification":true,"question":"One specific question","script":null,"filename":null,"language":null,"title":null,"explanation":null,"configNotes":null}`;
}

function buildUserMessage(taskDescription: string, clarificationAnswer?: string, previousQuestion?: string): string {
  if (clarificationAnswer && previousQuestion) {
    return `Original request: ${taskDescription}\n\nYou asked: ${previousQuestion}\nMy answer: ${clarificationAnswer}\n\nNow please generate the script.`;
  }
  return taskDescription;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 8192) return NextResponse.json({ error: 'Request too large' }, { status: 413 });

  const ip = getClientIp(request);
  const limit = rateLimit(`generate:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit reached. You can generate up to 10 scripts per hour. Try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try { body = JSON.parse(raw); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const { os, environment, cloudProviders, tool, taskDescription, clarificationAnswer, previousQuestion } = parsed.data;

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
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errData = await anthropicResponse.json().catch(() => ({}));
      console.error('[generate] Anthropic error:', anthropicResponse.status, errData);
      return NextResponse.json({ error: 'Script generation failed. Please try again.' }, { status: 502 });
    }

    const data = await anthropicResponse.json();
    const text: string = data.content?.[0]?.text ?? '';

    let result: GenerateResult;
    try { result = extractJson(text); } catch {
      console.error('[generate] Failed to parse Claude response:', text.slice(0, 300));
      return NextResponse.json({ error: 'Unexpected response format. Please try again.' }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[generate] Fetch error:', err);
    return NextResponse.json({ error: 'Network error reaching AI service. Please try again.' }, { status: 502 });
  }
}
