import { z } from 'zod';

// Grounding discipline, Layer 3 (schema validation / constrained output).
// The generation routes previously did `JSON.parse(text) as GenerateResult` — a cast,
// which is a compile-time assertion and checks nothing at runtime. Every field the model
// emitted was trusted verbatim. This module makes the shape real.

export const LANGUAGES = [
  'powershell', 'bash', 'python', 'zsh', 'terraform', 'yaml',
  'puppet', 'dockerfile', 'groovy', 'typescript', 'bicep', 'json',
] as const;

export type Language = (typeof LANGUAGES)[number];

// Layer 1 applied to the one field with teeth: the file extension. The model may name
// the file descriptively, but it does not get to choose the extension — an LLM-chosen
// ".exe", ".bat", ".hta" or a double extension is handed to the user as a download.
const EXTENSION_BY_LANGUAGE: Record<Language, string> = {
  powershell: '.ps1',
  bash: '.sh',
  zsh: '.sh',
  python: '.py',
  terraform: '.tf',
  yaml: '.yml',
  puppet: '.pp',
  dockerfile: '',
  groovy: '.groovy',
  typescript: '.ts',
  bicep: '.bicep',
  json: '.json',
};

const MAX_STEM_LENGTH = 64;

export function sanitizeFilename(raw: string | null | undefined, language: Language | null): string {
  // Dockerfiles are named by convention, not by extension.
  if (language === 'dockerfile') return 'Dockerfile';

  const extension = language ? EXTENSION_BY_LANGUAGE[language] : '.txt';

  // Basename only — drop anything before a path separator of either flavour so a
  // traversal-shaped name cannot survive even if a future caller writes it server-side.
  const basename = (raw ?? '').split(/[\\/]/).pop() ?? '';

  const stem = basename
    .replace(/\.[^.]*$/, '')            // strip whatever extension the model chose
    .replace(/[^A-Za-z0-9._-]+/g, '-')  // conservative charset
    .replace(/^[.\-]+|[.\-]+$/g, '')    // no leading dot (hidden file) or stray edges
    .slice(0, MAX_STEM_LENGTH);

  return `${stem || 'script'}${extension}`;
}

const nullableTrimmed = (max: number) =>
  z.string().trim().max(max).nullish().transform(v => (v && v.length > 0 ? v : null));

export const GenerateResultSchema = z
  .object({
    needsClarification: z.coerce.boolean().default(false),
    question: nullableTrimmed(2000),
    script: z.string().max(500_000).nullish().transform(v => v || null),
    filename: z.string().max(300).nullish(),
    // Unknown language degrades to null rather than failing the whole generation:
    // the script is still useful, it just renders unhighlighted.
    language: z.preprocess(
      v => (typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v) ? v : null),
      z.enum(LANGUAGES).nullable(),
    ),
    title: nullableTrimmed(300),
    explanation: nullableTrimmed(5000),
    configNotes: z.array(z.string().max(2000)).max(50).nullish().transform(v => v ?? null),
  })
  .transform(r => ({
    ...r,
    // Derived, never trusted from the model.
    filename: r.script ? sanitizeFilename(r.filename, r.language) : null,
  }));

export type ValidatedGenerateResult = z.infer<typeof GenerateResultSchema>;

// Returns null when the payload cannot be coerced into a usable result, so callers can
// return a clean 502 instead of forwarding a malformed object to the browser.
export function validateGenerateResult(raw: unknown): ValidatedGenerateResult | null {
  const parsed = GenerateResultSchema.safeParse(raw);
  if (!parsed.success) return null;

  // A result that neither asks a question nor carries a script is not usable.
  if (!parsed.data.needsClarification && !parsed.data.script) return null;
  if (parsed.data.needsClarification && !parsed.data.question) return null;

  return parsed.data;
}
