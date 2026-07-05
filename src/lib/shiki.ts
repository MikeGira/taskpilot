import type { HighlighterCore } from 'shiki/core';

// Singleton promise so repeated CodeBlock mounts share one highlighter and the
// shiki chunk (dynamic import) loads only when a result actually renders.
let highlighterPromise: Promise<HighlighterCore> | null = null;

const LANG_ALIASES: Record<string, string> = {
  powershell: 'powershell',
  pwsh: 'powershell',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  python: 'python',
  py: 'python',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
};

export function resolveShikiLang(language: string | null | undefined): string | null {
  if (!language) return null;
  return LANG_ALIASES[language.toLowerCase()] ?? null;
}

export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
        import('shiki/core'),
        import('shiki/engine/javascript'),
      ]);
      return createHighlighterCore({
        themes: [import('@shikijs/themes/github-dark-default')],
        langs: [
          import('@shikijs/langs/powershell'),
          import('@shikijs/langs/bash'),
          import('@shikijs/langs/python'),
          import('@shikijs/langs/json'),
          import('@shikijs/langs/yaml'),
        ],
        engine: createJavaScriptRegexEngine(),
      });
    })();
  }
  return highlighterPromise;
}
